# DarkTrace AI / Atlas Frontend

This is the authorized dark-web deanonymization and identity-attribution workstation for the SIH Project. The frontend now traces an anonymous actor across evidence, aliases, behavioral signals, wallets, domains, infrastructure, confidence, reviews, audit events, and reports from the FastAPI backend instead of using the committed demo fixtures.

## Run locally

From this directory:

```bash
cp .env.example .env
npm install
npm run dev
```

The default API URL is `http://localhost:8000/api/v1`. Set `VITE_API_URL` in `.env` when the backend is hosted elsewhere. Start the backend and its PostgreSQL dependency before opening the frontend.

## Demo login

Use the synthetic investigator account provisioned by the backend. The login screen displays the repository’s development account hint for the hackathon dataset. The credentials are still validated by `POST /api/v1/auth/login`, and all subsequent requests use the returned JWT bearer token.

## Recommended deanonymization presentation path

Authenticate, open the attribution investigations register, select an anonymous-actor investigation, run the correlation pipeline, inspect evidence and identity links, review the confidence/uncertainty breakdown, submit an analyst verification decision, and download the generated attribution report. The application shows loading, empty, error, refresh, and recovery states so a temporary backend issue cannot be mistaken for a successful identity attribution.

## Validation

```bash
npm test
npm run build
npm run lint
```

`npm test` runs the deterministic jsdom integration suite for backend-authenticated login, JWT session persistence, failed-login feedback, live dashboard enrichment, attribution methodology messaging, system status, and investigation-to-workspace navigation. `npm run build` is the primary release check. The lint command requires the `eslint` executable to be installed in the project environment.
