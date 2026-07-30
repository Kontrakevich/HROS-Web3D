# HROS 1.1 — Acceptance Criteria

## Alignment

- Blueprint, ideology, ontology, lifecycle, privacy, skills, visual semantics and UI/UX game design are versioned in repository.
- README and UI display `HROS COMMAND 1.1`.
- Snapshot and diagnostics use schemaVersion `1.1.0`.
- Blueprint defines AI Diary as the primary input.
- `docs/HROS_AVATAR_ONTOLOGY_v1.1.md` is canonical.
- `docs/HROS_COMMAND_PRODUCTION_v1.1.md` describes the working release.
- `skills/avatar-evolution/SKILL.md` is registered.

## Domain

- Person, Relationship, Moment and existing knowledge kinds remain compatible.
- Every knowledge record has provenance, status, confidence, visibility and version metadata.
- Perspective requires an owner.
- Hypothesis cannot be silently promoted to Fact.
- Different perspectives can coexist.
- System stores `avatar_profile`, `avatar_appearance`, `avatar_change_set`, `avatar_confirmation` and `development_path`.
- Avatar domain records require a perspective owner.
- Theme and reduced motion remain outside the domain snapshot.

## AI Diary

- Navigation exposes `Дневник` as a primary destination.
- `Сегодня` routes to new session, active draft or Change Set review.
- Messages remain outside the main snapshot while session is active or in review.
- Ending a session creates an editable Change Set.
- User can include, edit or reject each proposed change.
- Commit requires explicit confirmation.
- Confirmation stores accepted and rejected IDs.
- Committed session creates Original Memory with exact transcript.
- Derived records reference session and Original Memory.
- No AI draft is promoted silently.
- UI states whether external LLM orchestration is connected.

## COMMAND UI

- `Сегодня` is the default screen.
- The screen contains exactly one dominant primary action.
- Top-level navigation contains no more than seven destinations.
- Desktop uses side rail; mobile uses bottom navigation.
- Today, Diary, World, Avatar, Paths, Chronicle and System are available.
- Existing professional editors remain reachable.
- Family, Adventure and Strategy themes preserve information architecture.
- Reduced motion removes non-essential motion without removing information.
- Layout at 390 CSS px has no horizontal document overflow.
- Web3D is available through World but not required for editing.
- Production UI does not show internal playtest labels.

## Avatar

- User can select base form, role, palette and modifiers.
- User can preview relationship context independently of Identity Core.
- Relationship context changes aura/environment, not value, face or body.
- Preview does not change `avatar_profile`.
- Saving creates `avatar_change_set` with state `awaiting_confirmation`.
- Review displays previous and proposed forms and evidence.
- Commit is disabled until explicit confirmation.
- Confirm atomically updates profile, creates immutable appearance and confirmation, and finalizes Change Set.
- Reject leaves profile unchanged.
- Repeated confirm is idempotent and creates no duplicate appearance.
- Previous Appearance Version remains visible in Chronicle.
- Restoring a previous form creates a new Change Set.
- AI/system proposal without evidence is rejected.
- Avatar records default to private.

## Paths and gamification

- User can choose one active path.
- Exactly one path is active per owner.
- Switching paths does not delete history or progress of other paths.
- Path progress is described as an interface indicator based on related records.
- No human score, partner score, parent score or love score is displayed.
- No streak penalty, loot box, FOMO timer or reward for private disclosure is present.
- Missions are voluntary and route directly to relevant actions.

## Product

- Knowledge pipeline and manual record editor remain operational.
- Book contains principles and provenance.
- Privacy status is visible.
- Original, Semantic and Living Memory are separate.
- Chronicle displays confirmed moments and Avatar Appearance Versions.
- Web3D does not own persistence logic.

## API

- Existing People, Relationships, Moments, Records, Snapshot, Revisions and Diagnostics endpoints work.
- `GET /api/v1/avatar/state` returns owner, profile, appearances, pending Change Set and paths.
- `POST /api/v1/avatar/change-sets` creates draft without changing profile.
- `POST /api/v1/avatar/change-sets/{id}/confirm` requires `confirmed=true` and is idempotent.
- `POST /api/v1/avatar/change-sets/{id}/reject` leaves profile unchanged.
- `POST /api/v1/paths/{path_id}/activate` persists exclusive active path.
- API confirmation uses one transaction.
- Diagnostics do not expose private content.

## Migration

- Existing 1.0 local snapshot migrates automatically to 1.1.
- Existing entity IDs and counts are retained.
- Playtest avatar configuration migrates to Avatar Profile.
- Playtest appearance history migrates to immutable Avatar Appearance records.
- Playtest active path migrates to Development Path.
- Migration is idempotent.
- UI-only theme and reduced-motion preferences do not alter domain migration.

## Verification

- Backend tests pass.
- Production build passes.
- Chromium and WebKit open the deployed base path.
- Browser test verifies schemaVersion `1.1.0` and production command version.
- Browser test finds one dominant Today CTA.
- Browser test changes theme without snapshot mutation.
- Browser test creates Avatar Change Set and verifies no profile mutation during review.
- Browser test confirms and finds updated profile, immutable appearance and confirmation.
- Browser test activates an exclusive path.
- Browser test verifies Chronicle and 390px mobile layout.
- Browser test verifies no diary snapshot changes before confirmation.
- Browser test commits diary session and finds Original Memory.
- Browser test verifies Knowledge view and zero console errors.
- GitHub Pages deploy runs only after all checks succeed.
