from __future__ import annotations

import os,time,traceback
from collections import deque
from contextlib import asynccontextmanager
from uuid import uuid4
from fastapi import Depends,FastAPI,HTTPException,Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from . import schemas
from .database import DATABASE_URL,Base,SessionLocal,engine,get_db
from .migrations import apply_schema_migrations
from .repository import HrosRepository
from .seed import seed_if_empty

APP_VERSION='1.0.0';DIAGNOSTIC_EVENTS=deque(maxlen=200)
def safe_database_name():return 'postgresql' if DATABASE_URL.startswith('postgresql') else 'sqlite'
@asynccontextmanager
async def lifespan(_):
 Base.metadata.create_all(bind=engine);apply_schema_migrations(engine)
 with SessionLocal() as db:seed_if_empty(db)
 yield
app=FastAPI(title='HROS v1 API',description='Human Relationship Operating System: people, moments, perspectives, evidence, memory and principles.',version=APP_VERSION,lifespan=lifespan)
default_origins='http://localhost:8088,http://127.0.0.1:8088,http://localhost:5173,http://127.0.0.1:5173,https://kontrakevich.github.io'
origins=[x.strip() for x in os.getenv('CORS_ORIGINS',default_origins).split(',') if x.strip()]
app.add_middleware(CORSMiddleware,allow_origins=origins,allow_credentials=True,allow_methods=['*'],allow_headers=['*'])
@app.middleware('http')
async def diag(req:Request,call_next):
 trace=req.headers.get('x-trace-id') or str(uuid4());start=time.perf_counter()
 try:r=await call_next(req)
 except Exception as e:
  DIAGNOSTIC_EVENTS.appendleft({'traceId':trace,'method':req.method,'path':req.url.path,'status':500,'durationMs':round((time.perf_counter()-start)*1000,2),'error':f'{type(e).__name__}: {e}','stack':traceback.format_exc(limit=8)})
  return JSONResponse(status_code=500,content={'detail':'Internal server error','traceId':trace})
 DIAGNOSTIC_EVENTS.appendleft({'traceId':trace,'method':req.method,'path':req.url.path,'status':r.status_code,'durationMs':round((time.perf_counter()-start)*1000,2),'error':None});r.headers['x-trace-id']=trace;return r
def fail(e):return HTTPException(422,str(e))
@app.get('/')
def root():return {'product':'HROS','version':APP_VERSION,'docs':'/docs','api':'/api/v1'}
@app.get('/api/v1/health')
def health():return {'status':'ok','product':'HROS','version':APP_VERSION,'database':safe_database_name()}
@app.get('/api/v1/snapshot',response_model=schemas.SnapshotRead)
def snapshot(db:Session=Depends(get_db)):return HrosRepository(db).snapshot()
@app.get('/api/v1/people',response_model=list[schemas.PersonRead])
def people(db:Session=Depends(get_db)):return HrosRepository(db).list_people()
@app.post('/api/v1/people',response_model=schemas.PersonRead,status_code=201)
def create_person(p:schemas.PersonCreate,db:Session=Depends(get_db)):return HrosRepository(db).create_person(p)
@app.patch('/api/v1/people/{id}',response_model=schemas.PersonRead)
def update_person(id:str,p:schemas.PersonUpdate,db:Session=Depends(get_db)):
 try:return HrosRepository(db).update_person(id,p)
 except ValueError as e:raise fail(e) from e
@app.delete('/api/v1/people/{id}')
def delete_person(id:str,db:Session=Depends(get_db)):
 try:return HrosRepository(db).delete_person(id)
 except ValueError as e:raise fail(e) from e
@app.get('/api/v1/relationships',response_model=list[schemas.RelationshipRead])
def relationships(db:Session=Depends(get_db)):return HrosRepository(db).list_relationships()
@app.post('/api/v1/relationships',response_model=schemas.RelationshipRead,status_code=201)
def create_relationship(p:schemas.RelationshipCreate,db:Session=Depends(get_db)):
 try:return HrosRepository(db).create_relationship(p)
 except ValueError as e:raise fail(e) from e
@app.patch('/api/v1/relationships/{id}',response_model=schemas.RelationshipRead)
def update_relationship(id:str,p:schemas.RelationshipUpdate,db:Session=Depends(get_db)):
 try:return HrosRepository(db).update_relationship(id,p)
 except ValueError as e:raise fail(e) from e
@app.delete('/api/v1/relationships/{id}')
def delete_relationship(id:str,db:Session=Depends(get_db)):
 try:return HrosRepository(db).delete_relationship(id)
 except ValueError as e:raise fail(e) from e
@app.get('/api/v1/moments',response_model=list[schemas.MomentRead])
def moments(db:Session=Depends(get_db)):return HrosRepository(db).list_moments()
@app.post('/api/v1/moments',response_model=schemas.MomentRead,status_code=201)
def create_moment(p:schemas.MomentCreate,db:Session=Depends(get_db)):
 try:return HrosRepository(db).create_moment(p)
 except ValueError as e:raise fail(e) from e
@app.patch('/api/v1/moments/{id}',response_model=schemas.MomentRead)
def update_moment(id:str,p:schemas.MomentUpdate,db:Session=Depends(get_db)):
 try:return HrosRepository(db).update_moment(id,p)
 except ValueError as e:raise fail(e) from e
@app.post('/api/v1/moments/{id}/finalize',response_model=schemas.MomentRead)
def finalize_moment(id:str,db:Session=Depends(get_db)):
 try:return HrosRepository(db).finalize_moment(id)
 except ValueError as e:raise fail(e) from e
@app.delete('/api/v1/moments/{id}')
def delete_moment(id:str,db:Session=Depends(get_db)):
 try:return HrosRepository(db).delete_moment(id)
 except ValueError as e:raise fail(e) from e
@app.get('/api/v1/records',response_model=list[schemas.DomainRecordRead])
def records(kind:str|None=None,db:Session=Depends(get_db)):return HrosRepository(db).list_records(kind)
@app.post('/api/v1/records',response_model=schemas.DomainRecordRead,status_code=201)
def create_record(p:schemas.DomainRecordCreate,db:Session=Depends(get_db)):
 try:return HrosRepository(db).create_record(p)
 except ValueError as e:raise fail(e) from e
@app.patch('/api/v1/records/{id}',response_model=schemas.DomainRecordRead)
def update_record(id:str,p:schemas.DomainRecordUpdate,db:Session=Depends(get_db)):
 try:return HrosRepository(db).update_record(id,p)
 except ValueError as e:raise fail(e) from e
@app.delete('/api/v1/records/{id}')
def delete_record(id:str,db:Session=Depends(get_db)):
 try:return HrosRepository(db).delete_record(id)
 except ValueError as e:raise fail(e) from e
@app.get('/api/v1/{kind}/{id}/revisions',response_model=list[schemas.RevisionRead])
def revisions(kind:str,id:str,db:Session=Depends(get_db)):
 if kind not in {'person','relationship','moment','record'}:raise HTTPException(404,'Неизвестный тип сущности')
 return HrosRepository(db).revisions(kind,id)
@app.post('/api/v1/reset',response_model=schemas.SnapshotRead)
def reset(db:Session=Depends(get_db)):
 r=HrosRepository(db);r.clear();seed_if_empty(db);return r.snapshot()
@app.get('/api/v1/diagnostics')
def diagnostics():return {'version':APP_VERSION,'database':safe_database_name(),'corsOrigins':origins,'events':list(DIAGNOSTIC_EVENTS)}
