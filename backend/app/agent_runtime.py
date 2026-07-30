from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Any, Literal

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .repository import HrosRepository

try:
    from agents import Agent, OpenAIChatCompletionsModel, Runner, set_tracing_disabled
    from openai import AsyncOpenAI
except ImportError:  # pragma: no cover - surfaced through runtime status
    Agent = OpenAIChatCompletionsModel = Runner = AsyncOpenAI = None


AgentId = Literal["diary", "relationship", "memory", "navigator", "avatar"]


class AgentHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    text: str = Field(min_length=1, max_length=12000)


class AgentChatRequest(BaseModel):
    agentId: AgentId = "diary"
    conversationId: str = Field(min_length=1, max_length=160)
    message: str = Field(min_length=1, max_length=24000)
    history: list[AgentHistoryItem] = Field(default_factory=list, max_length=40)
    memoryLimit: int = Field(default=18, ge=4, le=40)


@dataclass(frozen=True)
class AgentSpec:
    id: AgentId
    title: str
    subtitle: str
    avatar: str
    instructions: str


AGENTS: dict[str, AgentSpec] = {
    "diary": AgentSpec(
        id="diary",
        title="ИИ-дневник",
        subtitle="Живой диалог и подготовка Change Set",
        avatar="✎",
        instructions=(
            "Помогай человеку свободно описывать события, действия, эмоции, потребности и последствия. "
            "Отделяй наблюдаемые факты от интерпретаций. Задавай не более одного уточняющего вопроса за ответ."
        ),
    ),
    "relationship": AgentSpec(
        id="relationship",
        title="Аналитик отношений",
        subtitle="Перспективы, влияние действий и динамика связи",
        avatar="∞",
        instructions=(
            "Анализируй отношения без диагностики и без оценки человеческой ценности. "
            "Не приписывай другому человеку мысли или чувства, которых нет в подтвержденных данных. "
            "Показывай факты, перспективы, гипотезы и вопросы для проверки раздельно."
        ),
    ),
    "memory": AgentSpec(
        id="memory",
        title="Хранитель памяти",
        subtitle="Поиск, сопоставление и уточнение памяти HROS",
        avatar="◫",
        instructions=(
            "Находи релевантные записи в памяти HROS, показывай происхождение и отмечай противоречия. "
            "Не объединяй разные перспективы в одну и не повышай статус записи без подтверждения пользователя."
        ),
    ),
    "navigator": AgentSpec(
        id="navigator",
        title="Навигатор HROS",
        subtitle="Люди, моменты, пути и следующие действия",
        avatar="◈",
        instructions=(
            "Помогай ориентироваться в HROS и выбирать следующее практическое действие. "
            "Опирайся на подтвержденные записи, незавершенные вопросы и текущие пути развития."
        ),
    ),
    "avatar": AgentSpec(
        id="avatar",
        title="Агент аватара",
        subtitle="Роли, увлечения и визуальная эволюция",
        avatar="♙",
        instructions=(
            "Предлагай обратимые изменения аватара на основе подтвержденных ролей, увлечений и действий. "
            "Отношения могут менять только контекст, ауру и совместные символы, но не ценность или идентичность человека."
        ),
    ),
}

TOKEN_RE = re.compile(r"[0-9a-zа-яё_-]{3,}", re.IGNORECASE)
KIND_BOOST = {
    "original_memory": 5,
    "living_memory": 5,
    "semantic_memory": 4,
    "principle": 4,
    "perspective": 4,
    "fact": 4,
    "relationship_state": 3,
    "person_facet": 3,
    "moment": 3,
    "relationship": 3,
    "person": 2,
}
STATUS_BOOST = {"confirmed": 4, "finalized": 4, "observed": 2, "hypothesis": 0, "draft": -2, "disputed": -1}


def runtime_status() -> dict[str, Any]:
    provider = "openrouter" if os.getenv("OPENROUTER_API_KEY") else "openai"
    configured = bool(os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")) and Agent is not None
    model = (
        os.getenv("OPENROUTER_MODEL", "openai/gpt-5.4-mini")
        if provider == "openrouter"
        else os.getenv("OPENAI_MODEL") or os.getenv("OPENAI_DEFAULT_MODEL") or "gpt-5.4-mini"
    )
    return {
        "configured": configured,
        "provider": provider,
        "model": model,
        "runtime": "openai-agents-python",
        "readOnlyMemory": True,
        "requiresConfirmationForWrites": True,
    }


def agent_catalog() -> dict[str, Any]:
    return {
        "runtime": runtime_status(),
        "agents": [
            {"id": spec.id, "title": spec.title, "subtitle": spec.subtitle, "avatar": spec.avatar}
            for spec in AGENTS.values()
        ],
    }


def _tokens(value: str) -> set[str]:
    return {token.lower() for token in TOKEN_RE.findall(value or "")}


def _record_allowed(item: dict[str, Any], self_id: str | None) -> bool:
    if item.get("visibility") != "private":
        return True
    owner = item.get("perspectiveOwnerId")
    return not owner or owner == self_id


def _memory_candidates(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    people = snapshot.get("people", [])
    self_id = next((item.get("id") for item in people if item.get("isSelf")), None)
    candidates: list[dict[str, Any]] = []

    for item in people:
        candidates.append({
            "id": item.get("id"), "kind": "person", "title": item.get("name"),
            "statement": f"{item.get('name', '')}: {item.get('role', '')}. {item.get('summary', '')}",
            "status": item.get("status", "observed"), "confidence": item.get("confidence", 1),
            "source": item.get("source", {}),
        })
    for item in snapshot.get("relationships", []):
        candidates.append({
            "id": item.get("id"), "kind": "relationship", "title": item.get("label"),
            "statement": f"{item.get('label', '')}. {item.get('meaning', '')}",
            "status": item.get("status", "observed"), "confidence": item.get("confidence", 1),
            "source": item.get("source", {}),
        })
    for item in snapshot.get("moments", []):
        candidates.append({
            "id": item.get("id"), "kind": "moment", "title": item.get("title"),
            "statement": f"{item.get('date', '')} · {item.get('title', '')}. {item.get('description', '')} {item.get('details', {}).get('meaning', '')}",
            "status": item.get("status", "observed"), "confidence": item.get("confidence", 1),
            "source": item.get("source", {}),
        })
    for item in snapshot.get("records", []):
        if not _record_allowed(item, self_id):
            continue
        candidates.append({
            "id": item.get("id"), "kind": item.get("kind"), "title": item.get("kind"),
            "statement": item.get("statement", ""), "status": item.get("status", "observed"),
            "confidence": item.get("confidence", 1), "source": item.get("source", {}),
        })
    return candidates


def retrieve_hros_memory(snapshot: dict[str, Any], query: str, limit: int = 18) -> list[dict[str, Any]]:
    query_tokens = _tokens(query)
    scored: list[tuple[float, dict[str, Any]]] = []
    for item in _memory_candidates(snapshot):
        text = f"{item.get('title', '')} {item.get('statement', '')}"
        item_tokens = _tokens(text)
        overlap = len(query_tokens & item_tokens)
        phrase_bonus = 8 if query.strip().lower() in text.lower() and len(query.strip()) > 4 else 0
        score = overlap * 7 + phrase_bonus + KIND_BOOST.get(str(item.get("kind")), 1)
        score += STATUS_BOOST.get(str(item.get("status")), 0)
        score += float(item.get("confidence") or 0)
        if not query_tokens:
            score += KIND_BOOST.get(str(item.get("kind")), 1)
        if score > 1:
            scored.append((score, item))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    result = []
    seen: set[str] = set()
    for score, item in scored:
        item_id = str(item.get("id") or "")
        if not item_id or item_id in seen:
            continue
        seen.add(item_id)
        result.append({
            "id": item_id,
            "kind": item.get("kind"),
            "title": item.get("title") or item.get("kind"),
            "statement": str(item.get("statement") or "")[:900],
            "status": item.get("status"),
            "confidence": item.get("confidence"),
            "source": item.get("source") or {},
            "score": round(score, 2),
        })
        if len(result) >= limit:
            break
    return result


def _model_for_runtime():
    if os.getenv("OPENROUTER_API_KEY"):
        client = AsyncOpenAI(
            api_key=os.environ["OPENROUTER_API_KEY"],
            base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
            default_headers={
                "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", "https://kontrakevich.github.io/HROS-Web3D/"),
                "X-Title": "HROS",
            },
        )
        return OpenAIChatCompletionsModel(
            model=os.getenv("OPENROUTER_MODEL", "openai/gpt-5.4-mini"),
            openai_client=client,
        )
    return os.getenv("OPENAI_MODEL") or os.getenv("OPENAI_DEFAULT_MODEL") or "gpt-5.4-mini"


def _build_prompt(payload: AgentChatRequest, memory: list[dict[str, Any]]) -> str:
    history = "\n".join(f"{item.role.upper()}: {item.text}" for item in payload.history[-24:])
    memory_text = "\n".join(
        f"[HROS:{item['id']}] ({item['kind']}; {item['status']}; confidence={item['confidence']}) {item['statement']}"
        for item in memory
    ) or "Релевантные записи не найдены."
    return f"""КОНТРАКТ HROS
- Используй персональные сведения только из блока MEMORY HROS и текущего диалога.
- Не выдумывай отсутствующую перспективу другого человека.
- Факт, перспектива, наблюдение и гипотеза должны оставаться разными типами утверждений.
- Ссылайся на использованную память маркерами [HROS:record-id].
- Не записывай и не изменяй HROS самостоятельно. Любое изменение проходит Change Set и подтверждение человека.
- Не оценивай человеческую ценность, качество партнера, силу любви или успешность отношений одной цифрой.
- Отвечай по-русски, ясно и без лишней риторики.

MEMORY HROS
{memory_text}

RECENT CHAT
{history or 'Новая беседа.'}

CURRENT USER MESSAGE
{payload.message}
"""


async def run_agent(db: Session, payload: AgentChatRequest) -> dict[str, Any]:
    status = runtime_status()
    if not status["configured"]:
        raise RuntimeError("GPT-агенты не настроены: задайте OPENAI_API_KEY или OPENROUTER_API_KEY на сервере HROS.")

    snapshot = HrosRepository(db).snapshot()
    memory = retrieve_hros_memory(snapshot, payload.message, payload.memoryLimit)
    spec = AGENTS[payload.agentId]
    if os.getenv("OPENAI_TRACING_ENABLED", "0").lower() not in {"1", "true", "yes"}:
        set_tracing_disabled(True)

    agent = Agent(
        name=spec.title,
        instructions=(
            "Ты специализированный GPT-агент внутри Human Relationship Operating System. "
            f"{spec.instructions} "
            "Ты имеешь доступ к HROS только на чтение. Предлагай изменения, но не утверждай, что они уже внесены."
        ),
        model=_model_for_runtime(),
    )
    result = await Runner.run(agent, _build_prompt(payload, memory))
    reply = str(result.final_output or "").strip()
    return {
        "conversationId": payload.conversationId,
        "agentId": payload.agentId,
        "reply": reply,
        "memoryRefs": memory,
        "runtime": status,
        "writeApplied": False,
        "confirmationRequired": True,
    }
