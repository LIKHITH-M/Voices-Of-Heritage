# auth-service

> Part of the **Voices of Heritage** microservices backend.

## Responsibility

JWT & OAuth2 authentication, user registration, role management, email verification.

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
