/**
 * research-service/src/routes/rag.routes.js
 *
 * Routes for RAG knowledge retrieval:
 *   POST /api/research/rag/index
 *   POST /api/research/rag/query
 */

const express = require('express');
const router = express.Router();
const ragController = require('../controllers/rag.controller');

router.post('/index', ragController.triggerIndex);
router.post('/query', ragController.queryRAG);

module.exports = router;

