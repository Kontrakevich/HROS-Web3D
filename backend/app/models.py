from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class EntityMixin:
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    status: Mapped[str] = mapped_column(String(24), default="observed", index=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    source: Mapped[dict] = mapped_column(JSON, default=dict)


class Person(EntityMixin, Base):
    __tablename__ = "people"

    name: Mapped[str] = mapped_column(String(180), index=True)
    role: Mapped[str] = mapped_column(String(180), default="Человек")
    type: Mapped[str] = mapped_column(String(40), default="other", index=True)
    strength: Mapped[int] = mapped_column(Integer, default=70)
    summary: Mapped[str] = mapped_column(Text, default="")
    position: Mapped[list] = mapped_column(JSON, default=list)
    is_self: Mapped[bool] = mapped_column(Boolean, default=False, index=True)


class Relationship(EntityMixin, Base):
    __tablename__ = "relationships"

    source_id: Mapped[str] = mapped_column(String(80), index=True)
    target_id: Mapped[str] = mapped_column(String(80), index=True)
    type: Mapped[str] = mapped_column(String(40), default="personal")
    label: Mapped[str] = mapped_column(String(180), default="Связь")
    strength: Mapped[int] = mapped_column(Integer, default=70)
    meaning: Mapped[str] = mapped_column(Text, default="")


class Moment(EntityMixin, Base):
    __tablename__ = "moments"

    title: Mapped[str] = mapped_column(String(240), index=True)
    date: Mapped[str] = mapped_column(String(20), index=True)
    period: Mapped[str] = mapped_column(String(120), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    participant_ids: Mapped[list] = mapped_column(JSON, default=list)
    emotions: Mapped[list] = mapped_column(JSON, default=list)
    significance: Mapped[int] = mapped_column(Integer, default=70)
    relationship_effect: Mapped[dict] = mapped_column(JSON, default=dict)
    details: Mapped[dict] = mapped_column(JSON, default=dict)


class Revision(Base):
    __tablename__ = "revisions"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(40), index=True)
    entity_id: Mapped[str] = mapped_column(String(80), index=True)
    action: Mapped[str] = mapped_column(String(40), index=True)
    version: Mapped[int] = mapped_column(Integer)
    snapshot: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
