/**
 * Voices of Heritage — AI Planner Service
 * Port: 5002 (DEPKG + Heritage Trip Generation)
 */

require('dotenv').config({ path: '../../.env' });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

process.on('unhandledRejection', (reason) => {
  console.warn('[AI Planner] Unhandled Promise Rejection (handled safely):', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('[AI Planner] Uncaught Exception (handled safely):', err?.message || err);
});

const app = express();
const PORT = process.env.AI_PLANNER_PORT || 5002;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/voices_heritage';

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
}));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────
const depkgRoutes    = require('./depkg/routes/depkgRoutes');
const aiRoutes       = require('./routes/ai.routes');
const ticketRoutes   = require('./routes/ticketRoutes');
const tripRoutes     = require('./routes/trips.routes');
const mapRoutes      = require('./routes/maps.routes');
const bookingRoutes  = require('./routes/booking.routes');
const stayRoutes     = require('./routes/stay.routes');
const guideRoutes    = require('./routes/guide.routes');
const foodRoutes     = require('./routes/food.routes');
const wellnessRoutes   = require('./routes/wellness.routes');
const utilityRoutes    = require('./routes/utility.routes');
const experienceRoutes = require('./routes/experience.routes');

app.use('/api/depkg',       depkgRoutes);
app.use('/depkg',           depkgRoutes);
app.use('/api/ai',          aiRoutes);
app.use('/ai',              aiRoutes);
app.use('/api/tickets',     ticketRoutes);
app.use('/tickets',         ticketRoutes);
app.use('/api/trips',       tripRoutes);
app.use('/trips',           tripRoutes);
app.use('/api/maps',        mapRoutes);
app.use('/maps',            mapRoutes);
app.use('/api/bookings',    bookingRoutes);
app.use('/api/stays',       stayRoutes);
app.use('/api/guides',      guideRoutes);
app.use('/api/food',        foodRoutes);
app.use('/api/wellness',    wellnessRoutes);
app.use('/api/utilities',   utilityRoutes);
app.use('/api/experiences', experienceRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'OK', service: 'voh-ai-planner', timestamp: new Date().toISOString() }));

// ── MongoDB ───────────────────────────────────────────────────
mongoose.set('bufferCommands', false);
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 2500,
})
  .then(() => console.log(`[AI Planner] MongoDB connected: ${MONGO_URI}`))
  .catch(err => console.warn('[AI Planner] MongoDB offline/warning:', err.message, '- Falling back to local storage store for trips.'));

app.listen(PORT, () => {
  console.log(`\n🧠 VOH AI Planner Service running on http://localhost:${PORT}`);
  console.log(`   DEPKG API: http://localhost:${PORT}/api/depkg`);
  console.log(`   AI API:    http://localhost:${PORT}/api/ai\n`);
});
