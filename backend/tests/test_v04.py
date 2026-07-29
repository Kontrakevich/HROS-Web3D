from fastapi.testclient import TestClient

from app.main import app


def test_moment_versioning_finalization_and_delete():
    with TestClient(app) as client:
        snapshot = client.post("/api/v1/reset").json()
        participants = [item["id"] for item in snapshot["people"][:2]]

        created = client.post("/api/v1/moments", json={
            "title": "Разговор о будущем",
            "date": "2026-07-29",
            "period": "лето 2026",
            "description": "Зафиксирован исходный контекст.",
            "participantIds": participants,
            "emotions": ["доверие", "интерес"],
            "significance": 86,
            "relationshipEffect": {"closeness": 0.7, "trust": 0.5, "tension": -0.2},
            "details": {
                "meaning": "Обозначили общее направление.",
                "place": "Москва",
                "tags": ["пара", "будущее"],
                "attachments": [{"name": "voice-note.m4a", "kind": "audio", "mimeType": "audio/mp4", "size": 4096}],
            },
            "source": {"kind": "user", "label": "Ручная запись"},
        })
        assert created.status_code == 201
        moment = created.json()
        assert moment["version"] == 1
        assert moment["relationshipEffect"]["closeness"] == 0.7
        assert moment["details"]["attachments"][0]["name"] == "voice-note.m4a"

        updated = client.patch(f"/api/v1/moments/{moment['id']}", json={
            "details": {
                **moment["details"],
                "meaning": "Подтверждённое общее направление.",
            },
            "status": "confirmed",
        })
        assert updated.status_code == 200
        assert updated.json()["version"] == 2
        assert updated.json()["status"] == "confirmed"

        finalized = client.post(f"/api/v1/moments/{moment['id']}/finalize")
        assert finalized.status_code == 200
        assert finalized.json()["version"] == 3
        assert finalized.json()["status"] == "finalized"
        assert finalized.json()["details"]["finalizedAt"]

        revisions = client.get(f"/api/v1/moment/{moment['id']}/revisions")
        assert revisions.status_code == 200
        assert len(revisions.json()) == 2

        deleted = client.delete(f"/api/v1/moments/{moment['id']}")
        assert deleted.status_code == 200
        assert deleted.json() == {"ok": True}
        assert all(item["id"] != moment["id"] for item in client.get("/api/v1/moments").json())


def test_moment_validation_rejects_invalid_effect_and_unknown_participant():
    with TestClient(app) as client:
        client.post("/api/v1/reset")
        invalid_effect = client.post("/api/v1/moments", json={
            "title": "Некорректный эффект",
            "date": "2026-07-29",
            "participantIds": ["person-mikhail"],
            "relationshipEffect": {"closeness": 2, "trust": 0, "tension": 0},
        })
        assert invalid_effect.status_code == 422

        unknown = client.post("/api/v1/moments", json={
            "title": "Неизвестный участник",
            "date": "2026-07-29",
            "participantIds": ["person-does-not-exist"],
        })
        assert unknown.status_code == 422
