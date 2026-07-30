from __future__ import annotations

import os
import time
import traceback
from collections import deque
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import Body, Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from . import avatar_service, schemas
from .database import DATABASE_URL, Base, SessionLocal, engine, get_db
from .migrations import apply_schema_migrations
from .repository import HrosRepository
from .seed import seed_if_empty

APP_VERSION = "1.1.0"
DIAGNOSTIC_EVENTS = deque(maxlen=200)
KIND_COLLECTIONS = {
    "evidence": "evidence", "fact": "facts", "perspective": "perspectives", "action": "actions",
    "person_facet": "personFacets", "relationship_state": "relationshipStates",
    "observation": "observations", "hypothesis": "hypotheses", "verification": "verifications",
    "pattern": "patterns", "principle": "principles", "original_memory": "originalMemory",
    "semantic_memory": "semanticMemory", "living_memory": "livingMemory",
    "interview_session": "interviewSessions", "interview_question": "interviewQuestions",
    "interview_answer": "interviewAnswers", "book_chapter": "bookChapters",
    "narrative_fragment": "narrativeFragments", "consent_policy": "consentPolicies",
    "avatar_profile": "avatarProfiles", "avatar_appearance": "avatarAppearances",
    "avatar_change_set": "avatarChangeSets", "avatar_confirmation": "avatarConfirmations",
    "development_path": "developmentPaths",
}


def safe_database_name() -> str:
    return "postgresql" if DATABASE_URL.startswith("postgresql") else "sqlite"


@asynccontextmanager
async def lifespan(_):
    Base.metadata.create_all(bind=engine)
    apply_schema_migrations(engine)
    with SessionLocal() as db:
        seed_if_empty(db)
        avatar_service.ensure_defaults(db)
    yield


app = FastAPI(
    title="HROS 1.1 API",
    description="Human Relationship Operating System: AI diary, people, moments, knowledge, avatar evolution and development paths.",
    version=APP_VERSION,
    lifespan=lifespan,
)
default_origins = "http://localhost:8088,http://127.0.0.1:8088,http://localhost:5173,http://127.0.0.1:5173,https://kontrakevich.github.io"
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", default_origins).split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.middleware("http")
async def diagnostics_middleware(request: Request, call_next):
    trace_id = request.headers.get("x-trace-id") or str(uuid4())
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as error:
        DIAGNOSTIC_EVENTS.appendleft({
            "traceId": trace_id, "method": request.method, "path": request.url.path, "status": 500,
            "durationMs": round((time.perf_counter() - started) * 1000, 2),
            "error": f"{type(error).__name__}: {error}", "stack": traceback.format_exc(limit=8),
        })
        return JSONResponse(status_code=500, content={"detail": "Internal server error", "traceId": trace_id})
    DIAGNOSTIC_EVENTS.appendleft({
        "traceId": trace_id, "method": request.method, "path": request.url.path, "status": response.status_code,
        "durationMs": round((time.perf_counter() - started) * 1000, 2), "error": None,
    })
    response.headers["x-trace-id"] = trace_id
    return response


def fail(error: Exception) -> HTTPException:
    return HTTPException(422, str(error))


def snapshot_v11(db: Session) -> dict:
    avatar_service.ensure_defaults(db)
    result = HrosRepository(db).snapshot()
    result["meta"] = {
        **result.get("meta", {}), "product": "HROS", "version": APP_VERSION,
        "schemaVersion": APP_VERSION, "commandVersion": "production-1.1",
    }
    for collection in KIND_COLLECTIONS.values():
        result[collection] = []
    for item in result.get("records", []):
        collection = KIND_COLLECTIONS.get(item.get("kind"))
        if collection:
            result[collection].append(item)
    return result


@app.get("/")
def root():
    return {"product": "HROS", "version": APP_VERSION, "docs": "/docs", "api": "/api/v1"}


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "product": "HROS", "version": APP_VERSION, "commandVersion": "production-1.1", "database": safe_database_name()}


@app.get("/api/v1/snapshot")
def snapshot(db: Session = Depends(get_db)):
    return snapshot_v11(db)


@app.get("/api/v1/people", response_model=list[schemas.PersonRead])
def people(db: Session = Depends(get_db)):
    return HrosRepository(db).list_people()


@app.post("/api/v1/people", response_model=schemas.PersonRead, status_code=201)
def create_person(payload: schemas.PersonCreate, db: Session = Depends(get_db)):
    return HrosRepository(db).create_person(payload)


@app.patch("/api/v1/people/{entity_id}", response_model=schemas.PersonRead)
def update_person(entity_id: str, payload: schemas.PersonUpdate, db: Session = Depends(get_db)):
    try:
        return HrosRepository(db).update_person(entity_id, payload)
    except ValueError as error:
        raise fail(error) from error


@app.delete("/api/v1/people/{entity_id}")
def delete_person(entity_id: str, db: Session = Depends(get_db)):
    try:
        return HrosRepository(db).delete_person(entity_id)
    except ValueError as error:
        raise fail(error) from error


@app.get("/api/v1/relationships", response_model=list[schemas.RelationshipRead])
def relationships(db: Session = Depends(get_db)):
    return HrosRepository(db).list_relationships()


@app.post("/api/v1/relationships", response_model=schemas.RelationshipRead, status_code=201)
def create_relationship(payload: schemas.RelationshipCreate, db: Session = Depends(get_db)):
    try:
        return HrosRepository(db).create_relationship(payload)
    except ValueError as error:
        raise fail(error) from error


@app.patch("/api/v1/relationships/{entity_id}", response_model=schemas.RelationshipRead)
def update_relationship(entity_id: str, payload: schemas.RelationshipUpdate, db: Session = Depends(get_db)):
    try:
        return HrosRepository(db).update_relationship(entity_id, payload)
    except ValueError as error:
        raise fail(error) from error


@app.delete("/api/v1/relationships/{entity_id}")
def delete_relationship(entity_id: str, db: Session = Depends(get_db)):
    try:
        return HrosRepository(db).delete_relationship(entity_id)
    except ValueError as error:
        raise fail(error) from error


@app.get("/api/v1/moments", response_model=list[schemas.MomentRead])
def moments(db: Session = Depends(get_db)):
    return HrosRepository(db).list_moments()


@app.post("/api/v1/moments", response_model=schemas.MomentRead, status_code=201)
def create_moment(payload: schemas.MomentCreate, db: Session = Depends(get_db)):
    try:
        return HrosRepository(db).create_moment(payload)
    except ValueError as error:
        raise fail(error) from error


@app.patch("/api/v1/moments/{entity_id}", response_model=schemas.MomentRead)
def update_moment(entity_id: str, payload: schemas.MomentUpdate, db: Session = Depends(get_db)):
    try:
        return HrosRepository(db).update_moment(entity_id, payload)
    except ValueError as error:
        raise fail(error) from error


@app.post("/api/v1/moments/{entity_id}/finalize", response_model=schemas.MomentRead)
def finalize_moment(entity_id: str, db: Session = Depends(get_db)):
    try:
        return HrosRepository(db).finalize_moment(entity_id)
    except ValueError as error:
        raise fail(error) from error


@app.delete("/api/v1/moments/{entity_id}")
def delete_moment(entity_id: str, db: Session = Depends(get_db)):
    try:
        return HrosRepository(db).delete_moment(entity_id)
    except ValueError as error:
        raise fail(error) from error


@app.get("/api/v1/records")
def records(kind: str | None = None, db: Session = Depends(get_db)):
    return HrosRepository(db).list_records(kind)


@app.post("/api/v1/records", response_model=schemas.DomainRecordRead, status_code=201)
def create_record(payload: schemas.DomainRecordCreate, db: Session = Depends(get_db)):
    try:
        return HrosRepository(db).create_record(payload)
    except ValueError as error:
        raise fail(error) from error


@app.patch("/api/v1/records/{entity_id}", response_model=schemas.DomainRecordRead)
def update_record(entity_id: str, payload: schemas.DomainRecordUpdate, db: Session = Depends(get_db)):
    try:
        return HrosRepository(db).update_record(entity_id, payload)
    except ValueError as error:
        raise fail(error) from error


@app.delete("/api/v1/records/{entity_id}")
def delete_record(entity_id: str, db: Session = Depends(get_db)):
    try:
        return HrosRepository(db).delete_record(entity_id)
    except ValueError as error:
        raise fail(error) from error


@app.get("/api/v1/avatar/state")
def avatar_state(ownerId: str | None = None, db: Session = Depends(get_db)):
    try:
        return avatar_service.state(db, ownerId)
    except ValueError as error:
        raise fail(error) from error


@app.post("/api/v1/avatar/change-sets", status_code=201)
def create_avatar_change_set(payload: dict = Body(...), db: Session = Depends(get_db)):
    try:
        return avatar_service.create_change_set(db, payload)
    except ValueError as error:
        raise fail(error) from error


@app.post("/api/v1/avatar/change-sets/{change_set_id}/confirm")
def confirm_avatar_change_set(change_set_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    try:
        return avatar_service.confirm_change_set(db, change_set_id, payload)
    except ValueError as error:
        raise fail(error) from error


@app.post("/api/v1/avatar/change-sets/{change_set_id}/reject")
def reject_avatar_change_set(change_set_id: str, payload: dict | None = Body(default=None), db: Session = Depends(get_db)):
    try:
        return avatar_service.reject_change_set(db, change_set_id, payload or {})
    except ValueError as error:
        raise fail(error) from error


@app.post("/api/v1/paths/{path_id}/activate")
def activate_development_path(path_id: str, payload: dict | None = Body(default=None), db: Session = Depends(get_db)):
    try:
        return avatar_service.activate_path(db, path_id, (payload or {}).get("ownerId"))
    except ValueError as error:
        raise fail(error) from error


@app.get("/api/v1/{kind}/{entity_id}/revisions", response_model=list[schemas.RevisionRead])
def revisions(kind: str, entity_id: str, db: Session = Depends(get_db)):
    if kind not in {"person", "relationship", "moment", "record"}:
        raise HTTPException(404, "Неизвестный тип сущности")
    return HrosRepository(db).revisions(kind, entity_id)


@app.post("/api/v1/reset")
def reset(db: Session = Depends(get_db)):
    repository = HrosRepository(db)
    repository.clear()
    seed_if_empty(db)
    avatar_service.ensure_defaults(db)
    return snapshot_v11(db)


@app.get("/api/v1/diagnostics")
def diagnostics():
    return {"version": APP_VERSION, "database": safe_database_name(), "corsOrigins": origins, "events": list(DIAGNOSTIC_EVENTS)}
