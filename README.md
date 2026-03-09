# Cyber Crime Risk Assessment & Threat Scoring Dashboard

Live Demo: https://harshbuwade.pythonanywhere.com/
A dark, forensic-style **Cyber Crime Investigation Dashboard** for assessing incidents, calculating threat scores, and visualizing risk using a Flask backend, SQLite, and a React-powered frontend (via CDN) with Chart.js.

## Tech Stack

- **Backend**: Python, Flask, SQLite, Flask-CORS
- **Frontend**: HTML, CSS, JavaScript, React 18 (UMD + Babel), Chart.js

## Project Structure

- `app.py` — Flask application and API endpoints
- `incidents.db` — SQLite database (created automatically on first run)
- `templates/index.html` — main dashboard shell
- `static/css/styles.css` — dark “investigation board” theme
- `static/js/app.jsx` — React dashboard logic (threat scoring, charts, boards)
- `requirements.txt` — Python dependencies

## Features

- **Threat Scoring Engine**
  - Score = \(Severity × 4 + Attack Complexity × 3 + Data Sensitivity × 2 + Exposure Level × 1\) (clamped 0–100)
  - Risk levels: **Low (0–30)**, **Medium (31–60)**, **High (61–100)**
  - Color-coded score and suggested mitigation steps

- **Dashboard**
  - Total, high, medium, low risk incident counters
  - Risk distribution chart (doughnut)
  - Threat activity timeline (line chart)

- **Incident Input Panel**
  - Title, Incident Type, Attack Vector, Severity (1–10), System Affected, Detection Time
  - Attack Complexity, Data Sensitivity, Exposure Level
  - Description
  - **Analyze Threat** creates & scores a new incident via the API

- **Investigation Board**
  - Case cards styled like digital evidence files
  - Shows ID, title, type, score, risk, asset, created time
  - Status badge mapped from risk level (Open / Investigating / Closed)

- **Alerts Panel**
  - Live-style flashing alerts in red/yellow tones
  - Contextual alerts based on current high/medium risk counts

- **Reports**
  - Table of previous incidents
  - Filter by risk level
  - Export via browser **Print → Save as PDF**

## Running the App

1. **Create & activate a virtual environment (recommended)**

```bash
cd aaliyah
python -m venv venv
venv\Scripts\activate  # on Windows PowerShell
```

2. **Install dependencies**

```bash
pip install -r requirements.txt
```

3. **Start the Flask server**

```bash
python app.py
```

4. **Open the dashboard**

Visit `http://localhost:5000` in your browser.

On first run, `incidents.db` and the `incidents` table are created automatically.

## API Overview

- `POST /api/analyze`
  - Request JSON: `{ severity, attack_complexity, data_sensitivity, exposure_level, ... }`
  - Response JSON: `{ threat_score, risk_level, mitigation_steps }`

- `GET /api/incidents`
  - Returns stored incidents in descending `created_at` order.

- `POST /api/incidents`
  - Creates a new incident, calculates score and risk level, and persists it.

- `GET /api/stats`
  - Returns dashboard counters and timeline aggregation.

## Next Steps / Extensions

- Add user authentication and role-based access
- Persist incident status separately from risk-derived mapping
- Add a heatmap view and more advanced timelines
- Integrate external threat intelligence feeds

