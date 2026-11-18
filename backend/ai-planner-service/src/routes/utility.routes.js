const express = require('express');
const router = express.Router();
const {
  getLiveWeather,
  getAudioNarrations,
  getEmergencyHelplines,
  handleHeritageChat,
} = require('../controllers/utilityController');

// GET /api/utilities/weather?city=Hampi
router.get('/weather', getLiveWeather);

// GET /api/utilities/narrations
router.get('/narrations', getAudioNarrations);

// GET /api/utilities/helplines?state=Karnataka&category=Tourist
router.get('/helplines', getEmergencyHelplines);

// POST /api/utilities/chat
router.post('/chat', handleHeritageChat);

module.exports = router;
