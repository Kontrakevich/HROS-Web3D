from fastapi.testclient import TestClient
from app.main import app

def test_person_versioning_and_delete_guard():
 with TestClient(app) as c:
  s=c.post('/api/v1/reset').json();owner=next(x for x in s['people'] if x['isSelf'])
  created=c.post('/api/v1/people',json={'name':'Тест','role':'Друг'});assert created.status_code==201
  pid=created.json()['id'];updated=c.patch(f'/api/v1/people/{pid}',json={'summary':'Новая версия','status':'confirmed'});assert updated.status_code==200 and updated.json()['version']==2
  h=c.get(f'/api/v1/history/person/{pid}');assert h.status_code==200 and len(h.json())==1
  assert c.delete(f'/api/v1/people/{owner["id"]}').status_code==422
  assert c.delete(f'/api/v1/people/{pid}').json()['ok'] is True

def test_relationship_crud():
 with TestClient(app) as c:
  s=c.post('/api/v1/reset').json();a,b=s['people'][:2]
  r=c.post('/api/v1/relationships',json={'sourceId':a['id'],'targetId':b['id'],'label':'Тестовая'});assert r.status_code==201
  rid=r.json()['id'];assert c.patch(f'/api/v1/relationships/{rid}',json={'strength':88}).json()['version']==2
  assert c.delete(f'/api/v1/relationships/{rid}').json()['ok'] is True
