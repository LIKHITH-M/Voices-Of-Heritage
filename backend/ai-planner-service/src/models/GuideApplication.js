const mongoose = require('mongoose');

const GuideApplicationSchema = new mongoose.Schema({
  // Personal Information
  fullName: { type: String, required: true },
  profilePhotoUrl: { type: String },
  email: { type: String, required: true, index: true },
  phone: { type: String },
  location: { type: String },

  // Professional Information
  guideType: {
    type: String,
    default: 'Individual Guide',
  },
  yearsExperience: { type: Number, default: 0 },
  previousExperience: { type: String },
  specializations: { type: [String], default: [] },
  description: { type: String },

  // Heritage Expertise
  heritageSites: { type: [String], default: [], index: true },
  knowledgeAreas: { type: [String], default: [] },
  historicalSubjects: { type: [String], default: [] },
  tourTypes: { type: [String], default: [] },

  // Languages & Services
  languages: { type: [String], default: [], index: true },
  services: { type: [String], default: [] },
  accessibilityServices: { type: [String], default: [] },
  maxGroupSize: { type: Number, default: 10 },

  // Availability
  availableDays: { type: [String], default: [] },
  timeSlots: { type: [String], default: [] },
  tourDuration: { type: [String], default: [] },

  // Pricing
  hourlyRate: { type: Number, default: 0 },
  tourRate: { type: Number, default: 0 },
  groupRate: { type: Number, default: 0 },
  additionalCharges: { type: String },

  // Qualifications & Verification
  certifications: { type: [String], default: [] },
  documents: { type: [String], default: [] },
  verificationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending',
  },

  applicationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },

  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

GuideApplicationSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('GuideApplication', GuideApplicationSchema);
