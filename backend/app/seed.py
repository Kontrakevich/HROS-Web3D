from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models

NOW_SOURCE = {"kind": "system", "label": "HROS v0.2 seed"}

PEOPLE = [
    dict(id="person-mikhail", name="Михаил", role="Я", type="self", strength=100, summary="Центральный узел личной вселенной.", position=[0, 0, 0], is_self=True, status="confirmed", confidence=1.0, source={"kind": "user", "label": "Профиль владельца"}),
    dict(id="person-snezha", name="Снежа", role="Жена", type="family", strength=96, summary="Любовь, близость и совместная жизнь.", position=[4.6, 1.5, 0.3], is_self=False, status="confirmed", confidence=1.0, source={"kind": "user", "label": "Личная история"}),
    dict(id="person-daughter", name="Василиса", role="Дочь", type="family", strength=94, summary="Отцовство, забота и передача опыта.", position=[-4.4, 1.4, -0.2], is_self=False, status="confirmed", confidence=1.0, source={"kind": "user", "label": "Семья"}),
    dict(id="person-boris", name="Борис Александрович", role="Дедушка", type="legacy", strength=90, summary="Преемственность, память и род.", position=[-3.5, -2.7, 0.2], is_self=False, status="confirmed", confidence=0.95, source={"kind": "user", "label": "Семейная память"}),
    dict(id="person-marins", name="Marins Group", role="Работа", type="work", strength=82, summary="Созидание, лидерство и профессия.", position=[0.2, 4.6, -0.8], is_self=False, status="confirmed", confidence=1.0, source={"kind": "user", "label": "Профессиональная деятельность"}),
    dict(id="person-hros", name="HROS", role="Проект", type="project", strength=86, summary="Исследование отношений, система и наследие.", position=[0, -4.5, 0.8], is_self=False, status="observed", confidence=0.9, source=NOW_SOURCE),
]

RELATIONSHIPS = [
    dict(id="rel-mikhail-snezha", source_id="person-mikhail", target_id="person-snezha", type="partner", label="Пара", strength=96, meaning="Давай мы оба будем понимать, как наши действия влияют друг на друга и к чему это приводит.", status="confirmed", confidence=1.0, source={"kind": "user", "label": "Базис отношений"}),
    dict(id="rel-mikhail-daughter", source_id="person-mikhail", target_id="person-daughter", type="parent", label="Отец и дочь", strength=94, meaning="Забота, присутствие и передача жизненного опыта.", status="confirmed", confidence=1.0, source={"kind": "user", "label": "Семья"}),
    dict(id="rel-mikhail-boris", source_id="person-mikhail", target_id="person-boris", type="legacy", label="Преемственность", strength=90, meaning="Связь с родом и сохранение памяти.", status="confirmed", confidence=0.95, source={"kind": "user", "label": "Семейная память"}),
    dict(id="rel-mikhail-marins", source_id="person-mikhail", target_id="person-marins", type="work", label="Профессия", strength=82, meaning="Создание визуальных систем и управление командами.", status="confirmed", confidence=1.0, source={"kind": "user", "label": "Работа"}),
    dict(id="rel-mikhail-hros", source_id="person-mikhail", target_id="person-hros", type="project", label="Создатель", strength=86, meaning="Превращение памяти и отношений в живую систему.", status="observed", confidence=0.9, source=NOW_SOURCE),
]

MOMENTS = [
    dict(id="moment-childhood", title="Семейная преемственность", date="1995-01-01", period="Детство", description="Память о семье как основа личной идентичности.", participant_ids=["person-mikhail", "person-boris"], emotions=["тепло", "уважение"], significance=90, relationship_effect={"closeness": 0.7, "trust": 0.8, "tension": 0}, status="confirmed", confidence=0.85, source={"kind": "user", "label": "Личная память"}),
    dict(id="moment-snezha", title="Жизнь со Снежей", date="2026-01-01", period="Настоящее", description="Совместная жизнь, близость и создание общих моментов.", participant_ids=["person-mikhail", "person-snezha"], emotions=["любовь", "близость"], significance=98, relationship_effect={"closeness": 0.9, "trust": 0.8, "tension": -0.2}, status="confirmed", confidence=1.0, source={"kind": "user", "label": "Совместная история"}),
    dict(id="moment-hros", title="Создание HROS", date="2026-07-29", period="2026", description="Переход от визуального прототипа к работающему ядру данных.", participant_ids=["person-mikhail", "person-hros"], emotions=["интерес", "созидание"], significance=86, relationship_effect={"closeness": 0.5, "trust": 0.4, "tension": 0}, status="observed", confidence=0.95, source=NOW_SOURCE),
]


def seed_if_empty(db: Session) -> bool:
    count = db.scalar(select(func.count()).select_from(models.Person)) or 0
    if count:
        return False
    db.add_all([models.Person(**item) for item in PEOPLE])
    db.add_all([models.Relationship(**item) for item in RELATIONSHIPS])
    db.add_all([models.Moment(**item) for item in MOMENTS])
    db.commit()
    return True
