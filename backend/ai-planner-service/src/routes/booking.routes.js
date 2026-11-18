const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  updatePaymentStatus,
  getBooking,
  getUserBookings,
  verifyTicket,
  scanBooking,
} = require('../controllers/bookingController');

// POST /api/bookings/create-order
router.post('/create-order', createOrder);

// POST /api/bookings/verify-payment
router.post('/verify-payment', verifyPayment);

// POST /api/bookings/payment-status  &  PATCH /api/bookings/:bookingId/status
router.post('/payment-status', updatePaymentStatus);
router.patch('/:bookingId/status', updatePaymentStatus);

// POST /api/bookings/verify-ticket  &  GET /api/bookings/verify/:bookingId
router.post('/verify-ticket', verifyTicket);
router.get('/verify/:bookingId', verifyTicket);

// POST /api/bookings/scan
router.post('/scan', scanBooking);

// GET /api/bookings/user/:userId
router.get('/user/:userId', getUserBookings);

// GET /api/bookings/:bookingId
router.get('/:bookingId', getBooking);

module.exports = router;
