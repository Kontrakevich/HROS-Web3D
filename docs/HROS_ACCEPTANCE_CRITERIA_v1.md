# HROS v1 — Acceptance Criteria

## Alignment

- Canonical Blueprint, ideology, ontology, lifecycle, privacy, skills, visual semantics and UI/UX game design are versioned in repository.
- README and UI display one current product direction.
- Snapshot and diagnostics use v1 keys and schemaVersion `1.0.0`.
- Blueprint explicitly defines AI Diary as the primary input.
- `docs/HROS_UI_UX_GAME_DESIGN_v1.md` is the canonical interface contract.
- `skills/hros-game-interface-director/SKILL.md` is registered.

## Domain

- Person, Relationship and Moment remain compatible with v0.4.
- System stores Evidence, Fact, Perspective, Observation, Hypothesis, Verification, Pattern, Principle, MemoryRecord, BookChapter and ConsentPolicy.
- Every knowledge record has provenance, status, confidence, visibility and revision metadata.
- Perspective requires an owner.
- Hypothesis remains distinguishable from Fact and cannot be silently promoted.
- Different perspectives of one moment can coexist.
- Playtest theme, active path and avatar appearance remain outside the HROS domain snapshot.

## AI Diary

- Navigation exposes `Дневник` as a primary destination.
- The `Сегодня` CTA routes to the correct diary state: new session, active draft or Change Set review.
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

## COMMAND UI

- `Сегодня` is the default playtest screen.
- The screen contains exactly one dominant primary action.
- Top-level game navigation contains no more than seven destinations.
- Desktop uses a side command rail.
- Mobile uses a bottom navigation bar with touch-sized controls.
- Navigation exposes Today, Diary, World, Avatar, Paths, Chronicle and System.
- Existing professional editors remain reachable through System.
- Theme selection supports Family, Adventure and Strategy without changing information architecture.
- Theme and reduced-motion preferences persist outside the domain snapshot.
- Reduced motion removes non-essential animation while preserving all information.
- Layout at 390 CSS px does not create horizontal document overflow.
- Web3D is available through World but is not required for data editing.

## Avatar Playtest

- User can select base form, active role, palette and optional modifiers.
- User can preview a relationship context independently of Identity Core.
- Relationship context changes aura or environment, not the value, face or body of the person.
- User can save a local Appearance Version.
- User can restore a previous Appearance Version.
- Appearance history is stored in `hros.avatar.appearance.history.v1`.
- Saving or restoring an appearance does not modify `hros.snapshot.v1`.
- UI explicitly labels avatar data as a local playtest preview until Avatar Ontology is canonicalized.

## Paths and Gamification

- User can choose one active path.
- Switching paths does not delete the history or progress of other paths.
- Path progress is explicitly described as a count-based interface indicator derived from related confirmed/observed records.
- No human score, partner score, parent score or love score is displayed.
- No streak penalty, loot box, FOMO timer or reward for private disclosure is present.
- Missions are voluntary and route directly to the relevant action.

## Product

- User can view the knowledge pipeline and create a record with kind, statement, perspective, visibility and links.
- User can open a Book view containing principles and their provenance.
- Privacy status is visible in the UI.
- Original, Semantic and Living Memory are displayed separately.
- Web3D remains available and does not own persistence logic.
- Chronicle displays confirmed moments with source/status context.

## API

- `GET|POST /api/v1/records` works.
- `PATCH|DELETE /api/v1/records/{id}` works with revisions.
- Snapshot groups records by kind.
- Reset restores v1 seed.
- Diagnostics expose version and operational events without private content.
- Production target includes a server-side transactional Diary Change Set endpoint; sequential record commit remains compatibility mode until implemented.
- Avatar settings remain local until Avatar Ontology, repository and API contracts are approved.

## Migration

- Existing v0.2/v0.4 local snapshot migrates automatically without deleting the source key.
- Existing entity IDs and counts are retained.
- Migration is idempotent.
- COMMAND UI preferences do not alter migration behavior.

## Verification

- Backend tests pass.
- Production build passes.
- Chromium and WebKit open the deployed base path.
- Browser test verifies `schemaVersion=1.0.0`.
- Browser test waits for `window.__HROS_COMMAND_UI__.ready`.
- Browser test opens the default Today screen and finds one dominant CTA.
- Browser test changes theme and verifies no snapshot mutation.
- Browser test saves and restores an Appearance Version and verifies no snapshot mutation.
- Browser test switches the active path and verifies no snapshot mutation.
- Browser test checks the 390 px mobile layout and absence of horizontal overflow.
- Browser test verifies no snapshot changes before diary confirmation.
- Browser test commits a diary session and finds its Original Memory.
- Browser test verifies Knowledge view, creation/persistence of a Perspective, Couple Mode, Book and zero console errors.
- GitHub Pages deploy runs only after all checks succeed.
