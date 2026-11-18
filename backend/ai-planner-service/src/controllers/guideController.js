const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const GuideApplication = require('../models/GuideApplication');
const localStore = require('../utils/localGuideStore');

const isMongoConnected = () => mongoose.connection.readyState === 1;

const toStringArray = (val) => {
  if (Array.isArray(val)) return val.map((x) => String(x).trim()).filter(Boolean);
  if (typeof val === 'string' && val.trim()) {
    return val.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

const normalizeStatus = (val) => {
  if (!val) return 'pending';
  const cleaned = String(val).trim().toLowerCase().replace(/\s+/g, '_');
  if (['pending', 'under_review', 'approved', 'rejected'].includes(cleaned)) return cleaned;
  return 'pending';
};

exports.submitApplication = async (req, res) => {
  try {
    const raw = req.body || {};
    if (!raw.fullName || !raw.email) {
      return res.status(400).json({ error: 'Full name and email are required.' });
    }

    const payload = {
      fullName: String(raw.fullName).trim(),
      profilePhotoUrl: raw.profilePhotoUrl || '',
      email: String(raw.email).trim().toLowerCase(),
      phone: raw.phone || '',
      location: raw.location || '',

      guideType: raw.guideType || 'Individual Guide',
      yearsExperience: Number(raw.yearsExperience) || 0,
      previousExperience: raw.previousExperience || '',
      specializations: toStringArray(raw.specializations),
      description: raw.description || '',

      heritageSites: toStringArray(raw.heritageSites),
      knowledgeAreas: toStringArray(raw.knowledgeAreas),
      historicalSubjects: toStringArray(raw.historicalSubjects),
      tourTypes: toStringArray(raw.tourTypes),

      languages: toStringArray(raw.languages),
      services: toStringArray(raw.services),
      accessibilityServices: toStringArray(raw.accessibilityServices),
      maxGroupSize: Number(raw.maxGroupSize) || 10,

      availableDays: toStringArray(raw.availableDays),
      timeSlots: toStringArray(raw.timeSlots),
      tourDuration: toStringArray(raw.tourDuration),

      hourlyRate: Number(raw.hourlyRate) || 0,
      tourRate: Number(raw.tourRate) || 0,
      groupRate: Number(raw.groupRate) || 0,
      additionalCharges: raw.additionalCharges || '',

      certifications: toStringArray(raw.certifications),
      documents: toStringArray(raw.documents),
      verificationStatus: 'pending',
      applicationStatus: 'pending',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let application;
    if (isMongoConnected()) {
      application = await GuideApplication.create(payload);
    } else {
      application = localStore.saveApplication({ _id: `GUIDE_${uuidv4().slice(0, 10).toUpperCase()}`, ...payload });
    }

    return res.status(201).json({
      success: true,
      applicationId: application._id,
      status: application.applicationStatus,
      verificationStatus: application.verificationStatus,
      application,
      message: 'Application submitted and saved to database. We will review and contact you.',
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
    const email = decodeURIComponent(req.params.email || '').trim().toLowerCase();
    let app;
    if (isMongoConnected()) {
      app = await GuideApplication.findOne({ email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).sort({ submittedAt: -1 });
    } else {
      const all = localStore.listApplications();
      app = all.find((a) => String(a.email || '').toLowerCase() === email) || null;
    }
    if (!app) return res.status(404).json({ error: 'No application found for this email' });
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

    const normAppStatus = normalizeStatus(applicationStatus);
    const normVerifyStatus = verificationStatus ? normalizeStatus(verificationStatus) : normAppStatus;

    const updateData = {
      applicationStatus: normAppStatus,
      verificationStatus: normVerifyStatus,
      updatedAt: new Date().toISOString(),
    };

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
    const normStatus = status ? normalizeStatus(status) : null;
    let apps;
    if (isMongoConnected()) {
      const filter = normStatus ? { applicationStatus: normStatus } : {};
      apps = await GuideApplication.find(filter).sort({ submittedAt: -1 });
    } else {
      apps = localStore.listApplications(normStatus ? { applicationStatus: normStatus } : {});
    }
    return res.json(apps);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/guides/match — Tourist-to-Guide Matching Endpoint
// Supports filtering & scoring by heritage site, expertise, language, availability, experience, group size, services, and pricing
exports.matchGuides = async (req, res) => {
  try {
    const {
      site,
      language,
      expertise,
      day,
      groupSize,
      service,
      maxTourRate,
      minExperience,
      includeAllStatuses,
    } = req.query;

    let apps;
    if (isMongoConnected()) {
      const filter = includeAllStatuses === 'true' ? {} : { applicationStatus: 'approved' };
      apps = await GuideApplication.find(filter).lean();
    } else {
      const all = localStore.listApplications();
      apps = includeAllStatuses === 'true' ? all : all.filter((a) => a.applicationStatus === 'approved');
    }

    const reqGroup = Number(groupSize) || 0;
    const reqMaxRate = Number(maxTourRate) || 0;
    const reqMinExp = Number(minExperience) || 0;

    const matched = apps
      .filter((g) => {
        if (site && !(g.heritageSites || []).some((s) => s.toLowerCase().includes(site.toLowerCase()))) return false;
        if (language && !(g.languages || []).some((l) => l.toLowerCase().includes(language.toLowerCase()))) return false;
        if (day && !(g.availableDays || []).some((d) => d.toLowerCase().includes(day.toLowerCase()))) return false;
        if (reqGroup > 0 && Number(g.maxGroupSize || 0) < reqGroup) return false;
        if (reqMaxRate > 0 && Number(g.tourRate || g.hourlyRate || 0) > reqMaxRate) return false;
        if (reqMinExp > 0 && Number(g.yearsExperience || 0) < reqMinExp) return false;
        if (expertise) {
          const hay = [...(g.knowledgeAreas || []), ...(g.specializations || []), ...(g.historicalSubjects || [])].join(' ').toLowerCase();
          if (!hay.includes(expertise.toLowerCase())) return false;
        }
        if (service) {
          const srv = [...(g.services || []), ...(g.accessibilityServices || [])].join(' ').toLowerCase();
          if (!srv.includes(service.toLowerCase())) return false;
        }
        return true;
      })
      .map((g) => {
        // Compute match relevance score
        let score = 60;
        if (g.applicationStatus === 'approved') score += 20;
        if (Number(g.yearsExperience) >= 5) score += 10;
        if ((g.certifications || []).length > 0) score += 10;
        return { ...g, matchScore: Math.min(100, score) };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    return res.json({
      success: true,
      count: matched.length,
      guides: matched,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
