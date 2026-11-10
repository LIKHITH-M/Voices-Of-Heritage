const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

router.post('/cashfree-order', ticketController.createCashfreeOrder);
router.post('/razorpay-order', ticketController.createCashfreeOrder); // Also handle razorpay-order gracefully with Cashfree
router.post('/book', ticketController.bookTicket);
router.get('/verify/:id', ticketController.verifyTicket);
router.post('/scan', ticketController.scanTicket);
router.post('/staff/login', ticketController.staffLogin);

module.exports = router;
