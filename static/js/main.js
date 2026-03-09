(function () {
  var API_BASE = "/api";
  var riskChart = null;
  var timelineChart = null;
  var incidents = [];
  var stats = {
    total_incidents: 0,
    high_risk: 0,
    medium_risk: 0,
    low_risk: 0,
    timeline: [],
  };

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    var el = $(id);
    if (el) el.textContent = value;
  }

  function updateKPIs() {
    setText("kpi-total", stats.total_incidents);
    setText("kpi-high", stats.high_risk);
    setText("kpi-medium", stats.medium_risk);
    setText("kpi-low", stats.low_risk);

    var meta = $("overview-meta");
    if (meta) {
      meta.textContent =
        "INCIDENTS: " + stats.total_incidents + " • SYNCED";
    }
  }

  function buildCharts() {
    var riskCtx = document.getElementById("chart-risk");
    var timeCtx = document.getElementById("chart-timeline");
    if (!riskCtx || !timeCtx || !window.Chart) return;

    if (riskChart) riskChart.destroy();
    if (timelineChart) timelineChart.destroy();

    riskChart = new Chart(riskCtx, {
      type: "doughnut",
      data: {
        labels: ["High", "Medium", "Low"],
        datasets: [
          {
            data: [stats.high_risk, stats.medium_risk, stats.low_risk],
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

    var labels = stats.timeline.map(function (t) {
      return t.day;
    });
    var values = stats.timeline.map(function (t) {
      return t.count;
    });

    timelineChart = new Chart(timeCtx, {
      type: "line",
      data: {
        labels: labels,
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
  }

  function riskStatusFromLevel(level) {
    if (level === "High") return "Open";
    if (level === "Medium") return "Investigating";
    return "Closed";
  }

  function renderBoard() {
    var container = $("board-grid");
    if (!container) return;

    container.innerHTML = "";
    if (!incidents.length) {
      var empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent =
        "No case files yet. Log an incident to begin the investigation trail.";
      container.appendChild(empty);
      return;
    }

    incidents.slice(0, 8).forEach(function (inc) {
      var card = document.createElement("div");
      card.className = "board-card";

      var header = document.createElement("div");
      header.className = "board-card-header";
      var idDiv = document.createElement("div");
      idDiv.className = "board-card-id";
      idDiv.textContent = "CASE #" + String(inc.id).padStart(4, "0");
      var typeDiv = document.createElement("div");
      typeDiv.className = "board-card-type";
      typeDiv.textContent = inc.incident_type;
      header.appendChild(idDiv);
      header.appendChild(typeDiv);

      var title = document.createElement("div");
      title.className = "board-card-title";
      title.textContent = inc.title;

      var chipRow = document.createElement("div");
      chipRow.className = "board-chip-row";
      var chip = document.createElement("div");
      chip.className = "board-chip";
      chip.textContent =
        "SCORE " + inc.threat_score + " / RISK " + inc.risk_level;

      var status = riskStatusFromLevel(inc.risk_level);
      var tag = document.createElement("div");
      var tagClass = "board-chip-tag ";
      if (status === "Closed") tagClass += "board-tag-closed";
      else if (status === "Investigating")
        tagClass += "board-tag-investigating";
      else tagClass += "board-tag-open";
      tag.className = tagClass;
      tag.textContent = status;
      chipRow.appendChild(chip);
      chipRow.appendChild(tag);

      var footer = document.createElement("div");
      footer.className = "board-card-footer";
      var sysSpan = document.createElement("span");
      sysSpan.textContent = inc.system_affected || "Unknown asset";
      var timeSpan = document.createElement("span");
      timeSpan.textContent = (inc.created_at || "").replace("T", " ");
      footer.appendChild(sysSpan);
      footer.appendChild(timeSpan);

      card.appendChild(header);
      card.appendChild(title);
      card.appendChild(chipRow);
      card.appendChild(footer);
      container.appendChild(card);
    });
  }

  function renderAlerts() {
    var list = $("alerts-list");
    if (!list) return;
    list.innerHTML = "";

    var high = stats.high_risk;
    var medium = stats.medium_risk;
    var total = stats.total_incidents;
    var alerts = [];

    if (high > 0) {
      alerts.push({
        level: "red",
        text: "High-risk incidents require immediate triage.",
        meta: "HIGH RISK CASES: " + high,
      });
    }
    if (medium > 0) {
      alerts.push({
        level: "yellow",
        text: "Active suspicious activity under investigation.",
        meta: "MEDIUM RISK CASES: " + medium,
      });
    }
    if (!alerts.length && total === 0) {
      alerts.push({
        level: "yellow",
        text: "No recorded incidents. Maintain watch for anomalies.",
        meta: "SENSORS: LIVE",
      });
    }

    var canned = [
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

    var allAlerts = alerts.concat(canned.slice(0, 3));

    allAlerts.forEach(function (a) {
      var item = document.createElement("div");
      item.className =
        "alert-item alert-pulse " + (a.level === "yellow" ? "yellow" : "");
      var left = document.createElement("div");
      left.className = "alert-left";
      var icon = document.createElement("div");
      icon.className = "alert-icon";
      icon.textContent = a.level === "yellow" ? "!" : "⚠";
      var text = document.createElement("div");
      text.className = "alert-text";
      text.textContent = a.text;
      left.appendChild(icon);
      left.appendChild(text);

      var meta = document.createElement("div");
      meta.className = "alert-meta";
      meta.textContent = a.meta;

      item.appendChild(left);
      item.appendChild(meta);
      list.appendChild(item);
    });
  }

  function renderReports() {
    var body = $("reports-body");
    var filterSel = $("reports-filter");
    if (!body || !filterSel) return;

    var filter = filterSel.value || "All";
    body.innerHTML = "";

    var filtered = incidents.filter(function (inc) {
      if (filter === "All") return true;
      return inc.risk_level === filter;
    });

    if (!filtered.length) {
      var row = document.createElement("tr");
      var cell = document.createElement("td");
      cell.colSpan = 6;
      cell.className = "empty-state";
      cell.textContent = "No incidents match the selected filter.";
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    filtered.forEach(function (inc) {
      var row = document.createElement("tr");
      function td(text) {
        var c = document.createElement("td");
        c.textContent = text;
        return c;
      }
      row.appendChild(td(inc.id));
      row.appendChild(td(inc.title));
      row.appendChild(td(inc.incident_type));
      row.appendChild(td(inc.threat_score));

      var riskTd = document.createElement("td");
      var pill = document.createElement("span");
      var pillClass = "risk-pill ";
      if (inc.risk_level === "High") pillClass += "risk-pill-high";
      else if (inc.risk_level === "Medium") pillClass += "risk-pill-medium";
      else pillClass += "risk-pill-low";
      pill.className = pillClass;
      pill.textContent = inc.risk_level;
      riskTd.appendChild(pill);
      row.appendChild(riskTd);

      row.appendChild(td((inc.created_at || "").replace("T", " ")));
      body.appendChild(row);
    });
  }

  function updateScoreDisplay(score, risk, mitigationSteps) {
    var display = $("score-display");
    var valueEl = $("score-value");
    var badge = $("score-badge");
    var list = $("mitigation-list");
    if (!display || !valueEl || !badge || !list) return;

    display.style.display = "flex";
    valueEl.textContent = score;

    badge.textContent = "Risk: " + risk;
    badge.className = "score-badge";
    if (risk === "High") badge.className += " score-badge-high";
    else if (risk === "Medium") badge.className += " score-badge-medium";
    else if (risk === "Low") badge.className += " score-badge-low";

    list.innerHTML = "";
    (mitigationSteps || []).forEach(function (step) {
      var li = document.createElement("li");
      li.textContent = step;
      list.appendChild(li);
    });
  }

  function fetchStatsAndIncidents() {
    var meta = $("overview-meta");
    if (meta) meta.textContent = "INCIDENTS: 0 • SYNCING...";

    Promise.all([
      fetch(API_BASE + "/stats").then(function (r) {
        return r.json();
      }),
      fetch(API_BASE + "/incidents").then(function (r) {
        return r.json();
      }),
    ])
      .then(function (res) {
        stats = res[0] || stats;
        incidents = (res[1] && res[1].incidents) || [];
        updateKPIs();
        buildCharts();
        renderBoard();
        renderAlerts();
        renderReports();
      })
      .catch(function (err) {
        console.error("Failed to load data", err);
        if (meta) meta.textContent = "INCIDENTS: 0 • ERROR";
      });
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    var btn = $("analyze-button");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Analyzing...";
    }

    var payload = {
      title: $("field-title").value || "Untitled Incident",
      incident_type: $("field-incident-type").value,
      attack_vector: $("field-attack-vector").value,
      severity: parseInt($("field-severity").value || "0", 10),
      system_affected: $("field-system-affected").value,
      detection_time: $("field-detection-time").value,
      description: $("field-description").value,
      attack_complexity: parseInt(
        $("field-attack-complexity").value || "0",
        10
      ),
      data_sensitivity: parseInt(
        $("field-data-sensitivity").value || "0",
        10
      ),
      exposure_level: parseInt(
        $("field-exposure-level").value || "0",
        10
      ),
    };

    fetch(API_BASE + "/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        return r.json().then(function (data) {
          return { ok: r.ok, data: data };
        });
      })
      .then(function (res) {
        if (!res.ok) {
          console.error("API error", res.data);
          return;
        }
        var incident = res.data;
        incidents.unshift(incident);
        updateScoreDisplay(
          incident.threat_score,
          incident.risk_level,
          [] // will be replaced with analyze call below
        );
        renderBoard();
        renderReports();
        fetchStatsAndIncidents();

        // Fetch mitigation details
        return fetch(API_BASE + "/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            severity: incident.severity,
            attack_complexity: payload.attack_complexity,
            data_sensitivity: payload.data_sensitivity,
            exposure_level: payload.exposure_level,
          }),
        }).then(function (r) {
          return r.json();
        });
      })
      .then(function (analysis) {
        if (analysis && typeof analysis.threat_score !== "undefined") {
          updateScoreDisplay(
            analysis.threat_score,
            analysis.risk_level,
            analysis.mitigation_steps
          );
        }
      })
      .catch(function (err) {
        console.error("Failed to create incident", err);
      })
      .finally(function () {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Analyze Threat";
        }
      });
  }

  function init() {
    var form = document.getElementById("incident-form");
    if (form) {
      form.addEventListener("submit", handleFormSubmit);
    }

    var filterSel = $("reports-filter");
    if (filterSel) {
      filterSel.addEventListener("change", renderReports);
    }

    var exportBtn = $("export-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        window.print();
      });
    }

    fetchStatsAndIncidents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

