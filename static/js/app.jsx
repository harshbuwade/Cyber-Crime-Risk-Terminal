const { useState, useEffect, useRef } = React;

const API_BASE = "/api";

const RISK_STATUS_MAP = {
  High: "Open",
  Medium: "Investigating",
  Low: "Closed",
};

function useDashboardData() {
  const [stats, setStats] = useState({
    total_incidents: 0,
    high_risk: 0,
    medium_risk: 0,
    low_risk: 0,
    timeline: [],
  });
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, incidentsRes] = await Promise.all([
        fetch(`${API_BASE}/stats`),
        fetch(`${API_BASE}/incidents`),
      ]);
      const statsJson = await statsRes.json();
      const incidentsJson = await incidentsRes.json();
      setStats(statsJson);
      setIncidents(incidentsJson.incidents || []);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  return { stats, incidents, setIncidents, refresh: loadAll, loading };
}

function RiskCharts({ stats }) {
  const pieRef = useRef(null);
  const lineRef = useRef(null);
  const pieChart = useRef(null);
  const lineChart = useRef(null);

  useEffect(() => {
    if (!pieRef.current || !lineRef.current) return;

    if (pieChart.current) pieChart.current.destroy();
    if (lineChart.current) lineChart.current.destroy();

    const { high_risk, medium_risk, low_risk, timeline } = stats;

    pieChart.current = new Chart(pieRef.current, {
      type: "doughnut",
      data: {
        labels: ["High", "Medium", "Low"],
        datasets: [
          {
            data: [high_risk, medium_risk, low_risk],
            backgroundColor: ["#f97373", "#facc15", "#22c55e"],
            borderColor: ["#fecaca", "#fef9c3", "#bbf7d0"],
            borderWidth: 1,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            labels: {
              color: "#e5e7eb",
              font: { family: "Rajdhani" },
            },
          },
        },
      },
    });

    const labels = timeline.map((t) => t.day);
    const values = timeline.map((t) => t.count);

    lineChart.current = new Chart(lineRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Incident Activity",
            data: values,
            borderColor: "#38bdf8",
            backgroundColor: "rgba(56, 189, 248, 0.2)",
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            labels: {
              color: "#e5e7eb",
              font: { family: "Rajdhani" },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#9ca3af",
              font: { family: "Rajdhani" },
            },
            grid: { color: "rgba(55,65,81,0.5)" },
          },
          y: {
            ticks: {
              color: "#9ca3af",
              font: { family: "Rajdhani" },
            },
            grid: { color: "rgba(55,65,81,0.5)" },
          },
        },
      },
    });

    return () => {
      if (pieChart.current) pieChart.current.destroy();
      if (lineChart.current) lineChart.current.destroy();
    };
  }, [stats]);

  return (
    <div className="charts-grid">
      <div className="chart-container">
        <div className="chart-title">Risk Distribution</div>
        <div className="chart-canvas-wrapper">
          <canvas ref={pieRef}></canvas>
        </div>
      </div>
      <div className="chart-container">
        <div className="chart-title">Threat Activity Timeline</div>
        <div className="chart-canvas-wrapper">
          <canvas ref={lineRef}></canvas>
        </div>
      </div>
    </div>
  );
}

function IncidentForm({ onIncidentCreated, lastAnalysis }) {
  const [form, setForm] = useState({
    title: "",
    incident_type: "Phishing",
    attack_vector: "",
    severity: 5,
    system_affected: "",
    detection_time: "",
    description: "",
    attack_complexity: 2,
    data_sensitivity: 2,
    exposure_level: 2,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "severity" ||
        name === "attack_complexity" ||
        name === "data_sensitivity" ||
        name === "exposure_level"
          ? Number(value)
          : value,
    }));
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (res.ok) {
        onIncidentCreated(json);
        setForm((prev) => ({
          ...prev,
          title: "",
          attack_vector: "",
          system_affected: "",
          detection_time: "",
          description: "",
        }));
      } else {
        console.error("Error from API", json);
      }
    } catch (err) {
      console.error("Failed to create incident", err);
    } finally {
      setSubmitting(false);
    }
  };

  const riskBadgeClass =
    lastAnalysis?.risk_level === "High"
      ? "score-badge score-badge-high"
      : lastAnalysis?.risk_level === "Medium"
      ? "score-badge score-badge-medium"
      : lastAnalysis?.risk_level === "Low"
      ? "score-badge score-badge-low"
      : "score-badge";

  return (
    <form onSubmit={handleAnalyze}>
      <div className="form-grid">
        <div className="form-field">
          <label className="form-label">Incident Title</label>
          <input
            className="form-input"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. Credential Harvesting via Spear Phishing"
            required
          />
        </div>
        <div className="form-field">
          <label className="form-label">Incident Type</label>
          <select
            className="form-select"
            name="incident_type"
            value={form.incident_type}
            onChange={handleChange}
          >
            <option>Phishing</option>
            <option>Malware</option>
            <option>DDoS</option>
            <option>Data Breach</option>
            <option>Insider Threat</option>
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">Attack Vector</label>
          <input
            className="form-input"
            name="attack_vector"
            value={form.attack_vector}
            onChange={handleChange}
            placeholder="Email link, RDP, VPN, web app..."
          />
        </div>
        <div className="form-field">
          <label className="form-label">Severity (1–10)</label>
          <input
            className="form-input"
            type="number"
            name="severity"
            min="1"
            max="10"
            value={form.severity}
            onChange={handleChange}
          />
        </div>
        <div className="form-field">
          <label className="form-label">System Affected</label>
          <input
            className="form-input"
            name="system_affected"
            value={form.system_affected}
            onChange={handleChange}
            placeholder="e.g. Finance DB cluster, HR portal"
          />
        </div>
        <div className="form-field">
          <label className="form-label">Detection Time</label>
          <input
            className="form-input"
            name="detection_time"
            value={form.detection_time}
            onChange={handleChange}
            placeholder="e.g. 2 hours after compromise"
          />
        </div>
        <div className="form-field">
          <label className="form-label">Attack Complexity</label>
          <select
            className="form-select"
            name="attack_complexity"
            value={form.attack_complexity}
            onChange={handleChange}
          >
            <option value={1}>Low</option>
            <option value={2}>Medium</option>
            <option value={3}>High</option>
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">Data Sensitivity</label>
          <select
            className="form-select"
            name="data_sensitivity"
            value={form.data_sensitivity}
            onChange={handleChange}
          >
            <option value={1}>Low</option>
            <option value={2}>Moderate</option>
            <option value={3}>Highly Sensitive</option>
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">Exposure Level</label>
          <select
            className="form-select"
            name="exposure_level"
            value={form.exposure_level}
            onChange={handleChange}
          >
            <option value={1}>Contained</option>
            <option value={2}>Limited</option>
            <option value={3}>Widespread</option>
          </select>
        </div>
        <div className="form-field full-span">
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Summarize what happened, impacted assets, and any observed indicators."
          />
        </div>
      </div>
      <div className="analyze-bar">
        <button className="button-primary" type="submit" disabled={submitting}>
          <span className="dot"></span>
          {submitting ? "Analyzing..." : "Analyze Threat"}
        </button>
        {lastAnalysis && (
          <div className="score-display">
            <div className="score-chip">
              Score: <span>{lastAnalysis.threat_score}</span>
            </div>
            <div className={riskBadgeClass}>
              Risk: {lastAnalysis.risk_level || "N/A"}
            </div>
          </div>
        )}
      </div>
      {lastAnalysis && lastAnalysis.mitigation_steps && (
        <ul className="mitigation-list">
          {lastAnalysis.mitigation_steps.map((step, idx) => (
            <li key={idx}>{step}</li>
          ))}
        </ul>
      )}
    </form>
  );
}

function InvestigationBoard({ incidents }) {
  if (!incidents.length) {
    return <div className="empty-state">No case files yet. Log an incident to begin the investigation trail.</div>;
  }

  return (
    <div className="board-grid">
      {incidents.slice(0, 8).map((inc) => {
        const status = RISK_STATUS_MAP[inc.risk_level] || "Open";
        const tagClass =
          status === "Closed"
            ? "board-chip-tag board-tag-closed"
            : status === "Investigating"
            ? "board-chip-tag board-tag-investigating"
            : "board-chip-tag board-tag-open";
        return (
          <div key={inc.id} className="board-card">
            <div className="board-card-header">
              <div className="board-card-id">CASE #{String(inc.id).padStart(4, "0")}</div>
              <div className="board-card-type">{inc.incident_type}</div>
            </div>
            <div className="board-card-title">{inc.title}</div>
            <div className="board-chip-row">
              <div className="board-chip">
                SCORE {inc.threat_score} / RISK {inc.risk_level}
              </div>
              <div className={tagClass}>{status}</div>
            </div>
            <div className="board-card-footer">
              <span>{inc.system_affected || "Unknown asset"}</span>
              <span>{(inc.created_at || "").replace("T", " ")}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AlertsPanel({ stats }) {
  const { high_risk, medium_risk, total_incidents } = stats;
  const alerts = [];

  if (high_risk > 0) {
    alerts.push({
      level: "red",
      text: "High-risk incidents require immediate triage.",
      meta: `HIGH RISK CASES: ${high_risk}`,
    });
  }
  if (medium_risk > 0) {
    alerts.push({
      level: "yellow",
      text: "Active suspicious activity under investigation.",
      meta: `MEDIUM RISK CASES: ${medium_risk}`,
    });
  }
  if (!alerts.length && total_incidents === 0) {
    alerts.push({
      level: "yellow",
      text: "No recorded incidents. Maintain watch for anomalies.",
      meta: "SENSORS: LIVE",
    });
  }

  const canned = [
    {
      level: "red",
      text: "Possible phishing campaign detected across multiple mailboxes.",
      meta: "SOURCE: MAIL GATEWAY",
    },
    {
      level: "yellow",
      text: "Multiple login failures detected from remote addresses.",
      meta: "SOURCE: AUTH SERVICE",
    },
    {
      level: "red",
      text: "Suspicious lateral movement pattern observed inside network.",
      meta: "SOURCE: EDR",
    },
  ];

  const allAlerts = [...alerts, ...canned.slice(0, 3)];

  return (
    <div className="alerts-list">
      {allAlerts.map((a, idx) => (
        <div
          key={idx}
          className={
            "alert-item alert-pulse " + (a.level === "yellow" ? "yellow" : "")
          }
        >
          <div className="alert-left">
            <div className="alert-icon">
              {a.level === "yellow" ? "!" : "⚠"}
            </div>
            <div className="alert-text">{a.text}</div>
          </div>
          <div className="alert-meta">{a.meta}</div>
        </div>
      ))}
    </div>
  );
}

function ReportsSection({ incidents }) {
  const [filter, setFilter] = useState("All");

  const filtered = incidents.filter((inc) =>
    filter === "All" ? true : inc.risk_level === filter
  );

  const handleExport = () => {
    window.print();
  };

  return (
    <div>
      <div className="reports-controls">
        <select
          className="form-select filter-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="All">All Risk Levels</option>
          <option value="High">High Risk</option>
          <option value="Medium">Medium Risk</option>
          <option value="Low">Low Risk</option>
        </select>
        <button className="button-outline" onClick={handleExport}>
          Export PDF
        </button>
      </div>
      <div className="reports-table-wrapper">
        {filtered.length ? (
          <table className="reports-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Type</th>
                <th>Score</th>
                <th>Risk</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inc) => (
                <tr key={inc.id}>
                  <td>{inc.id}</td>
                  <td>{inc.title}</td>
                  <td>{inc.incident_type}</td>
                  <td>{inc.threat_score}</td>
                  <td>
                    <span
                      className={
                        "risk-pill " +
                        (inc.risk_level === "High"
                          ? "risk-pill-high"
                          : inc.risk_level === "Medium"
                          ? "risk-pill-medium"
                          : "risk-pill-low")
                      }
                    >
                      {inc.risk_level}
                    </span>
                  </td>
                  <td>{(inc.created_at || "").replace("T", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            No incidents match the selected filter.
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardShell() {
  const { stats, incidents, setIncidents, refresh, loading } = useDashboardData();
  const [lastAnalysis, setLastAnalysis] = useState(null);

  const handleIncidentCreated = async (incident) => {
    setIncidents((prev) => [incident, ...prev]);
    setLastAnalysis({
      threat_score: incident.threat_score,
      risk_level: incident.risk_level,
      mitigation_steps: [], // already shown from analyze endpoint in a richer version
    });
    // refresh stats asynchronously
    refresh();

    try {
      const analyzeRes = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          severity: incident.severity,
          attack_complexity: 2,
          data_sensitivity: 2,
          exposure_level: 2,
        }),
      });
      const analyzeJson = await analyzeRes.json();
      setLastAnalysis(analyzeJson);
    } catch (e) {
      console.error("Failed to get mitigation details", e);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-badge">
            <span>CCRT</span>
          </div>
          <div className="brand-title">
            <h1>Cyber Crime Risk Terminal</h1>
            <span>Threat Assessment &amp; Investigation Board</span>
          </div>
        </div>
        <div className="header-status">
          <div className="status-pill">
            <span className="status-pill-dot" />
            LIVE THREAT MONITOR
          </div>
          <div className="header-divider" />
          <div className="header-tag">Forensic Operations Deck</div>
        </div>
      </header>
      <main className="app-main">
        <section className="column">
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <span className="panel-title-indicator" />
                Threat Overview
              </div>
              <div className="panel-meta">
                INCIDENTS: {stats.total_incidents}{" "}
                {loading ? " • SYNCING..." : " • SYNCED"}
              </div>
            </div>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-label">Total Incidents</div>
                <div className="kpi-value">{stats.total_incidents}</div>
                <div className="kpi-tag">GLOBAL</div>
              </div>
              <div className="kpi-card kpi-high">
                <div className="kpi-label">High Risk</div>
                <div className="kpi-value">{stats.high_risk}</div>
                <div className="kpi-tag">CRITICAL</div>
              </div>
              <div className="kpi-card kpi-medium">
                <div className="kpi-label">Medium Risk</div>
                <div className="kpi-value">{stats.medium_risk}</div>
                <div className="kpi-tag">ELEVATED</div>
              </div>
              <div className="kpi-card kpi-low">
                <div className="kpi-label">Low Risk</div>
                <div className="kpi-value">{stats.low_risk}</div>
                <div className="kpi-tag">BASELINE</div>
              </div>
            </div>
            <RiskCharts stats={stats} />
          </div>
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <span className="panel-title-indicator" />
                Incident Input Panel
              </div>
              <div className="panel-meta">Create &amp; Score Case Files</div>
            </div>
            <IncidentForm
              onIncidentCreated={handleIncidentCreated}
              lastAnalysis={lastAnalysis}
            />
          </div>
        </section>
        <section className="column">
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <span className="panel-title-indicator" />
                Investigation Board
              </div>
              <div className="panel-meta">Case Files &amp; Status</div>
            </div>
            <InvestigationBoard incidents={incidents} />
          </div>
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <span className="panel-title-indicator" />
                Live Alerts
              </div>
              <div className="panel-meta">Streaming Anomaly Indicators</div>
            </div>
            <AlertsPanel stats={stats} />
          </div>
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <span className="panel-title-indicator" />
                Reports
              </div>
              <div className="panel-meta">History &amp; PDF Export</div>
            </div>
            <ReportsSection incidents={incidents} />
          </div>
        </section>
      </main>
    </div>
  );
}

try {
  ReactDOM.render(<DashboardShell />, document.getElementById("root"));
} catch (e) {
  var root = document.getElementById("root");
  if (root) {
    root.innerText =
      "This dashboard requires a modern browser (Chrome, Edge, or Firefox). " +
      "If you are using Internet Explorer, please switch to a supported browser.";
  }
}

