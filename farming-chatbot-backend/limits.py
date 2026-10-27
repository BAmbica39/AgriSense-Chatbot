"""Per-user limits on /ask so double-clicks and floods don't turn into extra Gemini calls.

State is kept in memory, which is enough for a single backend process.
"""
import threading
import time
from collections import defaultdict, deque
from contextlib import contextmanager

from fastapi import HTTPException

import config

_lock = threading.Lock()
_in_flight = set()
_recent = defaultdict(deque)  # username -> timestamps of requests in the last minute


@contextmanager
def chat_slot(username):
    """Allow one question at a time per user, and at most CHAT_REQUESTS_PER_MINUTE per minute."""
    now = time.monotonic()
    with _lock:
        if username in _in_flight:
            raise HTTPException(status_code=429, detail="Please wait for the answer to your previous question.")
        timestamps = _recent[username]
        while timestamps and now - timestamps[0] > 60:
            timestamps.popleft()
        if len(timestamps) >= config.CHAT_REQUESTS_PER_MINUTE:
            raise HTTPException(status_code=429, detail="You're asking questions very quickly. Please wait a minute and try again.")
        timestamps.append(now)
        _in_flight.add(username)
    try:
        yield
    finally:
        with _lock:
            _in_flight.discard(username)


def reset():
    """Clear all limits (used by tests)."""
    with _lock:
        _in_flight.clear()
        _recent.clear()
