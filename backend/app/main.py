import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, SessionLocal, engine
from app.models import Incident
from app.routers.incidents import router
from app.memory import retain_incident

Base.metadata.create_all(bind=engine)
app = FastAPI(title="RecallOps API", version="1.0.0")

origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(router)


def seed_demo():
    db = SessionLocal()
    try:
        if db.query(Incident).count() == 0:
            old = Incident(
                title="Database connection timeout",
                service="payment-api",
                environment="production",
                error="Database connection timeout",
                severity="HIGH",
                description="Payment API experienced intermittent database connection failures.",
                root_cause="Connection pool exhaustion",
                resolution="Restarted Service X and increased connection pool size.",
                outcome="resolved",
            )
            db.add(old)
            db.commit()
            db.refresh(old)
            if os.getenv("HINDSIGHT_SEED_DEMO", "false").lower() == "true":
                retain_incident({
                    "id": f"INC-{old.id:03d}", "title": old.title, "service": old.service,
                    "environment": old.environment, "severity": old.severity,
                    "description": old.description, "created_at": old.created_at.isoformat(),
                    "outcome": old.outcome
                }, old.resolution, old.root_cause)
    finally:
        db.close()

seed_demo()

@app.get("/")
def home():
    return {"message": "RecallOps Backend Running", "docs": "/docs"}

@app.get("/api/health")
def health():
    from app.memory import hindsight_status
    return {"status": "ok", "hindsight": hindsight_status()}
