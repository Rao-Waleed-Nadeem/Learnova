"""AI service managing lesson tutoring, PII protection, and durable content caching."""

import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session

from app.ai.adapter import AISimplifyRequest, GeminiServiceAdapter, ILLMServiceAdapter
from app.core.config import settings
from app.models.ai import AIContentCache
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson
from app.models.topic import Topic
from app.models.user import User
from app.schemas.ai import AISimplifyLessonRequest, AISimplifyLessonResponse
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
        course_title: str,
        topic_title: str,
        lesson_title: str,
        mode: str,
        custom_prompt: Optional[str] = None,
        prompt_version: str = "v1",
    ) -> str:
        """Compute deterministic SHA-256 hash for cached explanation retrieval."""
        raw = (
            f"c:{course_title.strip().lower()}::"
            f"t:{topic_title.strip().lower()}::"
            f"l:{lesson_title.strip().lower()}::"
            f"m:{mode.strip().lower()}::"
            f"p:{(custom_prompt or '').strip().lower()}::"
            f"v:{prompt_version}"
        )
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @staticmethod
    def simplify_lesson(
        db: Session,
        req: AISimplifyLessonRequest,
        actor: User,
    ) -> AISimplifyLessonResponse:
        """Provide student/teacher lesson explanation with durable cache check and fallback."""
        # Optional validation: if lesson_id provided, verify enrollment / access
        course_title = req.course_title or "Course"
        topic_title = req.topic_title or "Topic"
        lesson_title = req.lesson_title or "Lesson"
        lesson_content = req.lesson_content or ""

        if req.lesson_id:
            lesson = db.get(Lesson, req.lesson_id)
            if lesson:
                lesson_title = lesson.title
                topic = db.get(Topic, lesson.topic_id)
                if topic:
                    topic_title = topic.title
                    course = db.get(Course, topic.course_id)
                    if course:
                        course_title = course.title
                        # If student, verify active enrollment
                        if actor.role.name == "student":
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

        # 1. Check durable PostgreSQL content cache
        cache_key = AIService._compute_cache_key(
            course_title=course_title,
            topic_title=topic_title,
            lesson_title=lesson_title,
            mode=req.mode,
            custom_prompt=req.custom_prompt,
            prompt_version="v1",
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
                prompt_used=req.custom_prompt or req.mode,
            )

        # 2. Invoke adapter (PII minimized: no student identity dispatched)
        adapter = AIService.get_adapter()
        adapter_req = AISimplifyRequest(
            course_title=course_title,
            topic_title=topic_title,
            lesson_title=lesson_title,
            lesson_content=lesson_content,
            mode=req.mode,
            custom_prompt=req.custom_prompt,
        )

        res = adapter.simplify_lesson(adapter_req)

        # 3. Save / Upsert into durable PostgreSQL content cache
        ttl_days = settings.AI_CACHE_TTL_DAYS
        expires_at = now + timedelta(days=ttl_days)

        if cached:
            # Refresh expired cache row
            cached.content = res.explanation
            cached.source = res.source
            cached.provider = "gemini" if res.source == "gemini" else "deterministic_fallback"
            cached.model = settings.GEMINI_MODEL
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
                prompt_version="v1",
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
