/**
 * research-service/src/routes/ptkg.routes.js
 *
 * Routes for PTKG graph data and operations:
 *   GET  /api/research/ptkg/:userId               -> Summary
 *   GET  /api/research/ptkg/:userId/graph         -> Full graph nodes and edges
 *   GET  /api/research/ptkg/:userId/preferences   -> Preference nodes
 *   POST /api/research/ptkg/:userId/build         -> Trigger rebuild
 */

const express = require('express');
const router = express.Router();
const ptkgController = require('../controllers/ptkg.controller');

router.get('/:userId', ptkgController.getSummary);
router.get('/:userId/graph', ptkgController.getGraph);
router.get('/:userId/preferences', ptkgController.getPreferences);
router.post('/:userId/build', ptkgController.triggerBuild);

module.exports = router;

