# dashboard-service

> Part of the **Voices of Heritage** microservices backend.

## Responsibility

Home dashboard data aggregation, personalised recommendations, activity feed.

## Port

`service` — see docker-compose.yml for the assigned port.

## Tech

- Node.js 20 + Express (or Python FastAPI for ML-heavy services)
- PostgreSQL / MongoDB (see docker-compose.yml)

## Getting Started

```bash
npm install
cp ../../.env.example .env   # fill in service-specific vars
npm run dev
```

## API Routes

> To be documented in Phase 1+

## Tests

```bash
npm test
```
