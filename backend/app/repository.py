from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session
from fastapi.encoders import jsonable_encoder

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
        "relationshipEffect": item.relationship_effect or {"closeness": 0, "trust": 0, "tension": 0},
        "details": item.details or {},
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
        items = self.db.scalars(select(models.Moment).order_by(models.Moment.date.desc(), models.Moment.created_at.desc())).all()
        return [moment_to_dict(item) for item in items]

    def snapshot(self) -> dict:
        return {
            "meta": {
                "product": "HROS",
                "version": "0.4.0",
                "schemaVersion": "0.4.0",
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

    def _revision(self, entity_type: str, entity, action: str, snapshot: dict) -> None:
        self.db.add(models.Revision(
            id=f"rev-{uuid4()}",
            entity_type=entity_type,
            entity_id=entity.id,
            action=action,
            version=entity.version,
            snapshot=jsonable_encoder(snapshot),
        ))

    def _person_ids(self) -> set[str]:
        return set(self.db.scalars(select(models.Person.id)).all())

    def _validate_participants(self, participant_ids: list[str]) -> None:
        missing = [item for item in participant_ids if item not in self._person_ids()]
        if missing:
            raise ValueError(f"Неизвестные участники: {', '.join(missing)}")

    def create_person(self, payload: schemas.PersonCreate) -> dict:
        data = payload.model_dump(exclude={"relationshipLabel", "relationshipType"})
        data["position"] = data["position"] or self._next_position(len(self.list_people()))
        person = models.Person(
            id=f"person-{uuid4()}",
            name=data["name"],
            role=data["role"],
            type=data["type"],
            strength=data["strength"],
            summary=data["summary"],
            position=data["position"],
            is_self=data["isSelf"],
            status=data["status"],
            confidence=data["confidence"],
            source=data["source"],
        )
        self.db.add(person)
        self.db.flush()
        if payload.relationshipLabel:
            owner = self.db.scalar(select(models.Person).where(models.Person.is_self.is_(True)))
            if owner:
                self.db.add(models.Relationship(
                    id=f"rel-{uuid4()}",
                    source_id=owner.id,
                    target_id=person.id,
                    type=payload.relationshipType or "personal",
                    label=payload.relationshipLabel,
                    strength=payload.strength,
                    meaning=payload.summary,
                    status="observed",
                    confidence=1.0,
                    source={"kind": "user", "label": "HROS API"},
                ))
        self.db.commit()
        self.db.refresh(person)
        return person_to_dict(person)

    def update_person(self, entity_id: str, payload: schemas.PersonUpdate) -> dict:
        item = self.db.get(models.Person, entity_id)
        if not item:
            raise ValueError("Человек не найден")
        self._revision("person", item, "before_update", person_to_dict(item))
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(item, {"isSelf": "is_self"}.get(key, key), value)
        item.version += 1
        self.db.commit()
        self.db.refresh(item)
        return person_to_dict(item)

    def delete_person(self, entity_id: str) -> dict:
        item = self.db.get(models.Person, entity_id)
        if not item:
            raise ValueError("Человек не найден")
        if item.is_self:
            raise ValueError("Нельзя удалить центральный профиль")
        self._revision("person", item, "delete", person_to_dict(item))
        self.db.execute(delete(models.Relationship).where(or_(
            models.Relationship.source_id == entity_id,
            models.Relationship.target_id == entity_id,
        )))
        for moment in self.db.scalars(select(models.Moment)).all():
            moment.participant_ids = [person_id for person_id in (moment.participant_ids or []) if person_id != entity_id]
        self.db.delete(item)
        self.db.commit()
        return {"ok": True}

    def create_relationship(self, payload: schemas.RelationshipCreate) -> dict:
        ids = self._person_ids()
        if payload.sourceId not in ids or payload.targetId not in ids:
            raise ValueError("Один из узлов связи не существует")
        item = models.Relationship(
            id=f"rel-{uuid4()}",
            source_id=payload.sourceId,
            target_id=payload.targetId,
            type=payload.type,
            label=payload.label.strip() or "Связь",
            strength=payload.strength,
            meaning=payload.meaning,
            status=payload.status,
            confidence=payload.confidence,
            source=payload.source,
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return relationship_to_dict(item)

    def update_relationship(self, entity_id: str, payload: schemas.RelationshipUpdate) -> dict:
        item = self.db.get(models.Relationship, entity_id)
        if not item:
            raise ValueError("Связь не найдена")
        values = payload.model_dump(exclude_unset=True)
        source_id = values.get("sourceId", item.source_id)
        target_id = values.get("targetId", item.target_id)
        if source_id == target_id or source_id not in self._person_ids() or target_id not in self._person_ids():
            raise ValueError("Некорректные узлы связи")
        self._revision("relationship", item, "before_update", relationship_to_dict(item))
        mapping = {"sourceId": "source_id", "targetId": "target_id"}
        for key, value in values.items():
            setattr(item, mapping.get(key, key), value)
        item.version += 1
        self.db.commit()
        self.db.refresh(item)
        return relationship_to_dict(item)

    def delete_relationship(self, entity_id: str) -> dict:
        item = self.db.get(models.Relationship, entity_id)
        if not item:
            raise ValueError("Связь не найдена")
        self._revision("relationship", item, "delete", relationship_to_dict(item))
        self.db.delete(item)
        self.db.commit()
        return {"ok": True}

    def create_moment(self, payload: schemas.MomentCreate) -> dict:
        self._validate_participants(payload.participantIds)
        item = models.Moment(
            id=f"moment-{uuid4()}",
            title=payload.title.strip(),
            date=payload.date,
            period=payload.period,
            description=payload.description,
            participant_ids=payload.participantIds,
            emotions=payload.emotions,
            significance=payload.significance,
            relationship_effect=payload.relationshipEffect.model_dump(),
            details=payload.details.model_dump(),
            status=payload.status,
            confidence=payload.confidence,
            source=payload.source,
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return moment_to_dict(item)

    def update_moment(self, entity_id: str, payload: schemas.MomentUpdate, action: str = "before_update") -> dict:
        item = self.db.get(models.Moment, entity_id)
        if not item:
            raise ValueError("Момент не найден")
        values = payload.model_dump(exclude_unset=True)
        if "participantIds" in values:
            self._validate_participants(values["participantIds"])
        self._revision("moment", item, action, moment_to_dict(item))
        mapping = {
            "participantIds": "participant_ids",
            "relationshipEffect": "relationship_effect",
        }
        for key, value in values.items():
            setattr(item, mapping.get(key, key), value)
        item.version += 1
        self.db.commit()
        self.db.refresh(item)
        return moment_to_dict(item)

    def finalize_moment(self, entity_id: str) -> dict:
        item = self.db.get(models.Moment, entity_id)
        if not item:
            raise ValueError("Момент не найден")
        details = dict(item.details or {})
        details["finalizedAt"] = iso_now()
        payload = schemas.MomentUpdate(status="finalized", details=details)
        return self.update_moment(entity_id, payload, action="before_finalize")

    def delete_moment(self, entity_id: str) -> dict:
        item = self.db.get(models.Moment, entity_id)
        if not item:
            raise ValueError("Момент не найден")
        self._revision("moment", item, "delete", moment_to_dict(item))
        self.db.delete(item)
        self.db.commit()
        return {"ok": True}

    def revisions(self, entity_type: str, entity_id: str) -> list[dict]:
        items = self.db.scalars(
            select(models.Revision)
            .where(models.Revision.entity_type == entity_type, models.Revision.entity_id == entity_id)
            .order_by(models.Revision.created_at.desc())
        ).all()
        return [{
            "id": item.id,
            "entityType": item.entity_type,
            "entityId": item.entity_id,
            "action": item.action,
            "version": item.version,
            "snapshot": item.snapshot,
            "createdAt": item.created_at,
        } for item in items]

    def clear(self) -> None:
        self.db.execute(delete(models.Revision))
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
        return [
            round(math.cos(angle) * radius, 3),
            round(math.sin(angle) * radius, 3),
            round(((index % 4) - 1.5) * 0.35, 3),
        ]
