from __future__ import annotations

import os
from pathlib import Path

TEST_DB = Path(__file__).parent / "test_hros.db"
if TEST_DB.exists():
    TEST_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402


def test_health_and_seed_snapshot():
    with TestClient(app) as client:
        health = client.get("/api/v1/health")
        assert health.status_code == 200
        assert health.json()["version"] == "1.0.0"

        snapshot = client.get("/api/v1/snapshot")
        assert snapshot.status_code == 200
        data = snapshot.json()
        assert data["meta"]["schemaVersion"] == "1.0.0"
        assert len(data["people"]) >= 6
        assert len(data["relationships"]) >= 5
        assert len(data["moments"]) >= 3
        assert len(data["records"]) >= 8
        assert data["perspectives"]
        assert data["principles"]
        assert data["originalMemory"]
        assert data["semanticMemory"]
        assert data["livingMemory"]
        assert all("details" in item for item in data["moments"])


def test_create_person_moment_and_perspective():
    with TestClient(app) as client:
        person = client.post("/api/v1/people", json={
            "name": "Тестовый человек", "role": "Друг", "type": "friend", "strength": 75,
            "summary": "Проверка Data Core", "relationshipLabel": "Дружба",
        })
        assert person.status_code == 201
        person_id = person.json()["id"]

        moment = client.post("/api/v1/moments", json={
            "title": "Тестовый момент", "date": "2026-07-30",
            "participantIds": ["person-mikhail", person_id], "emotions": "интерес, доверие",
            "significance": 80, "relationshipEffect": {"closeness": 0.4, "trust": 0.3, "tension": -0.1},
            "details": {"meaning": "Проверка Moment Engine", "place": "Москва"},
        })
        assert moment.status_code == 201
        moment_id = moment.json()["id"]

        perspective = client.post("/api/v1/records", json={
            "kind": "perspective", "statement": "Личная перспектива тестового участника.",
            "subjectIds": [person_id], "momentIds": [moment_id], "perspectiveOwnerId": person_id,
            "visibility": "private", "status": "observed", "confidence": 0.8,
            "source": {"kind": "user", "label": "API test"},
        })
        assert perspective.status_code == 201
        record_id = perspective.json()["id"]
        assert perspective.json()["visibility"] == "private"

        updated = client.patch(f"/api/v1/records/{record_id}", json={"statement": "Обновлённая перспектива."})
        assert updated.status_code == 200
        assert updated.json()["version"] == 2

        revisions = client.get(f"/api/v1/record/{record_id}/revisions")
        assert revisions.status_code == 200
        assert revisions.json()

        snapshot = client.get("/api/v1/snapshot").json()
        assert any(item["id"] == person_id for item in snapshot["people"])
        assert any(item["id"] == record_id for item in snapshot["perspectives"])


def test_perspective_requires_owner_and_links_are_validated():
    with TestClient(app) as client:
        missing_owner = client.post("/api/v1/records", json={
            "kind": "perspective", "statement": "Недопустимая перспектива", "visibility": "private"
        })
        assert missing_owner.status_code == 422

        bad_link = client.post("/api/v1/records", json={
            "kind": "fact", "statement": "Факт с неизвестной ссылкой", "subjectIds": ["person-missing"]
        })
        assert bad_link.status_code == 422
