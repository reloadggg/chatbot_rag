from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, Optional


@dataclass
class GuestSession:
    session_id: str
    user_type: str
    api_config: Dict[str, Any]
    created_at: datetime
    expires_at: datetime


class SessionStore:
    """Simple SQLite-backed store for guest sessions with TTL handling."""

    def __init__(self, db_path: Optional[Path] = None):
        base_dir = Path(__file__).resolve().parent
        data_dir = base_dir / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = db_path or (data_dir / "sessions.db")
        self._init_db()

    @contextmanager
    def _connect(self):
        conn = sqlite3.connect(self.db_path)
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS guest_sessions (
                    session_id TEXT PRIMARY KEY,
                    user_type TEXT NOT NULL,
                    api_config TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL
                )
                """
            )

    def save_guest_session(
        self,
        session_id: str,
        api_config: Dict[str, Any],
        expires_at: datetime,
        user_type: str = "guest",
    ) -> None:
        now = datetime.utcnow().isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO guest_sessions(session_id, user_type, api_config, created_at, expires_at)
                VALUES(?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    user_type=excluded.user_type,
                    api_config=excluded.api_config,
                    expires_at=excluded.expires_at
                """,
                (
                    session_id,
                    user_type,
                    json.dumps(api_config or {}),
                    now,
                    expires_at.isoformat(),
                ),
            )

    def load_guest_session(self, session_id: str) -> Optional[GuestSession]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT session_id, user_type, api_config, created_at, expires_at FROM guest_sessions WHERE session_id = ?",
                (session_id,),
            ).fetchone()

        if not row:
            return None

        session = GuestSession(
            session_id=row[0],
            user_type=row[1],
            api_config=json.loads(row[2] or "{}"),
            created_at=datetime.fromisoformat(row[3]),
            expires_at=datetime.fromisoformat(row[4]),
        )

        if datetime.utcnow() >= session.expires_at:
            self.delete_guest_session(session_id)
            return None

        return session

    def delete_guest_session(self, session_id: str) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM guest_sessions WHERE session_id = ?", (session_id,))

    def cleanup_expired(self) -> int:
        """Remove expired sessions; return count removed."""
        now = datetime.utcnow().isoformat()
        with self._connect() as conn:
            cursor = conn.execute(
                "DELETE FROM guest_sessions WHERE expires_at <= ?",
                (now,),
            )
            return cursor.rowcount

    def list_active_sessions(self) -> Iterable[GuestSession]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT session_id, user_type, api_config, created_at, expires_at FROM guest_sessions"
            ).fetchall()

        sessions = []
        for row in rows:
            session = GuestSession(
                session_id=row[0],
                user_type=row[1],
                api_config=json.loads(row[2] or "{}"),
                created_at=datetime.fromisoformat(row[3]),
                expires_at=datetime.fromisoformat(row[4]),
            )
            if datetime.utcnow() < session.expires_at:
                sessions.append(session)
        return sessions


session_store = SessionStore()
