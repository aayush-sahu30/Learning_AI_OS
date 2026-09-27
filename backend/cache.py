"""
Lightweight in-memory TTL cache for the AI Learning OS backend.
Avoids redundant YouTube API calls for the same video ID.
"""

import time
import threading
from typing import Any, Optional

class TTLCache:
    """Thread-safe in-memory cache with time-to-live expiry."""

    def __init__(self, ttl_seconds: int = 3600, max_size: int = 200):
        self._store: dict[str, tuple[Any, float]] = {}
        self._ttl = ttl_seconds
        self._max_size = max_size
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expiry = entry
            if time.monotonic() > expiry:
                del self._store[key]
                return None
            return value

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            # Evict oldest entries if at capacity
            if len(self._store) >= self._max_size:
                oldest_key = min(self._store, key=lambda k: self._store[k][1])
                del self._store[oldest_key]
            self._store[key] = (value, time.monotonic() + self._ttl)

    def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    @property
    def size(self) -> int:
        with self._lock:
            return len(self._store)


# Singleton caches — imported by main.py and services
video_cache = TTLCache(ttl_seconds=3600, max_size=500)    # 1 hr for video metadata + transcript
notes_cache = TTLCache(ttl_seconds=7200, max_size=200)    # 2 hr for generated notes
