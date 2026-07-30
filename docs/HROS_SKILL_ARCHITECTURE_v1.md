# HROS v1 — Skill Architecture

Каждое действие системы оформляется как переиспользуемый skill, совместимый с n8n.

## Обязательные skills

1. AI Diary Session
2. Interview Session
3. Person Profile
4. Relationship State
5. Moment Capture
6. Action Impact
7. Evidence Intake
8. Perspective Capture
9. Observation Extraction
10. Hypothesis Formation
11. Hypothesis Verification
12. Pattern Detection
13. Principle Synthesis
14. Memory Projection
15. Book Builder
16. Consent and Visibility
17. Import/Export
18. Diagnostic Package
19. n8n Workflow Adapter

AI Diary Session является orchestrator skill: он принимает живой диалог, вызывает специализированные skills, собирает Change Set и передаёт его на User Confirmation. Он не имеет права самостоятельно выполнить commit.

## Контракт skill

Каждый каталог `skills/<skill-name>/` содержит:

```text
SKILL.md
input.schema.json
output.schema.json
examples/
```

`SKILL.md` обязательно описывает:

- назначение;
- входы и выходы;
- предусловия;
- ограничения;
- запрещённые преобразования;
- критерии качества;
- коды ошибок;
- диагностику без секретов;
- идемпотентность;
- версию контракта;
- схему вызова n8n.

## Универсальный n8n envelope

```json
{
  "skill": "ai-diary-session",
  "contractVersion": "1.0.0",
  "traceId": "uuid",
  "actorId": "person-id",
  "workspaceId": "workspace-id",
  "input": {},
  "privacy": {"visibility": "private"},
  "result": {},
  "diagnostics": {"status": "ok", "warnings": []}
}
```

## Правила AI-skills

- не изменять Original Memory;
- не создавать Fact из интерпретации;
- гипотезу маркировать как hypothesis;
- сохранять supporting/contradicting evidence;
- не повышать visibility;
- возвращать confidence и причины неопределённости;
- поддерживать повторный запуск без дублирования записей;
- не выполнять commit Change Set без UserConfirmation;
- сохранять привязку каждого вывода к sessionId и messageId.
