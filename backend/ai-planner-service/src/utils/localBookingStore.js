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
    const bookingId = bookingData.bookingId || bookingData.ticketId || `BKG_${Date.now()}_${uuidv4().slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();
    const newBooking = {
      _id: bookingId,
      ...bookingData,
      bookingId,
      ticketId: bookingData.ticketId || bookingId,
      createdAt: bookingData.createdAt || now,
      updatedAt: now,
    };
    bookings.unshift(newBooking);
    writeBookings(bookings);
    return newBooking;
  },

  getBookingById: (id) => {
    const bookings = readBookings();
    return bookings.find((b) => b.bookingId === id || b.ticketId === id || b._id === id) || null;
  },

  getBookingsByUserId: (userId) => {
    const bookings = readBookings();
    return bookings.filter((b) => b.userId === userId);
  },

  getAllBookings: () => {
    return readBookings();
  },

  updateBookingStatus: (id, updateData) => {
    const bookings = readBookings();
    const index = bookings.findIndex((b) => b.bookingId === id || b.ticketId === id || b._id === id);
    if (index === -1) return null;
    bookings[index] = {
      ...bookings[index],
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
    writeBookings(bookings);
    return bookings[index];
  },

  verifyTicket: (id) => {
    const bookings = readBookings();
    const booking = bookings.find((b) => b.bookingId === id || b.ticketId === id || b._id === id);
    if (!booking) return { valid: false, reason: 'Ticket not found in database', booking: null };
    if (booking.paymentStatus !== 'paid') {
      return {
        valid: false,
        reason: `Payment status is '${booking.paymentStatus}'. Only paid tickets are valid for entry.`,
        booking,
      };
    }
    if (booking.ticketStatus === 'cancelled') {
      return { valid: false, reason: 'This ticket has been cancelled.', booking };
    }
    if (booking.ticketStatus === 'scanned') {
      return {
        valid: false,
        alreadyScanned: true,
        reason: `Ticket already scanned on ${booking.scannedAt || 'earlier'}.`,
        booking,
      };
    }
    return { valid: true, reason: 'Valid paid ticket', booking };
  },
};
