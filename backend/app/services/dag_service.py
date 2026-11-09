"""DAG validation and cycle detection service for topic prerequisite graphs (FR-CRS-04, SSD-07)."""

from typing import Dict, List, Optional, Set, Tuple
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.topic import Topic
from app.models.topic_prerequisite import TopicPrerequisite


class CycleDetectedException(HTTPException):
    """Exception raised when a circular dependency is detected in the topic prerequisite graph."""

    def __init__(self, cycle_path: List[UUID]):
        path_str = " -> ".join(str(node) for node in cycle_path)
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Circular dependency detected in topic prerequisite graph",
                "cycle_path": [str(node) for node in cycle_path],
                "cycle_formatted": path_str,
            },
        )


class DAGService:
    """Service providing authoritative cycle validation, topological sorting, and edge updates."""

    @staticmethod
    def get_course_topic_graph(db: Session, course_id: UUID) -> Tuple[Set[UUID], Dict[UUID, Set[UUID]]]:
        """Load all topic IDs and prerequisite adjacency list for a given course.

        Returns:
            topic_ids: set of all topic UUIDs belonging to the course.
            prereq_map: dict mapping topic_id -> set of prerequisite_topic_ids.
        """
        topic_rows = db.execute(select(Topic.id).where(Topic.course_id == course_id)).scalars().all()
        topic_ids = set(topic_rows)

        edge_rows = (
            db.execute(
                select(TopicPrerequisite.topic_id, TopicPrerequisite.prerequisite_topic_id)
                .join(Topic, Topic.id == TopicPrerequisite.topic_id)
                .where(Topic.course_id == course_id)
            )
            .fetchall()
        )

        prereq_map: Dict[UUID, Set[UUID]] = {t: set() for t in topic_ids}
        for t_id, p_id in edge_rows:
            if t_id in prereq_map:
                prereq_map[t_id].add(p_id)

        return topic_ids, prereq_map

    @classmethod
    def find_cycle(cls, adj: Dict[UUID, Set[UUID]]) -> Optional[List[UUID]]:
        """Detect any cycle in a directed graph using DFS with recursion stack tracking.

        In our prerequisite graph, an edge topic -> prereq means 'topic depends on prereq'.
        A cycle in dependencies exists if following prereq edges returns to a visited node.

        Returns:
            List of node UUIDs representing the cycle path (e.g. [A, B, C, A]), or None if acyclic.
        """
        # Node states: 0 = unvisited, 1 = visiting (on current DFS stack), 2 = visited
        visited: Dict[UUID, int] = {node: 0 for node in adj}
        parent_map: Dict[UUID, UUID] = {}

        def dfs(u: UUID, path: List[UUID]) -> Optional[List[UUID]]:
            visited[u] = 1
            path.append(u)

            for v in adj.get(u, set()):
                if visited.get(v, 0) == 1:
                    # Found a back-edge to an ancestor on the recursion stack!
                    cycle_start_idx = path.index(v)
                    return path[cycle_start_idx:] + [v]
                elif visited.get(v, 0) == 0:
                    parent_map[v] = u
                    result = dfs(v, path)
                    if result is not None:
                        return result

            path.pop()
            visited[u] = 2
            return None

        for node in list(adj.keys()):
            if visited[node] == 0:
                cycle = dfs(node, [])
                if cycle:
                    return cycle

        return None

    @classmethod
    def validate_and_update_prerequisites(
        cls,
        db: Session,
        topic: Topic,
        new_prerequisite_ids: List[UUID],
    ) -> List[UUID]:
        """Validate proposed prerequisite edges and atomically persist them.

        Enforces:
        1. No self-edge (topic cannot depend on itself).
        2. All proposed prerequisites belong to the same course.
        3. The resulting prerequisite graph contains no cycles.
        """
        course_id = topic.course_id

        # 1. Reject self-edge
        for p_id in new_prerequisite_ids:
            if p_id == topic.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Topic cannot depend on itself as a prerequisite: {topic.id}",
                )

        # 2. Verify all proposed prerequisites belong to the same course
        if new_prerequisite_ids:
            valid_topics = (
                db.execute(
                    select(Topic.id).where(
                        Topic.course_id == course_id,
                        Topic.id.in_(new_prerequisite_ids),
                    )
                )
                .scalars()
                .all()
            )
            valid_set = set(valid_topics)
            invalid_ids = [str(pid) for pid in new_prerequisite_ids if pid not in valid_set]
            if invalid_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Prerequisite topics do not belong to the same course: {invalid_ids}",
                )

        # 3. Build proposed graph and verify acyclicity
        topic_ids, adj = cls.get_course_topic_graph(db, course_id)
        # Update adj with the proposed changes
        adj[topic.id] = set(new_prerequisite_ids)

        cycle = cls.find_cycle(adj)
        if cycle:
            raise CycleDetectedException(cycle_path=cycle)

        # 4. Atomically apply changes in the database
        db.query(TopicPrerequisite).filter(TopicPrerequisite.topic_id == topic.id).delete()
        for p_id in set(new_prerequisite_ids):
            edge = TopicPrerequisite(topic_id=topic.id, prerequisite_topic_id=p_id)
            db.add(edge)

        db.commit()
        return list(set(new_prerequisite_ids))

    @classmethod
    def validate_course_graph_is_acyclic(cls, db: Session, course_id: UUID) -> None:
        """Validate that the course's prerequisite graph is acyclic for publication."""
        _, adj = cls.get_course_topic_graph(db, course_id)
        cycle = cls.find_cycle(adj)
        if cycle:
            raise CycleDetectedException(cycle_path=cycle)

    @classmethod
    def topological_sort(cls, db: Session, course_id: UUID) -> List[Topic]:
        """Perform topological sort of course topics respecting prerequisite ordering (Kahn's algorithm)."""
        topics = db.query(Topic).filter(Topic.course_id == course_id).order_by(Topic.order).all()
        topic_map = {t.id: t for t in topics}

        _, prereq_map = cls.get_course_topic_graph(db, course_id)

        # Build in-degree and dependents map
        # prereq_map[t_id] = set of prerequisites t_id depends on
        in_degree: Dict[UUID, int] = {t.id: len(prereq_map.get(t.id, set())) for t in topics}
        dependents: Dict[UUID, List[UUID]] = {t.id: [] for t in topics}
        for t_id, prereqs in prereq_map.items():
            for p_id in prereqs:
                if p_id in dependents:
                    dependents[p_id].append(t_id)

        # Queue topics with in_degree == 0, sorted by Topic.order
        queue: List[Topic] = sorted(
            [t for t in topics if in_degree[t.id] == 0],
            key=lambda x: x.order,
        )

        result: List[Topic] = []
        visited_ids: Set[UUID] = set()

        while queue:
            current = queue.pop(0)
            if current.id in visited_ids:
                continue
            visited_ids.add(current.id)
            result.append(current)

            for dep_id in dependents.get(current.id, []):
                in_degree[dep_id] -= 1
                if in_degree[dep_id] == 0 and dep_id not in visited_ids:
                    dep_topic = topic_map.get(dep_id)
                    if dep_topic:
                        queue.append(dep_topic)
                        queue.sort(key=lambda x: x.order)

        # Append any remaining topics not reached (fallback for isolated/unreachable nodes)
        for t in topics:
            if t.id not in visited_ids:
                result.append(t)
                visited_ids.add(t.id)

        return result
