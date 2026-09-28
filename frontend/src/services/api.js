const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

async function mockResponse() {
  const response = await fetch("/mock-incident.json");
  if (!response.ok) throw new Error("Could not load mock incident data.");
  return response.json();
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(data?.detail || data?.error || text || `Request failed (${response.status})`);
  return data;
}

export async function getHealth() {
  if (!API_BASE_URL) return { status: "mock", hindsight: false };
  return request("/api/health");
}

export async function analyzeIncident(incident) {
  if (!API_BASE_URL) {
    await new Promise(resolve => setTimeout(resolve, 1200));
    return mockResponse();
  }
  return request("/api/incidents/analyze", {
    method: "POST",
    body: JSON.stringify(incident)
  });
}

export async function resolveIncident(incident, recommendation) {
  if (!API_BASE_URL) {
    await new Promise(resolve => setTimeout(resolve, 700));
    return { status: "retained" };
  }
  return request("/api/incidents/resolve", {
    method: "POST",
    body: JSON.stringify({
      incident: { ...incident, id: incident.numeric_id ?? incident.id },
      recommendation,
      outcome: "resolved"
    })
  });
}
