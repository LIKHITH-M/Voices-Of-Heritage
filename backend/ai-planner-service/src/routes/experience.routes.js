const express = require('express');
const router = express.Router();
const {
  listExperiences,
  getExperienceById,
  getTripExperiences,
  createExperience,
  updateExperience,
  deleteExperience,
  extractFeedback,
  triggerGraphUpdate,
  autoSync,
  getPreferences,
  getSummary,
} = require('../controllers/experienceController');

// Static / specialized endpoints FIRST (before /:id param)
router.get('/preferences', getPreferences);
router.get('/summary', getSummary);
router.get('/trip/:tripId', getTripExperiences);
router.post('/extract', extractFeedback);
router.post('/graph-update', triggerGraphUpdate);
router.post('/auto-sync', autoSync);

// CRUD endpoints
router.get('/', listExperiences);
router.post('/', createExperience);
router.get('/:id', getExperienceById);
router.put('/:id', updateExperience);
router.delete('/:id', deleteExperience);

module.exports = router;
