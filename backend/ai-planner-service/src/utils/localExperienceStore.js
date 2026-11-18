const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '../../data');
const EXP_FILE = path.join(DATA_DIR, 'experiences.json');
const GRAPH_FILE = path.join(DATA_DIR, 'depkg_graph.json');

const initFiles = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(EXP_FILE)) fs.writeFileSync(EXP_FILE, JSON.stringify([], null, 2), 'utf8');
    if (!fs.existsSync(GRAPH_FILE)) fs.writeFileSync(GRAPH_FILE, JSON.stringify({}, null, 2), 'utf8');
  } catch (err) {
    console.error('[LocalExperienceStore] Init error:', err.message);
  }
};

initFiles();

const readExps = () => {
  try {
    initFiles();
    return JSON.parse(fs.readFileSync(EXP_FILE, 'utf8')) || [];
  } catch {
    return [];
  }
};

const writeExps = (arr) => {
  try {
    initFiles();
    fs.writeFileSync(EXP_FILE, JSON.stringify(arr, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[LocalExperienceStore] Write error:', err.message);
    return false;
  }
};

const readAllGraphs = () => {
  try {
    initFiles();
    return JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8')) || {};
  } catch {
    return {};
  }
};

const writeAllGraphs = (obj) => {
  try {
    initFiles();
    fs.writeFileSync(GRAPH_FILE, JSON.stringify(obj, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[LocalExperienceStore] Graph write error:', err.message);
    return false;
  }
};

module.exports = {
  getAllByUser: (userId, filters = {}) => {
    let list = readExps().filter((e) => e.userId === userId);
    if (filters.tripId) list = list.filter((e) => e.tripId === filters.tripId);
    if (filters.experienceType) list = list.filter((e) => e.experienceType === filters.experienceType);
    if (filters.feedbackStatus) list = list.filter((e) => e.feedbackStatus === filters.feedbackStatus);
    return list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  },

  getById: (id) => {
    const list = readExps();
    return list.find((e) => e.experienceId === id || e._id === id) || null;
  },

  getByEventKey: (userId, eventKey) => {
    if (!eventKey) return null;
    const list = readExps();
    return list.find((e) => e.userId === userId && e.eventKey === eventKey) || null;
  },

  upsertExperience: (data) => {
    const list = readExps();
    const now = new Date().toISOString();

    // Idempotent upsert by eventKey or experienceId
    const existingIdx = list.findIndex(
      (e) =>
        (data.experienceId && (e.experienceId === data.experienceId || e._id === data.experienceId)) ||
        (data.eventKey && e.userId === data.userId && e.eventKey === data.eventKey)
    );

    if (existingIdx !== -1) {
      const updated = {
        ...list[existingIdx],
        ...data,
        experienceId: list[existingIdx].experienceId,
        _id: list[existingIdx]._id,
        updatedAt: now,
      };
      list[existingIdx] = updated;
      writeExps(list);
      return { record: updated, created: false };
    }

    const experienceId = data.experienceId || `EXP_${Date.now()}_${uuidv4().slice(0, 8).toUpperCase()}`;
    const created = {
      _id: experienceId,
      experienceId,
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
    list.unshift(created);
    writeExps(list);
    return { record: created, created: true };
  },

  updateById: (id, patch) => {
    const list = readExps();
    const idx = list.findIndex((e) => e.experienceId === id || e._id === id);
    if (idx === -1) return null;
    list[idx] = {
      ...list[idx],
      ...patch,
      experienceId: list[idx].experienceId,
      _id: list[idx]._id,
      updatedAt: new Date().toISOString(),
    };
    writeExps(list);
    return list[idx];
  },

  deleteById: (id) => {
    const list = readExps();
    const next = list.filter((e) => e.experienceId !== id && e._id !== id);
    if (next.length === list.length) return false;
    writeExps(next);
    return true;
  },

  getUserGraph: (userId) => {
    const graphs = readAllGraphs();
    return graphs[userId] || null;
  },

  saveUserGraph: (userId, graphSnapshot) => {
    const graphs = readAllGraphs();
    graphs[userId] = graphSnapshot;
    writeAllGraphs(graphs);
    return graphSnapshot;
  },
};
