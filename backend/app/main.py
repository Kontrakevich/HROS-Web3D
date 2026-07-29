from __future__ import annotations

import os
import time
import traceback
from collections import deque
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from . import schemas
from .database import DATABASE_URL, Base, SessionLocal, engine, get_db
from .repository import HrosRepository
from .seed import seed_if_empty

APP_VERSION = "0.2.0"
DIAGNOSTIC_EVENTS: deque[dict] = deque(maxlen=200)


def safe_database_name() -> str:
    return "postgresql" if DATABASE_URL.startswith("postgresql") else "sqlite"


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_if_empty(db)
    yield


app = FastAPI(
    title="HROS Data Core API",
    description="Repository Service for people, relationships and moments.",
    version=APP_VERSION,
    lifespan=lifespan,
)

origins = [item.strip() for item in os.getenv("CORS_ORIGINS", "*").split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def diagnostics_middleware(request: Request, call_next):
    trace_id = request.headers.get("x-trace-id") or str(uuid4())
    started = time.perf_counter()
    status = 500
    error = None
    try:
        response = await call_next(request)
        status = response.status_code
    except Exception as exc:
        error = f"{type(exc).__name__}: {exc}"
        DIAGNOSTIC_EVENTS.appendleft({
            "traceId": trace_id,
            "method": request.method,
            "path": request.url.path,
            "status": status,
            "durationMs": round((time.perf_counter() - started) * 1000, 2),
            "error": error,
            "stack": traceback.format_exc(limit=8),
        })
        return JSONResponse(status_code=500, content={"detail": "Internal server error", "traceId": trace_id})
    duration = round((time.perf_counter() - started) * 1000, 2)
    DIAGNOSTIC_EVENTS.appendleft({
        "traceId": trace_id,
        "method": request.method,
        "path": request.url.path,
        "status": status,
        "durationMs": duration,
        "error": error,
    })
    response.headers["x-trace-id"] = trace_id
    return response


@app.get("/")
def root() -> dict:
    return {"product": "HROS", "version": APP_VERSION, "docs": "/docs", "api": "/api/v1"}


@app.get("/api/v1/health")
def health() -> dict:
    return {"status": "ok", "product": "HROS", "version": APP_VERSION, "database": safe_database_name()}


@app.get("/api/v1/snapshot", response_model=schemas.SnapshotRead)
def snapshot(db: Session = Depends(get_db)) -> dict:
    return HrosRepository(db).snapshot()


@app.get("/api/v1/people", response_model=list[schemas.PersonRead])
def list_people(db: Session = Depends(get_db)) -> list[dict]:
    return HrosRepository(db).list_people()


@app.post("/api/v1/people", response_model=schemas.PersonRead, status_code=201)
def create_person(payload: schemas.PersonCreate, db: Session = Depends(get_db)) -> dict:
    return HrosRepository(db).create_person(payload)


@app.get("/api/v1/relationships", response_model=list[schemas.RelationshipRead])
def list_relationships(db: Session = Depends(get_db)) -> list[dict]:
    return HrosRepository(db).list_relationships()


@app.post("/api/v1/relationships", response_model=schemas.RelationshipRead, status_code=201)
def create_relationship(payload: schemas.RelationshipCreate, db: Session = Depends(get_db)) -> dict:
    try:
        return HrosRepository(db).create_relationship(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/v1/moments", response_model=list[schemas.MomentRead])
def list_moments(db: Session = Depends(get_db)) -> list[dict]:
    return HrosRepository(db).list_moments()


@app.post("/api/v1/moments", response_model=schemas.MomentRead, status_code=201)
def create_moment(payload: schemas.MomentCreate, db: Session = Depends(get_db)) -> dict:
    try:
        return HrosRepository(db).create_moment(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/v1/reset", response_model=schemas.SnapshotRead)
def reset(db: Session = Depends(get_db)) -> dict:
    repository = HrosRepository(db)
    repository.clear()
    seed_if_empty(db)
    return repository.snapshot()


@app.get("/api/v1/diagnostics")
def diagnostics() -> dict:
    return {
        "version": APP_VERSION,
        "database": safe_database_name(),
        "events": list(DIAGNOSTIC_EVENTS),
    }
