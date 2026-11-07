"""Integration and unit tests for database connection and session management."""

from unittest.mock import MagicMock, patch
from sqlalchemy.exc import OperationalError

from app.db.session import check_db_connection, get_db


def test_check_db_connection_success():
    """Verify check_db_connection returns True on successful SELECT 1."""
    mock_conn = MagicMock()
    with patch("app.db.session.engine.connect") as mock_connect:
        mock_connect.return_value.__enter__.return_value = mock_conn
        success, error = check_db_connection()
        assert success is True
        assert error is None
        mock_conn.execute.assert_called_once()


def test_check_db_connection_failure():
    """Verify check_db_connection catches error and returns False with message."""
    with patch("app.db.session.engine.connect", side_effect=OperationalError("connection failed", None, None)):
        success, error = check_db_connection()
        assert success is False
        assert "connection failed" in error


def test_get_db_session_lifecycle():
    """Verify get_db dependency yields session and closes it cleanly."""
    mock_session = MagicMock()
    with patch("app.db.session.SessionLocal", return_value=mock_session):
        gen = get_db()
        session = next(gen)
        assert session == mock_session
        try:
            next(gen)
        except StopIteration:
            pass
        mock_session.close.assert_called_once()
