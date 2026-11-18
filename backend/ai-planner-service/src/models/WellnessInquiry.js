const mongoose = require('mongoose');

const WellnessInquirySchema = new mongoose.Schema(
  {
    inquiryId: { type: String, unique: true, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    phone: { type: String },
    site: { type: String },
    category: { type: String, default: 'Wellness Retreat' },
    dates: { type: String },
    groupSize: { type: Number, default: 1 },
    message: { type: String },
    status: {
      type: String,
      enum: ['received', 'confirmed', 'contacted', 'cancelled'],
      default: 'received',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WellnessInquiry', WellnessInquirySchema);
