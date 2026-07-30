from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi.encoders import jsonable_encoder
from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from . import models, schemas


KIND_COLLECTIONS = {
    "evidence": "evidence", "fact": "facts", "perspective": "perspectives", "action": "actions",
    "person_facet": "personFacets", "relationship_state": "relationshipStates",
    "observation": "observations", "hypothesis": "hypotheses", "verification": "verifications",
    "pattern": "patterns", "principle": "principles", "original_memory": "originalMemory",
    "semantic_memory": "semanticMemory", "living_memory": "livingMemory",
    "interview_session": "interviewSessions", "interview_question": "interviewQuestions",
    "interview_answer": "interviewAnswers", "book_chapter": "bookChapters",
    "narrative_fragment": "narrativeFragments", "consent_policy": "consentPolicies",
}


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def person_to_dict(item: models.Person) -> dict:
    return {"id": item.id, "name": item.name, "role": item.role, "type": item.type, "strength": item.strength,
            "summary": item.summary, "position": item.position or [], "isSelf": item.is_self, "status": item.status,
            "confidence": item.confidence, "version": item.version, "createdAt": item.created_at,
            "updatedAt": item.updated_at, "source": item.source or {}}


def relationship_to_dict(item: models.Relationship) -> dict:
    return {"id": item.id, "sourceId": item.source_id, "targetId": item.target_id, "type": item.type,
            "label": item.label, "strength": item.strength, "meaning": item.meaning, "status": item.status,
            "confidence": item.confidence, "version": item.version, "createdAt": item.created_at,
            "updatedAt": item.updated_at, "source": item.source or {}}


def moment_to_dict(item: models.Moment) -> dict:
    return {"id": item.id, "title": item.title, "date": item.date, "period": item.period,
            "description": item.description, "participantIds": item.participant_ids or [], "emotions": item.emotions or [],
            "significance": item.significance, "relationshipEffect": item.relationship_effect or {"closeness": 0, "trust": 0, "tension": 0},
            "details": item.details or {}, "status": item.status, "confidence": item.confidence, "version": item.version,
            "createdAt": item.created_at, "updatedAt": item.updated_at, "source": item.source or {}}


def record_to_dict(item: models.DomainRecord) -> dict:
    return {"id": item.id, "kind": item.kind, "statement": item.statement, "subjectIds": item.subject_ids or [],
            "relationshipIds": item.relationship_ids or [], "momentIds": item.moment_ids or [],
            "perspectiveOwnerId": item.perspective_owner_id, "visibility": item.visibility,
            "evidenceIds": item.evidence_ids or [], "supportsIds": item.supports_ids or [],
            "contradictsIds": item.contradicts_ids or [], "data": item.data or {}, "status": item.status,
            "confidence": item.confidence, "version": item.version, "createdAt": item.created_at,
            "updatedAt": item.updated_at, "source": item.source or {}}


class HrosRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_people(self) -> list[dict]:
        return [person_to_dict(x) for x in self.db.scalars(select(models.Person).order_by(models.Person.is_self.desc(), models.Person.created_at)).all()]

    def list_relationships(self) -> list[dict]:
        return [relationship_to_dict(x) for x in self.db.scalars(select(models.Relationship).order_by(models.Relationship.created_at)).all()]

    def list_moments(self) -> list[dict]:
        return [moment_to_dict(x) for x in self.db.scalars(select(models.Moment).order_by(models.Moment.date.desc(), models.Moment.created_at.desc())).all()]

    def list_records(self, kind: str | None = None) -> list[dict]:
        query = select(models.DomainRecord)
        if kind:
            query = query.where(models.DomainRecord.kind == kind)
        query = query.order_by(models.DomainRecord.created_at)
        return [record_to_dict(x) for x in self.db.scalars(query).all()]

    def snapshot(self) -> dict:
        records = self.list_records()
        result = {
            "meta": {"product": "HROS", "version": "1.0.0", "schemaVersion": "1.0.0", "updatedAt": iso_now(),
                     "mode": "api", "principle": "Давай мы оба будем понимать, как наши действия влияют друг на друга и к чему это приводит."},
            "people": self.list_people(), "relationships": self.list_relationships(), "moments": self.list_moments(), "records": records,
        }
        for collection in KIND_COLLECTIONS.values():
            result[collection] = []
        for item in records:
            collection = KIND_COLLECTIONS.get(item["kind"])
            if collection:
                result[collection].append(item)
        return result

    def _revision(self, entity_type: str, entity, action: str, snapshot: dict) -> None:
        self.db.add(models.Revision(id=f"rev-{uuid4()}", entity_type=entity_type, entity_id=entity.id,
                                    action=action, version=entity.version, snapshot=jsonable_encoder(snapshot)))

    def _person_ids(self) -> set[str]:
        return set(self.db.scalars(select(models.Person.id)).all())

    def _relationship_ids(self) -> set[str]:
        return set(self.db.scalars(select(models.Relationship.id)).all())

    def _moment_ids(self) -> set[str]:
        return set(self.db.scalars(select(models.Moment.id)).all())

    def _validate_links(self, people: list[str], relationships: list[str], moments: list[str]) -> None:
        missing_people = [x for x in people if x not in self._person_ids()]
        missing_relationships = [x for x in relationships if x not in self._relationship_ids()]
        missing_moments = [x for x in moments if x not in self._moment_ids()]
        missing = missing_people + missing_relationships + missing_moments
        if missing:
            raise ValueError(f"Неизвестные ссылки: {', '.join(missing)}")

    def create_person(self, payload: schemas.PersonCreate) -> dict:
        data = payload.model_dump(exclude={"relationshipLabel", "relationshipType"})
        data["position"] = data["position"] or self._next_position(len(self.list_people()))
        item = models.Person(id=f"person-{uuid4()}", name=data["name"], role=data["role"], type=data["type"],
                             strength=data["strength"], summary=data["summary"], position=data["position"],
                             is_self=data["isSelf"], status=data["status"], confidence=data["confidence"], source=data["source"])
        self.db.add(item)
        self.db.flush()
        if payload.relationshipLabel:
            owner = self.db.scalar(select(models.Person).where(models.Person.is_self.is_(True)))
            if owner:
                self.db.add(models.Relationship(id=f"rel-{uuid4()}", source_id=owner.id, target_id=item.id,
                                                type=payload.relationshipType or "personal", label=payload.relationshipLabel,
                                                strength=payload.strength, meaning=payload.summary, status="observed", confidence=1,
                                                source={"kind": "user", "label": "HROS API v1"}))
        self.db.commit(); self.db.refresh(item)
        return person_to_dict(item)

    def update_person(self, entity_id: str, payload: schemas.PersonUpdate) -> dict:
        item = self.db.get(models.Person, entity_id)
        if not item: raise ValueError("Человек не найден")
        self._revision("person", item, "before_update", person_to_dict(item))
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(item, {"isSelf": "is_self"}.get(key, key), value)
        item.version += 1
        self.db.commit(); self.db.refresh(item)
        return person_to_dict(item)

    def delete_person(self, entity_id: str) -> dict:
        item = self.db.get(models.Person, entity_id)
        if not item: raise ValueError("Человек не найден")
        if item.is_self: raise ValueError("Нельзя удалить центральный профиль")
        self._revision("person", item, "delete", person_to_dict(item))
        self.db.execute(delete(models.Relationship).where(or_(models.Relationship.source_id == entity_id, models.Relationship.target_id == entity_id)))
        for moment in self.db.scalars(select(models.Moment)).all():
            moment.participant_ids = [x for x in (moment.participant_ids or []) if x != entity_id]
        for record in self.db.scalars(select(models.DomainRecord)).all():
            record.subject_ids = [x for x in (record.subject_ids or []) if x != entity_id]
            if record.perspective_owner_id == entity_id:
                record.perspective_owner_id = None
                record.status = "disputed"
        self.db.delete(item); self.db.commit()
        return {"ok": True}

    def create_relationship(self, payload: schemas.RelationshipCreate) -> dict:
        if payload.sourceId not in self._person_ids() or payload.targetId not in self._person_ids(): raise ValueError("Один из узлов связи не существует")
        item = models.Relationship(id=f"rel-{uuid4()}", source_id=payload.sourceId, target_id=payload.targetId,
                                   type=payload.type, label=payload.label.strip() or "Связь", strength=payload.strength,
                                   meaning=payload.meaning, status=payload.status, confidence=payload.confidence, source=payload.source)
        self.db.add(item); self.db.commit(); self.db.refresh(item)
        return relationship_to_dict(item)

    def update_relationship(self, entity_id: str, payload: schemas.RelationshipUpdate) -> dict:
        item = self.db.get(models.Relationship, entity_id)
        if not item: raise ValueError("Связь не найдена")
        values = payload.model_dump(exclude_unset=True)
        source_id, target_id = values.get("sourceId", item.source_id), values.get("targetId", item.target_id)
        if source_id == target_id or source_id not in self._person_ids() or target_id not in self._person_ids(): raise ValueError("Некорректные узлы связи")
        self._revision("relationship", item, "before_update", relationship_to_dict(item))
        for key, value in values.items(): setattr(item, {"sourceId": "source_id", "targetId": "target_id"}.get(key, key), value)
        item.version += 1; self.db.commit(); self.db.refresh(item)
        return relationship_to_dict(item)

    def delete_relationship(self, entity_id: str) -> dict:
        item = self.db.get(models.Relationship, entity_id)
        if not item: raise ValueError("Связь не найдена")
        self._revision("relationship", item, "delete", relationship_to_dict(item))
        for record in self.db.scalars(select(models.DomainRecord)).all():
            record.relationship_ids = [x for x in (record.relationship_ids or []) if x != entity_id]
        self.db.delete(item); self.db.commit(); return {"ok": True}

    def create_moment(self, payload: schemas.MomentCreate) -> dict:
        self._validate_links(payload.participantIds, [], [])
        item = models.Moment(id=f"moment-{uuid4()}", title=payload.title.strip(), date=payload.date, period=payload.period,
                             description=payload.description, participant_ids=payload.participantIds, emotions=payload.emotions,
                             significance=payload.significance, relationship_effect=payload.relationshipEffect.model_dump(),
                             details=payload.details.model_dump(), status=payload.status, confidence=payload.confidence, source=payload.source)
        self.db.add(item); self.db.commit(); self.db.refresh(item); return moment_to_dict(item)

    def update_moment(self, entity_id: str, payload: schemas.MomentUpdate, action: str = "before_update") -> dict:
        item = self.db.get(models.Moment, entity_id)
        if not item: raise ValueError("Момент не найден")
        values = payload.model_dump(exclude_unset=True)
        if "participantIds" in values: self._validate_links(values["participantIds"], [], [])
        self._revision("moment", item, action, moment_to_dict(item))
        for key, value in values.items(): setattr(item, {"participantIds": "participant_ids", "relationshipEffect": "relationship_effect"}.get(key, key), value)
        item.version += 1; self.db.commit(); self.db.refresh(item); return moment_to_dict(item)

    def finalize_moment(self, entity_id: str) -> dict:
        item = self.db.get(models.Moment, entity_id)
        if not item: raise ValueError("Момент не найден")
        details = dict(item.details or {}); details["finalizedAt"] = iso_now()
        return self.update_moment(entity_id, schemas.MomentUpdate(status="finalized", details=details), "before_finalize")

    def delete_moment(self, entity_id: str) -> dict:
        item = self.db.get(models.Moment, entity_id)
        if not item: raise ValueError("Момент не найден")
        self._revision("moment", item, "delete", moment_to_dict(item))
        for record in self.db.scalars(select(models.DomainRecord)).all():
            record.moment_ids = [x for x in (record.moment_ids or []) if x != entity_id]
        self.db.delete(item); self.db.commit(); return {"ok": True}

    def create_record(self, payload: schemas.DomainRecordCreate) -> dict:
        self._validate_links(payload.subjectIds, payload.relationshipIds, payload.momentIds)
        item = models.DomainRecord(id=f"record-{uuid4()}", kind=payload.kind, statement=payload.statement.strip(),
                                   subject_ids=payload.subjectIds, relationship_ids=payload.relationshipIds, moment_ids=payload.momentIds,
                                   perspective_owner_id=payload.perspectiveOwnerId, visibility=payload.visibility,
                                   evidence_ids=payload.evidenceIds, supports_ids=payload.supportsIds,
                                   contradicts_ids=payload.contradictsIds, data=payload.data,
                                   status=payload.status, confidence=payload.confidence, source=payload.source)
        self.db.add(item); self.db.commit(); self.db.refresh(item); return record_to_dict(item)

    def update_record(self, entity_id: str, payload: schemas.DomainRecordUpdate) -> dict:
        item = self.db.get(models.DomainRecord, entity_id)
        if not item: raise ValueError("Запись не найдена")
        values = payload.model_dump(exclude_unset=True)
        people = values.get("subjectIds", item.subject_ids or [])
        relations = values.get("relationshipIds", item.relationship_ids or [])
        moments = values.get("momentIds", item.moment_ids or [])
        self._validate_links(people, relations, moments)
        kind = values.get("kind", item.kind)
        owner = values.get("perspectiveOwnerId", item.perspective_owner_id)
        if kind == "perspective" and not owner: raise ValueError("Для перспективы нужен владелец")
        self._revision("record", item, "before_update", record_to_dict(item))
        mapping = {"subjectIds": "subject_ids", "relationshipIds": "relationship_ids", "momentIds": "moment_ids",
                   "perspectiveOwnerId": "perspective_owner_id", "evidenceIds": "evidence_ids",
                   "supportsIds": "supports_ids", "contradictsIds": "contradicts_ids"}
        for key, value in values.items(): setattr(item, mapping.get(key, key), value)
        item.version += 1; self.db.commit(); self.db.refresh(item); return record_to_dict(item)

    def delete_record(self, entity_id: str) -> dict:
        item = self.db.get(models.DomainRecord, entity_id)
        if not item: raise ValueError("Запись не найдена")
        self._revision("record", item, "delete", record_to_dict(item)); self.db.delete(item); self.db.commit(); return {"ok": True}

    def revisions(self, entity_type: str, entity_id: str) -> list[dict]:
        items = self.db.scalars(select(models.Revision).where(models.Revision.entity_type == entity_type,
                                                               models.Revision.entity_id == entity_id).order_by(models.Revision.created_at.desc())).all()
        return [{"id": x.id, "entityType": x.entity_type, "entityId": x.entity_id, "action": x.action,
                 "version": x.version, "snapshot": x.snapshot, "createdAt": x.created_at} for x in items]

    def clear(self) -> None:
        self.db.execute(delete(models.Revision)); self.db.execute(delete(models.DomainRecord)); self.db.execute(delete(models.Moment))
        self.db.execute(delete(models.Relationship)); self.db.execute(delete(models.Person)); self.db.commit()

    @staticmethod
    def _next_position(index: int) -> list[float]:
        import math
        if index == 0: return [0, 0, 0]
        angle, radius = index * 2.399963229728653, 4.2 + (index % 3) * 0.7
        return [round(math.cos(angle) * radius, 3), round(math.sin(angle) * radius, 3), round(((index % 4) - 1.5) * 0.35, 3)]
