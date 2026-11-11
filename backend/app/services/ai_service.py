"""AI service managing lesson tutoring, PII protection, and durable content caching."""

import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session

from app.ai.adapter import AISimplifyRequest, GeminiServiceAdapter, ILLMServiceAdapter
from app.core.config import settings
from app.core.sanitizer import scrub_pii
from app.models.ai import AIContentCache
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson
from app.models.resource import LearningResource
from app.models.topic import Topic
from app.models.user import User
from app.schemas.ai import AISimplifyLessonRequest, AISimplifyLessonResponse
from app.services.question_service import QuestionService
from fastapi import HTTPException, status


class AIService:
    """Domain service for AI lesson tutoring and durable PostgreSQL content caching."""

    _adapter: Optional[ILLMServiceAdapter] = None

    @classmethod
    def get_adapter(cls) -> ILLMServiceAdapter:
        """Provide LLM service adapter singleton."""
        if cls._adapter is None:
            cls._adapter = GeminiServiceAdapter(
                api_key=settings.GEMINI_API_KEY,
                model=settings.GEMINI_MODEL,
                timeout_seconds=settings.AI_TIMEOUT_SECONDS,
            )
        return cls._adapter

    @classmethod
    def set_adapter(cls, adapter: ILLMServiceAdapter) -> None:
        """Allow dependency injection of mock adapter for testing."""
        cls._adapter = adapter

    @staticmethod
    def _compute_cache_key(
        lesson_id: uuid.UUID,
        content_hash: str,
        mode: str,
        custom_prompt: Optional[str] = None,
        model: str = "gemini-2.5-flash",
        prompt_version: str = "v2",
    ) -> str:
        """Compute deterministic versioned SHA-256 hash for content-aware cached explanation retrieval."""
        clean_prompt = (custom_prompt or "").strip().lower()
        raw = (
            f"ns:{prompt_version}::"
            f"m:{model.strip().lower()}::"
            f"lid:{str(lesson_id).lower()}::"
            f"ch:{content_hash}::"
            f"mode:{mode.strip().lower()}::"
            f"p:{clean_prompt}"
        )
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @staticmethod
    def simplify_lesson(
        db: Session,
        req: AISimplifyLessonRequest,
        actor: User,
    ) -> AISimplifyLessonResponse:
        """Provide student/teacher lesson explanation with authoritative DB resolution, RBAC, and durable cache."""
        # 1. Require and resolve persisted lesson
        if not req.lesson_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="A valid lesson_id is required for AI lesson tutoring",
            )

        lesson = db.get(Lesson, req.lesson_id)
        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lesson with ID {req.lesson_id} not found",
            )

        # 2. Resolve parent Topic and Course relationships from database
        topic = db.get(Topic, lesson.topic_id)
        if not topic:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lesson topic not found",
            )

        course = db.get(Course, topic.course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )

        # 3. Enforce strict server-side authorization BEFORE accessing cache or LLM
        actor_role = actor.role.name if (actor.role and actor.role.name) else "student"

        if actor_role == "student":
            # Student must be actively enrolled in published course
            if course.status != "published":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot access tutoring for an unpublished course",
                )

            enr = (
                db.query(Enrollment)
                .filter(
                    Enrollment.student_id == actor.id,
                    Enrollment.course_id == course.id,
                    Enrollment.status == "active",
                )
                .first()
            )
            if not enr:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Must be enrolled in the course to access lesson AI tutoring",
                )
        elif actor_role == "teacher":
            # Teacher must be assigned to course or creator
            QuestionService.verify_course_teacher_access(db, course.id, actor)
        elif actor_role == "administrator":
            # Admin permitted
            pass
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access lesson tutoring",
            )

        # 4. Extract authoritative canonical persisted lesson content (ignore untrusted client text)
        course_title = course.title
        topic_title = topic.title
        lesson_title = lesson.title

        lesson_desc = lesson.description or ""
        resources = (
            db.query(LearningResource)
            .filter(LearningResource.lesson_id == lesson.id)
            .order_by(LearningResource.created_at)
            .all()
        )
        resource_snippets = []
        for res_item in resources:
            if res_item.type in ("markdown", "document", "code"):
                resource_snippets.append(f"[{res_item.title}]: {res_item.content_or_url}")

        if resource_snippets:
            canonical_content = f"{lesson_desc}\n" + "\n".join(resource_snippets)
        else:
            canonical_content = lesson_desc or f"Foundational curriculum concepts for {lesson_title}."
        canonical_content = canonical_content.strip()

        # 5. Compute cryptographic content fingerprint
        content_hash = hashlib.sha256(canonical_content.encode("utf-8")).hexdigest()[:16]

        # 6. Scrub PII from custom prompt
        clean_custom_prompt = scrub_pii(req.custom_prompt) if req.custom_prompt else None

        # 7. Check durable PostgreSQL content cache with versioned content-aware key
        cache_key = AIService._compute_cache_key(
            lesson_id=lesson.id,
            content_hash=content_hash,
            mode=req.mode,
            custom_prompt=clean_custom_prompt,
            model=settings.GEMINI_MODEL,
            prompt_version="v2",
        )

        now = datetime.now(timezone.utc)
        cached = (
            db.query(AIContentCache)
            .filter(AIContentCache.cache_key == cache_key)
            .first()
        )

        is_valid_cache = False
        if cached:
            if cached.expires_at is None:
                is_valid_cache = True
            else:
                exp = cached.expires_at
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                if exp > now:
                    is_valid_cache = True

        if cached and is_valid_cache:
            source_label = "gemini_cache" if cached.source == "gemini" else "academic_cache"
            return AISimplifyLessonResponse(
                success=True,
                explanation=cached.content,
                source=source_label,
                is_cached=True,
                prompt_used=clean_custom_prompt or req.mode,
            )

        # 8. Invoke provider adapter with minimized, scrubbed payload
        adapter = AIService.get_adapter()
        adapter_req = AISimplifyRequest(
            course_title=course_title,
            topic_title=topic_title,
            lesson_title=lesson_title,
            lesson_content=canonical_content,
            mode=req.mode,
            custom_prompt=clean_custom_prompt,
        )

        res = adapter.simplify_lesson(adapter_req)

        # 9. Save / Upsert into durable PostgreSQL content cache
        ttl_days = settings.AI_CACHE_TTL_DAYS
        expires_at = now + timedelta(days=ttl_days)

        if cached:
            # Refresh expired cache row
            cached.content = res.explanation
            cached.source = res.source
            cached.provider = "gemini" if res.source == "gemini" else "deterministic_fallback"
            cached.model = settings.GEMINI_MODEL
            cached.prompt_version = "v2"
            cached.created_at = now
            cached.expires_at = expires_at
        else:
            cache_entry = AIContentCache(
                cache_key=cache_key,
                content_type="lesson_simplification",
                content=res.explanation,
                source=res.source,
                provider="gemini" if res.source == "gemini" else "deterministic_fallback",
                model=settings.GEMINI_MODEL,
                prompt_version="v2",
                created_at=now,
                expires_at=expires_at,
            )
            db.add(cache_entry)

        db.commit()

        return AISimplifyLessonResponse(
            success=True,
            explanation=res.explanation,
            source=res.source,
            is_cached=False,
            prompt_used=res.prompt_used,
        )
