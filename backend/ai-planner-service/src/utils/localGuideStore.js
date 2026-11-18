const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'guide_applications.json');

const initStore = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
  } catch (err) {
    console.error('[LocalGuideStore] Init error:', err.message);
  }
};

initStore();

const readApps = () => {
  try {
    initStore();
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || [];
  } catch (err) {
    console.error('[LocalGuideStore] Read error:', err.message);
    return [];
  }
};

const writeApps = (apps) => {
  try {
    initStore();
    fs.writeFileSync(DATA_FILE, JSON.stringify(apps, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[LocalGuideStore] Write error:', err.message);
    return false;
  }
};

module.exports = {
  saveApplication: (data) => {
    const apps = readApps();
    const id = data._id || `GUIDE_${uuidv4()}`;
    const newApp = {
      _id: id,
      ...data,
      applicationStatus: data.applicationStatus || 'pending',
      verificationStatus: data.verificationStatus || 'pending',
      submittedAt: data.submittedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    apps.unshift(newApp);
    writeApps(apps);
    return newApp;
  },

  getApplicationById: (id) => {
    const apps = readApps();
    return apps.find((a) => a._id === id) || null;
  },

  getApplicationByEmail: (email) => {
    const apps = readApps();
    return apps.find((a) => a.email === email) || null;
  },

  updateApplicationStatus: (id, updateData) => {
    const apps = readApps();
    const index = apps.findIndex((a) => a._id === id);
    if (index === -1) return null;
    apps[index] = { ...apps[index], ...updateData, updatedAt: new Date().toISOString() };
    writeApps(apps);
    return apps[index];
  },

  listApplications: (filter = {}) => {
    const apps = readApps();
    if (filter.applicationStatus) {
      return apps.filter((a) => a.applicationStatus === filter.applicationStatus);
    }
    return apps;
  },
};
