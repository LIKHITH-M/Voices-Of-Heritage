const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Booking = require('../models/Booking');
const localBookingStore = require('../utils/localBookingStore');
const { toTicketPayload } = require('./bookingController');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const QRCode = require('qrcode');

const isMongoConnected = () => mongoose.connection.readyState === 1;

// In-memory cache synced with persistent localBookingStore
const inMemoryTickets = new Map();

// Helper to send ticket confirmation email
const sendTicketEmail = async (ticket) => {
  try {
    const qrPayload = JSON.stringify({ ticketId: ticket.ticketId });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 250,
      margin: 2,
      color: { dark: '#09090C', light: '#fffbe6' }
    });
    
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
    const qrBuffer = Buffer.from(base64Data, 'base64');

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass || smtpUser.includes('your_email')) {
      console.log(`[Ticket Service] Email delivery skipped (no SMTP configured). Generated ticket ${ticket.ticketId}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass.replace(/\s+/g, ''),
      },
    });

    const mailOptions = {
      from: `"Voices of Heritage" <${smtpUser}>`,
      to: ticket.email,
      subject: `🎟️ Your Ticket for ${ticket.activityName} - ${ticket.ticketId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #fafafa;">
          <h2 style="color: #d97706; text-align: center;">Booking Confirmed!</h2>
          <p>Dear <strong>${ticket.visitorName}</strong>,</p>
          <p>Thank you for booking with Voices of Heritage. Your ticket for <strong>${ticket.activityName}</strong> has been confirmed.</p>
          
          <div style="background-color: #fff; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px dashed #d97706;">
            <h3 style="margin-top: 0; color: #d97706;">Ticket Details</h3>
            <p><strong>Monument/Site:</strong> ${ticket.site}</p>
            <p><strong>Date of Visit:</strong> ${ticket.visitDate}</p>
            <p><strong>Slot Time:</strong> ${ticket.visitTime}</p>
            <p><strong>Ticket ID:</strong> <span style="font-family: monospace; font-size: 14px; background: #eee; padding: 2px 6px; border-radius: 4px;">${ticket.ticketId}</span></p>
            <p><strong>Amount Paid:</strong> INR ${ticket.totalINR}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="margin-bottom: 10px; font-weight: bold; color: #555;">Present this QR Code at the Entrance:</p>
            <img src="cid:qrcode" alt="QR Code Ticket" style="border: 2px solid #333; border-radius: 8px;" />
          </div>

          <p style="font-size: 12px; color: #777; text-align: center;">Please keep this QR code ready on your device when arriving at the entry desk.</p>
        </div>
      `,
      attachments: [
        {
          filename: 'ticket-qr.png',
          content: qrBuffer,
          cid: 'qrcode'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Ticket Service] Ticket confirmation email delivered to ${ticket.email}`);
  } catch (error) {
    console.warn('[Ticket Service] Failed to send ticket email:', error.message);
  }
};

// Create Razorpay Order
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey';
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (key_secret && !key_secret.includes('your_') && !key_id.includes('your_')) {
      const Razorpay = require('razorpay');
      const instance = new Razorpay({ key_id, key_secret });
      const options = {
        amount: Math.round(Number(amount) * 100),
        currency: "INR",
        receipt: `rcpt_${Date.now()}`
      };
      const order = await instance.orders.create(options);
      return res.json({ success: true, order, key_id, isMock: false });
    }

    return res.json({
      success: true,
      order: {
        id: `order_mock_${Date.now()}`,
        amount: Math.round(Number(amount) * 100),
        currency: "INR",
        status: "created"
      },
      key_id: 'rzp_test_mockkey',
      isMock: true
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create Cashfree PG Order
exports.createCashfreeOrder = async (req, res) => {
  try {
    const { amount, form } = req.body;
    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const env = (process.env.CASHFREE_ENV || 'sandbox').toLowerCase();
    const apiVersion = process.env.CASHFREE_API_VERSION || '2023-08-01';

    const baseUrl = env === 'production' 
      ? 'https://api.cashfree.com/pg' 
      : 'https://sandbox.cashfree.com/pg';

    const orderId = `CF_${Date.now()}_${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    // If real Cashfree credentials exist in .env
    if (appId && secretKey && !appId.includes('your_') && !secretKey.includes('your_')) {
      const cleanPhone = (form?.phone || '9999999999').replace(/[^0-9]/g, '').slice(-10) || '9999999999';
      const orderPayload = {
        order_id: orderId,
        order_amount: Number(amount) || 1,
        order_currency: 'INR',
        customer_details: {
          customer_id: `CUST_${Date.now()}`,
          customer_name: form?.name || 'Heritage Visitor',
          customer_email: form?.email || 'visitor@voicesofheritage.com',
          customer_phone: cleanPhone.length === 10 ? cleanPhone : '9999999999'
        },
        order_meta: {
          return_url: `http://localhost:3000/bookings?order_id=${orderId}`
        }
      };

      const cfRes = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': appId,
          'x-client-secret': secretKey,
          'x-api-version': apiVersion
        },
        body: JSON.stringify(orderPayload)
      });

      const cfData = await cfRes.json();

      if (!cfRes.ok || !cfData.payment_session_id) {
        throw new Error(cfData.message || 'Failed to create Cashfree order');
      }

      return res.json({
        success: true,
        payment_session_id: cfData.payment_session_id,
        order_id: cfData.order_id,
        cf_env: env,
        isMock: false
      });
    }

    // Default development / test mode fallback
    return res.json({
      success: true,
      payment_session_id: `mock_cf_session_${Date.now()}`,
      order_id: orderId,
      cf_env: 'sandbox',
      isMock: true
    });
  } catch (error) {
    console.error('[Ticket Service] Error creating Cashfree order:', error);
    res.status(500).json({ success: false, message: error.message || 'Error creating Cashfree payment order' });
  }
};


// Book a new ticket
exports.bookTicket = async (req, res) => {
  try {
    const { activity, form, totalINR } = req.body;
    
    if (!activity || !form) {
      return res.status(400).json({ success: false, message: 'Activity and form details are required.' });
    }

    const ticketId = 'VH-' + new Date().getFullYear() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();

    const ticketData = {
      ticketId,
      activityId: activity.id || 'act_' + Date.now(),
      activityName: activity.name || 'Heritage Activity',
      site: activity.site || 'Heritage Site',
      visitorName: form.name || 'Visitor',
      email: form.email || '',
      phone: form.phone || '',
      visitDate: form.visitDate || new Date().toISOString().split('T')[0],
      visitTime: form.visitTime || 'Site default schedule',
      totalINR: Number(totalINR) || 0,
      status: 'active',
      createdAt: new Date()
    };

    let savedTicket = ticketData;

    try {
      if (isMongoConnected()) {
        const newTicket = new Ticket(ticketData);
        savedTicket = await newTicket.save();
      } else {
        throw new Error('MongoDB offline');
      }
    } catch (dbErr) {
      console.warn('[Ticket Service] Mongo save skipped, persisting to local booking store:', dbErr.message);
      localBookingStore.saveBooking({
        bookingId: ticketId,
        ticketId,
        userId: 'staff_demo',
        monumentId: ticketData.activityId,
        monumentName: ticketData.activityName,
        site: ticketData.site,
        visitorName: ticketData.visitorName,
        email: ticketData.email,
        phone: ticketData.phone,
        visitDate: ticketData.visitDate,
        timeSlot: ticketData.visitTime,
        totalAmount: ticketData.totalINR,
        paymentStatus: 'paid',
        ticketStatus: 'active',
        transactionRef: `DEMO_${ticketId}`,
      });
    }

    inMemoryTickets.set(ticketId, savedTicket);

    // Send email asynchronously
    sendTicketEmail(savedTicket).catch(err => {
      console.warn('[Ticket Service] Async email sending failed:', err.message);
    });

    res.status(201).json({
      success: true,
      ticket: savedTicket
    });
  } catch (error) {
    console.error('[Ticket Service] Error booking ticket:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error booking ticket.' });
  }
};

// Verify/Get ticket details — validates against persistent Booking + Ticket database
exports.verifyTicket = async (req, res) => {
  try {
    const { id } = req.params;
    let ticket = null;

    if (isMongoConnected()) {
      try {
        ticket = await Ticket.findOne({ ticketId: id });
        if (!ticket) {
          const booking = await Booking.findOne({ $or: [{ bookingId: id }, { ticketId: id }] });
          if (booking) ticket = toTicketPayload(booking);
        }
      } catch (err) {
        // Fallback to local persistent store
      }
    }

    if (!ticket) {
      const localBooking = localBookingStore.getBookingById(id);
      if (localBooking) ticket = toTicketPayload(localBooking);
    }

    if (!ticket) {
      ticket = inMemoryTickets.get(id);
    }

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found in database.' });
    }

    res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('[Ticket Service] Error verifying ticket:', error);
    res.status(500).json({ success: false, message: 'Server error verifying ticket.' });
  }
};

// Mark ticket as scanned (for Staff Scanner) — checks persistent Booking + Ticket DB
exports.scanTicket = async (req, res) => {
  try {
    const { ticketId, bookingId, staffId } = req.body;
    const lookupId = ticketId || bookingId;
    if (!lookupId) {
      return res.status(400).json({ success: false, message: 'Ticket ID is required.' });
    }

    let source = null;
    let record = null;

    if (isMongoConnected()) {
      try {
        record = await Ticket.findOne({ ticketId: lookupId });
        if (record) {
          source = 'mongo_ticket';
        } else {
          record = await Booking.findOne({ $or: [{ bookingId: lookupId }, { ticketId: lookupId }] });
          if (record) source = 'mongo_booking';
        }
      } catch (err) {
        // Fallback
      }
    }

    if (!record) {
      record = localBookingStore.getBookingById(lookupId);
      if (record) source = 'local_booking';
    }

    if (!record) {
      record = inMemoryTickets.get(lookupId);
      if (record) source = 'memory_ticket';
    }

    if (!record) {
      return res.status(404).json({ success: false, message: 'Ticket not found in database.' });
    }

    // Check payment status for Booking records
    if ((source === 'mongo_booking' || source === 'local_booking') && record.paymentStatus && record.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: `Cannot admit visitor: payment status is '${record.paymentStatus}'. Only paid tickets are valid.`,
      });
    }

    const currentStatus = source === 'mongo_booking' || source === 'local_booking'
      ? record.ticketStatus
      : record.status;

    if (currentStatus === 'scanned') {
      return res.status(400).json({
        success: false,
        message: 'This ticket has ALREADY BEEN SCANNED.',
        scannedAt: record.scannedAt,
      });
    }

    if (currentStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This ticket is cancelled.' });
    }

    const scannedAt = new Date();
    const scanner = staffId || 'EMP-001';

    if (source === 'mongo_ticket') {
      record.status = 'scanned';
      record.scannedAt = scannedAt;
      record.scannedBy = scanner;
      await record.save();
    } else if (source === 'mongo_booking') {
      record.ticketStatus = 'scanned';
      record.scannedAt = scannedAt;
      record.scannedBy = scanner;
      await record.save();
    } else if (source === 'local_booking') {
      record = localBookingStore.updateBookingStatus(record.bookingId || lookupId, {
        ticketStatus: 'scanned',
        scannedAt: scannedAt.toISOString(),
        scannedBy: scanner,
      });
    } else {
      record.status = 'scanned';
      record.scannedAt = scannedAt;
      record.scannedBy = scanner;
      inMemoryTickets.set(lookupId, record);
    }

    const payload = source === 'mongo_booking' || source === 'local_booking' ? toTicketPayload(record) : record;

    res.status(200).json({
      success: true,
      message: 'Ticket verified against database & scanned successfully. Visitor may enter.',
      ticket: payload,
    });
  } catch (error) {
    console.error('[Ticket Service] Error scanning ticket:', error);
    res.status(500).json({ success: false, message: 'Server error scanning ticket.' });
  }
};

// Staff Login
exports.staffLogin = async (req, res) => {
  const { email, password } = req.body;
  if (email === 'staff@voicesofheritage.com' && password === 'admin123') {
    return res.status(200).json({ 
      success: true, 
      staffId: 'EMP-001', 
      name: 'Authorized Staff', 
      role: 'Scanner' 
    });
  }
  
  return res.status(401).json({ success: false, message: 'Invalid staff credentials' });
};
