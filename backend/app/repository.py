from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from . import models, schemas


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def person_to_dict(item: models.Person) -> dict:
    return {
        "id": item.id,
        "name": item.name,
        "role": item.role,
        "type": item.type,
        "strength": item.strength,
        "summary": item.summary,
        "position": item.position or [],
        "isSelf": item.is_self,
        "status": item.status,
        "confidence": item.confidence,
        "version": item.version,
        "createdAt": item.created_at,
        "updatedAt": item.updated_at,
        "source": item.source or {},
    }


def relationship_to_dict(item: models.Relationship) -> dict:
    return {
        "id": item.id,
        "sourceId": item.source_id,
        "targetId": item.target_id,
        "type": item.type,
        "label": item.label,
        "strength": item.strength,
        "meaning": item.meaning,
        "status": item.status,
        "confidence": item.confidence,
        "version": item.version,
        "createdAt": item.created_at,
        "updatedAt": item.updated_at,
        "source": item.source or {},
    }


def moment_to_dict(item: models.Moment) -> dict:
    return {
        "id": item.id,
        "title": item.title,
        "date": item.date,
        "period": item.period,
        "description": item.description,
        "participantIds": item.participant_ids or [],
        "emotions": item.emotions or [],
        "significance": item.significance,
        "relationshipEffect": item.relationship_effect or {},
        "status": item.status,
        "confidence": item.confidence,
        "version": item.version,
        "createdAt": item.created_at,
        "updatedAt": item.updated_at,
        "source": item.source or {},
    }


class HrosRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_people(self) -> list[dict]:
        items = self.db.scalars(select(models.Person).order_by(models.Person.is_self.desc(), models.Person.created_at)).all()
        return [person_to_dict(item) for item in items]

    def list_relationships(self) -> list[dict]:
        items = self.db.scalars(select(models.Relationship).order_by(models.Relationship.created_at)).all()
        return [relationship_to_dict(item) for item in items]

    def list_moments(self) -> list[dict]:
        items = self.db.scalars(select(models.Moment).order_by(models.Moment.date.desc())).all()
        return [moment_to_dict(item) for item in items]

    def snapshot(self) -> dict:
        return {
            "meta": {
                "product": "HROS",
                "version": "0.2.0",
                "schemaVersion": "0.2.0",
                "updatedAt": iso_now(),
                "mode": "api",
            },
            "people": self.list_people(),
            "relationships": self.list_relationships(),
            "moments": self.list_moments(),
            "observations": [],
            "hypotheses": [],
            "patterns": [],
        }

    def create_person(self, payload: schemas.PersonCreate) -> dict:
        data = payload.model_dump(exclude={"relationshipLabel", "relationshipType"})
        if not data["position"]:
            data["position"] = self._next_position(len(self.list_people()))
        person = models.Person(
            id=f"person-{uuid4()}",
            name=data["name"], role=data["role"], type=data["type"], strength=data["strength"],
            summary=data["summary"], position=data["position"], is_self=data["isSelf"],
            status=data["status"], confidence=data["confidence"], source=data["source"],
        )
        self.db.add(person)
        self.db.flush()
        if payload.relationshipLabel:
            owner = self.db.scalar(select(models.Person).where(models.Person.is_self.is_(True)))
            if owner:
                self.db.add(models.Relationship(
                    id=f"rel-{uuid4()}", source_id=owner.id, target_id=person.id,
                    type=payload.relationshipType or "personal", label=payload.relationshipLabel,
                    strength=payload.strength, meaning=payload.summary,
                    status="observed", confidence=1.0,
                    source={"kind": "user", "label": "HROS API"},
                ))
        self.db.commit()
        self.db.refresh(person)
        return person_to_dict(person)

    def create_relationship(self, payload: schemas.RelationshipCreate) -> dict:
        ids = set(self.db.scalars(select(models.Person.id)).all())
        if payload.sourceId not in ids or payload.targetId not in ids:
            raise ValueError("Один из узлов связи не существует")
        item = models.Relationship(
            id=f"rel-{uuid4()}", source_id=payload.sourceId, target_id=payload.targetId,
            type=payload.type, label=payload.label.strip() or "Связь", strength=payload.strength,
            meaning=payload.meaning, status=payload.status, confidence=payload.confidence,
            source=payload.source,
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return relationship_to_dict(item)

    def create_moment(self, payload: schemas.MomentCreate) -> dict:
        ids = set(self.db.scalars(select(models.Person.id)).all())
        missing = [item for item in payload.participantIds if item not in ids]
        if missing:
            raise ValueError(f"Неизвестные участники: {', '.join(missing)}")
        item = models.Moment(
            id=f"moment-{uuid4()}", title=payload.title.strip(), date=payload.date,
            period=payload.period, description=payload.description, participant_ids=payload.participantIds,
            emotions=payload.emotions, significance=payload.significance,
            relationship_effect=payload.relationshipEffect, status=payload.status,
            confidence=payload.confidence, source=payload.source,
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return moment_to_dict(item)

    def clear(self) -> None:
        self.db.execute(delete(models.Moment))
        self.db.execute(delete(models.Relationship))
        self.db.execute(delete(models.Person))
        self.db.commit()

    @staticmethod
    def _next_position(index: int) -> list[float]:
        import math
        if index == 0:
            return [0, 0, 0]
        angle = index * 2.399963229728653
        radius = 4.2 + (index % 3) * 0.7
        return [round(math.cos(angle) * radius, 3), round(math.sin(angle) * radius, 3), round(((index % 4) - 1.5) * 0.35, 3)]
