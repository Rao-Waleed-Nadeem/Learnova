"""Courses API router providing catalog browsing, course creation, hierarchy retrieval, and publication."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import (
    get_current_active_user,
    get_optional_current_user,
    require_role,
    require_teacher_assigned_to_course,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.curriculum import (
    CourseCreateRequest,
    CourseDetailResponse,
    CourseResponse,
    CourseUpdateRequest,
)
from app.services.course_service import CourseService

router = APIRouter()


@router.get("", response_model=List[CourseResponse])
def list_courses(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve course catalog.

    - Public/Students: returns only 'published' courses.
    - Teachers: returns created/assigned courses + 'published' courses.
    - Administrators: returns all courses.
    """
    return CourseService.list_courses(db=db, current_user=current_user, skip=skip, limit=limit)


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    data: CourseCreateRequest,
    current_user: User = Depends(require_role("teacher", "administrator")),
    db: Session = Depends(get_db),
):
    """Create a new course in draft status. Only teachers and administrators are authorized."""
    return CourseService.create_course(db=db, data=data, creator=current_user)


@router.get("/{course_id}", response_model=CourseDetailResponse)
def get_course_detail(
    course_id: UUID,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve full course details with curriculum syllabus hierarchy."""
    return CourseService.get_course_detail(db=db, course_id=course_id, current_user=current_user)


@router.patch("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: UUID,
    data: CourseUpdateRequest,
    current_user: User = Depends(require_teacher_assigned_to_course),
    db: Session = Depends(get_db),
):
    """Update course metadata. Authorized for assigned teachers and administrators."""
    return CourseService.update_course(db=db, course_id=course_id, data=data, actor=current_user)


@router.post("/{course_id}/publish", response_model=CourseResponse)
def publish_course(
    course_id: UUID,
    current_user: User = Depends(require_teacher_assigned_to_course),
    db: Session = Depends(get_db),
):
    """Publish a draft course after validating topic/lesson completeness and prerequisite acyclicity."""
    return CourseService.publish_course(db=db, course_id=course_id, actor=current_user)
