"""Development seed command for Learnova.

Enforces execution ONLY in development/test environments.
Initializes canonical roles and optional development-only accounts.
"""

import hashlib
import logging
import os
import sys
import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.lesson import Lesson
from app.models.profile import UserProfile
from app.models.resource import LearningResource
from app.models.role import Role
from app.models.topic import Topic
from app.models.topic_prerequisite import TopicPrerequisite
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


CANONICAL_COURSES = [
    {
        "id": uuid.UUID("44444444-4444-4444-4444-444444444444"),
        "title": "Introduction to Computer Science & Python",
        "description": "Foundational programming concepts, algorithmic reasoning, control structures, and object-oriented principles.",
        "status": "published",
        "topics": [
            {
                "id": uuid.UUID("a1111111-1111-1111-1111-111111111111"),
                "title": "Syntax, Variables & Data Types",
                "description": "Core scalar types, memory bindings, arithmetic operators, and string formatting.",
                "order": 1,
                "mastery_threshold": Decimal("0.7500"),
                "prerequisites": [],
                "lessons": [
                    {
                        "id": uuid.UUID("b1111111-1111-1111-1111-111111111111"),
                        "title": "Variables, Expressions & Statements",
                        "order": 1,
                        "description": "Syntax fundamentals, naming conventions, and scalar variable definitions.",
                        "resources": [
                            {
                                "id": uuid.UUID("c1111111-1111-1111-1111-111111111111"),
                                "title": "Python Variable Assignment & Primitive Types Guide",
                                "type": "markdown",
                                "content_or_url": "# Python Variables\nVariables in Python are dynamically typed references to objects.",
                            }
                        ],
                    },
                    {
                        "id": uuid.UUID("b1111111-1111-1111-1111-111111111112"),
                        "title": "Numeric Types & Arithmetic Precedence",
                        "order": 2,
                        "description": "Integer, float operations, modulus, integer division, and operator hierarchy.",
                        "resources": [],
                    },
                    {
                        "id": uuid.UUID("b1111111-1111-1111-1111-111111111113"),
                        "title": "Strings, String Formatting & Slicing",
                        "order": 3,
                        "description": "String indexing, stride slicing, f-strings, and immutability.",
                        "resources": [],
                    },
                ],
            },
            {
                "id": uuid.UUID("a2222222-2222-2222-2222-222222222222"),
                "title": "Conditional Logic & Control Flow",
                "description": "Boolean branching, if-elif-else statements, while loops, and iterator traversal.",
                "order": 2,
                "mastery_threshold": Decimal("0.7500"),
                "prerequisites": [uuid.UUID("a1111111-1111-1111-1111-111111111111")],
                "lessons": [
                    {
                        "id": uuid.UUID("b2222222-2222-2222-2222-222222222221"),
                        "title": "Boolean Logic & Truth Tables",
                        "order": 1,
                        "description": "Truth tables, logical operators (and, or, not), and short-circuit evaluation.",
                        "resources": [],
                    },
                    {
                        "id": uuid.UUID("b2222222-2222-2222-2222-222222222222"),
                        "title": "If-Elif-Else Branching Structures",
                        "order": 2,
                        "description": "Multi-way conditional dispatch and guard clauses.",
                        "resources": [],
                    },
                    {
                        "id": uuid.UUID("b2222222-2222-2222-2222-222222222223"),
                        "title": "Loops and Iteration Control",
                        "order": 3,
                        "description": "While loops, for loops with range, break, and continue.",
                        "resources": [],
                    },
                ],
            },
            {
                "id": uuid.UUID("a3333333-3333-3333-3333-333333333333"),
                "title": "Functions & Modular Programming",
                "description": "Subroutines, scope resolution, default parameters, return contracts, and purity.",
                "order": 3,
                "mastery_threshold": Decimal("0.8000"),
                "prerequisites": [
                    uuid.UUID("a1111111-1111-1111-1111-111111111111"),
                    uuid.UUID("a2222222-2222-2222-2222-222222222222"),
                ],
                "lessons": [
                    {
                        "id": uuid.UUID("b3333333-3333-3333-3333-333333333331"),
                        "title": "Function Declarations & Arguments",
                        "order": 1,
                        "description": "def statements, positional vs keyword arguments, and parameter defaults.",
                        "resources": [],
                    },
                    {
                        "id": uuid.UUID("b3333333-3333-3333-3333-333333333332"),
                        "title": "Scope, Return Values & Purity",
                        "order": 2,
                        "description": "LEGB scope hierarchy, side effects, and pure computational functions.",
                        "resources": [],
                    },
                ],
            },
            {
                "id": uuid.UUID("a4444444-4444-4444-4444-444444444444"),
                "title": "Data Collections: Lists, Tuples & Dicts",
                "description": "Sequence mutability, hash maps, nested structures, and algorithmic transformations.",
                "order": 4,
                "mastery_threshold": Decimal("0.8000"),
                "prerequisites": [uuid.UUID("a3333333-3333-3333-3333-333333333333")],
                "lessons": [
                    {
                        "id": uuid.UUID("b4444444-4444-4444-4444-444444444441"),
                        "title": "Lists & Indexing Operations",
                        "order": 1,
                        "description": "Array-backed list mechanics, slicing, and mutation methods.",
                        "resources": [],
                    },
                    {
                        "id": uuid.UUID("b4444444-4444-4444-4444-444444444442"),
                        "title": "Dictionaries & Hash Maps",
                        "order": 2,
                        "description": "Key-value associations, hashing fundamentals, and dict comprehension.",
                        "resources": [],
                    },
                ],
            },
            {
                "id": uuid.UUID("a5555555-5555-5555-5555-555555555555"),
                "title": "Object-Oriented Programming & Classes",
                "description": "Encapsulation, instance state, dunder methods, class hierarchies, and polymorphism.",
                "order": 5,
                "mastery_threshold": Decimal("0.8500"),
                "prerequisites": [uuid.UUID("a4444444-4444-4444-4444-444444444444")],
                "lessons": [
                    {
                        "id": uuid.UUID("b5555555-5555-5555-5555-555555555551"),
                        "title": "Class Definitions, Self & Attributes",
                        "order": 1,
                        "description": "Instantiation, constructors (__init__), and instance attribute binding.",
                        "resources": [],
                    },
                    {
                        "id": uuid.UUID("b5555555-5555-5555-5555-555555555552"),
                        "title": "Inheritance & Method Overriding",
                        "order": 2,
                        "description": "Subclassing, super() calls, and polymorphic dispatch.",
                        "resources": [],
                    },
                ],
            },
        ],
    },
    {
        "id": uuid.UUID("55555555-5555-5555-5555-555555555555"),
        "title": "Data Structures and Algorithm Analysis",
        "description": "Linear and non-linear data structures, trees, graphs, sorting strategies, and Big-O computational complexity.",
        "status": "published",
        "topics": [
            {
                "id": uuid.UUID("c1111111-1111-1111-1111-111111111111"),
                "title": "Asymptotic Analysis & Big-O Notation",
                "description": "Upper bounds, worst-case scaling, time-space trade-offs, and recurrence relations.",
                "order": 1,
                "mastery_threshold": Decimal("0.8000"),
                "prerequisites": [],
                "lessons": [
                    {
                        "id": uuid.UUID("d1111111-1111-1111-1111-111111111111"),
                        "title": "Time and Space Complexity Analysis",
                        "order": 1,
                        "description": "Order of growth comparisons, constant, logarithmic, polynomial, and exponential functions.",
                        "resources": [],
                    }
                ],
            },
            {
                "id": uuid.UUID("c2222222-2222-2222-2222-222222222222"),
                "title": "Linked Lists, Stacks & Queues",
                "description": "Node pointers, dynamic memory allocation, LIFO stacks, FIFO queues, and deque structures.",
                "order": 2,
                "mastery_threshold": Decimal("0.8000"),
                "prerequisites": [uuid.UUID("c1111111-1111-1111-1111-111111111111")],
                "lessons": [
                    {
                        "id": uuid.UUID("d2222222-2222-2222-2222-222222222221"),
                        "title": "Singly and Doubly Linked Lists",
                        "order": 1,
                        "description": "Pointer manipulation, insertion, deletion, and cycle detection.",
                        "resources": [],
                    }
                ],
            },
        ],
    },
    {
        "id": uuid.UUID("66666666-6666-6666-6666-666666666666"),
        "title": "Distributed Systems & Cloud Architecture",
        "description": "Consensus protocols, CAP theorem, replication topologies, microservice patterns, and failure resilience.",
        "status": "published",
        "topics": [
            {
                "id": uuid.UUID("e1111111-1111-1111-1111-111111111111"),
                "title": "Distributed Foundations & Network Models",
                "description": "Synchronous vs asynchronous networks, clock skew, and partition tolerance.",
                "order": 1,
                "mastery_threshold": Decimal("0.8500"),
                "prerequisites": [],
                "lessons": [
                    {
                        "id": uuid.UUID("f1111111-1111-1111-1111-111111111111"),
                        "title": "Network Partitions & Failure Modes",
                        "order": 1,
                        "description": "Crash-stop vs Byzantine faults, split-brain mitigation, and timeout heuristics.",
                        "resources": [],
                    }
                ],
            }
        ],
    },
]


def _seed_courses(session: Session, teacher_user: Optional[User]) -> None:
    """Seed canonical courses, topics, DAG prerequisites, and lessons."""
    for c_data in CANONICAL_COURSES:
        course = session.get(Course, c_data["id"])
        if not course:
            course = Course(
                id=c_data["id"],
                title=c_data["title"],
                description=c_data["description"],
                status=c_data["status"],
                creator_id=teacher_user.id if teacher_user else None,
            )
            session.add(course)
            session.flush()
            logger.info("Seeded canonical course: %s", c_data["title"])

        if teacher_user:
            assignment = session.scalars(
                select(CourseTeacher).where(
                    CourseTeacher.course_id == course.id,
                    CourseTeacher.teacher_id == teacher_user.id,
                )
            ).first()
            if not assignment:
                session.add(CourseTeacher(course_id=course.id, teacher_id=teacher_user.id))

        # Seed topics and lessons
        for t_data in c_data.get("topics", []):
            topic = session.get(Topic, t_data["id"])
            if not topic:
                topic = Topic(
                    id=t_data["id"],
                    course_id=course.id,
                    title=t_data["title"],
                    description=t_data.get("description"),
                    order=t_data.get("order", 1),
                    mastery_threshold=t_data.get("mastery_threshold", Decimal("0.7500")),
                )
                session.add(topic)
                session.flush()

            for l_data in t_data.get("lessons", []):
                lesson = session.get(Lesson, l_data["id"])
                if not lesson:
                    lesson = Lesson(
                        id=l_data["id"],
                        topic_id=topic.id,
                        title=l_data["title"],
                        order=l_data.get("order", 1),
                        description=l_data.get("description"),
                    )
                    session.add(lesson)
                    session.flush()

                for r_data in l_data.get("resources", []):
                    resource = session.get(LearningResource, r_data["id"])
                    if not resource:
                        resource = LearningResource(
                            id=r_data["id"],
                            lesson_id=lesson.id,
                            title=r_data["title"],
                            type=r_data["type"],
                            content_or_url=r_data["content_or_url"],
                        )
                        session.add(resource)

        # Seed topic prerequisites
        for t_data in c_data.get("topics", []):
            for prereq_id in t_data.get("prerequisites", []):
                edge = session.scalars(
                    select(TopicPrerequisite).where(
                        TopicPrerequisite.topic_id == t_data["id"],
                        TopicPrerequisite.prerequisite_topic_id == prereq_id,
                    )
                ).first()
                if not edge:
                    session.add(
                        TopicPrerequisite(
                            topic_id=t_data["id"],
                            prerequisite_topic_id=prereq_id,
                        )
                    )

    session.commit()


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

        # 2. Seed dev accounts for all three canonical roles
        seed_dev_accounts = os.getenv("DEV_SEED_ACCOUNTS", "true").lower() == "true"
        if seed_dev_accounts:
            dev_accounts = [
                {
                    "email": "student@learnova.edu",
                    "password": "student123",
                    "full_name": "Alex Rivera",
                    "role_name": "student",
                    "department": "Computer Science",
                    "bio": "Undergraduate student specializing in software systems and algorithms.",
                },
                {
                    "email": "teacher@learnova.edu",
                    "password": "teacher123",
                    "full_name": "Elena Rostova",
                    "role_name": "teacher",
                    "department": "Computer Science & Engineering",
                    "bio": "Lead instructor for Data Structures and Distributed Systems.",
                },
                {
                    "email": "admin@learnova.edu",
                    "password": "admin123",
                    "full_name": "Sarah Connor",
                    "role_name": "administrator",
                    "department": "Platform Governance",
                    "bio": "System administrator with platform governance and security audit oversight.",
                },
                {
                    "email": "haseeb@gmail.com",
                    "password": "student123",
                    "full_name": "haseeb",
                    "role_name": "student",
                    "department": "Computer Science",
                    "bio": "Student learner enrolled in adaptive curriculum.",
                },
            ]

            for acc in dev_accounts:
                role = session.scalars(
                    select(Role).where(Role.name == acc["role_name"])
                ).first()

                if role:
                    existing_user = session.scalars(
                        select(User).where(User.email == acc["email"])
                    ).first()

                    if not existing_user:
                        user = User(
                            id=uuid.uuid4(),
                            email=acc["email"],
                            hashed_password=_hash_seed_password(acc["password"]),
                            full_name=acc["full_name"],
                            role_id=role.id,
                            is_active=True,
                        )
                        session.add(user)
                        session.flush()

                        profile = UserProfile(
                            id=uuid.uuid4(),
                            user_id=user.id,
                            bio=acc["bio"],
                            department=acc["department"],
                            preferences={"theme": "system", "emailNotifications": True},
                        )
                        session.add(profile)
                        session.commit()
                        logger.info("Seeded dev %s account: %s", acc["role_name"], acc["email"])
                    else:
                        logger.info("Dev account %s already exists; skipping.", acc["email"])

        # 3. Seed canonical published courses, topics, lessons, and DAG prerequisites
        teacher_user = session.scalars(
            select(User).where(User.email == "teacher@learnova.edu")
        ).first()
        _seed_courses(session, teacher_user)
        logger.info("Canonical courses, topics, and syllabus DAG seeded successfully.")

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
