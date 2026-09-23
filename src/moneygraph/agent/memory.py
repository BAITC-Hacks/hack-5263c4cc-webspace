"""Local bounded conversation context, never a source of financial facts.

Tokens are random capabilities for this loopback application, not multi-user identity.
Only token hashes are stored. Reads and writes bind dataset, rules and selected scope.
SQLite is optional; the default database exists only in this process.
"""
from __future__ import annotations

from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import secrets
import sqlite3
import threading
import time
from typing import Callable

from .contracts import MAX_HISTORY_CHARACTERS, MAX_HISTORY_TURNS


class MemoryUnavailable(Exception):
    """Sanitized session failure; never carries transcript or capability."""
    def __init__(self, status: int, detail: str):
        self.status, self.detail = status, detail
        super().__init__(detail)


def evidence_version(engine) -> str | None:
    return getattr(engine, "analysis_id", None)


def scope_key(engine, gid: int, gids: list[int] | None) -> str:
    version = evidence_version(engine)
    if version is None:
        raise ValueError("Session memory requires versioned analysis.")
    return json.dumps([version, gid, sorted(gids or [gid])], separators=(",", ":"))


class ConversationMemory:
    def __init__(self, path: str | None = None, *, ttl: int = 86400,
                 capacity: int = 128, clock: Callable[[], float] = time.time):
        if ttl <= 0 or capacity <= 0:
            raise ValueError("Memory bounds must be positive.")
        self.ttl, self.capacity, self.clock = ttl, capacity, clock
        self.persistence = "sqlite" if path else "process"
        self.lock = threading.RLock()
        if path:
            file = Path(path).expanduser().absolute()
            file.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            # Never follow a database symlink or silently create a world-readable file.
            if file.is_symlink() or (file.exists() and getattr(file.lstat(), "st_file_attributes", 0) & 0x400):
                raise OSError("Conversation storage must be a regular file")
            descriptor = os.open(file, os.O_CREAT | os.O_RDWR | getattr(os, "O_NOFOLLOW", 0), 0o600)
            try:
                if os.name == "posix":
                    os.fchmod(descriptor, 0o600)
            finally:
                os.close(descriptor)
            path = str(file)
        self.db = sqlite3.connect(path or ":memory:", check_same_thread=False, timeout=2)
        self.db.execute("PRAGMA secure_delete=ON")
        self.db.execute("""CREATE TABLE IF NOT EXISTS conversations (
            token_hash TEXT PRIMARY KEY, scope TEXT NOT NULL, history TEXT NOT NULL,
            expires REAL NOT NULL, revision INTEGER NOT NULL, lease REAL NOT NULL)""")
        with self.db:
            self.db.execute("DELETE FROM conversations WHERE expires <= ?", (self.clock(),))

    @contextmanager
    def transaction(self):
        with self.lock:
            try:
                self.db.execute("BEGIN IMMEDIATE")
                self.db.execute("DELETE FROM conversations WHERE expires <= ?", (self.clock(),))
                yield
                self.db.commit()
            except MemoryUnavailable:
                # Persist expiry pruning even when the requested session has expired.
                self.db.commit()
                raise
            except Exception:
                self.db.rollback()
                raise

    @staticmethod
    def digest(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    def begin(self, scope: str, token: str | None = None) -> tuple[str, int, list[dict]]:
        with self.transaction():
            now = self.clock()
            if token is None:
                if self.db.execute("SELECT count(*) FROM conversations").fetchone()[0] >= self.capacity:
                    raise MemoryUnavailable(429, "Conversation capacity reached. Delete an old conversation.")
                token = secrets.token_hex(16)
                self.db.execute("INSERT INTO conversations VALUES (?, ?, ?, ?, ?, ?)",
                                (self.digest(token), scope, "[]", now + self.ttl, 1, now + 90))
                return token, 1, []
            row = self.db.execute("SELECT scope, history, revision, lease FROM conversations WHERE token_hash = ?",
                                  (self.digest(token),)).fetchone()
            if row is None:
                raise MemoryUnavailable(404, "Conversation expired or was forgotten. Start a new conversation.")
            if row[0] != scope:
                raise MemoryUnavailable(409, "Conversation evidence scope changed. Start a new conversation.")
            if row[3] > now:
                raise MemoryUnavailable(409, "This conversation already has a running question.")
            revision = row[2] + 1
            self.db.execute("UPDATE conversations SET revision = ?, lease = ? WHERE token_hash = ?",
                            (revision, now + 90, self.digest(token)))
            return token, revision, json.loads(row[1])

    def finish(self, token: str, revision: int, question: str, answer: str,
               *, retain: bool = True) -> dict | None:
        with self.transaction():
            row = self.db.execute("SELECT history, expires FROM conversations WHERE token_hash = ? AND revision = ?",
                                  (self.digest(token), revision)).fetchone()
            # A delete, expiration or newer lease must never be undone by a late reply.
            if row is None:
                return None
            history = json.loads(row[0])
            if retain:
                history += [{"role": "user", "content": question[:1200]},
                            {"role": "assistant", "content": answer[:5000]}]
                history = history[-MAX_HISTORY_TURNS:]
                while sum(len(item["content"]) for item in history) > MAX_HISTORY_CHARACTERS:
                    history = history[2:]
            self.db.execute("UPDATE conversations SET history = ?, lease = 0 WHERE token_hash = ? AND revision = ?",
                            (json.dumps(history), self.digest(token), revision))
            return {"session_id": token, "turns": len(history),
                    "expires_in_seconds": max(0, int(row[1] - self.clock())),
                    "persistence": self.persistence}

    def release(self, token: str, revision: int):
        with self.transaction():
            self.db.execute("UPDATE conversations SET lease = 0 WHERE token_hash = ? AND revision = ?",
                            (self.digest(token), revision))

    def forget(self, token: str):
        with self.transaction():
            self.db.execute("DELETE FROM conversations WHERE token_hash = ?", (self.digest(token),))

    def close(self):
        with self.lock:
            self.db.close()
