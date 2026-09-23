"""Stable application entry points for CLI, ASGI and tests."""
from .app import make_app
from .dependencies import context


def get_engine(request):
    """A request is required: no process-global dataset fallback."""
    return context(request).analysis


create_app = make_app
app = make_app()

__all__ = ["app", "create_app", "make_app", "get_engine"]
