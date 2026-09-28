# RecallOps — Full Hackathon Package

This package contains the matched frontend and backend for the RecallOps incident-response demo.

## Structure

```text
RecallOps-Full/
├── backend/
│   ├── app/
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
└── frontend/
    ├── src/
    ├── public/
    ├── package.json
    └── README.md
```

## Fastest local run

### Terminal 1 — backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Terminal 2 — frontend

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Then:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL in Chrome.

## Demo behavior

The backend seeds one resolved historical database-timeout incident into SQLite on first run. Analyzing the default incident recalls it and recommends its recorded resolution. Resolving the new incident stores the new experience and, when Hindsight is enabled, retains it in the configured Hindsight memory bank.

## Hindsight

Hindsight is optional at runtime. With it enabled, the backend uses Hindsight `recall` for retrieval and `retain` for the memory loop. Without it, SQLite retrieval keeps the demo functional.
