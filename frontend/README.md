# RecallOps Frontend

Premium React/Vite UI for the RecallOps incident-memory demo.

## Run

```bash
npm install
npm run dev
```

For the real backend, create `.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

If `VITE_API_BASE_URL` is empty, the UI uses `public/mock-incident.json`, so it can be demoed without a backend.

## Backend contract

- `GET /api/health`
- `POST /api/incidents/analyze`
- `POST /api/incidents/resolve`

The frontend and backend in the full RecallOps package use the same contract.
