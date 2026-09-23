"""Typed, bounded request and answer contracts independent of HTTP and providers."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, StrictFloat, StrictInt, field_validator, model_validator

from .policy import MAX_HISTORY_TURNS, MAX_HISTORY_CHARACTERS


class ConversationTurn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["user", "assistant"]
    content: str = Field(strict=True, min_length=1, max_length=5000)

    @model_validator(mode="after")
    def bounded_content(self):
        if not self.content.strip():
            raise ValueError("History turns must contain text.")
        if self.role == "user" and len(self.content) > 1200:
            raise ValueError("User history turns must not exceed 1200 characters.")
        return self


class CopilotRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    gid: int = Field(ge=0, le=2**63 - 1, strict=True)
    question: str = Field(min_length=1, max_length=1200, strict=True)
    gids: list[int] | None = Field(default=None, min_length=1, max_length=5)
    history: list[ConversationTurn] = Field(default_factory=list, max_length=MAX_HISTORY_TURNS)
    remember: bool = Field(default=False, strict=True)
    session_id: str | None = Field(default=None, pattern=r"^[a-f0-9]{32}$")

    @field_validator("gids", mode="before")
    @classmethod
    def valid_cohort(cls, gids):
        if gids is not None and (not isinstance(gids, list) or any(type(gid) is not int or not 0 <= gid <= 2**63 - 1 for gid in gids) or len(set(gids)) != len(gids)):
            raise ValueError("Cohort IDs must be unique nonnegative integers.")
        return gids

    @model_validator(mode="after")
    def bounded_history(self):
        if not self.question.strip():
            raise ValueError("Question must contain text.")
        if self.session_id and (not self.remember or self.history):
            raise ValueError("A stored session requires remember=true and no client history.")
        if self.remember and self.history:
            raise ValueError("Stored sessions cannot import client history.")
        if sum(len(turn.content) for turn in self.history) > MAX_HISTORY_CHARACTERS:
            raise ValueError("Conversation history must not exceed 12000 characters.")
        return self

class SessionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    gid: int = Field(ge=0, le=2**63 - 1, strict=True)
    gids: list[int] | None = Field(default=None, min_length=1, max_length=5)

    @field_validator("gids", mode="before")
    @classmethod
    def valid_cohort(cls, gids):
        return CopilotRequest.valid_cohort(gids)


class NumericClaim(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    evidence_id: str = Field(min_length=1, max_length=160)
    path: list[str] = Field(min_length=1, max_length=12)
    value: StrictInt | StrictFloat


class ModelAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answer: str = Field(min_length=1, max_length=5000)
    citations: list[str] = Field(min_length=1, max_length=4)
    limitations: list[str] = Field(max_length=8)
    numeric_claims: list[NumericClaim] = Field(default_factory=list, max_length=24)

    @field_validator("answer")
    @classmethod
    def nonblank_answer(cls, value):
        if not value.strip():
            raise ValueError("Answer must contain text.")
        return value

    @field_validator("limitations", "citations")
    @classmethod
    def bounded_items(cls, values):
        if any(not value.strip() or len(value) > 500 for value in values):
            raise ValueError("Answer items must be nonempty and bounded.")
        return values
