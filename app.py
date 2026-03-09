from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import sqlite3
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "incidents.db"


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS incidents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            incident_type TEXT NOT NULL,
            severity INTEGER NOT NULL,
            attack_vector TEXT,
            system_affected TEXT,
            threat_score INTEGER NOT NULL,
            risk_level TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


def calculate_threat_score(payload):
    severity = int(payload.get("severity", 0))
    attack_complexity = int(payload.get("attack_complexity", 0))
    data_sensitivity = int(payload.get("data_sensitivity", 0))
    exposure_level = int(payload.get("exposure_level", 0))

    raw_score = (
        severity * 4
        + attack_complexity * 3
        + data_sensitivity * 2
        + exposure_level * 1
    )
    # Clamp score between 0 and 100
    score = max(0, min(100, raw_score))

    if score <= 30:
        risk_level = "Low"
    elif score <= 60:
        risk_level = "Medium"
    else:
        risk_level = "High"

    return score, risk_level


def mitigation_for_risk(risk_level):
    if risk_level == "High":
        return [
            "Isolate affected systems immediately.",
            "Initiate incident response playbook.",
            "Notify security leadership and legal/compliance if required.",
            "Increase monitoring thresholds for related assets.",
        ]
    if risk_level == "Medium":
        return [
            "Increase logging and monitoring on affected systems.",
            "Apply relevant patches and hardening controls.",
            "Review access logs and user activity.",
        ]
    return [
        "Continue standard monitoring.",
        "Document the incident for trend analysis.",
        "Review existing controls for potential improvements.",
    ]


app = Flask(__name__, template_folder="templates", static_folder="static")
CORS(app, resources={r"/api/*": {"origins": "*"}})


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/analyze", methods=["POST"])
def analyze():
    data = request.get_json(force=True)
    score, risk_level = calculate_threat_score(data)
    mitigation = mitigation_for_risk(risk_level)
    return jsonify(
        {
            "threat_score": score,
            "risk_level": risk_level,
            "mitigation_steps": mitigation,
        }
    )


@app.route("/api/incidents", methods=["GET"])
def get_incidents():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, title, incident_type, severity, attack_vector, system_affected, "
        "threat_score, risk_level, description, created_at "
        "FROM incidents ORDER BY datetime(created_at) DESC"
    )
    rows = cur.fetchall()
    conn.close()

    incidents = [dict(row) for row in rows]
    return jsonify({"incidents": incidents})


@app.route("/api/incidents", methods=["POST"])
def create_incident():
    data = request.get_json(force=True)
    score, risk_level = calculate_threat_score(data)

    title = data.get("title", "Untitled Incident")
    incident_type = data.get("incident_type", "Unknown")
    severity = int(data.get("severity", 0))
    attack_vector = data.get("attack_vector", "")
    system_affected = data.get("system_affected", "")
    description = data.get("description", "")
    created_at = datetime.utcnow().isoformat(timespec="seconds")

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO incidents
        (title, incident_type, severity, attack_vector, system_affected,
         threat_score, risk_level, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            title,
            incident_type,
            severity,
            attack_vector,
            system_affected,
            score,
            risk_level,
            description,
            created_at,
        ),
    )
    conn.commit()
    incident_id = cur.lastrowid
    conn.close()

    return (
        jsonify(
            {
                "id": incident_id,
                "title": title,
                "incident_type": incident_type,
                "severity": severity,
                "attack_vector": attack_vector,
                "system_affected": system_affected,
                "threat_score": score,
                "risk_level": risk_level,
                "description": description,
                "created_at": created_at,
            }
        ),
        201,
    )


@app.route("/api/stats", methods=["GET"])
def stats():
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM incidents")
    total_incidents = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM incidents WHERE risk_level = 'High'")
    high_risk = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM incidents WHERE risk_level = 'Medium'")
    medium_risk = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM incidents WHERE risk_level = 'Low'")
    low_risk = cur.fetchone()[0]

    cur.execute(
        """
        SELECT substr(created_at, 1, 10) as day, COUNT(*) as count
        FROM incidents
        GROUP BY day
        ORDER BY day ASC
        """
    )
    timeline_rows = cur.fetchall()
    conn.close()

    timeline = [{"day": row["day"], "count": row["count"]} for row in timeline_rows]

    return jsonify(
        {
            "total_incidents": total_incidents,
            "high_risk": high_risk,
            "medium_risk": medium_risk,
            "low_risk": low_risk,
            "timeline": timeline,
        }
    )


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)

