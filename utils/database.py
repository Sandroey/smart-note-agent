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
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                pos_x REAL DEFAULT 0,
                pos_y REAL DEFAULT 0,
                width REAL DEFAULT 350,
                height REAL DEFAULT 150,
                fully_rendered INTEGER DEFAULT 1,
                created_at TEXT NOT NULL
            )
        """)
        # 兼容旧表：添加 fully_rendered 字段
        try:
            conn.execute("ALTER TABLE chat_messages ADD COLUMN fully_rendered INTEGER DEFAULT 1")
        except sqlite3.OperationalError:
            pass
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

    # ===== 聊天记录方法 =====

    def add_chat_message(self, content: str, pos_x: float = 0, pos_y: float = 0, width: float = 350, height: float = 150, fully_rendered: int = 0) -> dict:
        now = datetime.now().isoformat()
        conn = self._get_conn()
        cursor = conn.execute(
            "INSERT INTO chat_messages (content, pos_x, pos_y, width, height, fully_rendered, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (content, pos_x, pos_y, width, height, fully_rendered, now)
        )
        msg_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return {"id": msg_id, "content": content, "pos_x": pos_x, "pos_y": pos_y, "width": width, "height": height, "fully_rendered": fully_rendered, "created_at": now}

    def get_all_chat_messages(self, limit: int = 100) -> list:
        conn = self._get_conn()
        rows = conn.execute(
            "SELECT * FROM chat_messages ORDER BY created_at ASC LIMIT ?", (limit,)
        ).fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def delete_chat_message(self, msg_id: int) -> bool:
        conn = self._get_conn()
        cursor = conn.execute("DELETE FROM chat_messages WHERE id = ?", (msg_id,))
        conn.commit()
        deleted = cursor.rowcount > 0
        conn.close()
        return deleted

    def update_chat_message_position(self, msg_id: int, pos_x: float, pos_y: float, width: float, height: float) -> bool:
        conn = self._get_conn()
        cursor = conn.execute(
            "UPDATE chat_messages SET pos_x=?, pos_y=?, width=?, height=? WHERE id=?",
            (pos_x, pos_y, width, height, msg_id)
        )
        conn.commit()
        updated = cursor.rowcount > 0
        conn.close()
        return updated

    def update_fully_rendered(self, msg_id: int, fully_rendered: int = 1) -> bool:
        conn = self._get_conn()
        cursor = conn.execute(
            "UPDATE chat_messages SET fully_rendered=? WHERE id=?",
            (fully_rendered, msg_id)
        )
        conn.commit()
        updated = cursor.rowcount > 0
        conn.close()
        return updated