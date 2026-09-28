import math
import os
import re
from datetime import datetime, timezone
from typing import Any

try:
    from hindsight_client import Hindsight
except Exception:  # Hindsight is optional until a server is configured.
    Hindsight = None

STOPWORDS = {
    "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "with", "is", "was",
    "are", "from", "this", "that", "api", "service", "production", "error", "failure"
}


def tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9_-]+", text.lower()) if t not in STOPWORDS and len(t) > 2}


def similarity(a: str, b: str) -> float:
    ta, tb = tokens(a), tokens(b)
    if not ta or not tb:
        return 0.0
    inter = len(ta & tb)
    union = len(ta | tb)
    jaccard = inter / union if union else 0
    containment = inter / min(len(ta), len(tb))
    return min(0.99, 0.72 * containment + 0.28 * jaccard)


def _hindsight_client():
    enabled = os.getenv("HINDSIGHT_ENABLED", "false").lower() == "true"
    if not enabled or Hindsight is None:
        return None
    return Hindsight(base_url=os.getenv("HINDSIGHT_URL", "http://127.0.0.1:8888"))


def hindsight_status() -> bool:
    client = _hindsight_client()
    if not client:
        return False
    try:
        # A tiny recall is a safe connectivity check for the configured bank.
        client.recall(bank_id=os.getenv("HINDSIGHT_BANK_ID", "recallops"), query="incident response")
        return True
    except Exception:
        return False


def retain_incident(incident: dict[str, Any], resolution: str | None = None, root_cause: str | None = None) -> bool:
    client = _hindsight_client()
    if not client:
        return False
    content = (
        f"Incident {incident.get('id')}: {incident.get('title')}. "
        f"Service: {incident.get('service')}. Environment: {incident.get('environment')}. "
        f"Severity: {incident.get('severity')}. Description: {incident.get('description')}. "
        f"Root cause: {root_cause or incident.get('root_cause') or 'Not recorded yet'}. "
        f"Resolution: {resolution or incident.get('resolution') or 'Not recorded yet'}. "
        f"Outcome: {incident.get('outcome') or 'open'}."
    )
    try:
        client.retain(
            bank_id=os.getenv("HINDSIGHT_BANK_ID", "recallops"),
            content=content,
            context="production incident response",
            document_id=f"incident-{incident.get('id')}",
            timestamp=incident.get("created_at") or datetime.now(timezone.utc).isoformat(),
        )
        return True
    except Exception:
        return False


def _result_text(item: Any) -> str:
    if isinstance(item, dict):
        return str(item.get("text") or item.get("content") or item.get("fact") or "")
    return str(getattr(item, "text", "") or getattr(item, "content", "") or getattr(item, "fact", "") or "")


def recall_hindsight(query: str) -> list[dict[str, Any]]:
    client = _hindsight_client()
    if not client:
        return []
    try:
        response = client.recall(bank_id=os.getenv("HINDSIGHT_BANK_ID", "recallops"), query=query, budget="mid")
        results = getattr(response, "results", None) or (response.get("results", []) if isinstance(response, dict) else [])
        out = []
        for item in results[:5]:
            text = _result_text(item)
            if text:
                out.append({"text": text, "source": "hindsight"})
        return out
    except Exception:
        return []


def find_similar_incidents(db, incident: dict[str, Any], limit: int = 5) -> list[dict[str, Any]]:
    from app.models import Incident

    query = " ".join([
        incident.get("title", ""), incident.get("service", ""), incident.get("description", "")
    ])
    candidates = []
    for old in db.query(Incident).filter(Incident.resolution.isnot(None)).all():
        old_text = " ".join([old.title, old.service, old.error, old.description or ""])
        score = similarity(query, old_text)
        if score > 0.08:
            minutes = "—"
            if old.created_at and old.resolved_at:
                delta = old.resolved_at - old.created_at
                minutes = f"{max(1, round(delta.total_seconds() / 60))} min"
            candidates.append({
                "incident_id": f"INC-{old.id:03d}",
                "date": old.created_at.strftime("%d %b %Y") if old.created_at else "Unknown",
                "title": old.title,
                "similarity": round(score, 2),
                "root_cause": old.root_cause or "Not recorded",
                "resolution": old.resolution or "Not recorded",
                "outcome": old.outcome or "resolved",
                "resolution_time": minutes,
                "source": "local",
            })
    candidates.sort(key=lambda x: x["similarity"], reverse=True)
    return candidates[:limit]
