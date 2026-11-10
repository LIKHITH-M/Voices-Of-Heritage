# smart-utilities

> Part of the **Voices of Heritage** microservices backend.

## Responsibility

AI chatbot (RAG), offline navigation, real-time weather, place-specific news.

## Port

`utilities` — see docker-compose.yml for the assigned port.

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
