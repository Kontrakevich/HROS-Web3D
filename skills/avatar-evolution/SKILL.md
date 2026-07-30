# Skill: Avatar Evolution

## Назначение

Управляет жизненным циклом визуального аватара HROS: формирует объяснимое предложение изменения, сохраняет изолированный Change Set, проводит подтверждение, создаёт неизменяемую Appearance Version и обновляет текущий Avatar Profile.

## Контракт

- Skill ID: `avatar-evolution`
- Contract version: `1.1.0`
- Execution model: `propose → review → explicit confirmation → atomic commit`
- n8n compatibility: yes

## Входы

- `ownerId`;
- `currentAvatarProfile`;
- `proposedConfig`;
- `reason`;
- `proposedBy: user|ai|system`;
- `evidenceIds`;
- `visibility`;
- `idempotencyKey`;
- `traceId`;
- `repositoryMode`;
- `confirmation`.

## Выходы

До подтверждения:

- `avatarChangeSet`;
- `beforeConfig`;
- `proposedConfig`;
- `sourceSummary`;
- `safetyDiagnostics`.

После подтверждения:

- `avatarProfile`;
- `avatarAppearance`;
- `avatarConfirmation`;
- `finalizedChangeSet`;
- `revisionMetadata`;
- `diagnostics`.

## Ограничения

1. Skill не меняет `Person` или Identity Core.
2. Proposal не применяется без `confirmation.accepted=true`.
3. AI/system proposal без `evidenceIds` отклоняется.
4. Relationship Context влияет только на ауру, окружение и совместные символы.
5. Skill не создаёт human score, love score или рейтинг личности.
6. Existing Appearance Version не перезаписывается.
7. Restore выполняется как новый proposal.
8. Visibility по умолчанию `private` и не увеличивается автоматически.
9. Диагностика не содержит private diary text.
10. Commit идемпотентен по Change Set.

## Алгоритм

```text
validate input
→ normalize config
→ compare with current profile
→ validate source policy
→ create avatar_change_set(draft)
→ return review payload
→ receive explicit confirmation
→ begin transaction
→ create avatar_confirmation
→ create avatar_appearance(finalized)
→ update avatar_profile
→ finalize avatar_change_set
→ commit transaction
→ return audit bundle
```

## Валидация конфигурации

```json
{
  "base": "explorer|creator|guardian",
  "role": "base|creator|athlete|leader|father",
  "palette": "cyan|amber|violet|green",
  "modifiers": ["ai-orbit", "sport-band", "family-emblem", "architecture-grid"],
  "relationshipContext": "neutral|support|distance|tension"
}
```

Неизвестные значения запрещены, modifiers уникальны, ownerId обязан существовать. Автоматическое предложение требует существующих evidence IDs.

## Критерии качества

- профиль не изменяется на стадии draft/review;
- confirmation создаёт ровно одну Appearance Version;
- повторный confirm не создаёт дублей;
- reject оставляет профиль без изменений;
- before/proposed доступны пользователю;
- source и confidence отображаются;
- old appearance остаётся в Chronicle;
- LocalStorage и API дают эквивалентный результат;
- browser и backend tests проходят;
- console errors отсутствуют.

## Диагностика

- `AVATAR_OWNER_MISSING`
- `AVATAR_CONFIG_INVALID`
- `AVATAR_NO_CHANGES`
- `AVATAR_SOURCE_REQUIRED`
- `AVATAR_CHANGESET_NOT_DRAFT`
- `AVATAR_CONFIRMATION_REQUIRED`
- `AVATAR_DUPLICATE_CONFIRMATION`
- `AVATAR_ATOMIC_COMMIT_FAILED`
- `AVATAR_VISIBILITY_ESCALATION`
- `AVATAR_IDENTITY_MUTATION_ATTEMPT`

## n8n envelope

```json
{
  "skill": "avatar-evolution",
  "contractVersion": "1.1.0",
  "traceId": "uuid",
  "actorId": "person-id",
  "workspaceId": "workspace-id",
  "input": {
    "ownerId": "person-id",
    "proposedConfig": {},
    "proposedBy": "user",
    "evidenceIds": [],
    "idempotencyKey": "uuid"
  },
  "privacy": {"visibility": "private"},
  "result": {
    "changeSet": {},
    "profile": null,
    "appearance": null,
    "confirmation": null
  },
  "diagnostics": {"status": "ok", "warnings": []}
}
```

## Совместимость

- `hros-game-interface-director`;
- `ai-diary-session`;
- `person-profile`;
- `relationship-state`;
- `evidence-intake`;
- `consent-visibility`;
- `diagnostic-package`;
- `n8n-workflow-adapter`.
