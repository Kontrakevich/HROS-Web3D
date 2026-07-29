from fastapi.testclient import TestClient
from app.main import app


def test_person_versioning_and_delete_guard():
    with TestClient(app) as client:
        snapshot = client.post('/api/v1/reset').json()
        owner = next(item for item in snapshot['people'] if item['isSelf'])
        created = client.post('/api/v1/people', json={'name': 'Тест', 'role': 'Друг'})
        assert created.status_code == 201
        person_id = created.json()['id']
        updated = client.patch(
            f'/api/v1/people/{person_id}',
            json={'summary': 'Новая версия', 'status': 'confirmed'},
        )
        assert updated.status_code == 200
        assert updated.json()['version'] == 2
        history = client.get(f'/api/v1/person/{person_id}/revisions')
        assert history.status_code == 200
        assert len(history.json()) == 1
        assert client.delete(f'/api/v1/people/{owner["id"]}').status_code == 422
        assert client.delete(f'/api/v1/people/{person_id}').json()['ok'] is True


def test_relationship_crud():
    with TestClient(app) as client:
        snapshot = client.post('/api/v1/reset').json()
        source, target = snapshot['people'][:2]
        created = client.post(
            '/api/v1/relationships',
            json={'sourceId': source['id'], 'targetId': target['id'], 'label': 'Тестовая'},
        )
        assert created.status_code == 201
        relationship_id = created.json()['id']
        updated = client.patch(
            f'/api/v1/relationships/{relationship_id}',
            json={'strength': 88},
        )
        assert updated.status_code == 200
        assert updated.json()['version'] == 2
        assert client.delete(f'/api/v1/relationships/{relationship_id}').json()['ok'] is True
