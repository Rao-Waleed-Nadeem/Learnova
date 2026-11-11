"""Aggregated API v1 router."""

from fastapi import APIRouter
from app.api.v1.endpoints import (
    admin,
    ai,
    assessments,
    attempts,
    auth,
    courses,
    enrollments,
    gamification,
    health,
    lessons,
    mastery,
    questions,
    student_analytics,
    teacher_analytics,
    topics,
    users,
)

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(student_analytics.router, prefix="/students", tags=["student-analytics"])
api_router.include_router(teacher_analytics.router, prefix="/teacher", tags=["teacher-analytics"])
api_router.include_router(courses.router, prefix="/courses", tags=["courses"])
api_router.include_router(topics.router, prefix="", tags=["topics"])
api_router.include_router(lessons.router, prefix="", tags=["lessons", "resources"])
api_router.include_router(enrollments.router, prefix="", tags=["enrollments", "learning-map"])
api_router.include_router(questions.router, prefix="/questions", tags=["questions"])
api_router.include_router(assessments.router, prefix="/assessments", tags=["assessments"])
api_router.include_router(attempts.router, prefix="/attempts", tags=["attempts"])
api_router.include_router(mastery.router, prefix="", tags=["mastery", "learning-path"])
api_router.include_router(gamification.router, prefix="", tags=["gamification"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
