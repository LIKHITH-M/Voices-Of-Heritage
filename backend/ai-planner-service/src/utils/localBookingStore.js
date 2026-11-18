const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'bookings.json');

const initStore = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
  } catch (err) {
    console.error('[LocalBookingStore] Init error:', err.message);
  }
};

initStore();

const readBookings = () => {
  try {
    initStore();
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || [];
  } catch (err) {
    console.error('[LocalBookingStore] Read error:', err.message);
    return [];
  }
};

const writeBookings = (bookings) => {
  try {
    initStore();
    fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[LocalBookingStore] Write error:', err.message);
    return false;
  }
};

module.exports = {
  saveBooking: (bookingData) => {
    const bookings = readBookings();
    const bookingId = bookingData.bookingId || `BKG_${uuidv4()}`;
    const newBooking = {
      _id: bookingId,
      ...bookingData,
      bookingId,
      createdAt: bookingData.createdAt || new Date().toISOString(),
    };
    bookings.unshift(newBooking);
    writeBookings(bookings);
    return newBooking;
  },

  getBookingById: (bookingId) => {
    const bookings = readBookings();
    return bookings.find((b) => b.bookingId === bookingId || b._id === bookingId) || null;
  },

  getBookingsByUserId: (userId) => {
    const bookings = readBookings();
    return bookings.filter((b) => b.userId === userId);
  },

  updateBookingStatus: (bookingId, updateData) => {
    const bookings = readBookings();
    const index = bookings.findIndex((b) => b.bookingId === bookingId || b._id === bookingId);
    if (index === -1) return null;
    bookings[index] = { ...bookings[index], ...updateData, updatedAt: new Date().toISOString() };
    writeBookings(bookings);
    return bookings[index];
  },

  verifyTicket: (bookingId) => {
    const bookings = readBookings();
    const booking = bookings.find((b) => b.bookingId === bookingId || b._id === bookingId);
    if (!booking) return { valid: false, booking: null };
    return { valid: booking.paymentStatus === 'paid', booking };
  },
};
