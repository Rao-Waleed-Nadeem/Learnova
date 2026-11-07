"""Unit and route tests for health and readiness endpoints."""

from unittest.mock import patch
from fastapi.testclient import TestClient


def test_root_health_backward_compatibility(client: TestClient):
    """Verify that root /health returns exact original response."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "learnova-api"}


def test_v1_liveness(client: TestClient):
    """Verify /api/v1/health/liveness endpoint."""
    response = client.get("/api/v1/health/liveness")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "Learnova API"
    assert "version" in data


def test_readiness_healthy_mock(client: TestClient):
    """Verify readiness endpoints when database connection succeeds."""
    with patch("app.main.check_db_connection", return_value=(True, None)), \
         patch("app.api.v1.endpoints.health.check_db_connection", return_value=(True, None)):
        root_res = client.get("/ready")
        assert root_res.status_code == 200
        assert root_res.json() == {
            "status": "ready",
            "database": "connected",
            "service": "learnova-api",
        }

        v1_res = client.get("/api/v1/health/readiness")
        assert v1_res.status_code == 200
        assert v1_res.json()["status"] == "ready"
        assert v1_res.json()["database"] == "connected"


def test_readiness_unhealthy_mock(client: TestClient):
    """Verify readiness endpoints return 503 when database is unavailable."""
    with patch("app.main.check_db_connection", return_value=(False, "Connection refused")), \
         patch("app.api.v1.endpoints.health.check_db_connection", return_value=(False, "Connection refused")):
        root_res = client.get("/ready")
        assert root_res.status_code == 503
        assert root_res.json() == {
            "status": "not_ready",
            "database": "disconnected",
            "service": "learnova-api",
        }

        v1_res = client.get("/api/v1/health/readiness")
        assert v1_res.status_code == 503
        assert v1_res.json()["status"] == "not_ready"
        assert v1_res.json()["database"] == "disconnected"
