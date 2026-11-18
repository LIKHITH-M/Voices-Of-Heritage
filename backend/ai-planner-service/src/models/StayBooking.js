const mongoose = require('mongoose');

const StayBookingSchema = new mongoose.Schema({
  bookingId: { type: String, unique: true, required: true },
  userId: { type: String, required: true },
  hotelId: { type: String },
  hotelName: { type: String, required: true },
  hotelCity: { type: String },
  checkIn: { type: String, required: true },
  checkOut: { type: String, required: true },
  roomType: { type: String },
  numRooms: { type: Number, default: 1 },
  numGuests: { type: Number, default: 1 },
  totalAmount: { type: Number, required: true },
  guestName: { type: String, required: true },
  guestEmail: { type: String, required: true },
  guestPhone: { type: String },
  specialRequests: { type: String },
  paymentStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending',
  },
  paymentMethod: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('StayBooking', StayBookingSchema);
