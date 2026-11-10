# 🏛️ Voices of Heritage

> **A Feature-Rich Cultural Heritage Platform** — Connecting travellers, researchers, and communities with India's living heritage through immersive technology.

---

## 🌐 Overview

**Voices of Heritage** is a full-stack, microservices-based web platform offering:

- 🌐 **Immersive Experiences** — VR/AR tours, 360° storytelling, live WebRTC guides
- 🧠 **Smart Utilities** — AI chatbot, offline navigation, real-time weather
- 📚 **Digital Archives** — Manuscripts, 3D artifact scans, research hub
- 🎒 **Activity Booking** — Heritage treks, sunrise viewings, photography tours
- 🛍️ **Artisan Marketplace** — Certified heritage crafts, live demonstrations
- 🌿 **Conservation Tools** — Adopt a heritage element, volunteer portal, damage reporting
- 🤝 **Partnerships** — Tourism boards, UNESCO/ASI data sync, transport & hotel APIs
- 🔐 **Blockchain Ticketing** — Tamper-proof ticket issuance & QR verification

---

## 🗂️ Repository Structure

```
voices-of-heritage/
├── frontend/                  # Next.js app (SSR, SEO-optimised)
├── backend/
│   ├── auth-service/          # JWT + OAuth2 authentication
│   ├── dashboard-service/     # Home dashboard & navigation
│   ├── immersive-service/     # VR/AR/Virtual Tours (WebRTC, Three.js)
│   ├── archives-service/      # Digital archives & research
│   ├── smart-utilities/       # AI chatbot, weather, news, offline nav
│   ├── crowd-service/         # Real-time crowd insight & analytics
│   ├── stay-service/          # Smart stay & lodging booking
│   ├── artisan-service/       # Local artisan marketplace
│   ├── conservation-service/  # Conservation participation tools
│   ├── food-service/          # Heritage food trail & culinary archive
│   ├── wellness-service/      # Spiritual & wellness experiences
│   ├── school-service/        # School & institutional programs
│   ├── activity-service/      # Experience & activity booking
│   ├── community-service/     # Economic & community features
│   └── partnerships-service/  # Tourism board, transport, UNESCO APIs
├── blockchain/                # Ethereum/Hyperledger smart contracts
├── ml-models/                 # AI/ML models (chatbot, crowd, routing)
├── infrastructure/            # Docker & Kubernetes configs
└── docs/                      # Architecture, API specs, ADRs
```

---

## 🛠️ Tech Stack

| Layer        | Technology                                        |
|--------------|---------------------------------------------------|
| Frontend     | Next.js 14, React, Tailwind CSS, Three.js, A-Frame |
| Backend      | Node.js (Express) + Python (FastAPI)              |
| Database     | PostgreSQL + MongoDB + Redis                      |
| Auth         | JWT, OAuth2 (Google, Facebook)                    |
| Real-Time    | WebRTC, WebSockets                                |
| AI/ML        | OpenAI API, scikit-learn, TensorFlow              |
| Blockchain   | Ethereum / Hyperledger Fabric                     |
| 3D/AR/VR     | Three.js, WebXR, model-viewer                     |
| Infra        | Docker, Kubernetes, AWS/GCP                       |
| DevOps       | GitHub Actions, Prometheus, Grafana               |
| Payments     | Razorpay / Stripe                                 |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+, Python 3.11+, Docker Desktop, Git

### 1. Clone & install dependencies
```bash
git clone https://github.com/your-org/voices-of-heritage.git
cd voices-of-heritage
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Fill in all required values in .env
```

### Quick 1-Command Startup (Recommended)
Simply run this script from the project root to automatically start all microservices, backend APIs, and the frontend web app on localhost:
```bash
./start.sh
```
*(Or run `npm start`)*

This starts:
- 🌐 **Frontend Web App**: http://localhost:3000
- 🧠 **AI Trip Planner Client**: http://localhost:3001
- 🔐 **Auth Microservice**: http://localhost:4001
- 🤖 **AI Trip Planner API**: http://localhost:5002

Press `Ctrl + C` in the terminal anytime to cleanly stop all services.

---

### Alternative: Docker Compose
```bash
docker compose up --build
```

---

## 🌿 Git Branching Strategy

| Branch          | Purpose                              |
|-----------------|--------------------------------------|
| `main`          | Production-ready code                |
| `dev`           | Integration branch for features      |
| `feature/*`     | Individual feature branches          |
| `hotfix/*`      | Critical production fixes            |
| `release/*`     | Release candidate branches           |

---

## 📅 Development Phases

See [`docs/pipeline.md`](./docs/pipeline.md) for the full 18-phase development plan.

---

## 📄 License

Internal development document — © Voices of Heritage Team
