from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models
from .repository import person_to_dict, record_to_dict

AVATAR_DEFAULT = {
    "base": "explorer",
    "role": "creator",
    "palette": "cyan",
    "modifiers": ["ai-orbit"],
    "relationshipContext": "neutral",
}
PATHS = [
    {"id": "creator", "title": "AI-создатель"},
    {"id": "athlete", "title": "Физическая форма"},
    {"id": "partner", "title": "Партнёрство"},
    {"id": "father", "title": "Отцовство"},
]
VALUES = {
    "base": {"explorer", "creator", "guardian"},
    "role": {"base", "creator", "athlete", "leader", "father"},
    "palette": {"cyan", "amber", "violet", "green"},
    "relationshipContext": {"neutral", "support", "distance", "tension"},
    "modifiers": {"ai-orbit", "sport-band", "family-emblem", "architecture-grid"},
}


def now() -> datetime:
    return datetime.now(timezone.utc)


def uid(prefix: str) -> str:
    return f"{prefix}-{uuid4()}"


def normalize_avatar(value: dict | None) -> dict:
    source = {**AVATAR_DEFAULT, **(value or {})}
    result = {
        "base": source["base"] if source.get("base") in VALUES["base"] else AVATAR_DEFAULT["base"],
        "role": source["role"] if source.get("role") in VALUES["role"] else AVATAR_DEFAULT["role"],
        "palette": source["palette"] if source.get("palette") in VALUES["palette"] else AVATAR_DEFAULT["palette"],
        "relationshipContext": source["relationshipContext"] if source.get("relationshipContext") in VALUES["relationshipContext"] else AVATAR_DEFAULT["relationshipContext"],
        "modifiers": [],
    }
    result["modifiers"] = list(dict.fromkeys(x for x in source.get("modifiers", []) if x in VALUES["modifiers"]))
    return result


def owner(db: Session, owner_id: str | None = None) -> models.Person:
    if owner_id:
        item = db.get(models.Person, owner_id)
    else:
        item = db.scalar(select(models.Person).where(models.Person.is_self.is_(True)))
        if item is None:
            item = db.scalar(select(models.Person).order_by(models.Person.created_at))
    if item is None:
        raise ValueError("Владелец аватара не найден")
    return item


def latest(db: Session, kind: str, owner_id: str, statuses: set[str] | None = None) -> models.DomainRecord | None:
    query = select(models.DomainRecord).where(
        models.DomainRecord.kind == kind,
        models.DomainRecord.perspective_owner_id == owner_id,
    ).order_by(models.DomainRecord.updated_at.desc(), models.DomainRecord.created_at.desc())
    if statuses:
        query = query.where(models.DomainRecord.status.in_(statuses))
    return db.scalar(query)


def ensure_defaults(db: Session, owner_id: str | None = None, commit: bool = True) -> None:
    person = owner(db, owner_id)
    changed = False
    profile = latest(db, "avatar_profile", person.id, {"confirmed", "finalized", "observed"})
    timestamp = now()
    if profile is None:
        profile = models.DomainRecord(
            id=f"avatar-profile-{person.id}", kind="avatar_profile",
            statement=f"Рабочий профиль аватара {person.name}.",
            subject_ids=[person.id], relationship_ids=[], moment_ids=[], perspective_owner_id=person.id,
            visibility="private", evidence_ids=[], supports_ids=[], contradicts_ids=[],
            data={**AVATAR_DEFAULT, "activePathId": "creator", "production": True, "confirmedAt": timestamp.isoformat()},
            status="confirmed", confidence=1.0, source={"kind": "system", "label": "HROS COMMAND 1.1 default"},
        )
        db.add(profile)
        changed = True
    existing_paths = db.scalars(select(models.DomainRecord).where(
        models.DomainRecord.kind == "development_path",
        models.DomainRecord.perspective_owner_id == person.id,
    )).all()
    existing_path_ids = {(item.data or {}).get("pathId") for item in existing_paths}
    for path in PATHS:
        if path["id"] not in existing_path_ids:
            db.add(models.DomainRecord(
                id=f"development-path-{person.id}-{path['id']}", kind="development_path",
                statement=f"Путь развития: {path['title']}.",
                subject_ids=[person.id], relationship_ids=[], moment_ids=[], perspective_owner_id=person.id,
                visibility="private", evidence_ids=[], supports_ids=[], contradicts_ids=[],
                data={"pathId": path["id"], "title": path["title"], "active": path["id"] == "creator", "activatedAt": timestamp.isoformat() if path["id"] == "creator" else None},
                status="confirmed", confidence=1.0, source={"kind": "system", "label": "HROS COMMAND 1.1 default"},
            ))
            changed = True
    if changed:
        if commit:
            db.commit()
        else:
            db.flush()


def state(db: Session, owner_id: str | None = None) -> dict:
    ensure_defaults(db, owner_id)
    person = owner(db, owner_id)
    records = db.scalars(select(models.DomainRecord).where(models.DomainRecord.perspective_owner_id == person.id)).all()
    profile = next((x for x in sorted(records, key=lambda x: x.updated_at, reverse=True) if x.kind == "avatar_profile" and x.status != "archived"), None)
    appearances = sorted((x for x in records if x.kind == "avatar_appearance" and x.status == "finalized"), key=lambda x: x.created_at, reverse=True)
    pending = next((x for x in sorted(records, key=lambda x: x.updated_at, reverse=True) if x.kind == "avatar_change_set" and x.status == "draft" and (x.data or {}).get("state") == "awaiting_confirmation"), None)
    paths = sorted((x for x in records if x.kind == "development_path"), key=lambda x: (x.data or {}).get("pathId", ""))
    return {
        "owner": person_to_dict(person),
        "profile": record_to_dict(profile) if profile else None,
        "appearances": [record_to_dict(x) for x in appearances],
        "pendingChangeSet": record_to_dict(pending) if pending else None,
        "paths": [record_to_dict(x) for x in paths],
        "repositoryMode": "api",
    }


def valid_evidence(db: Session, values: list[str]) -> list[str]:
    result = []
    for value in dict.fromkeys(values or []):
        record = db.get(models.DomainRecord, value)
        moment = db.get(models.Moment, value)
        if record is not None and record.status in {"confirmed", "finalized", "observed"}:
            result.append(value)
        elif moment is not None and moment.status in {"confirmed", "finalized", "observed"}:
            result.append(value)
    return result


def create_change_set(db: Session, payload: dict) -> dict:
    ensure_defaults(db, payload.get("ownerId"))
    person = owner(db, payload.get("ownerId"))
    proposed = normalize_avatar(payload.get("avatar"))
    proposed_by = str(payload.get("proposedBy") or "user")
    evidence_ids = valid_evidence(db, payload.get("evidenceIds") or [])
    if proposed_by != "user" and not evidence_ids:
        raise ValueError("Автоматическое предложение требует проверяемого источника")
    profile = latest(db, "avatar_profile", person.id, {"confirmed", "finalized", "observed"})
    previous = normalize_avatar(profile.data if profile else AVATAR_DEFAULT)
    drafts = db.scalars(select(models.DomainRecord).where(
        models.DomainRecord.kind == "avatar_change_set",
        models.DomainRecord.perspective_owner_id == person.id,
        models.DomainRecord.status == "draft",
    )).all()
    timestamp = now()
    for item in drafts:
        item.status = "archived"
        item.version += 1
        item.updated_at = timestamp
        item.data = {**(item.data or {}), "state": "superseded", "supersededAt": timestamp.isoformat()}
    change_set = models.DomainRecord(
        id=uid("avatar-change-set"), kind="avatar_change_set",
        statement=f"Предлагаемое изменение аватара: {proposed['role']}.",
        subject_ids=[person.id], relationship_ids=[], moment_ids=[], perspective_owner_id=person.id,
        visibility="private", evidence_ids=evidence_ids, supports_ids=[], contradicts_ids=[],
        data={"state": "awaiting_confirmation", "proposedAvatar": proposed, "previousAvatar": previous,
              "reason": str(payload.get("reason") or "").strip(), "proposedBy": proposed_by,
              "idempotencyKey": payload.get("idempotencyKey"), "createdAt": timestamp.isoformat()},
        status="draft", confidence=1.0, source={"kind": proposed_by, "label": "Редактор аватара HROS COMMAND"},
    )
    db.add(change_set)
    db.commit()
    db.refresh(change_set)
    return record_to_dict(change_set)


def confirmation_bundle(db: Session, change_set: models.DomainRecord) -> dict | None:
    data = change_set.data or {}
    if data.get("state") != "committed":
        return None
    profile = db.get(models.DomainRecord, data.get("profileId")) if data.get("profileId") else None
    appearance = db.get(models.DomainRecord, data.get("appearanceId")) if data.get("appearanceId") else None
    confirmation = db.get(models.DomainRecord, data.get("confirmationId")) if data.get("confirmationId") else None
    if not all((profile, appearance, confirmation)):
        return None
    return {"profile": record_to_dict(profile), "appearance": record_to_dict(appearance),
            "confirmation": record_to_dict(confirmation), "changeSet": record_to_dict(change_set), "idempotent": True}


def confirm_change_set(db: Session, change_set_id: str, payload: dict) -> dict:
    if payload.get("confirmed") is not True:
        raise ValueError("Требуется явное подтверждение")
    change_set = db.get(models.DomainRecord, change_set_id)
    if change_set is None or change_set.kind != "avatar_change_set":
        raise ValueError("Avatar Change Set не найден")
    existing = confirmation_bundle(db, change_set)
    if existing:
        return existing
    if change_set.status != "draft" or (change_set.data or {}).get("state") != "awaiting_confirmation":
        raise ValueError("Avatar Change Set уже обработан")
    person = owner(db, change_set.perspective_owner_id)
    profile = latest(db, "avatar_profile", person.id, {"confirmed", "finalized", "observed"})
    proposed = normalize_avatar((change_set.data or {}).get("proposedAvatar"))
    timestamp = now()
    if profile is None:
        profile = models.DomainRecord(
            id=f"avatar-profile-{person.id}", kind="avatar_profile", statement=f"Рабочий профиль аватара {person.name}.",
            subject_ids=[person.id], relationship_ids=[], moment_ids=[], perspective_owner_id=person.id,
            visibility="private", evidence_ids=list(change_set.evidence_ids or []), supports_ids=[], contradicts_ids=[],
            data={}, status="confirmed", confidence=1.0, source={},
        )
        db.add(profile)
        db.flush()
    profile.data = {**(profile.data or {}), **proposed, "production": True, "confirmedAt": timestamp.isoformat(), "lastChangeSetId": change_set.id}
    profile.evidence_ids = list(dict.fromkeys([*(profile.evidence_ids or []), *(change_set.evidence_ids or [])]))
    profile.source = {"kind": "user_confirmation", "label": "Подтверждено в Avatar Change Set", "changeSetId": change_set.id}
    profile.version += 1
    profile.updated_at = timestamp
    appearance = models.DomainRecord(
        id=uid("avatar-appearance"), kind="avatar_appearance", statement=f"Подтверждённая форма аватара: {proposed['role']}.",
        subject_ids=[person.id], relationship_ids=[], moment_ids=[], perspective_owner_id=person.id,
        visibility="private", evidence_ids=list(change_set.evidence_ids or []), supports_ids=[profile.id], contradicts_ids=[],
        data={"avatar": proposed, "immutable": True, "confirmedAt": timestamp.isoformat(), "changeSetId": change_set.id,
              "reason": (change_set.data or {}).get("reason", "")},
        status="finalized", confidence=1.0, source={"kind": "user_confirmation", "label": "Подтверждённая версия внешности", "changeSetId": change_set.id},
    )
    confirmation = models.DomainRecord(
        id=uid("avatar-confirmation"), kind="avatar_confirmation", statement="Пользователь проверил источники и подтвердил изменение аватара.",
        subject_ids=[person.id], relationship_ids=[], moment_ids=[], perspective_owner_id=person.id,
        visibility="private", evidence_ids=[change_set.id, *(change_set.evidence_ids or [])], supports_ids=[profile.id, appearance.id], contradicts_ids=[],
        data={"changeSetId": change_set.id, "confirmedBy": payload.get("confirmedBy") or person.id,
              "confirmedAt": timestamp.isoformat(), "accepted": True},
        status="finalized", confidence=1.0, source={"kind": "user_confirmation", "label": "Явное подтверждение Avatar Change Set", "changeSetId": change_set.id},
    )
    change_set.status = "finalized"
    change_set.version += 1
    change_set.updated_at = timestamp
    change_set.data = {**(change_set.data or {}), "state": "committed", "confirmedAt": timestamp.isoformat(),
                       "profileId": profile.id, "appearanceId": appearance.id, "confirmationId": confirmation.id}
    try:
        db.add_all([appearance, confirmation])
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"profile": record_to_dict(profile), "appearance": record_to_dict(appearance),
            "confirmation": record_to_dict(confirmation), "changeSet": record_to_dict(change_set), "idempotent": False}


def reject_change_set(db: Session, change_set_id: str, payload: dict) -> dict:
    change_set = db.get(models.DomainRecord, change_set_id)
    if change_set is None or change_set.kind != "avatar_change_set" or change_set.status != "draft":
        raise ValueError("Avatar Change Set не найден или уже обработан")
    timestamp = now()
    change_set.status = "archived"
    change_set.version += 1
    change_set.updated_at = timestamp
    change_set.data = {**(change_set.data or {}), "state": "rejected", "rejectedAt": timestamp.isoformat(), "reason": str(payload.get("reason") or "")}
    db.commit()
    return record_to_dict(change_set)


def activate_path(db: Session, path_id: str, owner_id: str | None = None) -> dict:
    if path_id not in {item["id"] for item in PATHS}:
        raise ValueError("Неизвестный путь развития")
    ensure_defaults(db, owner_id)
    person = owner(db, owner_id)
    paths = db.scalars(select(models.DomainRecord).where(
        models.DomainRecord.kind == "development_path",
        models.DomainRecord.perspective_owner_id == person.id,
    )).all()
    timestamp = now()
    for item in paths:
        active = (item.data or {}).get("pathId") == path_id
        item.data = {**(item.data or {}), "active": active,
                     "activatedAt": timestamp.isoformat() if active else (item.data or {}).get("activatedAt")}
        item.source = {"kind": "user", "label": "Выбор активного пути HROS COMMAND"}
        item.version += 1
        item.updated_at = timestamp
    profile = latest(db, "avatar_profile", person.id, {"confirmed", "finalized", "observed"})
    if profile:
        profile.data = {**(profile.data or {}), "activePathId": path_id}
        profile.version += 1
        profile.updated_at = timestamp
    db.commit()
    return state(db, person.id)
