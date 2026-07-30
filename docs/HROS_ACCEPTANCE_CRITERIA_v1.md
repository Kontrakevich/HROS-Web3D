# HROS v1 — Acceptance Criteria

## Alignment

- Canonical Blueprint, ideology, ontology, lifecycle, privacy, skills and visual semantics are versioned in repository.
- README and UI display one current product version.
- Snapshot and diagnostics use v1 keys and schemaVersion `1.0.0`.
- Blueprint explicitly defines AI Diary as the primary input.

## Domain

- Person, Relationship and Moment remain compatible with v0.4.
- System stores Evidence, Fact, Perspective, Observation, Hypothesis, Verification, Pattern, Principle, MemoryRecord, BookChapter and ConsentPolicy.
- Every knowledge record has provenance, status, confidence, visibility and revision metadata.
- Perspective requires an owner.
- Hypothesis remains distinguishable from Fact and cannot be silently promoted.
- Different perspectives of one moment can coexist.

## AI Diary

- Navigation exposes `ИИ-дневник` as the primary input section.
- User can create a diary session and enter a natural-language response.
- Messages remain outside the main HROS snapshot while session is active or in review.
- Ending a session creates an editable Change Set.
- User can include, edit or reject each proposed change.
- Commit button requires explicit confirmation.
- Confirmation stores accepted and rejected change IDs.
- Committed session creates Original Memory with the exact transcript.
- Derived records reference the diary session and Original Memory.
- No AI draft is promoted silently.
- UI states clearly whether LLM orchestration is connected or only the safe guided mode is active.

## Product

- User can view the knowledge pipeline and create a record with kind, statement, perspective, visibility and links.
- User can open a Book view containing principles and their provenance.
- Privacy status is visible in the UI.
- Original, Semantic and Living Memory are displayed separately.
- Web3D remains available and does not own persistence logic.

## API

- `GET|POST /api/v1/records` works.
- `PATCH|DELETE /api/v1/records/{id}` works with revisions.
- Snapshot groups records by kind.
- Reset restores v1 seed.
- Diagnostics expose version and operational events without private content.
- Production target includes a server-side transactional Diary Change Set endpoint; sequential record commit remains compatibility mode until implemented.

## Migration

- Existing v0.2/v0.4 local snapshot migrates automatically without deleting the source key.
- Existing entity IDs and counts are retained.
- Migration is idempotent.

## Verification

- Backend tests pass.
- Production build passes.
- Chromium and WebKit open the deployed base path.
- Browser test verifies `schemaVersion=1.0.0`.
- Browser test verifies no snapshot changes before diary confirmation.
- Browser test commits a diary session and finds its Original Memory.
- Browser test verifies Knowledge view, creation/persistence of a Perspective, Couple Mode, Book and zero console errors.
- GitHub Pages deploy runs only after all checks succeed.
