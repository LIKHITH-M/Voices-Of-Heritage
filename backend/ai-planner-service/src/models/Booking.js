const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, unique: true, required: true, index: true },
    ticketId: { type: String, index: true },
    userId: { type: String, required: true, index: true },
    monumentId: { type: String, required: true },
    monumentName: { type: String, required: true },
    site: { type: String },
    state: { type: String },
    category: { type: String },
    meetingPoint: { type: String },
    scanPoint: { type: String },

    // Visitor details
    visitorName: { type: String },
    email: { type: String },
    phone: { type: String },
    nationality: { type: String, enum: ['indian', 'nri'], default: 'indian' },
    idType: { type: String },
    idNumber: { type: String },
    adults: { type: Number, default: 1 },
    children: { type: Number, default: 0 },
    seniors: { type: Number, default: 0 },
    specialRequirements: { type: String },

    // Visit details
    visitDate: { type: String, required: true },
    timeSlot: { type: String },
    ticketType: { type: String },
    numTickets: { type: Number, default: 1 },
    totalAmount: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'INR' },

    // Payment details
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'cancelled'],
      default: 'pending',
    },
    paymentGateway: { type: String, default: 'razorpay' },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    transactionRef: { type: String },
    failureReason: { type: String },
    paymentErrorCode: { type: String },
    paidAt: { type: Date },

    // Ticket / QR verification status
    ticketStatus: {
      type: String,
      enum: ['pending', 'active', 'scanned', 'cancelled'],
      default: 'pending',
    },
    qrData: { type: String },
    scannedAt: { type: Date },
    scannedBy: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', BookingSchema);
