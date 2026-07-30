from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models

NOW_SOURCE = {"kind": "system", "label": "HROS v1 seed"}

PEOPLE = [
    dict(id="person-mikhail", name="Михаил", role="Я", type="self", strength=100, summary="Центральный узел личной вселенной.", position=[0, 0, 0], is_self=True, status="confirmed", confidence=1.0, source={"kind": "user", "label": "Профиль владельца"}),
    dict(id="person-snezha", name="Снежа", role="Жена", type="family", strength=96, summary="Любовь, близость и совместная жизнь.", position=[4.6, 1.5, 0.3], is_self=False, status="confirmed", confidence=1.0, source={"kind": "user", "label": "Личная история"}),
    dict(id="person-daughter", name="Василиса", role="Дочь", type="family", strength=94, summary="Отцовство, забота и передача опыта.", position=[-4.4, 1.4, -0.2], is_self=False, status="confirmed", confidence=1.0, source={"kind": "user", "label": "Семья"}),
    dict(id="person-boris", name="Борис Александрович", role="Дедушка", type="legacy", strength=90, summary="Преемственность, память и род.", position=[-3.5, -2.7, 0.2], is_self=False, status="confirmed", confidence=0.95, source={"kind": "user", "label": "Семейная память"}),
    dict(id="person-marins", name="Marins Group", role="Работа", type="work", strength=82, summary="Созидание, лидерство и профессия.", position=[0.2, 4.6, -0.8], is_self=False, status="confirmed", confidence=1.0, source={"kind": "user", "label": "Профессиональная деятельность"}),
    dict(id="person-hros", name="HROS", role="Проект", type="project", strength=86, summary="Исследование отношений, система и наследие.", position=[0, -4.5, 0.8], is_self=False, status="confirmed", confidence=1.0, source=NOW_SOURCE),
]

RELATIONSHIPS = [
    dict(id="rel-mikhail-snezha", source_id="person-mikhail", target_id="person-snezha", type="partner", label="Пара", strength=96, meaning="Осознанное понимание взаимного влияния действий и последствий.", status="confirmed", confidence=1.0, source={"kind": "user", "label": "Базис отношений"}),
    dict(id="rel-mikhail-daughter", source_id="person-mikhail", target_id="person-daughter", type="parent", label="Отец и дочь", strength=94, meaning="Забота, присутствие и передача жизненного опыта.", status="confirmed", confidence=1.0, source={"kind": "user", "label": "Семья"}),
    dict(id="rel-mikhail-boris", source_id="person-mikhail", target_id="person-boris", type="legacy", label="Преемственность", strength=90, meaning="Связь с родом и сохранение памяти.", status="confirmed", confidence=0.95, source={"kind": "user", "label": "Семейная память"}),
    dict(id="rel-mikhail-marins", source_id="person-mikhail", target_id="person-marins", type="work", label="Профессия", strength=82, meaning="Создание визуальных систем и управление командами.", status="confirmed", confidence=1.0, source={"kind": "user", "label": "Работа"}),
    dict(id="rel-mikhail-hros", source_id="person-mikhail", target_id="person-hros", type="project", label="Создатель", strength=86, meaning="Превращение памяти и отношений в живую проверяемую систему.", status="confirmed", confidence=1.0, source=NOW_SOURCE),
]

MOMENTS = [
    dict(id="moment-childhood", title="Семейная преемственность", date="1995-01-01", period="Детство", description="Память о семье как основа личной идентичности.", participant_ids=["person-mikhail", "person-boris"], emotions=["тепло", "уважение"], significance=90, relationship_effect={"closeness": 0.7, "trust": 0.8, "tension": 0}, details={"meaning": "Преемственность стала важной частью системы ценностей.", "tags": ["семья"], "attachments": []}, status="confirmed", confidence=0.85, source={"kind": "user", "label": "Личная память"}),
    dict(id="moment-snezha", title="Базовый принцип пары", date="2026-07-23", period="Настоящее", description="Формулировка принципа о влиянии действий партнёров друг на друга.", participant_ids=["person-mikhail", "person-snezha"], emotions=["близость", "ответственность"], significance=100, relationship_effect={"closeness": 0.7, "trust": 0.6, "tension": -0.2}, details={"meaning": "Взаимное понимание влияния действий является основой бережных отношений.", "tags": ["пара", "принцип"], "attachments": []}, status="confirmed", confidence=1.0, source={"kind": "user", "label": "Совместная история"}),
    dict(id="moment-hros", title="Alignment HROS v1", date="2026-07-30", period="2026", description="Возврат технической реализации к первоначальной продуктовой задумке.", participant_ids=["person-mikhail", "person-hros"], emotions=["интерес", "созидание"], significance=95, relationship_effect={"closeness": 0.5, "trust": 0.5, "tension": -0.1}, details={"meaning": "Blueprint и ontology снова стали каноническими.", "tags": ["HROS"], "attachments": []}, status="confirmed", confidence=1.0, source=NOW_SOURCE),
]

RECORDS = [
    dict(id="evidence-principle", kind="evidence", statement="Исходная формулировка принципа отношений сохранена без перезаписи.", subject_ids=["person-mikhail", "person-snezha"], relationship_ids=["rel-mikhail-snezha"], moment_ids=["moment-snezha"], perspective_owner_id=None, visibility="shared", evidence_ids=[], supports_ids=[], contradicts_ids=[], data={"originalText": "Давай мы оба будем понимать, как наши действия влияют друг на друга и к чему это приводит."}, status="confirmed", confidence=1.0, source={"kind": "user", "label": "Дословная формулировка"}),
    dict(id="perspective-mikhail-principle", kind="perspective", statement="Для Михаила осознание взаимного влияния действий является условием бережного отношения в паре.", subject_ids=["person-mikhail", "person-snezha"], relationship_ids=["rel-mikhail-snezha"], moment_ids=["moment-snezha"], perspective_owner_id="person-mikhail", visibility="private", evidence_ids=["evidence-principle"], supports_ids=[], contradicts_ids=[], data={}, status="confirmed", confidence=1.0, source={"kind": "user", "label": "Перспектива Михаила"}),
    dict(id="perspective-snezha-open", kind="perspective", statement="Перспектива Снежи пока не зафиксирована и не должна предполагаться системой.", subject_ids=["person-snezha"], relationship_ids=["rel-mikhail-snezha"], moment_ids=["moment-snezha"], perspective_owner_id="person-snezha", visibility="private", evidence_ids=[], supports_ids=[], contradicts_ids=[], data={}, status="draft", confidence=0.0, source={"kind": "system", "label": "Ожидает ответа"}),
    dict(id="principle-mutual-impact", kind="principle", statement="Бережные отношения требуют понимания того, как действия каждого влияют на другого и к каким последствиям приводят.", subject_ids=["person-mikhail", "person-snezha"], relationship_ids=["rel-mikhail-snezha"], moment_ids=["moment-snezha"], perspective_owner_id=None, visibility="shared", evidence_ids=["evidence-principle"], supports_ids=["perspective-mikhail-principle"], contradicts_ids=[], data={"scope": "couple_and_general", "chapterId": "chapter-foundation"}, status="confirmed", confidence=0.9, source={"kind": "user", "label": "Базис отношений"}),
    dict(id="memory-original-principle", kind="original_memory", statement="Дословная исходная запись принципа.", subject_ids=["person-mikhail", "person-snezha"], relationship_ids=["rel-mikhail-snezha"], moment_ids=["moment-snezha"], perspective_owner_id=None, visibility="shared", evidence_ids=["evidence-principle"], supports_ids=[], contradicts_ids=[], data={"immutable": True}, status="finalized", confidence=1.0, source={"kind": "user", "label": "Original Memory"}),
    dict(id="memory-semantic-principle", kind="semantic_memory", statement="Принцип связан с Михаилом, Снежей, отношениями и моментом формулировки.", subject_ids=["person-mikhail", "person-snezha"], relationship_ids=["rel-mikhail-snezha"], moment_ids=["moment-snezha"], perspective_owner_id=None, visibility="shared", evidence_ids=[], supports_ids=["memory-original-principle"], contradicts_ids=[], data={}, status="confirmed", confidence=1.0, source=NOW_SOURCE),
    dict(id="memory-living-principle", kind="living_memory", statement="Взаимное осознание влияния действий — центральный ориентир, но эффект практики требует подтверждения обеими сторонами.", subject_ids=["person-mikhail", "person-snezha"], relationship_ids=["rel-mikhail-snezha"], moment_ids=["moment-snezha"], perspective_owner_id=None, visibility="shared", evidence_ids=[], supports_ids=["memory-semantic-principle"], contradicts_ids=[], data={"reviewAfter": "2026-09-01"}, status="observed", confidence=0.75, source=NOW_SOURCE),
    dict(id="interview-couple-principle", kind="interview_session", statement="Интервью для фиксации двух перспектив базового принципа.", subject_ids=["person-mikhail", "person-snezha"], relationship_ids=["rel-mikhail-snezha"], moment_ids=["moment-snezha"], perspective_owner_id=None, visibility="shared_with_partner", evidence_ids=[], supports_ids=[], contradicts_ids=[], data={"state": "awaiting_partner", "nextQuestion": "Что для тебя означает этот принцип и в каких ситуациях он особенно важен?"}, status="draft", confidence=1.0, source=NOW_SOURCE),
    dict(id="chapter-foundation", kind="book_chapter", statement="Глава 1. Взаимное влияние и ответственность за пространство отношений.", subject_ids=["person-mikhail", "person-snezha"], relationship_ids=["rel-mikhail-snezha"], moment_ids=["moment-snezha"], perspective_owner_id=None, visibility="shared", evidence_ids=[], supports_ids=["principle-mutual-impact"], contradicts_ids=[], data={"order": 1, "title": "Понимать, как мы влияем друг на друга"}, status="confirmed", confidence=1.0, source=NOW_SOURCE),
    dict(id="narrative-foundation", kind="narrative_fragment", statement="Отношения становятся бережнее, когда люди замечают взаимное влияние и принимают последствия всерьёз.", subject_ids=["person-mikhail", "person-snezha"], relationship_ids=["rel-mikhail-snezha"], moment_ids=["moment-snezha"], perspective_owner_id=None, visibility="shared", evidence_ids=[], supports_ids=["principle-mutual-impact"], contradicts_ids=[], data={"chapterId": "chapter-foundation"}, status="confirmed", confidence=0.9, source=NOW_SOURCE),
    dict(id="consent-default-private", kind="consent_policy", statement="Новые личные записи остаются приватными до явного решения поделиться ими.", subject_ids=["person-mikhail"], relationship_ids=[], moment_ids=[], perspective_owner_id="person-mikhail", visibility="private", evidence_ids=[], supports_ids=[], contradicts_ids=[], data={"defaultVisibility": "private", "aiMayIncreaseVisibility": False}, status="finalized", confidence=1.0, source=NOW_SOURCE),
]


def seed_if_empty(db: Session) -> bool:
    changed = False
    people_count = db.scalar(select(func.count()).select_from(models.Person)) or 0
    if not people_count:
        db.add_all([models.Person(**item) for item in PEOPLE])
        db.add_all([models.Relationship(**item) for item in RELATIONSHIPS])
        db.add_all([models.Moment(**item) for item in MOMENTS])
        changed = True
    records_count = db.scalar(select(func.count()).select_from(models.DomainRecord)) or 0
    if not records_count:
        db.add_all([models.DomainRecord(**item) for item in RECORDS])
        changed = True
    if changed:
        db.commit()
    return changed
