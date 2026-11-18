const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  bookingId: { type: String, unique: true, required: true },
  userId: { type: String, required: true },
  monumentId: { type: String, required: true },
  monumentName: { type: String, required: true },
  visitDate: { type: String, required: true },
  timeSlot: { type: String },
  ticketType: { type: String },
  numTickets: { type: Number, default: 1 },
  totalAmount: { type: Number, required: true },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'cancelled'],
    default: 'pending',
  },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  qrData: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Booking', BookingSchema);
