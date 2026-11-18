const express = require('express');
const router = express.Router();
const {
  bookStay,
  getStayBooking,
  getUserStayBookings,
  cancelStayBooking,
} = require('../controllers/stayController');

// POST /api/stays/book
router.post('/book', bookStay);

// GET /api/stays/user/:userId
router.get('/user/:userId', getUserStayBookings);

// GET /api/stays/:bookingId
router.get('/:bookingId', getStayBooking);

// PATCH /api/stays/:bookingId/cancel
router.patch('/:bookingId/cancel', cancelStayBooking);

module.exports = router;
