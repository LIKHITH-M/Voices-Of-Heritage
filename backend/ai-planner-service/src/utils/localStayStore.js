const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'stay_bookings.json');

const initStore = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
  } catch (err) {
    console.error('[LocalStayStore] Init error:', err.message);
  }
};

initStore();

const readStays = () => {
  try {
    initStore();
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || [];
  } catch (err) {
    console.error('[LocalStayStore] Read error:', err.message);
    return [];
  }
};

const writeStays = (stays) => {
  try {
    initStore();
    fs.writeFileSync(DATA_FILE, JSON.stringify(stays, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[LocalStayStore] Write error:', err.message);
    return false;
  }
};

module.exports = {
  saveStayBooking: (data) => {
    const stays = readStays();
    const bookingId = data.bookingId || `STAY_${uuidv4()}`;
    const newStay = { _id: bookingId, ...data, bookingId, createdAt: data.createdAt || new Date().toISOString() };
    stays.unshift(newStay);
    writeStays(stays);
    return newStay;
  },

  getStayBookingById: (bookingId) => {
    const stays = readStays();
    return stays.find((s) => s.bookingId === bookingId || s._id === bookingId) || null;
  },

  getStayBookingsByUserId: (userId) => {
    const stays = readStays();
    return stays.filter((s) => s.userId === userId);
  },

  updateStayBooking: (bookingId, updateData) => {
    const stays = readStays();
    const index = stays.findIndex((s) => s.bookingId === bookingId || s._id === bookingId);
    if (index === -1) return null;
    stays[index] = { ...stays[index], ...updateData, updatedAt: new Date().toISOString() };
    writeStays(stays);
    return stays[index];
  },
};
