const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const Booking = require('../models/Booking');
const localStore = require('../utils/localBookingStore');

// Helper: try Mongoose, fall back to local store
const isMongoConnected = () => {
  const mongoose = require('mongoose');
  return mongoose.connection.readyState === 1;
};

exports.createOrder = async (req, res) => {
  try {
    const {
      userId, monumentId, monumentName, visitDate,
      timeSlot, ticketType, numTickets, totalAmount,
    } = req.body;

    if (!userId || !monumentId || !monumentName || !visitDate || !totalAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const bookingId = `BKG_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const amountInPaise = Math.round(totalAmount * 100);

    let razorpayOrderId = null;
    let isMock = false;

    // Try Razorpay
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET &&
        !process.env.RAZORPAY_KEY_ID.includes('your_')) {
      try {
        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        const order = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: bookingId,
        });
        razorpayOrderId = order.id;
      } catch (rzpErr) {
        console.warn('[Booking] Razorpay order creation failed, using mock:', rzpErr.message);
        razorpayOrderId = `order_mock_${Date.now()}`;
        isMock = true;
      }
    } else {
      razorpayOrderId = `order_mock_${Date.now()}`;
      isMock = true;
    }

    const bookingData = {
      bookingId, userId, monumentId, monumentName,
      visitDate, timeSlot, ticketType,
      numTickets: numTickets || 1,
      totalAmount,
      paymentStatus: 'pending',
      razorpayOrderId,
    };

    if (isMongoConnected()) {
      await Booking.create(bookingData);
    } else {
      localStore.saveBooking(bookingData);
    }

    return res.status(201).json({
      orderId: razorpayOrderId,
      bookingId,
      amount: amountInPaise,
      currency: 'INR',
      isMock,
    });
  } catch (err) {
    console.error('[Booking] createOrder error:', err);
    return res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!bookingId) return res.status(400).json({ error: 'bookingId required' });

    // Signature verification
    let signatureValid = false;
    if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const secret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret';
      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('hex');
      signatureValid = expectedSig === razorpay_signature;
    } else {
      // Mock flow — accept without signature
      signatureValid = true;
    }

    if (!signatureValid) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    let booking;
    if (isMongoConnected()) {
      booking = await Booking.findOne({ bookingId });
    } else {
      booking = localStore.getBookingById(bookingId);
    }

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const qrData = JSON.stringify({
      bookingId: booking.bookingId,
      monumentName: booking.monumentName,
      visitDate: booking.visitDate,
      timeSlot: booking.timeSlot,
      ticketType: booking.ticketType,
      numTickets: booking.numTickets,
      userId: booking.userId,
    });

    const updateData = {
      paymentStatus: 'paid',
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      qrData,
    };

    if (isMongoConnected()) {
      booking = await Booking.findOneAndUpdate({ bookingId }, updateData, { new: true });
    } else {
      booking = localStore.updateBookingStatus(bookingId, updateData);
    }

    return res.json({ success: true, booking });
  } catch (err) {
    console.error('[Booking] verifyPayment error:', err);
    return res.status(500).json({ error: 'Payment verification failed', details: err.message });
  }
};

exports.getBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    let booking;
    if (isMongoConnected()) {
      booking = await Booking.findOne({ bookingId });
    } else {
      booking = localStore.getBookingById(bookingId);
    }
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    return res.json(booking);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    let bookings;
    if (isMongoConnected()) {
      bookings = await Booking.find({ userId }).sort({ createdAt: -1 });
    } else {
      bookings = localStore.getBookingsByUserId(userId);
    }
    return res.json(bookings);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.verifyTicket = async (req, res) => {
  try {
    const { qrData } = req.body;
    if (!qrData) return res.status(400).json({ error: 'qrData required' });

    let parsed;
    try {
      parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch {
      return res.status(400).json({ valid: false, error: 'Invalid qrData format' });
    }

    const { bookingId } = parsed;
    if (!bookingId) return res.status(400).json({ valid: false, error: 'bookingId not found in qrData' });

    let booking;
    if (isMongoConnected()) {
      booking = await Booking.findOne({ bookingId });
    } else {
      const result = localStore.verifyTicket(bookingId);
      return res.json(result);
    }

    if (!booking) return res.json({ valid: false, booking: null });
    return res.json({ valid: booking.paymentStatus === 'paid', booking });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
