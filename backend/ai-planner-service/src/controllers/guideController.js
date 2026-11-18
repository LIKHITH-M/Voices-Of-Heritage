const { v4: uuidv4 } = require('uuid');
const GuideApplication = require('../models/GuideApplication');
const localStore = require('../utils/localGuideStore');

const isMongoConnected = () => {
  const mongoose = require('mongoose');
  return mongoose.connection.readyState === 1;
};

exports.submitApplication = async (req, res) => {
  try {
    const data = req.body;
    if (!data.fullName || !data.email) {
      return res.status(400).json({ error: 'fullName and email are required' });
    }

    let application;
    if (isMongoConnected()) {
      application = await GuideApplication.create({
        ...data,
        applicationStatus: 'pending',
        verificationStatus: 'pending',
        submittedAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      application = localStore.saveApplication({ _id: `GUIDE_${uuidv4()}`, ...data });
    }

    return res.status(201).json({
      success: true,
      applicationId: application._id,
      status: application.applicationStatus,
      message: 'Application submitted successfully. We will review and contact you.',
    });
  } catch (err) {
    console.error('[Guide] submitApplication error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getApplication = async (req, res) => {
  try {
    const { id } = req.params;
    let app;
    if (isMongoConnected()) {
      app = await GuideApplication.findById(id);
    } else {
      app = localStore.getApplicationById(id);
    }
    if (!app) return res.status(404).json({ error: 'Application not found' });
    return res.json(app);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getUserApplication = async (req, res) => {
  try {
    const { email } = req.params;
    let app;
    if (isMongoConnected()) {
      app = await GuideApplication.findOne({ email });
    } else {
      app = localStore.getApplicationByEmail(email);
    }
    if (!app) return res.status(404).json({ error: 'Application not found' });
    return res.json(app);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { applicationStatus, verificationStatus } = req.body;

    if (!applicationStatus) return res.status(400).json({ error: 'applicationStatus required' });

    const updateData = { applicationStatus, updatedAt: new Date() };
    if (verificationStatus) updateData.verificationStatus = verificationStatus;

    let app;
    if (isMongoConnected()) {
      app = await GuideApplication.findByIdAndUpdate(id, updateData, { new: true });
    } else {
      app = localStore.updateApplicationStatus(id, updateData);
    }
    if (!app) return res.status(404).json({ error: 'Application not found' });
    return res.json({ success: true, application: app });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.listApplications = async (req, res) => {
  try {
    const { status } = req.query;
    let apps;
    if (isMongoConnected()) {
      const filter = status ? { applicationStatus: status } : {};
      apps = await GuideApplication.find(filter).sort({ submittedAt: -1 });
    } else {
      apps = localStore.listApplications(status ? { applicationStatus: status } : {});
    }
    return res.json(apps);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
