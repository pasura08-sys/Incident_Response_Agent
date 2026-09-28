from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Incident
from app.schemas import AnalyzeRequest, ResolveRequest
from app.memory import find_similar_incidents, recall_hindsight, retain_incident

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def serialize(incident: Incident) -> dict:
    return {
        "id": f"INC-{incident.id:03d}",
        "numeric_id": incident.id,
        "title": incident.title,
        "service": incident.service,
        "environment": incident.environment,
        "severity": incident.severity,
        "description": incident.description or incident.error,
        "timestamp": incident.created_at.isoformat() if incident.created_at else datetime.now(timezone.utc).isoformat(),
        "root_cause": incident.root_cause,
        "resolution": incident.resolution,
        "outcome": incident.outcome,
    }

@router.post("/analyze")
def analyze_incident(request: AnalyzeRequest, db: Session = Depends(get_db)):
    current = None
    if request.id:
        current = db.query(Incident).filter(Incident.id == request.id).first()
    if not current:
        current = Incident(
            title=request.title,
            service=request.service,
            environment=request.environment,
            error=request.title,
            severity=request.severity,
            description=request.description,
        )
        db.add(current)
        db.commit()
        db.refresh(current)

    incident = serialize(current)
    local = find_similar_incidents(db, incident)

    hindsight_hits = recall_hindsight(
        f"Find previous production incidents similar to: {request.title}. "
        f"Service {request.service}. {request.description}"
    )
    if hindsight_hits and not local:
        # Hindsight is intentionally surfaced even when the structured local record is absent.
        for index, hit in enumerate(hindsight_hits[:5]):
            text = hit["text"]
            local.append({
                "incident_id": f"MEM-{index+1:03d}",
                "date": "Recalled memory",
                "title": text[:80],
                "similarity": max(0.72, 0.92 - index * 0.04),
                "root_cause": "See recalled memory",
                "resolution": text,
                "outcome": "resolved",
                "resolution_time": "Recorded in memory",
                "source": "hindsight",
            })

    memories = local[:5]
    top = memories[0] if memories else None
    confidence = min(0.97, max(0.52, (top["similarity"] if top else 0.52)))
    action = top["resolution"] if top else "Investigate the failure and record the resolution."
    reason = (
        f"A similar incident ({top['incident_id']}) was previously resolved with this approach."
        if top else "No sufficiently similar resolved incident was found in organizational memory."
    )
    return {
        "incident": incident,
        "analysis": {
            "status": "completed",
            "summary": top["root_cause"] if top else "No historical root cause found yet.",
            "confidence": round(confidence, 2),
            "memory_source": "hindsight" if any(m["source"] == "hindsight" for m in memories) else "local-fallback",
        },
        "memories": memories,
        "recommendation": {"action": action, "reason": reason, "confidence": round(confidence, 2)},
        "memory_update": {
            "status": "pending",
            "message": "Resolve the incident to retain the new experience for future recalls."
        },
    }

@router.post("/resolve")
def resolve_incident(request: ResolveRequest, db: Session = Depends(get_db)):
    incident_id = request.incident.id
    if not incident_id:
        raise HTTPException(status_code=400, detail="Incident id is required. Analyze the incident first.")
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")

    incident.root_cause = request.recommendation.reason
    incident.resolution = request.recommendation.action
    incident.outcome = request.outcome
    incident.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(incident)

    hindsight_retained = retain_incident(serialize(incident), request.recommendation.action, request.recommendation.reason)
    return {
        "status": "retained",
        "incident": serialize(incident),
        "hindsight_retained": hindsight_retained,
        "memory_update": {
            "status": "retained",
            "message": "Resolution retained. The agent can use this experience in future incidents."
        }
    }
