"""Provider I/O. Policy, account selection and evidence stay outside this adapter."""
from typing import Any

from openai import OpenAI

from ..settings import Settings


class ResponsesProvider:
    def __init__(self, settings: Settings, client: Any = None):
        self.owned = client is None
        self.client = client if client is not None else OpenAI(
            api_key=settings.api_key, timeout=20.0, max_retries=0, base_url="https://api.openai.com/v1",
        )

    def create(self, *, remaining: float, **request: Any):
        if remaining <= 0:
            raise TimeoutError("Investigation deadline exhausted")
        return self.client.responses.create(timeout=min(20.0, remaining), **request)

    def close(self) -> None:
        if self.owned:
            self.client.close()
