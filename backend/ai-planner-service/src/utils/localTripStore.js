const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'trips.json');

// Ensure data directory and file exist
const initStore = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
    }
  } catch (err) {
    console.error('[LocalTripStore] Init error:', err.message);
  }
};

initStore();

const readTrips = () => {
  try {
    initStore();
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data) || [];
  } catch (err) {
    console.error('[LocalTripStore] Read error:', err.message);
    return [];
  }
};

const writeTrips = (trips) => {
  try {
    initStore();
    fs.writeFileSync(DATA_FILE, JSON.stringify(trips, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[LocalTripStore] Write error:', err.message);
    return false;
  }
};

module.exports = {
  getAllTrips: () => {
    return readTrips();
  },

  getTripById: (id) => {
    const trips = readTrips();
    return trips.find((t) => t._id === id || t.id === id) || null;
  },

  saveTrip: (tripData) => {
    const trips = readTrips();
    const id = tripData._id || tripData.id || `trip_${uuidv4()}`;
    const newTrip = {
      _id: id,
      id: id,
      ...tripData,
      createdAt: tripData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    trips.unshift(newTrip);
    writeTrips(trips);
    return newTrip;
  },

  updateTrip: (id, updateData) => {
    const trips = readTrips();
    const index = trips.findIndex((t) => t._id === id || t.id === id);
    if (index === -1) return null;
    trips[index] = {
      ...trips[index],
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
    writeTrips(trips);
    return trips[index];
  },

  deleteTrip: (id) => {
    const trips = readTrips();
    const filtered = trips.filter((t) => t._id !== id && t.id !== id);
    if (filtered.length !== trips.length) {
      writeTrips(filtered);
      return true;
    }
    return false;
  },
};

