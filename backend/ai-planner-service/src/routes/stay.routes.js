const express = require('express');
const router = express.Router();
const {
  getLiveInventory,
  bookStay,
  getStayBooking,
  getUserStayBookings,
  cancelStayBooking,
} = require('../controllers/stayController');

// GET /api/stays/inventory — live OSM hotel inventory + real-time availability
router.get('/inventory', getLiveInventory);

// POST /api/stays/book
router.post('/book', bookStay);

// GET /api/stays/user/:userId
router.get('/user/:userId', getUserStayBookings);

// GET /api/stays/:bookingId
router.get('/:bookingId', getStayBooking);

// PATCH /api/stays/:bookingId/cancel
router.patch('/:bookingId/cancel', cancelStayBooking);

module.exports = router;
