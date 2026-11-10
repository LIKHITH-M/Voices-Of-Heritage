# 🏛️ Voices of Heritage — Digital Archives Service

> Manages manuscript & mural galleries, 3D artifact catalog, research hub, and public API access.

## Responsibility
- Upload & browse high-resolution manuscripts, murals, photographs
- 3D model viewer (.glb / .obj / .stl) via Three.js / model-viewer
- Artifact detail pages (history, dimensions, provenance)
- Research paper portal with citation generator
- Public REST API with API key management for researchers
- Bulk data export (CSV/JSON) for institutions

## Port: `4004`

## Tech
- Node.js 20 + Express
- MongoDB (artifact metadata, manuscripts)
- PostgreSQL (researcher accounts, API keys)
- AWS S3 (media & 3D model storage)

## Getting Started
```bash
npm install
cp ../../.env.example .env
npm run dev
```
