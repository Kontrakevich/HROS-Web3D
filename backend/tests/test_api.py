from __future__ import annotations

import os
from pathlib import Path

TEST_DB = Path(__file__).parent / "test_hros.db"
if TEST_DB.exists():
    TEST_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402


def test_health_seed_and_avatar_production_state():
    with TestClient(app) as client:
        health = client.get("/api/v1/health")
        assert health.status_code == 200
        assert health.json()["version"] == "1.1.0"
        assert health.json()["commandVersion"] == "production-1.1"
        data = client.get("/api/v1/snapshot").json()
        assert data["meta"]["schemaVersion"] == "1.1.0"
        assert data["meta"]["commandVersion"] == "production-1.1"
        assert len(data["people"]) >= 6
        assert data["perspectives"] and data["principles"] and data["originalMemory"]
        assert data["semanticMemory"] and data["livingMemory"]
        assert data["avatarProfiles"]
        assert len(data["developmentPaths"]) == 4
        state = client.get("/api/v1/avatar/state").json()
        assert state["owner"]["id"] == "person-mikhail"
        assert state["profile"]["kind"] == "avatar_profile"
        assert state["profile"]["data"]["production"] is True
        assert sum(1 for item in state["paths"] if item["data"]["active"]) == 1


def test_avatar_change_set_requires_confirmation_and_commits_atomically():
    with TestClient(app) as client:
        before = client.get("/api/v1/avatar/state").json()
        profile_version = before["profile"]["version"]
        appearance_count = len(before["appearances"])
        change = client.post("/api/v1/avatar/change-sets", json={
            "ownerId": "person-mikhail",
            "avatar": {"base": "guardian", "role": "athlete", "palette": "green", "modifiers": ["sport-band", "family-emblem"], "relationshipContext": "support"},
            "evidenceIds": ["principle-mutual-impact", "moment-snezha"],
            "reason": "Backend production test",
        })
        assert change.status_code == 201
        change_set = change.json()
        assert change_set["status"] == "draft"
        assert change_set["data"]["state"] == "awaiting_confirmation"
        during = client.get("/api/v1/avatar/state").json()
        assert during["profile"]["version"] == profile_version
        assert len(during["appearances"]) == appearance_count
        denied = client.post(f"/api/v1/avatar/change-sets/{change_set['id']}/confirm", json={"confirmed": False})
        assert denied.status_code == 422
        committed = client.post(f"/api/v1/avatar/change-sets/{change_set['id']}/confirm", json={"confirmed": True, "confirmedBy": "person-mikhail"})
        assert committed.status_code == 200
        result = committed.json()
        assert result["profile"]["version"] == profile_version + 1
        assert result["profile"]["data"]["role"] == "athlete"
        assert result["appearance"]["status"] == "finalized"
        assert result["appearance"]["data"]["immutable"] is True
        assert result["confirmation"]["source"]["kind"] == "user_confirmation"
        assert result["changeSet"]["data"]["state"] == "committed"
        after = client.get("/api/v1/avatar/state").json()
        assert len(after["appearances"]) == appearance_count + 1
        assert after["pendingChangeSet"] is None
        repeated = client.post(f"/api/v1/avatar/change-sets/{change_set['id']}/confirm", json={"confirmed": True})
        assert repeated.status_code == 200
        assert repeated.json()["idempotent"] is True
        assert repeated.json()["appearance"]["id"] == result["appearance"]["id"]


def test_path_activation_is_persistent_and_exclusive():
    with TestClient(app) as client:
        activated = client.post("/api/v1/paths/partner/activate", json={"ownerId": "person-mikhail"})
        if activated.status_code != 200:
            raise AssertionError(client.get("/api/v1/diagnostics").json())
        state = activated.json()
        active = [item for item in state["paths"] if item["data"]["active"]]
        assert len(active) == 1
        assert active[0]["data"]["pathId"] == "partner"
        assert state["profile"]["data"]["activePathId"] == "partner"
        snapshot = client.get("/api/v1/snapshot").json()
        active_snapshot = [item for item in snapshot["developmentPaths"] if item["data"]["active"]]
        assert len(active_snapshot) == 1 and active_snapshot[0]["data"]["pathId"] == "partner"


def test_existing_data_core_crud_remains_operational():
    with TestClient(app) as client:
        person = client.post("/api/v1/people", json={"name": "Тестовый человек", "role": "Друг", "type": "friend", "strength": 75, "summary": "Проверка Data Core", "relationshipLabel": "Дружба"})
        assert person.status_code == 201
        person_id = person.json()["id"]
        moment = client.post("/api/v1/moments", json={"title": "Тестовый момент", "date": "2026-07-30", "participantIds": ["person-mikhail", person_id], "emotions": "интерес, доверие", "significance": 80, "relationshipEffect": {"closeness": 0.4, "trust": 0.3, "tension": -0.1}, "details": {"meaning": "Проверка Moment Engine", "place": "Москва"}})
        assert moment.status_code == 201
        perspective = client.post("/api/v1/records", json={"kind": "perspective", "statement": "Личная перспектива тестового участника.", "subjectIds": [person_id], "momentIds": [moment.json()["id"]], "perspectiveOwnerId": person_id, "visibility": "private", "status": "observed", "confidence": 0.8, "source": {"kind": "user", "label": "API test"}})
        assert perspective.status_code == 201
        record_id = perspective.json()["id"]
        updated = client.patch(f"/api/v1/records/{record_id}", json={"statement": "Обновлённая перспектива."})
        assert updated.status_code == 200 and updated.json()["version"] == 2
        assert client.get(f"/api/v1/record/{record_id}/revisions").json()


def test_perspective_requires_owner_and_links_are_validated():
    with TestClient(app) as client:
        assert client.post("/api/v1/records", json={"kind": "perspective", "statement": "Недопустимая перспектива", "visibility": "private"}).status_code == 422
        assert client.post("/api/v1/records", json={"kind": "fact", "statement": "Факт с неизвестной ссылкой", "subjectIds": ["person-missing"]}).status_code == 422
