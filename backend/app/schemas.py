from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

EntityStatus = Literal["draft", "observed", "hypothesis", "confirmed", "finalized", "archived"]


class EntityBase(BaseModel):
    status: EntityStatus = "observed"
    confidence: float = Field(default=1.0, ge=0, le=1)
    source: dict[str, Any] = Field(default_factory=lambda: {"kind": "user", "label": "HROS API"})


class PersonCreate(EntityBase):
    name: str = Field(min_length=1, max_length=180)
    role: str = Field(default="Человек", max_length=180)
    type: str = Field(default="other", max_length=40)
    strength: int = Field(default=70, ge=0, le=100)
    summary: str = ""
    position: list[float] = Field(default_factory=list)
    isSelf: bool = False
    relationshipLabel: str | None = None
    relationshipType: str | None = None

    @field_validator("name", "role")
    @classmethod
    def trim_text(cls, value: str) -> str:
        return value.strip()


class PersonRead(EntityBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    role: str
    type: str
    strength: int
    summary: str
    position: list[float]
    isSelf: bool
    version: int
    createdAt: datetime
    updatedAt: datetime


class RelationshipCreate(EntityBase):
    sourceId: str
    targetId: str
    type: str = "personal"
    label: str = "Связь"
    strength: int = Field(default=70, ge=0, le=100)
    meaning: str = ""


class RelationshipRead(EntityBase):
    id: str
    sourceId: str
    targetId: str
    type: str
    label: str
    strength: int
    meaning: str
    version: int
    createdAt: datetime
    updatedAt: datetime


class MomentCreate(EntityBase):
    title: str = Field(min_length=1, max_length=240)
    date: str
    period: str = ""
    description: str = ""
    participantIds: list[str] = Field(default_factory=list)
    emotions: list[str] | str = Field(default_factory=list)
    significance: int = Field(default=70, ge=0, le=100)
    relationshipEffect: dict[str, float] = Field(default_factory=lambda: {"closeness": 0, "trust": 0, "tension": 0})

    @field_validator("emotions")
    @classmethod
    def normalize_emotions(cls, value: list[str] | str) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


class MomentRead(EntityBase):
    id: str
    title: str
    date: str
    period: str
    description: str
    participantIds: list[str]
    emotions: list[str]
    significance: int
    relationshipEffect: dict[str, float]
    version: int
    createdAt: datetime
    updatedAt: datetime


class SnapshotRead(BaseModel):
    meta: dict[str, Any]
    people: list[PersonRead]
    relationships: list[RelationshipRead]
    moments: list[MomentRead]
    observations: list[Any] = Field(default_factory=list)
    hypotheses: list[Any] = Field(default_factory=list)
    patterns: list[Any] = Field(default_factory=list)
