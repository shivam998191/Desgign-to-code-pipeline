# Design → Code pipeline

End-to-end MVP that turns a Jira ticket (plus optional Figma context) into a **Bitbucket Cloud** branch, commits, pull request, optional deploy hook, and rollback on failure. A React dashboard shows each stage, live logs, and WebSocket updates.

## Architecture

- **Backend**: Node.js + TypeScript, Express, **MongoDB** (official driver), BullMQ (Redis), Socket.IO, OpenAI, Bitbucket REST API (Axios + `form-data` for commits).
- **Frontend**: React + TypeScript + Vite + Tailwind + Socket.IO client.
- **Secrets**: Loaded only on the server from `.env`. They are never sent to the browser or embedded in AI system prompts beyond what the backend services already use with provider APIs.

## Prerequisites

- Node.js 20+
- **MongoDB Atlas** (or other MongoDB) and **Redis** (`docker compose` in this folder starts Redis only).

## 1. Start infrastructure

From `design-to-code-pipeline/`:

```bash
docker compose up -d
```

Copy `backend/.env.example` to `backend/.env` and set **MongoDB**, **Jira**, **Bitbucket** (`BITBUCKET_USERNAME` + `BITBUCKET_API_TOKEN`), **Figma**, **OpenAI**, and Redis.

## 2. Backend

```bash
cd backend
npm install
npm run dev
```

The API listens on `PORT` (default `4000`) and exposes:

- `GET /health` — liveness.
- `GET /api/jobs` — list jobs (newest first).
- `POST /api/jobs` — body `{ "ticketId": "PROJ-123", "repo": "workspace/repo-slug" }` (**Bitbucket** workspace and repository slug).
- `GET /api/jobs/:jobId` — job detail with ordered steps and logs.
- `POST /api/jobs/:jobId/retry` — reset steps and re-queue the pipeline.

Socket.IO emits `job-update` with the full job snapshot after each meaningful change.

## 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` and `/socket.io` to `http://localhost:4000` during development. For production, set `VITE_API_BASE` and `VITE_SOCKET_URL` to your deployed API origin.

## Security notes

- Use **read-only** Jira and Figma tokens where possible.
- Use a **Bitbucket app password** (or scoped token) with only the repo permissions you need.
- Logging uses structured redaction for common secret paths; avoid logging raw ticket payloads that might contain pasted credentials.

## Pipeline stages

`FETCH_JIRA` → `PARSE_REQUIREMENTS` → `FETCH_FIGMA` → `ANALYZE` → `GENERATE_CODE` → `CREATE_BRANCH` → `COMMIT_CODE` → `CREATE_PR` → `DEPLOY` → (`ROLLBACK` on failure).

`DEPLOY` is a no-op unless `DEPLOY_WEBHOOK_URL` is set. On failure after a branch exists, the rollback path deletes the remote branch (best-effort) and posts a rollback payload to the same webhook when configured.

## BullMQ retries

`PIPELINE_MAX_ATTEMPTS` controls how many times BullMQ will retry the **entire** pipeline job after a worker-level failure. The default is `1` to avoid duplicate branches or PRs; use manual retry from the dashboard for controlled reruns.

## Customization

- Replace `run_tests` in `backend/src/mcp/tools.ts` with a call into your CI provider.
- Tighten AI prompts in `backend/src/modules/ai/aiService.ts` to match your repository conventions.
- Extend `deployService` to call your real deployment platform instead of a generic webhook.
