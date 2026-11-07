"""Development seed command for Learnova.

Enforces execution ONLY in development/test environments.
Initializes canonical roles and optional development-only accounts.
"""

import hashlib
import logging
import os
import sys
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.profile import UserProfile
from app.models.role import Role
from app.models.user import User

logger = logging.getLogger("learnova.cli.seed")

CANONICAL_ROLES = [
    {
        "id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
        "name": "student",
        "description": "Student learner account with course and assessment access",
    },
    {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222222"),
        "name": "teacher",
        "description": "Teacher account with course management and curriculum authoring access",
    },
    {
        "id": uuid.UUID("33333333-3333-3333-3333-333333333333"),
        "name": "administrator",
        "description": "System administrator with platform governance and oversight privileges",
    },
]


def _hash_seed_password(plain: str) -> str:
    """Generate a hashed password representation for seed accounts.
    
    Ensures plaintext passwords are never stored in the database.
    """
    digest = hashlib.sha256(plain.encode("utf-8")).hexdigest()
    # Format with algorithm prefix
    return f"sha256${digest}"


def seed_database(db: Optional[Session] = None) -> None:
    """Seed the database with foundational roles and optional dev test accounts."""
    env = settings.ENVIRONMENT.lower()
    if env not in ("development", "test", "local"):
        logger.error(
            "ABORTED: Seeding is strictly forbidden in non-development environment '%s'.",
            env,
        )
        raise RuntimeError(
            f"Database seeding is forbidden in environment '{settings.ENVIRONMENT}'"
        )

    session = db or SessionLocal()
    try:
        # 1. Seed canonical roles
        for role_data in CANONICAL_ROLES:
            stmt = select(Role).where(Role.name == role_data["name"])
            existing_role = session.scalars(stmt).first()
            if not existing_role:
                new_role = Role(
                    id=role_data["id"],
                    name=role_data["name"],
                    description=role_data["description"],
                )
                session.add(new_role)
                logger.info("Seeded canonical role: %s", role_data["name"])

        session.commit()

        # 2. Seed optional dev accounts only if explicitly requested
        seed_dev_accounts = os.getenv("DEV_SEED_ACCOUNTS", "false").lower() == "true"
        if seed_dev_accounts:
            admin_email = os.getenv("DEV_ADMIN_EMAIL", "admin.dev@learnova.internal").lower()
            admin_password = os.getenv("DEV_ADMIN_PASSWORD", "dev-secure-pass-123")

            admin_role = session.scalars(
                select(Role).where(Role.name == "administrator")
            ).first()

            if admin_role:
                existing_user = session.scalars(
                    select(User).where(User.email == admin_email)
                ).first()

                if not existing_user:
                    admin_user = User(
                        id=uuid.uuid4(),
                        email=admin_email,
                        hashed_password=_hash_seed_password(admin_password),
                        full_name="Development Administrator",
                        role_id=admin_role.id,
                        is_active=True,
                    )
                    session.add(admin_user)
                    session.flush()

                    admin_profile = UserProfile(
                        id=uuid.uuid4(),
                        user_id=admin_user.id,
                        bio="System development administrator",
                        department="Engineering",
                        preferences={"theme": "system", "emailNotifications": False},
                    )
                    session.add(admin_profile)
                    session.commit()
                    logger.info("Seeded dev admin account: %s", admin_email)
                else:
                    logger.info("Dev admin account %s already exists; skipping.", admin_email)

        logger.info("Database seeding completed successfully.")
    except Exception as exc:
        session.rollback()
        logger.error("Seeding failed: %s", exc)
        raise
    finally:
        if db is None:
            session.close()


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    try:
        seed_database()
        print("Database seed completed.")
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
