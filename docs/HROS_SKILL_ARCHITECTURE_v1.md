# HROS v1 — Skill Architecture

Каждое действие системы оформляется как переиспользуемый skill, совместимый с n8n.

## Обязательные skills

1. Person Profile
2. Relationship State
3. Moment Capture
4. Action Impact
5. Evidence Intake
6. Perspective Capture
7. Interview Session
8. Observation Extraction
9. Hypothesis Formation
10. Hypothesis Verification
11. Pattern Detection
12. Principle Synthesis
13. Memory Projection
14. Book Builder
15. Consent and Visibility
16. Import/Export
17. Diagnostic Package
18. n8n Workflow Adapter

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
  "skill": "perspective-capture",
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
- поддерживать повторный запуск без дублирования записей.