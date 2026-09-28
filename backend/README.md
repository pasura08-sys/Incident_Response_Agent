# RecallOps Backend

FastAPI + SQLite backend matching the RecallOps frontend.

## 1. Setup

Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If PowerShell blocks activation, run the uvicorn command with the Python executable inside `.venv` instead.

## 2. Run

```powershell
uvicorn app.main:app --reload --port 8000
```

Open `http://127.0.0.1:8000/docs` for Swagger.

## 3. Connect the frontend

In `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Then restart Vite.

## 4. Hindsight

The backend supports Hindsight through `hindsight-client`. Set:

```env
HINDSIGHT_ENABLED=true
HINDSIGHT_URL=http://127.0.0.1:8888
HINDSIGHT_BANK_ID=recallops
HINDSIGHT_SEED_DEMO=true
```

If Hindsight is unavailable or disabled, RecallOps automatically falls back to structured SQLite retrieval so the demo still works.

The Hindsight flow is:

- `recall` during incident analysis
- `retain` after an incident is resolved
- the same incident document ID is reused for memory updates

## API

- `GET /api/health`
- `POST /api/incidents/analyze`
- `POST /api/incidents/resolve`

See `docs/api-contract.json` in the frontend package for example payloads.
