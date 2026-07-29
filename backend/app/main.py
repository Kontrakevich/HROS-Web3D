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
from .repository import HrosRepository
from .seed import seed_if_empty
APP_VERSION='0.3.0';DIAGNOSTIC_EVENTS=deque(maxlen=200)
def safe_database_name():return 'postgresql' if DATABASE_URL.startswith('postgresql') else 'sqlite'
@asynccontextmanager
async def lifespan(_):
 Base.metadata.create_all(bind=engine)
 with SessionLocal() as db:seed_if_empty(db)
 yield
app=FastAPI(title='HROS Data Core API',version=APP_VERSION,lifespan=lifespan)
origins=[x.strip() for x in os.getenv('CORS_ORIGINS','*').split(',') if x.strip()]
app.add_middleware(CORSMiddleware,allow_origins=origins,allow_credentials=origins!=['*'],allow_methods=['*'],allow_headers=['*'])
@app.middleware('http')
async def diag(req:Request,call_next):
 trace=req.headers.get('x-trace-id') or str(uuid4());start=time.perf_counter()
 try:r=await call_next(req)
 except Exception as e:DIAGNOSTIC_EVENTS.appendleft({'traceId':trace,'path':req.url.path,'error':str(e),'stack':traceback.format_exc(limit=8)});return JSONResponse(status_code=500,content={'detail':'Internal server error','traceId':trace})
 DIAGNOSTIC_EVENTS.appendleft({'traceId':trace,'method':req.method,'path':req.url.path,'status':r.status_code,'durationMs':round((time.perf_counter()-start)*1000,2)});r.headers['x-trace-id']=trace;return r
@app.get('/')
def root():return {'product':'HROS','version':APP_VERSION,'docs':'/docs','api':'/api/v1'}
@app.get('/api/v1/health')
def health():return {'status':'ok','product':'HROS','version':APP_VERSION,'database':safe_database_name()}
@app.get('/api/v1/snapshot',response_model=schemas.SnapshotRead)
def snap(db:Session=Depends(get_db)):return HrosRepository(db).snapshot()
@app.get('/api/v1/people')
def people(db:Session=Depends(get_db)):return HrosRepository(db).list_people()
@app.post('/api/v1/people',status_code=201)
def create_person(p:schemas.PersonCreate,db:Session=Depends(get_db)):return HrosRepository(db).create_person(p)
@app.patch('/api/v1/people/{id}')
def update_person(id:str,p:schemas.PersonUpdate,db:Session=Depends(get_db)):
 try:return HrosRepository(db).update_person(id,p)
 except ValueError as e:raise HTTPException(422,str(e)) from e
@app.delete('/api/v1/people/{id}')
def delete_person(id:str,db:Session=Depends(get_db)):
 try:return HrosRepository(db).delete_person(id)
 except ValueError as e:raise HTTPException(422,str(e)) from e
@app.get('/api/v1/relationships')
def relationships(db:Session=Depends(get_db)):return HrosRepository(db).list_relationships()
@app.post('/api/v1/relationships',status_code=201)
def create_relationship(p:schemas.RelationshipCreate,db:Session=Depends(get_db)):
 try:return HrosRepository(db).create_relationship(p)
 except ValueError as e:raise HTTPException(422,str(e)) from e
@app.patch('/api/v1/relationships/{id}')
def update_relationship(id:str,p:schemas.RelationshipUpdate,db:Session=Depends(get_db)):
 try:return HrosRepository(db).update_relationship(id,p)
 except ValueError as e:raise HTTPException(422,str(e)) from e
@app.delete('/api/v1/relationships/{id}')
def delete_relationship(id:str,db:Session=Depends(get_db)):
 try:return HrosRepository(db).delete_relationship(id)
 except ValueError as e:raise HTTPException(422,str(e)) from e
@app.get('/api/v1/history/{entity_type}/{entity_id}')
def history(entity_type:str,entity_id:str,db:Session=Depends(get_db)):return HrosRepository(db).revisions(entity_type,entity_id)
@app.get('/api/v1/moments')
def moments(db:Session=Depends(get_db)):return HrosRepository(db).list_moments()
@app.post('/api/v1/moments',status_code=201)
def create_moment(p:schemas.MomentCreate,db:Session=Depends(get_db)):return HrosRepository(db).create_moment(p)
@app.post('/api/v1/reset')
def reset(db:Session=Depends(get_db)):
 r=HrosRepository(db);r.clear();seed_if_empty(db);return r.snapshot()
@app.get('/api/v1/diagnostics')
def diagnostics():return {'version':APP_VERSION,'database':safe_database_name(),'events':list(DIAGNOSTIC_EVENTS)}
