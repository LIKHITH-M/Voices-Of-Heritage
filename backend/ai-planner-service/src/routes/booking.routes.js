const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getBooking,
  getUserBookings,
  verifyTicket,
} = require('../controllers/bookingController');

// POST /api/bookings/create-order
router.post('/create-order', createOrder);

// POST /api/bookings/verify-payment
router.post('/verify-payment', verifyPayment);

// POST /api/bookings/verify-ticket
router.post('/verify-ticket', verifyTicket);

// GET /api/bookings/user/:userId
router.get('/user/:userId', getUserBookings);

// GET /api/bookings/:bookingId
router.get('/:bookingId', getBooking);

module.exports = router;
