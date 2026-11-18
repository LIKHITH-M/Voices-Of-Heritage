const express = require('express');
const router = express.Router();
const {
  submitApplication,
  getApplication,
  getUserApplication,
  updateStatus,
  listApplications,
} = require('../controllers/guideController');

// GET /api/guides/applications — list all (with optional ?status= filter)
router.get('/applications', listApplications);

// POST /api/guides/apply
router.post('/apply', submitApplication);

// GET /api/guides/by-email/:email
router.get('/by-email/:email', getUserApplication);

// GET /api/guides/application/:id
router.get('/application/:id', getApplication);

// PATCH /api/guides/application/:id/status
router.patch('/application/:id/status', updateStatus);

module.exports = router;
