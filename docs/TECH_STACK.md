# 🛠️ Voices of Heritage — Tech Stack Reference

## Frontend

| Technology | Purpose | Version |
|---|---|---|
| **Next.js** | SSR/SSG framework (SEO, routing, API routes) | 14.x |
| **React** | Component-based UI | 18.x |
| **Tailwind CSS** | Utility-first styling | 3.x |
| **Three.js** | 3D rendering for VR/AR scenes | Latest |
| **A-Frame** | WebXR VR experiences | 1.5.x |
| **Pannellum.js** | 360° photo/video viewer | Latest |
| **model-viewer** | 3D artifact model viewer (Google Web Component) | Latest |
| **D3.js** | Crowd heatmap visualisations | 7.x |
| **Socket.io Client** | Real-time WebSocket connections | Latest |

## Backend Services

| Technology | Purpose |
|---|---|
| **Node.js 20 + Express** | Main REST API services |
| **Python 3.11 + FastAPI** | AI/ML services (chatbot, crowd analytics) |
| **Socket.io** | WebSocket real-time events (crowd, notifications) |
| **WebRTC (Mediasoup/Janus)** | Live virtual tour streaming |

## Databases

| Database | Role | Use Cases |
|---|---|---|
| **PostgreSQL 16** | Relational data | Users, bookings, payments, guides, events |
| **MongoDB 7** | Document store | Archive metadata, manuscripts, artifact records |
| **Redis 7** | Cache + sessions | JWT sessions, rate limiting, WebSocket state, weather cache |

## Authentication

| Technology | Purpose |
|---|---|
| **JWT** | Stateless API authentication |
| **bcrypt** | Password hashing |
| **OAuth2 — Google** | Social login |
| **OAuth2 — Facebook** | Social login |

## AI / ML

| Technology | Purpose |
|---|---|
| **OpenAI API (GPT-4o)** | Heritage AI chatbot |
| **LangChain (Python)** | RAG pipeline over heritage knowledge base |
| **scikit-learn** | Crowd analytics & prediction models |
| **TensorFlow/Keras** | Deep learning crowd forecasting |
| **D-Wave / Classical heuristics** | Quantum-inspired route optimisation |

## Real-Time & Streaming

| Technology | Purpose |
|---|---|
| **WebRTC (Mediasoup)** | Guide-to-visitor live virtual tours |
| **WebSockets (Socket.io)** | Real-time crowd data, notifications |
| **WebXR API / AR.js** | Augmented reality overlays |

## Blockchain

| Technology | Purpose |
|---|---|
| **Ethereum / Solidity** | Smart contracts for ticket issuance |
| **Hyperledger Fabric** | Enterprise-grade permissioned blockchain option |
| **Hardhat** | Smart contract development & testing |
| **ethers.js** | Frontend blockchain interaction |
| **IPFS** | Decentralised storage for NFT heritage passes |

## Infrastructure & DevOps

| Technology | Purpose |
|---|---|
| **Docker** | Containerisation of all services |
| **Docker Compose** | Local multi-service development |
| **Kubernetes (K8s)** | Production orchestration, autoscaling |
| **Nginx / Kong** | API Gateway & reverse proxy |
| **GitHub Actions** | CI/CD pipeline |
| **Prometheus + Grafana** | Metrics monitoring & dashboards |
| **Sentry** | Error tracking |

## Cloud & Storage

| Technology | Purpose |
|---|---|
| **AWS / GCP** | Cloud hosting |
| **AWS S3 / GCS** | Media asset storage (images, 3D models, videos) |
| **CloudFront / Cloudflare** | CDN for global media delivery |
| **MongoDB Atlas** | Managed MongoDB (production) |
| **AWS RDS** | Managed PostgreSQL (production) |

## Payments

| Technology | Purpose |
|---|---|
| **Razorpay** | Primary payment gateway (India) |
| **Stripe** | International payments |

## External APIs

| API | Purpose |
|---|---|
| **OpenWeatherMap** | Real-time weather per heritage site |
| **NewsAPI / RSS** | Place-specific heritage news |
| **Mapbox / Google Maps** | Interactive maps, offline navigation |
| **Google Translate / DeepL** | Multi-language translation |
| **UNESCO API** | World Heritage site data sync |
| **ASI Database** | Archaeological Survey of India monuments |
| **MakeMyTrip / Booking.com** | Transport & hotel deep linking |
| **IRCTC API** | Train booking integration |
