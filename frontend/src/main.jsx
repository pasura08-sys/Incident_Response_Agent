import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { analyzeIncident, resolveIncident } from "./services/api";

const defaultIncident = {
  title: "Database connection timeout",
  service: "payment-api",
  environment: "production",
  severity: "HIGH",
  description: "Intermittent database connection failures."
};

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const paths = {
    pulse: <><path d="M3 12h4l2.2-6 4.6 12L16 12h5" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.2 4.2" /></>,
    brain: <><path d="M9.2 4.4a3.2 3.2 0 0 0-5.1 2.7 3.3 3.3 0 0 0 .6 1.9A3.5 3.5 0 0 0 6 15.6a3.2 3.2 0 0 0 3.2 3.2h.8V5.2a3 3 0 0 0-.8-.8Z" /><path d="M14.8 4.4a3.2 3.2 0 0 1 5.1 2.7 3.3 3.3 0 0 1-.6 1.9 3.5 3.5 0 0 1-1.3 6.6 3.2 3.2 0 0 1-3.2 3.2H14V5.2a3 3 0 0 1 .8-.8Z" /><path d="M6 10h3M15 10h3M9 15h2M13 15h2" /></>,
    arrow: <><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></>,
    check: <path d="m5 12 4.2 4.2L19 6.8" />,
    clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></>,
    server: <><rect x="4" y="4" width="16" height="6" rx="1.5" /><rect x="4" y="14" width="16" height="6" rx="1.5" /><path d="M8 7h.01M8 17h.01" /></>,
    chevron: <path d="m8 10 4 4 4-4" />,
    external: <><path d="M14 5h5v5" /><path d="m19 5-8 8" /><path d="M19 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function App() {
  const [incident, setIncident] = useState(defaultIncident);
  const [result, setResult] = useState(null);
  const [stage, setStage] = useState("idle");
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [resolved, setResolved] = useState(false);
  const [showIncidentEditor, setShowIncidentEditor] = useState(false);
  const [error, setError] = useState("");

  const currentMemory = selectedMemory || result?.memories?.[0];

  const formattedTime = useMemo(() => {
    if (!result?.incident?.timestamp) return "Just now";
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
    }).format(new Date(result.incident.timestamp));
  }, [result]);

  async function handleAnalyze() {
    setError("");
    setResolved(false);
    setStage("recalling");
    try {
      const data = await analyzeIncident(incident);
      setResult(data);
      setStage("complete");
    } catch (e) {
      setError(e.message || "Unable to analyze incident.");
      setStage("idle");
    }
  }

  async function handleResolve() {
    if (!result) return;
    setStage("saving");
    try {
      await resolveIncident(result.incident, result.recommendation);
      setResolved(true);
      setStage("complete");
      setResult(prev => ({
        ...prev,
        memory_update: {
          status: "retained",
          message: "Resolution retained. The agent can use this experience in future incidents."
        }
      }));
    } catch (e) {
      setError(e.message || "Unable to save resolution.");
      setStage("complete");
    }
  }

  useEffect(() => {
    handleAnalyze();
  }, []);

  const isBusy = stage === "recalling" || stage === "saving";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Icon name="pulse" size={18} /></div>
          <span>RECALL<span className="brand-slash">/</span>OPS</span>
        </div>
        <div className="topbar-right">
          <div className="system-status"><span className="status-dot" /> Memory online</div>
          <button className="ghost-button" onClick={() => setShowIncidentEditor(true)}>New incident</button>
          <div className="avatar">RO</div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow"><span>INCIDENT INTELLIGENCE</span><span className="eyebrow-line" /></div>
          <h1>Every incident<br /><em>leaves a memory.</em></h1>
          <p className="hero-copy">
            RecallOps gives engineering teams an organizational memory that gets more useful
            every time production breaks.
          </p>
          <div className="hero-meta">
            <span><Icon name="brain" size={15} /> Hindsight memory</span>
            <span><span className="mini-dot" /> Production</span>
            <span>Last synced 2 min ago</span>
          </div>
        </section>

        <section className="incident-stage">
          <div className="section-label">
            <span>01 / ACTIVE INCIDENT</span>
            <span className="mono">{result?.incident?.id || "INC-024"}</span>
          </div>

          <div className="incident-card">
            <div className="incident-main">
              <div className="severity-row">
                <span className="severity"><span className="severity-dot" /> {incident.severity}</span>
                <span className="service-chip"><Icon name="server" size={13} /> {incident.service}</span>
                <span className="service-chip">{incident.environment}</span>
              </div>
              <h2>{incident.title}</h2>
              <p>{incident.description}</p>
              <div className="incident-footer">
                <span>Detected {formattedTime}</span>
                <span className="divider" />
                <span>Payment infrastructure</span>
              </div>
            </div>
            <button className="analyze-button" onClick={handleAnalyze} disabled={isBusy}>
              <span>{stage === "recalling" ? "Recalling memory…" : stage === "saving" ? "Saving…" : "Analyze incident"}</span>
              <Icon name="arrow" size={17} />
            </button>
          </div>
        </section>

        <section className="memory-section">
          <div className="memory-header">
            <div>
              <div className="section-label"><span>02 / HINDSIGHT</span><span className="live-label">LIVE RECALL</span></div>
              <h3>{stage === "recalling" ? "Searching organizational memory." : result ? "The agent remembers." : "Ready to remember."}</h3>
            </div>
            <div className="memory-count">{result?.memories?.length || 0}<span>related incidents</span></div>
          </div>

          {stage === "recalling" ? (
            <div className="recall-loader">
              <div className="recall-orbit"><span /><span /><span /></div>
              <div>
                <div className="loader-title">Recalling similar incidents</div>
                <div className="loader-copy">Comparing this failure with organizational memory…</div>
              </div>
            </div>
          ) : (
            <div className="memory-grid">
              <div className="memory-list">
                {(result?.memories || []).map((memory, index) => (
                  <button
                    key={memory.incident_id}
                    className={`memory-item ${currentMemory?.incident_id === memory.incident_id ? "selected" : ""}`}
                    onClick={() => setSelectedMemory(memory)}
                  >
                    <div className="memory-number">0{index + 1}</div>
                    <div className="memory-item-body">
                      <div className="memory-item-top">
                        <span>{memory.incident_id}</span>
                        <span>{Math.round(memory.similarity * 100)}% match</span>
                      </div>
                      <strong>{memory.title}</strong>
                      <span className="memory-date">{memory.date}</span>
                    </div>
                    <div className="memory-bar"><span style={{ width: `${memory.similarity * 100}%` }} /></div>
                  </button>
                ))}
              </div>

              <div className="memory-detail">
                {currentMemory ? (
                  <>
                    <div className="detail-top">
                      <span className="detail-kicker">RECALLED EXPERIENCE</span>
                      <span className="match-pill">{Math.round(currentMemory.similarity * 100)}% similar</span>
                    </div>
                    <h4>{currentMemory.title}</h4>
                    <div className="detail-date">{currentMemory.incident_id} · {currentMemory.date}</div>
                    <div className="detail-block">
                      <span>ROOT CAUSE</span>
                      <p>{currentMemory.root_cause}</p>
                    </div>
                    <div className="detail-block">
                      <span>WHAT WORKED</span>
                      <p>{currentMemory.resolution}</p>
                    </div>
                    <div className="detail-outcome">
                      <div><Icon name="check" size={16} /><span>Resolved in {currentMemory.resolution_time}</span></div>
                      <button onClick={() => setSelectedMemory(currentMemory)}>Open incident <Icon name="external" size={13} /></button>
                    </div>
                  </>
                ) : (
                  <div className="empty-memory">
                    <Icon name="search" size={24} />
                    <p>Analyze the active incident to recall relevant experience.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {result && stage !== "recalling" && (
          <section className="recommendation-section">
            <div className="recommendation-copy">
              <div className="section-label"><span>03 / AGENT DECISION</span><span className="confidence">CONFIDENCE {Math.round(result.recommendation.confidence * 100)}%</span></div>
              <h3>Use what worked<br /><em>last time.</em></h3>
              <p>{result.recommendation.reason}</p>
            </div>
            <div className="recommendation-card">
              <div className="rec-card-label"><span className="rec-icon"><Icon name="arrow" size={15} /></span> RECOMMENDED ACTION</div>
              <div className="rec-action">{result.recommendation.action}</div>
              <div className="rec-footer">
                <span>Derived from {result.memories.length} recalled incidents</span>
                <button onClick={handleResolve} disabled={resolved || stage === "saving"}>
                  {resolved ? <><Icon name="check" size={14} /> Resolution retained</> : <>Mark resolved <Icon name="arrow" size={14} /></>}
                </button>
              </div>
            </div>
          </section>
        )}

        {result && (
          <section className={`memory-update ${resolved ? "retained" : ""}`}>
            <div className="update-icon"><Icon name={resolved ? "check" : "brain"} size={17} /></div>
            <div>
              <strong>{resolved ? "New experience retained." : "Memory loop ready."}</strong>
              <p>{result.memory_update?.message}</p>
            </div>
            <span className="update-state">{resolved ? "RETAINED" : "PENDING"}</span>
          </section>
        )}

        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError("")}><Icon name="close" size={15} /></button>
          </div>
        )}
      </main>

      <footer className="footer">
        <div>RECALL<span>/</span>OPS</div>
        <span>Incident response with organizational memory.</span>
        <span className="mono">v0.1 / HINDSIGHT</span>
      </footer>

      {showIncidentEditor && (
        <div className="modal-backdrop" onClick={() => setShowIncidentEditor(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div><span className="section-label">NEW INCIDENT</span><h3>Start a memory loop.</h3></div>
              <button className="icon-button" onClick={() => setShowIncidentEditor(false)}><Icon name="close" /></button>
            </div>
            <label>Incident title<input value={incident.title} onChange={e => setIncident({...incident, title: e.target.value})} /></label>
            <div className="form-grid">
              <label>Service<input value={incident.service} onChange={e => setIncident({...incident, service: e.target.value})} /></label>
              <label>Environment<select value={incident.environment} onChange={e => setIncident({...incident, environment: e.target.value})}><option>production</option><option>staging</option><option>development</option></select></label>
            </div>
            <label>Severity<select value={incident.severity} onChange={e => setIncident({...incident, severity: e.target.value})}><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select></label>
            <label>Description<textarea rows="4" value={incident.description} onChange={e => setIncident({...incident, description: e.target.value})} /></label>
            <button className="analyze-button full" onClick={() => { setShowIncidentEditor(false); handleAnalyze(); }}>Analyze with memory <Icon name="arrow" size={17} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
