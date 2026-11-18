const { v4: uuidv4 } = require('uuid');
const StayBooking = require('../models/StayBooking');
const localStore = require('../utils/localStayStore');

const isMongoConnected = () => {
  const mongoose = require('mongoose');
  return mongoose.connection.readyState === 1;
};

exports.bookStay = async (req, res) => {
  try {
    const {
      userId, hotelId, hotelName, hotelCity,
      checkIn, checkOut, roomType, numRooms, numGuests,
      totalAmount, guestName, guestEmail, guestPhone,
      specialRequests, paymentMethod,
    } = req.body;

    if (!userId || !hotelName || !checkIn || !checkOut || !totalAmount || !guestName || !guestEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const bookingId = `STAY_${Date.now()}_${uuidv4().slice(0, 8)}`;

    const bookingData = {
      bookingId, userId, hotelId, hotelName, hotelCity,
      checkIn, checkOut, roomType,
      numRooms: numRooms || 1,
      numGuests: numGuests || 1,
      totalAmount, guestName, guestEmail, guestPhone,
      specialRequests, paymentMethod,
      paymentStatus: 'confirmed',
    };

    let booking;
    if (isMongoConnected()) {
      booking = await StayBooking.create(bookingData);
    } else {
      booking = localStore.saveStayBooking(bookingData);
    }

    return res.status(201).json({
      success: true,
      bookingId,
      message: 'Stay booked successfully',
      booking,
    });
  } catch (err) {
    console.error('[Stay] bookStay error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getStayBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    let booking;
    if (isMongoConnected()) {
      booking = await StayBooking.findOne({ bookingId });
    } else {
      booking = localStore.getStayBookingById(bookingId);
    }
    if (!booking) return res.status(404).json({ error: 'Stay booking not found' });
    return res.json(booking);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getUserStayBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    let bookings;
    if (isMongoConnected()) {
      bookings = await StayBooking.find({ userId }).sort({ createdAt: -1 });
    } else {
      bookings = localStore.getStayBookingsByUserId(userId);
    }
    return res.json(bookings);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.cancelStayBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const updateData = { paymentStatus: 'cancelled' };
    let booking;
    if (isMongoConnected()) {
      booking = await StayBooking.findOneAndUpdate({ bookingId }, updateData, { new: true });
    } else {
      booking = localStore.updateStayBooking(bookingId, updateData);
    }
    if (!booking) return res.status(404).json({ error: 'Stay booking not found' });
    return res.json({ success: true, booking });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
