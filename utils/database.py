import sqlite3
from datetime import datetime
from typing import Optional


class NoteDB:
    def __init__(self, db_path: str = "notes.db"):
        self.db_path = db_path
        self._init_db()

    def _get_conn(self):
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        conn = self._get_conn()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                tags TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        conn.commit()
        conn.close()

    def add_note(self, title: str, content: str, tags: str = "") -> dict:
        now = datetime.now().isoformat()
        conn = self._get_conn()
        cursor = conn.execute(
            "INSERT INTO notes (title, content, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (title, content, tags, now, now)
        )
        note_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return {"id": note_id, "title": title, "content": content, "tags": tags, "created_at": now}

    def search_notes(self, keyword: str) -> list:
        conn = self._get_conn()
        rows = conn.execute(
            "SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? OR tags LIKE ? ORDER BY created_at DESC",
            (f"%{keyword}%", f"%{keyword}%", f"%{keyword}%")
        ).fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def get_all_notes(self, limit: int = 20) -> list:
        conn = self._get_conn()
        rows = conn.execute(
            "SELECT * FROM notes ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def get_note_by_id(self, note_id: int) -> Optional[dict]:
        conn = self._get_conn()
        row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
        conn.close()
        return dict(row) if row else None

    def update_note(self, note_id: int, title: str = None, content: str = None, tags: str = None) -> bool:
        note = self.get_note_by_id(note_id)
        if not note:
            return False
        now = datetime.now().isoformat()
        conn = self._get_conn()
        conn.execute(
            "UPDATE notes SET title=?, content=?, tags=?, updated_at=? WHERE id=?",
            (
                title or note["title"],
                content or note["content"],
                tags if tags is not None else note["tags"],
                now,
                note_id
            )
        )
        conn.commit()
        conn.close()
        return True

    def delete_note(self, note_id: int) -> bool:
        conn = self._get_conn()
        cursor = conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        conn.commit()
        deleted = cursor.rowcount > 0
        conn.close()
        return deleted
