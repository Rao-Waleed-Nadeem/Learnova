"""Pydantic schemas for Question Bank operations (D3 Domain)."""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------------------------
# Format-Specific Item Schemas
# ---------------------------------------------------------------------------

class MCQOptionInput(BaseModel):
    """Option payload for multiple choice question creation/update."""
    id: Optional[str] = None
    text: str = Field(..., min_length=1)
    is_correct: bool = False


class MatchingPairInput(BaseModel):
    """Left-Right pair item for matching question creation/update."""
    id: Optional[str] = None
    left: str = Field(..., min_length=1)
    right: str = Field(..., min_length=1)


# ---------------------------------------------------------------------------
# Question Request Schemas
# ---------------------------------------------------------------------------

class QuestionCreateRequest(BaseModel):
    """Payload for creating a question in the Question Bank."""
    course_id: UUID
    topic_id: UUID
    type: Literal["multiple_choice", "true_false", "fill_blank", "matching", "short_answer"]
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    points: int = Field(default=1, gt=0)
    prompt: str = Field(..., min_length=1)
    explanation: Optional[str] = None
    status: Literal["draft", "pending_review", "approved", "rejected", "archived"] = "approved"
    source: Literal["teacher", "ai_generated"] = "teacher"

    # Convenience format fields
    options: Optional[List[MCQOptionInput]] = None
    is_multiple_correct_allowed: Optional[bool] = False
    correct_bool: Optional[bool] = None
    accepted_answers: Optional[List[str]] = None
    case_sensitive: Optional[bool] = False
    matching_pairs: Optional[List[MatchingPairInput]] = None
    expected_rubric: Optional[str] = None
    grading_mode: Optional[Literal["manual_review", "exact_match"]] = "manual_review"

    # Direct raw storage fields (optional alternative)
    payload: Optional[Dict[str, Any]] = None
    answer_key: Optional[Dict[str, Any]] = None


class QuestionUpdateRequest(BaseModel):
    """Payload for updating an existing question in the Question Bank."""
    topic_id: Optional[UUID] = None
    difficulty: Optional[Literal["easy", "medium", "hard"]] = None
    points: Optional[int] = Field(default=None, gt=0)
    prompt: Optional[str] = Field(default=None, min_length=1)
    explanation: Optional[str] = None
    status: Optional[Literal["draft", "pending_review", "approved", "rejected", "archived"]] = None

    # Format fields
    options: Optional[List[MCQOptionInput]] = None
    is_multiple_correct_allowed: Optional[bool] = None
    correct_bool: Optional[bool] = None
    accepted_answers: Optional[List[str]] = None
    case_sensitive: Optional[bool] = None
    matching_pairs: Optional[List[MatchingPairInput]] = None
    expected_rubric: Optional[str] = None
    grading_mode: Optional[Literal["manual_review", "exact_match"]] = None

    payload: Optional[Dict[str, Any]] = None
    answer_key: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Question Response Schemas
# ---------------------------------------------------------------------------

class QuestionDetailResponse(BaseModel):
    """Authoritative question response for teachers and administrators with grading data."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    course_id: UUID
    topic_id: UUID
    author_id: Optional[UUID] = None
    type: str
    difficulty: str
    points: int
    prompt: str
    explanation: Optional[str] = None
    status: str
    source: str
    version: int
    payload: Dict[str, Any]
    answer_key: Dict[str, Any]

    # Reconstructed convenience fields for teacher view
    options: Optional[List[Dict[str, Any]]] = None
    is_multiple_correct_allowed: Optional[bool] = None
    correct_bool: Optional[bool] = None
    accepted_answers: Optional[List[str]] = None
    case_sensitive: Optional[bool] = None
    matching_pairs: Optional[List[Dict[str, Any]]] = None
    expected_rubric: Optional[str] = None
    grading_mode: Optional[str] = None

    created_at: datetime
    updated_at: datetime


class QuestionStudentResponse(BaseModel):
    """Safe projection for student delivery strictly omitting all answer keys and rubrics."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    course_id: UUID
    topic_id: UUID
    type: str
    difficulty: str
    points: int
    prompt: str
    version: int
    payload: Dict[str, Any]
    created_at: datetime
