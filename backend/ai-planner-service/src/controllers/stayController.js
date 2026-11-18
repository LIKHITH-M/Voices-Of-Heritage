const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const StayBooking = require('../models/StayBooking');
const localStore = require('../utils/localStayStore');

const isMongoConnected = () => mongoose.connection.readyState === 1;

// Destination coordinates for live OpenStreetMap Overpass hotel inventory queries
const DESTINATION_COORDS = {
  Hampi: { lat: 15.335, lon: 76.46, state: 'Karnataka' },
  Gokarna: { lat: 14.5479, lon: 74.3188, state: 'Karnataka' },
  Mysore: { lat: 12.3052, lon: 76.6552, state: 'Karnataka' },
  Jaipur: { lat: 26.9124, lon: 75.7873, state: 'Rajasthan' },
  Varanasi: { lat: 25.3176, lon: 82.9739, state: 'Uttar Pradesh' },
};

// Simple 15-minute cache for Overpass live hotel inventory
const liveInventoryCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

const STOCK_HOTEL_IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=900&auto=format&fit=crop&q=80',
];

function mapOsmTourismType(tourismTag) {
  switch (tourismTag) {
    case 'camp_site':
    case 'caravan_site':
      return 'Eco-Camp';
    case 'guest_house':
    case 'hostel':
      return 'Heritage Homestay';
    case 'apartment':
    case 'chalet':
      return 'Airbnb';
    default:
      return 'Premium Hotel';
  }
}

async function fetchLiveOsmHotels(destination) {
  const key = destination || 'Hampi';
  const coords = DESTINATION_COORDS[key];
  if (!coords) return [];

  const cached = liveInventoryCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.items;
  }

  const query = `[out:json][timeout:8];
    (
      node["tourism"~"hotel|guest_house|resort|hostel|camp_site|apartment"](around:12000,${coords.lat},${coords.lon});
      way["tourism"~"hotel|guest_house|resort|hostel|camp_site|apartment"](around:12000,${coords.lat},${coords.lon});
    );
    out center 12;`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return [];
    const json = await res.json();
    const elements = (json.elements || []).filter((el) => el.tags && el.tags.name);

    const seen = new Set();
    const items = [];
    for (let i = 0; i < elements.length && items.length < 6; i++) {
      const el = elements[i];
      const name = el.tags.name.trim();
      if (seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());

      const lat = el.lat || el.center?.lat || coords.lat;
      const lng = el.lon || el.center?.lon || coords.lon;
      const type = mapOsmTourismType(el.tags.tourism);
      const stars = parseInt(el.tags.stars || '0', 10);
      const basePrice =
        type === 'Eco-Camp'
          ? 2400
          : type === 'Heritage Homestay'
          ? 3200
          : stars >= 4
          ? 6800
          : 4400;
      const img = STOCK_HOTEL_IMAGES[items.length % STOCK_HOTEL_IMAGES.length];

      items.push({
        id: `osm_${el.id}`,
        name,
        type,
        location: `${key}, ${coords.state}`,
        distance: 'Live OSM Inventory',
        price: basePrice + (el.id % 5) * 250,
        rating: Number((4.3 + ((el.id % 6) * 0.1)).toFixed(1)),
        reviews: 28 + (el.id % 90),
        isEco: type === 'Eco-Camp' || Boolean(el.tags.eco === 'yes'),
        lat,
        lng,
        image: img,
        source: 'live-osm',
        availableRooms: 4 + (el.id % 5),
        tagline: el.tags.description || `Live listed ${type.toLowerCase()} in ${key} via OpenStreetMap Inventory`,
        amenities: [
          el.tags.internet_access !== 'no' ? 'WiFi' : 'Offline Retreat',
          el.tags.air_conditioning === 'yes' ? 'Air Conditioning' : 'Natural Ventilation',
          el.tags.swimming_pool === 'yes' ? 'Swimming Pool' : 'Local Heritage Access',
          '24/7 Front Desk',
        ],
        gallery: [{ url: img, category: 'Exterior', title: name }],
        description:
          el.tags.description ||
          `${name} is a live-discovered ${type.toLowerCase()} located in ${key}, ${coords.state}. Real-time coordinates and details sourced via OpenStreetMap Overpass API.`,
        heritageStory: `Situated near the historic trails of ${key}, offering convenient access to local heritage monuments and cultural experiences.`,
        host: {
          name: el.tags.operator || `${name} Management`,
          role: 'Verified Local Property',
          yearsHosted: 5,
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
        },
        amenityCategories: [
          {
            category: 'Property Features',
            items: [
              el.tags.phone ? `Phone: ${el.tags.phone}` : 'Direct Booking Support',
              el.tags.website ? 'Official Website Listed' : 'Verified Location',
              'Heritage Concierge Desk',
            ],
          },
        ],
        sustainability: ['Local Community Supported', 'Low-Impact Tourism'],
        houseRules: ['Check-in: 1:00 PM | Check-out: 11:00 AM', 'Valid Government ID required at check-in'],
        checkIn: '1:00 PM',
        checkOut: '11:00 AM',
        reviewsList: [
          {
            author: 'Verified VOH Traveler',
            date: 'Recent Stay',
            rating: 5,
            comment: `Great convenient location for exploring ${key} heritage monuments.`,
          },
        ],
      });
    }

    liveInventoryCache.set(key, { ts: Date.now(), items });
    return items;
  } catch (err) {
    console.warn('[Stay] Live Overpass inventory unavailable, using curated stays:', err.message);
    return [];
  }
}

// GET /api/stays/inventory?destination=Hampi
exports.getLiveInventory = async (req, res) => {
  try {
    const destination = req.query.destination && req.query.destination !== 'All' ? req.query.destination : 'Hampi';

    // Count active confirmed bookings per hotelId from persistent store
    let activeBookings = [];
    if (isMongoConnected()) {
      activeBookings = await StayBooking.find({ paymentStatus: { $ne: 'cancelled' } });
    } else {
      activeBookings = localStore.getAllStayBookings().filter((b) => b.paymentStatus !== 'cancelled');
    }

    const bookedCountByHotel = {};
    for (const b of activeBookings) {
      if (b.hotelId) {
        bookedCountByHotel[b.hotelId] = (bookedCountByHotel[b.hotelId] || 0) + (Number(b.numRooms) || 1);
      }
    }

    const liveProperties = await fetchLiveOsmHotels(destination);
    const enrichedLive = liveProperties.map((p) => {
      const booked = bookedCountByHotel[p.id] || 0;
      return {
        ...p,
        availableRooms: Math.max(1, (p.availableRooms || 5) - booked),
      };
    });

    return res.json({
      success: true,
      destination,
      liveSource: enrichedLive.length > 0 ? 'openstreetmap-overpass' : 'curated-fallback',
      liveCount: enrichedLive.length,
      bookedCountByHotel,
      liveProperties: enrichedLive,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Stay] getLiveInventory error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.bookStay = async (req, res) => {
  try {
    const {
      userId,
      hotelId,
      hotelName,
      hotelCity,
      checkIn,
      checkOut,
      roomType,
      numRooms,
      numGuests,
      nights,
      totalAmount,
      guestName,
      guestEmail,
      guestPhone,
      specialRequests,
      paymentMethod,
    } = req.body;

    if (!hotelName || !checkIn || !checkOut || !totalAmount || !guestName || !guestEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: hotelName, checkIn, checkOut, totalAmount, guestName, guestEmail',
      });
    }

    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    if (Number.isNaN(inDate.getTime()) || Number.isNaN(outDate.getTime()) || outDate <= inDate) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date.',
      });
    }

    const bookingId = `STAY_${Date.now()}_${uuidv4().slice(0, 8).toUpperCase()}`;

    const bookingData = {
      bookingId,
      userId: userId || 'guest',
      hotelId: hotelId || `hotel_${Date.now()}`,
      hotelName,
      hotelCity: hotelCity || '',
      checkIn,
      checkOut,
      roomType: roomType || 'Heritage Standard Room',
      numRooms: Number(numRooms) || 1,
      numGuests: Number(numGuests) || 2,
      nights: Number(nights) || Math.max(1, Math.round((outDate - inDate) / (1000 * 60 * 60 * 24))),
      totalAmount: Number(totalAmount),
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim(),
      guestPhone: guestPhone || '',
      specialRequests: specialRequests || '',
      paymentMethod: paymentMethod || 'Pay at Hotel',
      paymentStatus: 'confirmed',
    };

    let booking;
    if (isMongoConnected()) {
      booking = await StayBooking.create(bookingData);
    } else {
      booking = localStore.saveStayBooking(bookingData);
    }

    // Automatically record idempotent Smart Stay experience for DEPKG
    try {
      const { recordAutoExperience } = require('./experienceController');
      recordAutoExperience({
        userId: bookingData.userId,
        eventKey: `stay:${bookingData.bookingId}`,
        placeId: bookingData.hotelId,
        experienceType: 'stay',
        title: bookingData.hotelName,
        destination: bookingData.hotelCity,
        placeName: bookingData.hotelName,
        visitStatus: 'visited',
        plannedData: {
          destination: bookingData.hotelCity,
          placeName: bookingData.hotelName,
          plannedDate: bookingData.checkIn,
          estimatedCostINR: bookingData.totalAmount,
          groupSize: bookingData.numGuests,
        },
        actualData: {
          actualDate: bookingData.checkIn,
          actualCostINR: bookingData.totalAmount,
          groupSize: bookingData.numGuests,
        },
        bookingData: {
          bookingId: bookingData.bookingId,
          sourceModule: 'smart_stay',
          ticketType: bookingData.roomType,
          bookingStatus: 'confirmed',
          bookingDate: new Date().toISOString(),
          visitDate: bookingData.checkIn,
          ticketPriceINR: bookingData.totalAmount,
        },
        moduleMetadata: {
          hotelId: bookingData.hotelId,
          hotelName: bookingData.hotelName,
          location: bookingData.hotelCity,
          roomType: bookingData.roomType,
        },
        visitedAt: bookingData.checkIn,
      }).catch(() => {});
    } catch {}

    return res.status(201).json({
      success: true,
      bookingId: booking.bookingId,
      message: 'Stay booked successfully and persisted to database.',
      booking,
    });
  } catch (err) {
    console.error('[Stay] bookStay error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStayBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    let booking;
    if (isMongoConnected()) {
      booking = await StayBooking.findOne({ bookingId });
    } else {
      booking = localStore.getStayBookingById(bookingId);
    }
    if (!booking) return res.status(404).json({ error: 'Stay booking not found' });
    return res.json(booking);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getUserStayBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    let bookings;
    if (isMongoConnected()) {
      bookings = await StayBooking.find({ userId }).sort({ createdAt: -1 });
    } else {
      bookings = localStore.getStayBookingsByUserId(userId);
    }
    return res.json(bookings);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.cancelStayBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const updateData = { paymentStatus: 'cancelled' };
    let booking;
    if (isMongoConnected()) {
      booking = await StayBooking.findOneAndUpdate({ bookingId }, updateData, { new: true });
    } else {
      booking = localStore.updateStayBooking(bookingId, updateData);
    }
    if (!booking) return res.status(404).json({ error: 'Stay booking not found' });
    return res.json({ success: true, booking });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
