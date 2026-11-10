const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
    },
    activityId: {
      type: String,
      required: true,
    },
    activityName: {
      type: String,
      required: true,
    },
    site: {
      type: String,
      required: true,
    },
    visitorName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    visitDate: {
      type: String,
      required: true,
    },
    visitTime: {
      type: String,
      required: true,
    },
    totalINR: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'scanned', 'cancelled'],
      default: 'active',
    },
    scannedAt: {
      type: Date,
    },
    scannedBy: {
      type: String,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Ticket', ticketSchema);
