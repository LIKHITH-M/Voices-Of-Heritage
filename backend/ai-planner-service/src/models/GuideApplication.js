const mongoose = require('mongoose');

const GuideApplicationSchema = new mongoose.Schema({
  // Personal
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  location: { type: String },
  profilePhotoUrl: { type: String },

  // Professional
  guideType: {
    type: String,
    enum: ['individual', 'institution', 'freelance'],
    default: 'individual',
  },
  yearsExperience: { type: Number },
  previousExperience: { type: String },
  specializations: { type: [String], default: [] },
  description: { type: String },

  // Heritage
  heritageSites: { type: [String], default: [] },
  knowledgeAreas: { type: [String], default: [] },
  historicalSubjects: { type: [String], default: [] },
  tourTypes: { type: [String], default: [] },

  // Languages & Services
  languages: { type: [String], default: [] },
  services: { type: [String], default: [] },
  accessibilityServices: { type: [String], default: [] },
  maxGroupSize: { type: Number },

  // Availability
  availableDays: { type: [String], default: [] },
  timeSlots: { type: [String], default: [] },
  tourDuration: { type: String },

  // Pricing
  hourlyRate: { type: Number },
  tourRate: { type: Number },
  groupRate: { type: Number },
  additionalCharges: { type: String },

  // Qualifications
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
  },

  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

GuideApplicationSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('GuideApplication', GuideApplicationSchema);
