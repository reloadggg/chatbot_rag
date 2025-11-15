from __future__ import annotations

import sqlite3
import time
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional


@dataclass
class Conversation:
    session_id: str
    title: str
    user_type: str
    created_at: float
    updated_at: float


@dataclass
class ConversationMessage:
    session_id: str
    role: str
    content: str
    created_at: float


class ConversationStore:
    def __init__(self, db_path: Optional[Path] = None):
        base_dir = Path(__file__).resolve().parent
        data_dir = base_dir / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = db_path or (data_dir / "conversations.db")
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
                CREATE TABLE IF NOT EXISTS conversations (
                    session_id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    user_type TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS conversation_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    FOREIGN KEY(session_id) REFERENCES conversations(session_id) ON DELETE CASCADE
                )
                """
            )

    def ensure_conversation(self, session_id: str, user_type: str) -> None:
        now = time.time()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO conversations(session_id, title, user_type, created_at, updated_at)
                VALUES(?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET updated_at=excluded.updated_at
                """,
                (session_id, "新的对话", user_type, now, now),
            )

    def update_title(self, session_id: str, title: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE conversations SET title = ?, updated_at = ? WHERE session_id = ?",
                (title.strip() or "新的对话", time.time(), session_id),
            )

    def append_message(self, session_id: str, role: str, content: str, user_type: str) -> None:
        trimmed = (content or "").strip()
        if not trimmed:
            return

        self.ensure_conversation(session_id, user_type)
        now = time.time()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO conversation_messages(session_id, role, content, created_at)
                VALUES(?, ?, ?, ?)
                """,
                (session_id, role, trimmed, now),
            )
            conn.execute(
                "UPDATE conversations SET updated_at = ? WHERE session_id = ?",
                (now, session_id),
            )

        if role == "user":
            self._maybe_update_title(session_id, trimmed)

    def _maybe_update_title(self, session_id: str, content: str) -> None:
        preview = content.strip().splitlines()[0][:60]
        if not preview:
            return

        with self._connect() as conn:
            row = conn.execute(
                "SELECT title FROM conversations WHERE session_id = ?",
                (session_id,),
            ).fetchone()
            if not row:
                return
            current_title = row[0]
            if current_title == "新的对话" or current_title.strip() == "":
                conn.execute(
                    "UPDATE conversations SET title = ? WHERE session_id = ?",
                    (preview, session_id),
                )

    def list_conversations(self, user_type: Optional[str] = None, limit: int = 50) -> List[Conversation]:
        with self._connect() as conn:
            if user_type:
                rows = conn.execute(
                    "SELECT session_id, title, user_type, created_at, updated_at FROM conversations WHERE user_type = ? ORDER BY updated_at DESC LIMIT ?",
                    (user_type, limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT session_id, title, user_type, created_at, updated_at FROM conversations ORDER BY updated_at DESC LIMIT ?",
                    (limit,),
                ).fetchall()

        return [
            Conversation(
                session_id=row[0],
                title=row[1],
                user_type=row[2],
                created_at=row[3],
                updated_at=row[4],
            )
            for row in rows
        ]

    def get_conversation(self, session_id: str) -> Optional[Conversation]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT session_id, title, user_type, created_at, updated_at FROM conversations WHERE session_id = ?",
                (session_id,),
            ).fetchone()
        if not row:
            return None
        return Conversation(
            session_id=row[0],
            title=row[1],
            user_type=row[2],
            created_at=row[3],
            updated_at=row[4],
        )

    def get_messages(self, session_id: str) -> List[ConversationMessage]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT session_id, role, content, created_at FROM conversation_messages WHERE session_id = ? ORDER BY created_at ASC",
                (session_id,),
            ).fetchall()
        return [
            ConversationMessage(
                session_id=row[0],
                role=row[1],
                content=row[2],
                created_at=row[3],
            )
            for row in rows
        ]

    def delete_conversation(self, session_id: str) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM conversations WHERE session_id = ?", (session_id,))
            conn.execute("DELETE FROM conversation_messages WHERE session_id = ?", (session_id,))


conversation_store = ConversationStore()
