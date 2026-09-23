"""Runtime configuration, loaded explicitly at the composition boundary."""
from dataclasses import dataclass, field
import os


@dataclass(frozen=True)
class Settings:
    data_dir: str | None = None
    ai_enabled: bool = False
    allow_external_ai: bool = False
    api_key: str | None = field(default=None, repr=False)
    memory_path: str | None = None
    model: str = "gpt-6-sol"

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            memory_path=os.getenv("MONEYGRAPH_MEMORY_PATH") or None,
            data_dir=os.getenv("MONEYGRAPH_DATA_DIR") or None,
            ai_enabled=os.getenv("MONEYGRAPH_AI_ENABLED", "false").lower() == "true",
            allow_external_ai=os.getenv("MONEYGRAPH_ALLOW_EXTERNAL_AI", "false").lower() == "true",
            api_key=os.getenv("OPENAI_API_KEY", "").strip() or None,
            model=os.getenv("OPENAI_MODEL", "gpt-6-sol"),
        )

    @property
    def provider_allowed(self) -> bool:
        return self.ai_enabled and self.allow_external_ai and bool(self.api_key and self.api_key.strip())
