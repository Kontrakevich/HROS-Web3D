from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

EntityStatus = Literal["draft", "observed", "hypothesis", "confirmed", "disputed", "finalized", "archived"]
Visibility = Literal["private", "shared_with_partner", "shared", "group"]
RecordKind = Literal[
    "evidence", "fact", "perspective", "action", "person_facet", "relationship_state",
    "observation", "hypothesis", "verification", "pattern", "principle",
    "original_memory", "semantic_memory", "living_memory",
    "interview_session", "interview_question", "interview_answer",
    "book_chapter", "narrative_fragment", "consent_policy",
]


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


class PersonUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=180)
    role: str | None = Field(default=None, max_length=180)
    type: str | None = Field(default=None, max_length=40)
    strength: int | None = Field(default=None, ge=0, le=100)
    summary: str | None = None
    position: list[float] | None = None
    isSelf: bool | None = None
    status: EntityStatus | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    source: dict[str, Any] | None = None


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

    @model_validator(mode="after")
    def distinct_nodes(self):
        if self.sourceId == self.targetId:
            raise ValueError("Нужны разные узлы связи")
        return self


class RelationshipUpdate(BaseModel):
    sourceId: str | None = None
    targetId: str | None = None
    type: str | None = None
    label: str | None = None
    strength: int | None = Field(default=None, ge=0, le=100)
    meaning: str | None = None
    status: EntityStatus | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    source: dict[str, Any] | None = None


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


class AttachmentMeta(BaseModel):
    name: str = Field(min_length=1, max_length=240)
    kind: str = Field(default="link", max_length=40)
    url: str | None = Field(default=None, max_length=2000)
    mimeType: str | None = Field(default=None, max_length=180)
    size: int | None = Field(default=None, ge=0)
    lastModified: int | None = Field(default=None, ge=0)


class MomentDetails(BaseModel):
    meaning: str = ""
    place: str = ""
    tags: list[str] = Field(default_factory=list)
    attachments: list[AttachmentMeta] = Field(default_factory=list)
    finalizedAt: str | None = None

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, value: list[str]) -> list[str]:
        return list(dict.fromkeys(item.strip() for item in value if item.strip()))


class RelationshipEffect(BaseModel):
    closeness: float = Field(default=0, ge=-1, le=1)
    trust: float = Field(default=0, ge=-1, le=1)
    tension: float = Field(default=0, ge=-1, le=1)


class MomentCreate(EntityBase):
    title: str = Field(min_length=1, max_length=240)
    date: str
    period: str = ""
    description: str = ""
    participantIds: list[str] = Field(default_factory=list)
    emotions: list[str] | str = Field(default_factory=list)
    significance: int = Field(default=70, ge=0, le=100)
    relationshipEffect: RelationshipEffect = Field(default_factory=RelationshipEffect)
    details: MomentDetails = Field(default_factory=MomentDetails)

    @field_validator("emotions")
    @classmethod
    def normalize_emotions(cls, value: list[str] | str) -> list[str]:
        items = value.split(",") if isinstance(value, str) else value
        return list(dict.fromkeys(item.strip() for item in items if item.strip()))


class MomentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=240)
    date: str | None = None
    period: str | None = None
    description: str | None = None
    participantIds: list[str] | None = None
    emotions: list[str] | str | None = None
    significance: int | None = Field(default=None, ge=0, le=100)
    relationshipEffect: RelationshipEffect | None = None
    details: MomentDetails | None = None
    status: EntityStatus | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    source: dict[str, Any] | None = None

    @field_validator("emotions")
    @classmethod
    def normalize_emotions(cls, value: list[str] | str | None) -> list[str] | None:
        if value is None:
            return None
        items = value.split(",") if isinstance(value, str) else value
        return list(dict.fromkeys(item.strip() for item in items if item.strip()))


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
    details: dict[str, Any]
    version: int
    createdAt: datetime
    updatedAt: datetime


class DomainRecordCreate(EntityBase):
    kind: RecordKind
    statement: str = Field(min_length=1)
    subjectIds: list[str] = Field(default_factory=list)
    relationshipIds: list[str] = Field(default_factory=list)
    momentIds: list[str] = Field(default_factory=list)
    perspectiveOwnerId: str | None = None
    visibility: Visibility = "private"
    evidenceIds: list[str] = Field(default_factory=list)
    supportsIds: list[str] = Field(default_factory=list)
    contradictsIds: list[str] = Field(default_factory=list)
    data: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def perspective_has_owner(self):
        if self.kind == "perspective" and not self.perspectiveOwnerId:
            raise ValueError("Для перспективы нужен владелец")
        return self


class DomainRecordUpdate(BaseModel):
    kind: RecordKind | None = None
    statement: str | None = Field(default=None, min_length=1)
    subjectIds: list[str] | None = None
    relationshipIds: list[str] | None = None
    momentIds: list[str] | None = None
    perspectiveOwnerId: str | None = None
    visibility: Visibility | None = None
    evidenceIds: list[str] | None = None
    supportsIds: list[str] | None = None
    contradictsIds: list[str] | None = None
    data: dict[str, Any] | None = None
    status: EntityStatus | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    source: dict[str, Any] | None = None


class DomainRecordRead(EntityBase):
    id: str
    kind: RecordKind
    statement: str
    subjectIds: list[str]
    relationshipIds: list[str]
    momentIds: list[str]
    perspectiveOwnerId: str | None
    visibility: Visibility
    evidenceIds: list[str]
    supportsIds: list[str]
    contradictsIds: list[str]
    data: dict[str, Any]
    version: int
    createdAt: datetime
    updatedAt: datetime


class RevisionRead(BaseModel):
    id: str
    entityType: str
    entityId: str
    action: str
    version: int
    snapshot: dict[str, Any]
    createdAt: datetime


class SnapshotRead(BaseModel):
    meta: dict[str, Any]
    people: list[PersonRead]
    relationships: list[RelationshipRead]
    moments: list[MomentRead]
    records: list[DomainRecordRead] = Field(default_factory=list)
    evidence: list[DomainRecordRead] = Field(default_factory=list)
    facts: list[DomainRecordRead] = Field(default_factory=list)
    perspectives: list[DomainRecordRead] = Field(default_factory=list)
    actions: list[DomainRecordRead] = Field(default_factory=list)
    personFacets: list[DomainRecordRead] = Field(default_factory=list)
    relationshipStates: list[DomainRecordRead] = Field(default_factory=list)
    observations: list[DomainRecordRead] = Field(default_factory=list)
    hypotheses: list[DomainRecordRead] = Field(default_factory=list)
    verifications: list[DomainRecordRead] = Field(default_factory=list)
    patterns: list[DomainRecordRead] = Field(default_factory=list)
    principles: list[DomainRecordRead] = Field(default_factory=list)
    originalMemory: list[DomainRecordRead] = Field(default_factory=list)
    semanticMemory: list[DomainRecordRead] = Field(default_factory=list)
    livingMemory: list[DomainRecordRead] = Field(default_factory=list)
    interviewSessions: list[DomainRecordRead] = Field(default_factory=list)
    interviewQuestions: list[DomainRecordRead] = Field(default_factory=list)
    interviewAnswers: list[DomainRecordRead] = Field(default_factory=list)
    bookChapters: list[DomainRecordRead] = Field(default_factory=list)
    narrativeFragments: list[DomainRecordRead] = Field(default_factory=list)
    consentPolicies: list[DomainRecordRead] = Field(default_factory=list)
