const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'wellness_inquiries.json');

const initStore = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
  } catch (err) {
    console.error('[LocalWellnessStore] Init error:', err.message);
  }
};

initStore();

const readInquiries = () => {
  try {
    initStore();
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || [];
  } catch (err) {
    console.error('[LocalWellnessStore] Read error:', err.message);
    return [];
  }
};

const writeInquiries = (items) => {
  try {
    initStore();
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[LocalWellnessStore] Write error:', err.message);
    return false;
  }
};

module.exports = {
  saveInquiry: (data) => {
    const items = readInquiries();
    const inquiryId = data.inquiryId || `WELL_${Date.now()}_${uuidv4().slice(0, 6).toUpperCase()}`;
    const record = {
      _id: inquiryId,
      inquiryId,
      ...data,
      status: data.status || 'received',
      createdAt: new Date().toISOString(),
    };
    items.unshift(record);
    writeInquiries(items);
    return record;
  },

  listInquiries: (email) => {
    const items = readInquiries();
    if (email) {
      return items.filter((i) => String(i.email || '').toLowerCase() === String(email).toLowerCase());
    }
    return items;
  },
};
