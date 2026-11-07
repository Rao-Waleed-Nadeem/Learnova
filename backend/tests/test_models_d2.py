"""Unit tests for Learnova D2 (Courses, Curriculum & Resources) models."""

import uuid
from decimal import Decimal
import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.lesson import Lesson
from app.models.resource import LearningResource
from app.models.role import Role
from app.models.topic import Topic
from app.models.topic_prerequisite import TopicPrerequisite
from app.models.user import User


@pytest.fixture
def teacher_user(db_session: Session) -> User:
    """Fixture providing a teacher user."""
    role = Role(name="teacher")
    db_session.add(role)
    db_session.commit()

    teacher = User(
        email="prof.smith@learnova.internal",
        hashed_password="hash",
        full_name="Prof. Smith",
        role_id=role.id,
    )
    db_session.add(teacher)
    db_session.commit()
    return teacher


def test_course_status_constraint(db_session: Session, teacher_user: User) -> None:
    """Verify courses.status check constraint (draft, published, archived)."""
    valid_course = Course(
        title="Intro to Computer Science",
        status="draft",
        creator_id=teacher_user.id,
    )
    db_session.add(valid_course)
    db_session.commit()

    assert valid_course.id is not None
    assert valid_course.status == "draft"

    # Invalid status must raise IntegrityError
    invalid_course = Course(
        title="Bad Status Course",
        status="pending_approval",
        creator_id=teacher_user.id,
    )
    db_session.add(invalid_course)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_course_creator_set_null(db_session: Session, teacher_user: User) -> None:
    """Verify that deleting a course creator sets creator_id to NULL without dropping course."""
    course = Course(
        title="Data Structures",
        status="published",
        creator_id=teacher_user.id,
    )
    db_session.add(course)
    db_session.commit()

    course_id = course.id
    db_session.delete(teacher_user)
    db_session.commit()

    loaded_course = db_session.get(Course, course_id)
    assert loaded_course is not None
    assert loaded_course.creator_id is None


def test_course_teacher_junction(db_session: Session, teacher_user: User) -> None:
    """Verify course_teachers many-to-many junction table (DEC-P2-002)."""
    course = Course(title="Algorithms 101", status="draft")
    db_session.add(course)
    db_session.commit()

    assignment = CourseTeacher(course_id=course.id, teacher_id=teacher_user.id)
    db_session.add(assignment)
    db_session.commit()

    assert len(course.teacher_assignments) == 1
    assert course.teacher_assignments[0].teacher_id == teacher_user.id

    # Duplicate assignment must fail on composite primary key
    duplicate = CourseTeacher(course_id=course.id, teacher_id=teacher_user.id)
    db_session.add(duplicate)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_topic_order_and_mastery_bounds(db_session: Session) -> None:
    """Verify topic order (>= 0) and mastery_threshold (0.0 to 1.0) constraints."""
    course = Course(title="Operating Systems", status="draft")
    db_session.add(course)
    db_session.commit()

    # Valid topic
    valid_topic = Topic(
        course_id=course.id,
        title="Processes and Threads",
        order=0,
        mastery_threshold=Decimal("0.7500"),
    )
    db_session.add(valid_topic)
    db_session.commit()
    assert valid_topic.id is not None

    # Invalid negative order
    neg_order_topic = Topic(
        course_id=course.id,
        title="Invalid Order Topic",
        order=-1,
        mastery_threshold=Decimal("0.7500"),
    )
    db_session.add(neg_order_topic)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    # Invalid mastery threshold > 1.0
    high_threshold_topic = Topic(
        course_id=course.id,
        title="High Threshold Topic",
        order=1,
        mastery_threshold=Decimal("1.5000"),
    )
    db_session.add(high_threshold_topic)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_topic_prerequisite_no_self_edge(db_session: Session) -> None:
    """Verify topic_prerequisites check constraint rejects self-loops (SSD-02)."""
    course = Course(title="Discrete Math", status="draft")
    db_session.add(course)
    db_session.commit()

    topic = Topic(course_id=course.id, title="Set Theory", order=0)
    db_session.add(topic)
    db_session.commit()

    # Self-edge must violate ck_topic_prerequisites_no_self_edge
    self_edge = TopicPrerequisite(topic_id=topic.id, prerequisite_topic_id=topic.id)
    db_session.add(self_edge)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_topic_prerequisite_duplicate_edge(db_session: Session) -> None:
    """Verify topic_prerequisites primary key rejects duplicate edges."""
    course = Course(title="Linear Algebra", status="draft")
    db_session.add(course)
    db_session.commit()

    topic_a = Topic(course_id=course.id, title="Vectors", order=0)
    topic_b = Topic(course_id=course.id, title="Matrices", order=1)
    db_session.add_all([topic_a, topic_b])
    db_session.commit()

    edge1 = TopicPrerequisite(topic_id=topic_b.id, prerequisite_topic_id=topic_a.id)
    db_session.add(edge1)
    db_session.commit()

    edge2 = TopicPrerequisite(topic_id=topic_b.id, prerequisite_topic_id=topic_a.id)
    db_session.add(edge2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_learning_resource_type_constraint(db_session: Session) -> None:
    """Verify learning_resources.type check constraint (DEC-P2-004)."""
    course = Course(title="Web Architecture", status="draft")
    db_session.add(course)
    db_session.commit()

    topic = Topic(course_id=course.id, title="HTTP Protocol", order=0)
    db_session.add(topic)
    db_session.commit()

    lesson = Lesson(topic_id=topic.id, title="HTTP Methods & Headers", order=0)
    db_session.add(lesson)
    db_session.commit()

    # Valid types: document, video, markdown, code, link
    for r_type in ["document", "video", "markdown", "code", "link"]:
        res = LearningResource(
            lesson_id=lesson.id,
            title=f"Sample {r_type}",
            type=r_type,
            content_or_url=f"https://content.internal/{r_type}",
            file_size_bytes=1024,
        )
        db_session.add(res)
    db_session.commit()

    assert len(lesson.resources) == 5

    # Invalid resource type
    invalid_res = LearningResource(
        lesson_id=lesson.id,
        title="Invalid Resource",
        type="executable_binary",
        content_or_url="malicious.exe",
    )
    db_session.add(invalid_res)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_curriculum_hierarchy_cascades(db_session: Session) -> None:
    """Verify course deletion cascades downward through topics, lessons, and resources."""
    course = Course(title="AI Basics", status="draft")
    db_session.add(course)
    db_session.commit()

    topic = Topic(course_id=course.id, title="Neural Networks", order=0)
    db_session.add(topic)
    db_session.commit()

    lesson = Lesson(topic_id=topic.id, title="Perceptrons", order=0)
    db_session.add(lesson)
    db_session.commit()

    resource = LearningResource(
        lesson_id=lesson.id,
        title="Perceptron Notes",
        type="markdown",
        content_or_url="# Perceptrons",
    )
    db_session.add(resource)
    db_session.commit()

    topic_id = topic.id
    lesson_id = lesson.id
    resource_id = resource.id

    db_session.delete(course)
    db_session.commit()

    assert db_session.get(Topic, topic_id) is None
    assert db_session.get(Lesson, lesson_id) is None
    assert db_session.get(LearningResource, resource_id) is None
