/**
 * research-service/src/routes/evaluation.routes.js
 *
 * Routes for evaluation logs & research metrics:
 *   POST /api/research/evaluation/log
 *   GET  /api/research/evaluation/metrics
 *   GET  /api/research/evaluation/metrics/:userId
 */

const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/evaluation.controller');

router.post('/log', evaluationController.logRun);
router.get('/metrics', evaluationController.getMetrics);
router.get('/metrics/:userId', evaluationController.getMetrics);

module.exports = router;

