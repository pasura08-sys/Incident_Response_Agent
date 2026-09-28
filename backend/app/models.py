from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, String
from app.database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    service = Column(String, nullable=False)
    environment = Column(String, nullable=False, default="production")
    error = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    description = Column(String, nullable=True)
    root_cause = Column(String, nullable=True)
    resolution = Column(String, nullable=True)
    outcome = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)
