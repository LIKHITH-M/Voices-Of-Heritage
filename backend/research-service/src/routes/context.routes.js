/**
 * research-service/src/routes/context.routes.js
 *
 * Route definitions for context retrieval:
 *   GET /api/research/context/:userId
 */

const express = require('express');
const router = express.Router();
const contextController = require('../controllers/context.controller');

router.get('/:userId', contextController.getContext);

module.exports = router;

