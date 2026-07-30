# HROS v1 — Acceptance Criteria

## Alignment

- Canonical Blueprint, ontology, lifecycle, privacy, skills and visual semantics are versioned in repository.
- README and UI display one current product version.
- Snapshot and diagnostics use v1 keys and schemaVersion `1.0.0`.

## Domain

- Person, Relationship and Moment remain compatible with v0.4.
- System stores Evidence, Fact, Perspective, Observation, Hypothesis, Verification, Pattern, Principle, MemoryRecord, BookChapter and ConsentPolicy.
- Every knowledge record has provenance, status, confidence, visibility and revision metadata.
- Perspective requires an owner.
- Hypothesis remains distinguishable from Fact and cannot be silently promoted.
- Different perspectives of one moment can coexist.

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

## Migration

- Existing v0.2/v0.4 local snapshot migrates automatically without deleting the source key.
- Existing entity IDs and counts are retained.
- Migration is idempotent.

## Verification

- Backend tests pass.
- Production build passes.
- Chromium and WebKit open the deployed base path.
- Browser test verifies `schemaVersion=1.0.0`, Knowledge view, creation/persistence of a Perspective, Book view and zero console errors.
- GitHub Pages deploy runs only after all checks succeed.