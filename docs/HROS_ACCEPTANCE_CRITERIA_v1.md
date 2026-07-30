# HROS v1.2 — Acceptance Criteria

## Alignment

- Canonical Blueprint, ideology, ontology, lifecycle, privacy, skills, visual semantics, UI/UX game design and Messenger/Agent Runtime are versioned in repository.
- Product version is `1.2.0`; domain schema remains `1.0.0`.
- README and UI display the same current product direction.
- Blueprint defines live dialogue as the primary input.
- `docs/HROS_MESSENGER_AND_AGENT_RUNTIME_v1.md` is the canonical chat and agent contract.
- `skills/hros-messenger-agent-runtime/SKILL.md` is registered.

## Domain

- Person, Relationship, Moment and DomainRecord remain compatible with schema v1.
- System stores Evidence, Fact, Perspective, Observation, Hypothesis, Verification, Pattern, Principle, MemoryRecord, BookChapter and ConsentPolicy.
- Every knowledge record has provenance, status, confidence, visibility and revision metadata.
- Perspective requires an owner.
- Hypothesis remains distinguishable from Fact and cannot be silently promoted.
- Different perspectives of one moment can coexist.
- Messenger threads, theme, active path and current avatar shell remain outside `hros.snapshot.v1` until their domain contracts are separately canonicalized.

## Full-screen Messenger

- Selecting `Дневник` opens a `100dvh` full-screen Messenger.
- COMMAND UI does not remain interactive behind Messenger.
- Desktop exposes thread list, active chat and optional agent/memory panel.
- Mobile exposes one usable panel at a time and a working return to thread list.
- Layout at 390 CSS px has no horizontal document overflow.
- Thread list supports search.
- User can create separate chats for all registered agents.
- User can pin and mute a thread.
- User can send a message by Enter and create a newline by Shift+Enter.
- Composer grows until its maximum height.
- Message displays time and delivery status.
- User can reply, edit, copy and delete a message.
- Attachment metadata is visible and does not pretend that binary storage already exists.
- Typing state is visible while an agent response is pending.
- Thread can be exported as JSON without secrets.
- Reduced-motion mode disables non-essential animation.

## GPT Agents

- Agent catalog contains `diary`, `relationship`, `memory`, `navigator` and `avatar`.
- UI shows agent identity, purpose, runtime provider and model.
- Direct OpenAI runtime uses OpenAI Agents SDK.
- OpenRouter runtime uses the OpenAI-compatible server-side adapter.
- API key is never included in frontend assets, LocalStorage, response payloads or diagnostics.
- Without a configured server key, API chat returns controlled `503`.
- GitHub Pages uses an explicitly labelled local memory mode and never calls it GPT.
- Agent response includes `writeApplied=false` and `confirmationRequired=true`.

## HROS Memory Gateway

- Agent receives a bounded Context Envelope rather than the entire snapshot.
- Search considers People, Relationships, Moments and DomainRecords.
- Ranking considers query relevance, kind, status and confidence.
- Original, Living and Semantic Memory receive higher retrieval priority.
- Hypotheses remain marked as hypotheses.
- Private record owned by another perspective owner is excluded.
- Used records are returned as `memoryRefs`.
- Model instruction requires inline references in the format `[HROS:record-id]`.
- Missing evidence is stated rather than filled with invented personal facts.
- Messenger info panel displays kind, status, confidence and statement preview for used records.

## Diary and Change Set

- Messenger chat does not modify `hros.snapshot.v1`.
- `Зафиксировать` converts the selected conversation into a DiarySession draft.
- Imported transcript preserves user and assistant messages.
- Imported transcript retains source conversation and agent identifiers.
- Ending the imported session creates an editable Change Set.
- User can include, edit or reject each proposed change.
- Commit button requires explicit confirmation.
- Confirmation stores accepted and rejected change IDs.
- Committed session creates Original Memory with the exact transcript.
- Derived records reference the diary session and Original Memory.
- No agent output is promoted silently.

## COMMAND UI

- `Сегодня` remains the default screen.
- The screen contains exactly one dominant primary action.
- Top-level game navigation contains no more than seven destinations.
- Desktop uses a side command rail.
- Mobile uses a bottom navigation bar.
- Navigation exposes Today, Diary, World, Avatar, Paths, Chronicle and System.
- Existing professional editors remain reachable through System.
- Theme selection supports Family, Adventure and Strategy without changing information architecture.
- Theme and reduced-motion preferences persist outside the domain snapshot.
- Web3D remains available through World and is not required for data editing.

## Avatar and Gamification

- User can select base form, active role, palette and optional modifiers.
- User can preview a relationship context independently of Identity Core.
- Relationship context changes aura or environment, not the value, face or body of the person.
- User can save and restore an Appearance Version.
- Saving or restoring appearance does not modify `hros.snapshot.v1`.
- User can switch active path without deleting other path history.
- No human score, partner score, parent score or love score is displayed.
- No streak penalty, loot box, FOMO timer or reward for private disclosure is present.

## API

- `GET /api/v1/agents` returns catalog and runtime status.
- `POST /api/v1/agents/chat` validates agent, conversation, message, history and memory limit.
- `GET|POST /api/v1/records` works.
- `PATCH|DELETE /api/v1/records/{id}` works with revisions.
- Snapshot groups records by kind.
- Reset restores v1 seed.
- Diagnostics expose version and operational events without private message content or secrets.
- Production target still includes a transactional Diary Change Set endpoint; sequential commit remains compatibility mode.

## Deployment

- `.env.example` documents OpenAI and OpenRouter without real keys.
- Docker passes protected provider variables only to the API service.
- GitHub Pages build contains no API key.
- Pages can operate in local Memory Gateway mode.
- Protected Docker deployment can operate in GPT mode.

## Verification

- Backend tests pass on Python 3.14.
- Agent catalog is tested without external network calls.
- Missing API key produces controlled `503`.
- Production build passes with Node 24 and Vite 8.
- Chromium and WebKit open the deployed base path.
- Browser test verifies `schemaVersion=1.0.0` and product UI version `1.2`.
- Browser test waits for Messenger, Diary and COMMAND readiness.
- Browser test opens Messenger from the Today CTA.
- Browser test finds thread list, active chat and context panel.
- Browser test sends a message through local Memory Gateway and finds HROS references.
- Browser test verifies no snapshot mutation during chat.
- Browser test checks desktop and 390 px mobile layouts.
- Browser test converts chat into Change Set and commits only after confirmation.
- Browser test finds Original Memory, User Confirmation and provenance.
- Browser test verifies existing Moment, Knowledge, Couple and Book interfaces.
- Browser test reports zero console errors.
- GitHub Pages deploy runs only after all checks succeed.
