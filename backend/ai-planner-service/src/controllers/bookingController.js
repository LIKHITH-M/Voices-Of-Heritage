const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const localStore = require('../utils/localBookingStore');

const isMongoConnected = () => mongoose.connection.readyState === 1;

const RAZORPAY_TEST_KEY = process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes('your_')
  ? process.env.RAZORPAY_KEY_ID
  : 'rzp_test_ToUXkFkXqdjYh8';

const hasRealRazorpaySecret = () => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(secret && !secret.includes('your_') && secret.trim().length > 8);
};

// Normalize booking into unified ticket format for verification endpoints
const toTicketPayload = (b) => {
  if (!b) return null;
  const obj = typeof b.toObject === 'function' ? b.toObject() : b;
  const status =
    obj.ticketStatus === 'scanned'
      ? 'scanned'
      : obj.paymentStatus === 'cancelled' || obj.ticketStatus === 'cancelled'
      ? 'cancelled'
      : obj.paymentStatus === 'paid'
      ? 'active'
      : obj.paymentStatus || 'pending';

  return {
    ...obj,
    ticketId: obj.ticketId || obj.bookingId,
    bookingId: obj.bookingId || obj.ticketId,
    activityName: obj.monumentName || obj.activityName,
    site: obj.site || obj.monumentName,
    visitorName: obj.visitorName || 'Heritage Visitor',
    email: obj.email || '',
    phone: obj.phone || '',
    visitDate: obj.visitDate,
    visitTime: obj.timeSlot || obj.visitTime || 'Default schedule',
    totalINR: obj.totalAmount ?? obj.totalINR ?? 0,
    status,
  };
};

// POST /api/bookings/create-order
exports.createOrder = async (req, res) => {
  try {
    const {
      userId,
      monumentId,
      monumentName,
      site,
      state,
      category,
      meetingPoint,
      scanPoint,
      visitorName,
      email,
      phone,
      nationality,
      idType,
      idNumber,
      adults,
      children,
      seniors,
      specialRequirements,
      visitDate,
      timeSlot,
      ticketType,
      numTickets,
      totalAmount,
    } = req.body;

    if (!monumentId || !monumentName || !visitDate || totalAmount === undefined || totalAmount === null) {
      return res.status(400).json({ error: 'Missing required fields: monumentId, monumentName, visitDate, totalAmount' });
    }

    const numericAmount = Number(totalAmount);
    if (Number.isNaN(numericAmount) || numericAmount < 0) {
      return res.status(400).json({ error: 'Invalid totalAmount' });
    }

    const bookingId = `VOH-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`;
    const amountInPaise = Math.round(numericAmount * 100);

    let razorpayOrderId = null;
    let isMockOrder = false;

    if (numericAmount === 0) {
      razorpayOrderId = `order_free_${Date.now()}`;
      isMockOrder = true;
    } else if (hasRealRazorpaySecret()) {
      try {
        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
          key_id: RAZORPAY_TEST_KEY,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        const order = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: bookingId,
          notes: {
            bookingId,
            monumentName,
            visitDate,
          },
        });
        razorpayOrderId = order.id;
      } catch (rzpErr) {
        console.warn('[Booking] Razorpay server order creation failed, falling back to test-key checkout:', rzpErr.message);
        razorpayOrderId = `order_test_${Date.now()}`;
        isMockOrder = true;
      }
    } else {
      // Test-key-only mode: frontend opens Razorpay Checkout with key_id + amount (no invalid order_id)
      razorpayOrderId = `order_test_${Date.now()}`;
      isMockOrder = true;
    }

    const bookingData = {
      bookingId,
      ticketId: bookingId,
      userId: userId || 'guest',
      monumentId,
      monumentName,
      site: site || monumentName,
      state: state || '',
      category: category || 'entry-ticket',
      meetingPoint: meetingPoint || '',
      scanPoint: scanPoint || '',
      visitorName: visitorName || 'Heritage Visitor',
      email: email || '',
      phone: phone || '',
      nationality: nationality === 'nri' ? 'nri' : 'indian',
      idType: idType || '',
      idNumber: idNumber || '',
      adults: Number(adults) || 1,
      children: Number(children) || 0,
      seniors: Number(seniors) || 0,
      specialRequirements: specialRequirements || '',
      visitDate,
      timeSlot: timeSlot || 'Site default schedule',
      ticketType: ticketType || (nationality === 'nri' ? 'nri' : 'indian'),
      numTickets: Number(numTickets) || (Number(adults) || 1) + (Number(children) || 0) + (Number(seniors) || 0),
      totalAmount: numericAmount,
      currency: 'INR',
      paymentStatus: 'pending',
      paymentGateway: 'razorpay',
      razorpayOrderId,
      transactionRef: razorpayOrderId,
      ticketStatus: 'pending',
    };

    let saved;
    if (isMongoConnected()) {
      saved = await Booking.create(bookingData);
    } else {
      saved = localStore.saveBooking(bookingData);
    }

    return res.status(201).json({
      success: true,
      orderId: razorpayOrderId,
      bookingId: saved.bookingId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: RAZORPAY_TEST_KEY,
      isMock: isMockOrder,
      booking: toTicketPayload(saved),
    });
  } catch (err) {
    console.error('[Booking] createOrder error:', err);
    return res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
};

// POST /api/bookings/verify-payment
exports.verifyPayment = async (req, res) => {
  try {
    const {
      bookingId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!bookingId) return res.status(400).json({ error: 'bookingId required' });

    let booking;
    if (isMongoConnected()) {
      booking = await Booking.findOne({ bookingId });
    } else {
      booking = localStore.getBookingById(bookingId);
    }

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Determine signature validity
    let signatureValid = false;
    const isFreeBooking = Number(booking.totalAmount) === 0;
    const isServerOrder =
      hasRealRazorpaySecret() &&
      booking.razorpayOrderId &&
      !booking.razorpayOrderId.startsWith('order_test_') &&
      !booking.razorpayOrderId.startsWith('order_mock_') &&
      !booking.razorpayOrderId.startsWith('order_free_');

    if (isFreeBooking) {
      signatureValid = true;
    } else if (isServerOrder) {
      if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
        const expectedSig = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest('hex');
        signatureValid = expectedSig === razorpay_signature;
      }
    } else {
      // Razorpay test-key-only checkout (returns real razorpay_payment_id like pay_...) or offline test payment
      signatureValid = Boolean(razorpay_payment_id);
    }

    if (!signatureValid) {
      const failUpdate = {
        paymentStatus: 'failed',
        ticketStatus: 'pending',
        failureReason: 'Invalid Razorpay payment signature',
        paymentErrorCode: 'SIGNATURE_MISMATCH',
      };
      if (isMongoConnected()) {
        await Booking.findOneAndUpdate({ bookingId }, failUpdate);
      } else {
        localStore.updateBookingStatus(bookingId, failUpdate);
      }
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const paidAt = new Date().toISOString();
    const paymentId = isFreeBooking
      ? `FREE_${bookingId}`
      : razorpay_payment_id || `pay_test_${Date.now()}`;

    const qrData = JSON.stringify({
      bookingId: booking.bookingId,
      ticketId: booking.bookingId,
      monumentName: booking.monumentName,
      site: booking.site || booking.monumentName,
      visitorName: booking.visitorName,
      visitDate: booking.visitDate,
      timeSlot: booking.timeSlot,
      ticketType: booking.ticketType,
      numTickets: booking.numTickets,
      totalAmount: booking.totalAmount,
      paymentStatus: 'paid',
      paymentId,
    });

    const updateData = {
      paymentStatus: 'paid',
      ticketStatus: 'active',
      razorpayPaymentId: paymentId,
      razorpayOrderId: razorpay_order_id || booking.razorpayOrderId,
      razorpaySignature: razorpay_signature || (isFreeBooking ? 'free_entry' : 'razorpay_test_verified'),
      transactionRef: paymentId,
      failureReason: '',
      paymentErrorCode: '',
      paidAt,
      qrData,
    };

    if (isMongoConnected()) {
      booking = await Booking.findOneAndUpdate({ bookingId }, updateData, { new: true });
    } else {
      booking = localStore.updateBookingStatus(bookingId, updateData);
    }

    // Automatically record idempotent monument booking experience for DEPKG
    try {
      const { recordAutoExperience } = require('./experienceController');
      const bObj = toTicketPayload(booking);
      recordAutoExperience({
        userId: bObj.userId || 'guest',
        eventKey: `booking:${bObj.bookingId}`,
        placeId: bObj.monumentId,
        experienceType: 'booking',
        title: bObj.monumentName || 'Monument Ticket',
        destination: bObj.site || bObj.monumentName,
        region: bObj.state || '',
        placeName: bObj.monumentName || bObj.site,
        visitStatus: 'visited',
        plannedData: {
          destination: bObj.site || bObj.monumentName,
          placeName: bObj.monumentName,
          plannedDate: bObj.visitDate,
          plannedTime: bObj.timeSlot,
          estimatedCostINR: bObj.totalAmount,
          groupSize: bObj.numTickets || 1,
        },
        actualData: {
          actualDate: bObj.visitDate,
          actualCostINR: bObj.totalAmount,
          groupSize: bObj.numTickets || 1,
        },
        bookingData: {
          bookingId: bObj.bookingId,
          sourceModule: 'asi_ticket',
          ticketType: bObj.ticketType,
          visitorType: bObj.nationality || 'indian',
          bookingStatus: 'paid',
          bookingDate: bObj.createdAt,
          visitDate: bObj.visitDate,
          ticketPriceINR: bObj.totalAmount,
        },
        visitedAt: bObj.visitDate || new Date().toISOString(),
      }).catch(() => {});
    } catch {}

    return res.json({
      success: true,
      message: 'Payment verified and heritage ticket issued.',
      booking: toTicketPayload(booking),
    });
  } catch (err) {
    console.error('[Booking] verifyPayment error:', err);
    return res.status(500).json({ error: 'Payment verification failed', details: err.message });
  }
};

// PATCH /api/bookings/:bookingId/status  AND  POST /api/bookings/payment-status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const bookingId = req.params.bookingId || req.body.bookingId;
    const { paymentStatus, failureReason, paymentErrorCode, razorpayPaymentId } = req.body;

    if (!bookingId) return res.status(400).json({ error: 'bookingId required' });
    const allowed = ['pending', 'paid', 'failed', 'cancelled'];
    if (!allowed.includes(paymentStatus)) {
      return res.status(400).json({ error: `paymentStatus must be one of: ${allowed.join(', ')}` });
    }

    const updateData = {
      paymentStatus,
      ...(failureReason !== undefined ? { failureReason } : {}),
      ...(paymentErrorCode !== undefined ? { paymentErrorCode } : {}),
      ...(razorpayPaymentId ? { razorpayPaymentId, transactionRef: razorpayPaymentId } : {}),
      ticketStatus: paymentStatus === 'cancelled' ? 'cancelled' : paymentStatus === 'paid' ? 'active' : 'pending',
    };

    let booking;
    if (isMongoConnected()) {
      booking = await Booking.findOneAndUpdate({ bookingId }, updateData, { new: true });
    } else {
      booking = localStore.updateBookingStatus(bookingId, updateData);
    }

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    return res.json({ success: true, booking: toTicketPayload(booking) });
  } catch (err) {
    console.error('[Booking] updatePaymentStatus error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/bookings/:bookingId
exports.getBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    let booking;
    if (isMongoConnected()) {
      booking = await Booking.findOne({ $or: [{ bookingId }, { ticketId: bookingId }] });
    } else {
      booking = localStore.getBookingById(bookingId);
    }
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    return res.json(toTicketPayload(booking));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/bookings/user/:userId
exports.getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    let bookings;
    if (isMongoConnected()) {
      bookings = await Booking.find({ userId }).sort({ createdAt: -1 });
    } else {
      bookings = localStore.getBookingsByUserId(userId);
    }
    return res.json(bookings.map(toTicketPayload));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/bookings/verify-ticket  AND  GET /api/bookings/verify/:bookingId
exports.verifyTicket = async (req, res) => {
  try {
    let rawId = req.params.bookingId || req.body.bookingId || req.body.ticketId;
    const { qrData } = req.body || {};

    if (!rawId && qrData) {
      if (typeof qrData === 'string') {
        try {
          const parsed = JSON.parse(qrData);
          rawId = parsed.bookingId || parsed.ticketId;
        } catch {
          // Could be a raw ID or verify URL
          const urlMatch = qrData.match(/\/verify\/([A-Za-z0-9_-]+)/);
          rawId = urlMatch ? urlMatch[1] : qrData.trim();
        }
      } else if (typeof qrData === 'object') {
        rawId = qrData.bookingId || qrData.ticketId;
      }
    }

    if (!rawId) {
      return res.status(400).json({ valid: false, error: 'bookingId or qrData required' });
    }

    let booking;
    if (isMongoConnected()) {
      booking = await Booking.findOne({ $or: [{ bookingId: rawId }, { ticketId: rawId }] });
    } else {
      booking = localStore.getBookingById(rawId);
    }

    if (!booking) {
      return res.status(404).json({ valid: false, reason: 'Ticket not found in persistent database', booking: null });
    }

    const payload = toTicketPayload(booking);
    const isPaid = payload.paymentStatus === 'paid';
    const isActive = payload.ticketStatus !== 'cancelled' && payload.ticketStatus !== 'scanned';

    return res.json({
      valid: isPaid && isActive,
      alreadyScanned: payload.ticketStatus === 'scanned',
      reason: !isPaid
        ? `Payment status is '${payload.paymentStatus}'. Entry requires a confirmed paid ticket.`
        : payload.ticketStatus === 'scanned'
        ? `Ticket was already scanned on ${payload.scannedAt || 'earlier'}.`
        : payload.ticketStatus === 'cancelled'
        ? 'Ticket has been cancelled.'
        : 'Valid paid ticket.',
      booking: payload,
      ticket: payload,
    });
  } catch (err) {
    return res.status(500).json({ valid: false, error: err.message });
  }
};

// POST /api/bookings/scan — mark verified paid booking as scanned
exports.scanBooking = async (req, res) => {
  try {
    const { bookingId, ticketId, staffId } = req.body;
    const id = bookingId || ticketId;
    if (!id) return res.status(400).json({ success: false, message: 'bookingId required' });

    let booking;
    if (isMongoConnected()) {
      booking = await Booking.findOne({ $or: [{ bookingId: id }, { ticketId: id }] });
    } else {
      booking = localStore.getBookingById(id);
    }

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ticket not found in database.' });
    }
    if (booking.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: `Cannot admit visitor: payment status is '${booking.paymentStatus}'.`,
      });
    }
    if (booking.ticketStatus === 'scanned') {
      return res.status(400).json({
        success: false,
        message: 'This ticket has ALREADY BEEN SCANNED.',
        scannedAt: booking.scannedAt,
      });
    }
    if (booking.ticketStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This ticket is cancelled.' });
    }

    const updateData = {
      ticketStatus: 'scanned',
      scannedAt: new Date().toISOString(),
      scannedBy: staffId || 'EMP-001',
    };

    if (isMongoConnected()) {
      booking = await Booking.findOneAndUpdate({ bookingId: booking.bookingId }, updateData, { new: true });
    } else {
      booking = localStore.updateBookingStatus(booking.bookingId, updateData);
    }

    const payload = toTicketPayload(booking);
    return res.json({
      success: true,
      message: 'Ticket verified & scanned against database. Visitor may enter.',
      ticket: payload,
      booking: payload,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.toTicketPayload = toTicketPayload;
