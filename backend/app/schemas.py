from datetime import datetime
from pydantic import BaseModel, Field

class IncidentInput(BaseModel):
    id: int | None = None
    title: str = Field(min_length=1)
    service: str = Field(min_length=1)
    environment: str = "production"
    severity: str = "HIGH"
    description: str = Field(min_length=1)

class Recommendation(BaseModel):
    action: str
    reason: str
    confidence: float = Field(ge=0, le=1)

class AnalyzeRequest(IncidentInput):
    pass

class ResolveRequest(BaseModel):
    incident: IncidentInput
    recommendation: Recommendation
    outcome: str = "resolved"

class MemoryItem(BaseModel):
    incident_id: str
    date: str
    title: str
    similarity: float = Field(ge=0, le=1)
    root_cause: str
    resolution: str
    outcome: str
    resolution_time: str
    source: str = "local"

class AnalyzeResponse(BaseModel):
    incident: dict
    analysis: dict
    memories: list[MemoryItem]
    recommendation: Recommendation
    memory_update: dict
