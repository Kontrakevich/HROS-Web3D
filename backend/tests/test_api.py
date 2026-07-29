from __future__ import annotations

import os
from pathlib import Path

TEST_DB = Path(__file__).parent / "test_hros.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def test_health_and_seed_snapshot():
    with TestClient(app) as client:
        health = client.get("/api/v1/health")
        assert health.status_code == 200
        assert health.json()["version"] == "0.2.0"

        snapshot = client.get("/api/v1/snapshot")
        assert snapshot.status_code == 200
        data = snapshot.json()
        assert len(data["people"]) >= 6
        assert len(data["relationships"]) >= 5
        assert len(data["moments"]) >= 3


def test_create_person_relationship_and_moment():
    with TestClient(app) as client:
        person = client.post("/api/v1/people", json={
            "name": "Тестовый человек",
            "role": "Друг",
            "type": "friend",
            "strength": 75,
            "summary": "Проверка Data Core",
            "relationshipLabel": "Дружба"
        })
        assert person.status_code == 201
        person_id = person.json()["id"]

        moment = client.post("/api/v1/moments", json={
            "title": "Тестовый момент",
            "date": "2026-07-29",
            "participantIds": ["person-mikhail", person_id],
            "emotions": "интерес, доверие",
            "significance": 80
        })
        assert moment.status_code == 201
        assert moment.json()["emotions"] == ["интерес", "доверие"]

        snapshot = client.get("/api/v1/snapshot").json()
        assert any(item["id"] == person_id for item in snapshot["people"])
        assert any(person_id in item["participantIds"] for item in snapshot["moments"])
