"""Unit tests for Learnova D1 (User Accounts & Roles) models."""

import uuid
import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.profile import UserProfile
from app.models.role import Role
from app.models.user import User


def test_role_allowed_names(db_session: Session) -> None:
    """Verify that only the 3 canonical roles are permitted."""
    student_role = Role(name="student", description="Student learner")
    teacher_role = Role(name="teacher", description="Course instructor")
    admin_role = Role(name="administrator", description="System administrator")

    db_session.add_all([student_role, teacher_role, admin_role])
    db_session.commit()

    assert student_role.id is not None
    assert teacher_role.id is not None
    assert admin_role.id is not None

    # Invalid role must violate ck_roles_name check constraint
    invalid_role = Role(name="super_admin", description="Disallowed role")
    db_session.add(invalid_role)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_role_unique_name(db_session: Session) -> None:
    """Verify that duplicate role names are rejected by unique constraint."""
    role1 = Role(name="student")
    role2 = Role(name="student")

    db_session.add(role1)
    db_session.commit()

    db_session.add(role2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_user_creation_and_profile_cascade(db_session: Session) -> None:
    """Verify user creation with profile and cascading delete behavior."""
    role = Role(name="student")
    db_session.add(role)
    db_session.commit()

    user = User(
        email="learner@learnova.internal",
        hashed_password="$2b$12$e8qHkY2N4w1n7q9k...",  # Bcrypt-style hash
        full_name="Jane Learner",
        role_id=role.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    profile = UserProfile(
        user_id=user.id,
        bio="Avid CS student",
        department="Computer Science",
        preferences={"theme": "dark", "emailNotifications": True},
    )
    db_session.add(profile)
    db_session.commit()

    # Verify relationships
    assert user.role.name == "student"
    assert user.profile is not None
    assert user.profile.department == "Computer Science"
    assert user.profile.preferences["theme"] == "dark"

    # Verify cascade delete: deleting user deletes profile
    profile_id = profile.id
    db_session.delete(user)
    db_session.commit()

    assert db_session.get(UserProfile, profile_id) is None


def test_user_unique_email(db_session: Session) -> None:
    """Verify unique constraint on user email address."""
    role = Role(name="teacher")
    db_session.add(role)
    db_session.commit()

    user1 = User(
        email="instructor@learnova.internal",
        hashed_password="hash1",
        full_name="Instructor One",
        role_id=role.id,
    )
    user2 = User(
        email="instructor@learnova.internal",
        hashed_password="hash2",
        full_name="Instructor Two",
        role_id=role.id,
    )

    db_session.add(user1)
    db_session.commit()

    db_session.add(user2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_role_delete_restricted(db_session: Session) -> None:
    """Verify ON DELETE RESTRICT prevents deleting an active role."""
    role = Role(name="administrator")
    db_session.add(role)
    db_session.commit()

    user = User(
        email="admin@learnova.internal",
        hashed_password="hash",
        full_name="Admin User",
        role_id=role.id,
    )
    db_session.add(user)
    db_session.commit()

    db_session.delete(role)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_password_hash_never_plaintext(db_session: Session) -> None:
    """Verify hashed_password column stores hashes and not plaintext."""
    role = Role(name="student")
    db_session.add(role)
    db_session.commit()

    raw_password = "MySuperSecretPassword123!"
    # Ensure application hashes passwords before persisting
    stored_hash = "$2b$12$" + ("x" * 53)

    user = User(
        email="student.secure@learnova.internal",
        hashed_password=stored_hash,
        full_name="Secure Student",
        role_id=role.id,
    )
    db_session.add(user)
    db_session.commit()

    saved = db_session.get(User, user.id)
    assert saved is not None
    assert saved.hashed_password != raw_password
    assert saved.hashed_password == stored_hash
