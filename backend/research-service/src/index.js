/**
 * research-service/src/index.js
 *
 * Entry point for the VoH Research Service.
 * This microservice runs on port 5003 alongside:
 *   - auth-service    :4001  (authentication + user profiles)
 *   - ai-planner-service :5002 (heritage itinerary generation)
 *
 * Responsibilities:
 *   - Receive and store travel experience events
 *   - Extract observations from raw events
 *   - Run preference inference (PTKG update)
 *   - Serve PTKG context for personalized itinerary generation
 *   - Provide RAG context from heritage knowledge base
 *   - Log evaluation metrics for research comparison
 */

require('dotenv').config({ path: '../../.env' });

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const morgan = require('morgan');
const helmet = require('helmet');

const app = express();
const PORT = process.env.RESEARCH_SERVICE_PORT || 5003;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/voices_heritage';

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3003',
    'http://127.0.0.1:3000',
    process.env.VITE_FRONTEND_URL,
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// Phase 2: Experience ingestion
const experienceRoutes = require('./routes/experience.routes');
app.use('/api/research', experienceRoutes);
app.use('/api', experienceRoutes);

// Phase 3: Trip persistence
const tripRoutes = require('./routes/trip.routes');
app.use('/api/trips', tripRoutes);

// Phase 7: Preference consolidation
const consolidationRoutes = require('./routes/consolidation.routes');
app.use('/api/research', consolidationRoutes);
app.use('/api', consolidationRoutes);

// Phase 8: PTKG management
const ptkgRoutes = require('./routes/ptkg.routes');
app.use('/api/research/ptkg', ptkgRoutes);
app.use('/api/ptkg', ptkgRoutes);

// Phase 10: Graph context retrieval
const contextRoutes = require('./routes/context.routes');
app.use('/api/research/context', contextRoutes);
app.use('/api/context', contextRoutes);

// Phase 12: RAG
const ragRoutes = require('./routes/rag.routes');
app.use('/api/research/rag', ragRoutes);
app.use('/api/rag', ragRoutes);

// Phase 17: Evaluation
const evaluationRoutes = require('./routes/evaluation.routes');
app.use('/api/research/evaluation', evaluationRoutes);
app.use('/api/evaluation', evaluationRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'voh-research-service',
    version: '1.0.0',
    phase: 19,                           // All 19 research phases fully completed
    mongoConnected: mongoose.connection.readyState === 1,
    timestamp: new Date().toISOString(),
  });
});

// ─── Global error handler ─────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('[research-service] Error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── Database connection + Server start ───────────────────────────────────────

mongoose.set('bufferCommands', false);

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 })
  .then(() => {
    console.log('[research-service] MongoDB connected:', MONGO_URI);
  })
  .catch(err => {
    console.warn('[research-service] MongoDB not connected, running in resilient mode:', err.message);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`[research-service] Running on http://localhost:${PORT}`);
      console.log(`[research-service] Health check: http://localhost:${PORT}/health`);
    });
  });

module.exports = app; // for tests
