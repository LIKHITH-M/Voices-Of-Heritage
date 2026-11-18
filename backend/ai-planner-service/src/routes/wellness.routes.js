const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const WellnessInquiry = require('../models/WellnessInquiry');
const localWellnessStore = require('../utils/localWellnessStore');

const isMongoConnected = () => mongoose.connection.readyState === 1;

const wellnessSites = [
  {
    id: 'ws_01',
    name: 'Muktinath Ashtanga Yoga Ashram',
    region: 'Karnataka',
    city: 'Mysuru',
    type: 'Yoga Retreat',
    emoji: '🧘',
    description: 'Nestled in the foothills of Chamundi Hills, offering classical Mysore-style Ashtanga yoga, pranayama, and traditional Ayurvedic therapies.',
    amenities: ['Ashtanga Yoga Shala', 'Ayurvedic Spa', 'Organic Sattvic Meals', 'Meditation Garden'],
    rating: 4.9,
    pricePerNight: 3500,
    image: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&auto=format&fit=crop&q=80',
    tags: ['yoga', 'Ayurveda', 'Karnataka'],
  },
  {
    id: 'ws_02',
    name: 'Pushkar Sacred Lake Meditation Centre',
    region: 'Rajasthan',
    city: 'Pushkar',
    type: 'Meditation Centre',
    emoji: '🌅',
    description: 'Overlooking the sacred ghats of Pushkar Lake, hosting silent meditation retreats, Vedic chanting, and sunrise ghee-lamp ceremonies.',
    amenities: ['Silent Retreat Rooms', 'Vedic Library', 'Sunrise Lake Aarti', 'Rooftop Meditation'],
    rating: 4.8,
    pricePerNight: 2200,
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
    tags: ['meditation', 'sacred lake', 'Rajasthan'],
  },
  {
    id: 'ws_03',
    name: 'Rishikesh Himalayan Yoga Sanctuary',
    region: 'Uttarakhand',
    city: 'Rishikesh',
    type: 'Yoga Retreat',
    emoji: '🏔️',
    description: 'In the Yoga Capital of the World along the Ganga — immersive Hatha, Kundalini, breathwork, and evening Ganga Aarti contemplation.',
    amenities: ['Riverside Yoga Deck', 'Satsang Hall', 'Ayurvedic Kitchen', 'Ganga Aarti Access'],
    rating: 4.9,
    pricePerNight: 2800,
    image: 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=800&auto=format&fit=crop&q=80',
    tags: ['yoga', 'Himalaya', 'Ganga'],
  },
  {
    id: 'ws_04',
    name: 'Thrissur Ashtavaidya Ayurveda Heritage Resort',
    region: 'Kerala',
    city: 'Thrissur',
    type: 'Ayurveda Centre',
    emoji: '🌿',
    description: 'A 200-year-old Ayurvedic healing heritage centre following Kerala’s Ashtavaidya lineage with authentic Panchakarma rejuvenation.',
    amenities: ['Panchakarma Therapies', 'Herbal Medicine Garden', 'Physician Consultations', 'Sattvic Meals'],
    rating: 4.9,
    pricePerNight: 5500,
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80',
    tags: ['Ayurveda', 'Panchakarma', 'Kerala'],
  },
  {
    id: 'ws_05',
    name: 'Hampi Virupaksha Temple Contemplation Stay',
    region: 'Karnataka',
    city: 'Hampi',
    type: 'Temple Meditation',
    emoji: '🛕',
    description: 'Experience living Vijayanagara sacred heritage — attend pre-dawn temple rituals, chant atop Hemakuta Hill, and meditate beside the Tungabhadra.',
    amenities: ['Pre-Dawn Puja Access', 'Sanskrit Chanting', 'Sacred Heritage Walks', 'Riverside Silence'],
    rating: 4.8,
    pricePerNight: 1800,
    image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=80',
    tags: ['temple', 'meditation', 'Karnataka'],
  },
  {
    id: 'ws_06',
    name: 'Varanasi Ganga Dhyan Kendra',
    region: 'Uttar Pradesh',
    city: 'Varanasi',
    type: 'Spiritual Experience',
    emoji: '🔥',
    description: 'On the eternal ghats of Kashi — dawn boat meditation, Dashashwamedh Ganga Aarti, and classical Vedic philosophy discourses.',
    amenities: ['Dawn Boat Meditation', 'Ganga Aarti Viewing', 'Ashram Stay', 'Vedic Philosophy'],
    rating: 4.9,
    pricePerNight: 2000,
    image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=800&auto=format&fit=crop&q=80',
    tags: ['Ganga', 'spiritual', 'Varanasi'],
  },
  {
    id: 'ws_07',
    name: 'Bodh Gaya Vipassana & Bodhi Tree Retreat',
    region: 'Bihar',
    city: 'Bodh Gaya',
    type: 'Meditation Centre',
    emoji: '🌳',
    description: 'Beside the sacred Mahabodhi Temple where the Buddha attained enlightenment — 10-day Vipassana silence and mindfulness immersion.',
    amenities: ['Mahabodhi Temple Visits', 'Noble Silence Courses', 'Walking Meditation', 'Interfaith Library'],
    rating: 5.0,
    pricePerNight: 0,
    image: 'https://images.unsplash.com/photo-1519817914152-22d216bb9170?w=800&auto=format&fit=crop&q=80',
    tags: ['Buddhism', 'Vipassana', 'Bihar'],
  },
  {
    id: 'ws_08',
    name: 'Auroville Integral Yoga & Matrimandir Centre',
    region: 'Tamil Nadu',
    city: 'Pondicherry',
    type: 'Yoga Retreat',
    emoji: '✨',
    description: 'International spiritual township founded on Sri Aurobindo’s Integral Yoga, centered around the golden Matrimandir inner chamber.',
    amenities: ['Matrimandir Concentration', 'Integral Yoga', 'Forest Silence Walks', 'Conscious Living'],
    rating: 4.8,
    pricePerNight: 3200,
    image: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=800&auto=format&fit=crop&q=80',
    tags: ['Integral Yoga', 'spiritual', 'Tamil Nadu'],
  },
  {
    id: 'ws_09',
    name: 'Madurai Meenakshi Sacred Temple Stay',
    region: 'Tamil Nadu',
    city: 'Madurai',
    type: 'Temple Meditation',
    emoji: '🌺',
    description: 'Stay in historic Madurai and immerse in daily temple chants, Siddha wellness therapies, and Carnatic devotional evenings.',
    amenities: ['Early Morning Darshan', 'Siddha Marma Therapy', 'Carnatic Music', 'Temple Walk'],
    rating: 4.8,
    pricePerNight: 2400,
    image: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&auto=format&fit=crop&q=80',
    tags: ['Dravidian', 'Siddha', 'Tamil Nadu'],
  },
];

const retreats = [
  {
    id: 'ret_01',
    name: 'Mysore Ashtanga Yoga Intensive',
    duration: '14 Days',
    level: 'All Levels',
    style: 'Ashtanga Yoga',
    location: 'Mysuru, Karnataka',
    price: 38000,
    rating: 4.9,
    emoji: '🧘',
    description: 'Deep immersion in authentic Mysore-style Ashtanga Yoga — daily guided shala practice, pranayama, yoga philosophy, and Ayurvedic oil therapy.',
    includes: ['Daily Mysore & led yoga sessions', 'Yoga Sutra philosophy talks', 'Ayurvedic consultation', 'Sattvic vegetarian meals', 'Heritage ashram stay'],
  },
  {
    id: 'ret_02',
    name: 'Kerala Traditional Panchakarma Detox',
    duration: '10 Days',
    level: 'All Ages',
    style: 'Ayurveda',
    location: 'Thrissur, Kerala',
    price: 65000,
    rating: 4.9,
    emoji: '🌿',
    description: 'Complete Ashtavaidya Ayurvedic cleansing featuring Abhyanga, Shirodhara, herbal steam baths, and personalized dosha nutrition.',
    includes: ['Daily physician consultations', 'Customized Panchakarma therapies', 'Fresh herbal formulations', '3 dosha-balanced meals/day', 'Garden cottage stay'],
  },
  {
    id: 'ret_03',
    name: 'Himalayan Noble Silence & Breathwork',
    duration: '7 Days',
    level: 'Beginner to Intermediate',
    style: 'Vipassana + Pranayama',
    location: 'Rishikesh, Uttarakhand',
    price: 22000,
    rating: 4.8,
    emoji: '🏔️',
    description: 'Disconnect from digital noise along the sacred Ganga with guided Vipassana, Yoga Nidra, and Himalayan pranayama breathwork.',
    includes: ['Guided noble silence', 'Daily Yoga Nidra & Pranayama', 'Ganga riverbank meditation', 'Ashram meals & accommodation'],
  },
  {
    id: 'ret_04',
    name: 'Thar Desert Sunrise Yoga & Stargazing',
    duration: '5 Days',
    level: 'All Levels',
    style: 'Hatha + Meditation',
    location: 'Pushkar & Jaisalmer, Rajasthan',
    price: 28000,
    rating: 4.8,
    emoji: '🏜️',
    description: 'Practice Hatha yoga amid golden sand dunes at sunrise, meditate under desert skies, and partake in sacred Pushkar Lake rituals.',
    includes: ['Desert sunrise yoga', 'Pushkar Lake sunset ritual', 'Stargazing silent meditation', 'Heritage haveli stay & meals'],
  },
  {
    id: 'ret_05',
    name: 'Bodh Gaya Mindfulness & Dharma Immersion',
    duration: '10 Days',
    level: 'All Levels',
    style: 'Vipassana Meditation',
    location: 'Bodh Gaya, Bihar',
    price: 0,
    rating: 5.0,
    emoji: '🌳',
    description: 'Donation-supported ten-day mindfulness and Vipassana course in the sacred landscape surrounding the Mahabodhi Temple.',
    includes: ['Simple ashram lodging', 'Wholesome vegetarian meals', 'Daily Dharma discourses', 'Guided sitting & walking meditation'],
  },
];

const meditationCircuits = [
  {
    id: 'mc_01',
    name: 'Hampi Sacred Ruins Contemplation Circuit',
    region: 'Karnataka',
    duration: '3 Days / 3.5 hrs daily',
    bestTime: 'Oct – Feb (5:30–9:00 AM)',
    rating: 4.9,
    emoji: '🛕',
    description: 'Trace Vijayanagara’s sacred geography from living shrines to silent granite hilltops overlooking the Tungabhadra valley.',
    temples: ['Virupaksha Temple', 'Hemakuta Hill Shrines', 'Matanga Hill Sunrise Point', 'Achyutaraya Temple', 'Vittala Sacred Courtyard'],
    stops: [
      { name: 'Virupaksha Temple', activity: 'Pre-dawn pradakshina & devotional music', duration: '45 min' },
      { name: 'Hemakuta Hill', activity: 'Sunrise silent meditation amid ancient shrines', duration: '40 min' },
      { name: 'Matanga Hill', activity: 'Panoramic breathwork & contemplation', duration: '50 min' },
      { name: 'Tungabhadra Riverbank', activity: 'Evening gratitude chant & river stillness', duration: '35 min' },
    ],
  },
  {
    id: 'mc_02',
    name: 'Varanasi – Sarnath – Bodh Gaya Sacred Circuit',
    region: 'Uttar Pradesh & Bihar',
    duration: '4 Days',
    bestTime: 'Nov – Mar (Early Morning)',
    rating: 4.9,
    emoji: '☸️',
    description: 'Walk the spiritual heartland uniting Kashi’s eternal Shiva ghats with Sarnath (first sermon) and Bodh Gaya (enlightenment of the Buddha).',
    temples: ['Assi Ghat', 'Kashi Vishwanath Corridor', 'Dashashwamedh Ghat', 'Dhamek Stupa (Sarnath)', 'Mahabodhi Temple (Bodh Gaya)'],
    stops: [
      { name: 'Assi Ghat', activity: 'Subah-e-Banaras sunrise yoga & Vedic chanting', duration: '60 min' },
      { name: 'Dashashwamedh Ghat', activity: 'Evening Ganga Aarti fire contemplation', duration: '60 min' },
      { name: 'Dhamek Stupa, Sarnath', activity: 'Mindful circumambulation & silence', duration: '45 min' },
      { name: 'Bodhi Tree, Bodh Gaya', activity: 'Deep sitting meditation under the Bodhi canopy', duration: '60 min' },
    ],
  },
  {
    id: 'mc_03',
    name: 'Tamil Nadu Great Shaiva Temple Circuit',
    region: 'Tamil Nadu',
    duration: '5 Days',
    bestTime: 'Sep – Mar (Morning & Dusk)',
    rating: 4.8,
    emoji: '🌺',
    description: 'Journey across South India’s monumental Dravidian temples — living sanctuaries of sacred geometry, bronze art, and unbroken mantra heritage.',
    temples: ['Madurai Meenakshi Amman', 'Thanjavur Brihadeeswarar', 'Chidambaram Nataraja', 'Tiruvannamalai Arunachaleswarar'],
    stops: [
      { name: 'Meenakshi Amman Temple', activity: 'Morning temple hymn listening & mandapa stillness', duration: '60 min' },
      { name: 'Brihadeeswarar Temple', activity: 'Chola granite architecture & sacred acoustics walk', duration: '50 min' },
      { name: 'Tiruvannamalai Girivalam', activity: 'Sacred hill circumambulation & Ramana Ashram silence', duration: '90 min' },
    ],
  },
  {
    id: 'mc_04',
    name: 'Pushkar & Mount Abu Sacred Silence Circuit',
    region: 'Rajasthan',
    duration: '4 Days',
    bestTime: 'Oct – Mar (Dawn & Sunset)',
    rating: 4.8,
    emoji: '🕉️',
    description: 'Pair Pushkar’s sacred lakeside ghats with the transcendent hand-carved marble peace of Rajasthan’s historic Jain temple sanctuaries.',
    temples: ['Pushkar Lake Ghats', 'Brahma Temple', 'Savitri Hill', 'Dilwara Jain Temples', 'Ranakpur Chaturmukha'],
    stops: [
      { name: 'Pushkar Lake Ghats', activity: 'Dawn reflection & mantra meditation', duration: '40 min' },
      { name: 'Savitri Hill Temple', activity: 'Sunrise pilgrimage hike & pranayama', duration: '75 min' },
      { name: 'Ranakpur 1,444-Pillar Sanctuary', activity: 'Silent contemplation in marble courtyard', duration: '60 min' },
    ],
  },
];

// GET /api/wellness/sites
router.get('/sites', (req, res) => {
  const { region, type } = req.query;
  let result = wellnessSites;
  if (region && region !== 'All') {
    result = result.filter((s) => s.region.toLowerCase() === region.toLowerCase());
  }
  if (type && type !== 'All') {
    result = result.filter((s) => s.type.toLowerCase() === type.toLowerCase());
  }
  return res.json(result);
});

// GET /api/wellness/retreats
router.get('/retreats', (req, res) => {
  const { location } = req.query;
  if (location && location !== 'All') {
    return res.json(retreats.filter((r) => r.location.toLowerCase().includes(location.toLowerCase())));
  }
  return res.json(retreats);
});

// GET /api/wellness/circuits
router.get('/circuits', (req, res) => {
  const { region } = req.query;
  if (region && region !== 'All') {
    return res.json(meditationCircuits.filter((c) => c.region.toLowerCase().includes(region.toLowerCase())));
  }
  return res.json(meditationCircuits);
});

// POST /api/wellness/inquiry — Persisted to MongoDB or data/wellness_inquiries.json
router.post('/inquiry', async (req, res) => {
  try {
    const { name, email, phone, site, category, dates, groupSize, message } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Full name and email are required.' });
    }

    const inquiryId = `WELL_${Date.now()}_${uuidv4().slice(0, 6).toUpperCase()}`;
    const payload = {
      inquiryId,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone || '',
      site: site || 'General Wellness & Spiritual Retreat',
      category: category || 'Wellness Retreat',
      dates: dates || '',
      groupSize: Number(groupSize) || 1,
      message: message || '',
      status: 'received',
    };

    let saved;
    if (isMongoConnected()) {
      saved = await WellnessInquiry.create(payload);
    } else {
      saved = localWellnessStore.saveInquiry(payload);
    }

    // Automatically record idempotent Wellness experience when userId is available
    const uid = req.body?.userId || req.headers['x-user-id'];
    if (uid) {
      try {
        const { recordAutoExperience } = require('../controllers/experienceController');
        recordAutoExperience({
          userId: uid,
          eventKey: `wellness:${saved.inquiryId}`,
          experienceType: 'wellness',
          title: payload.site,
          placeName: payload.site,
          visitStatus: 'visited',
          bookingData: {
            bookingId: saved.inquiryId,
            sourceModule: 'wellness',
            bookingStatus: 'received',
            bookingDate: new Date().toISOString(),
            visitDate: payload.dates,
          },
          wellnessDetails: {
            experienceSubType: payload.category || 'Retreat',
          },
        }).catch(() => {});
      } catch {}
    }

    return res.status(201).json({
      success: true,
      inquiryId: saved.inquiryId,
      inquiry: saved,
      message: 'Your wellness & spiritual retreat inquiry has been saved. Our team will reach out within 24 hours.',
    });
  } catch (err) {
    console.error('[Wellness] inquiry error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/wellness/inquiries?email=...
router.get('/inquiries', async (req, res) => {
  try {
    const { email } = req.query;
    let items;
    if (isMongoConnected()) {
      const filter = email ? { email: String(email).toLowerCase() } : {};
      items = await WellnessInquiry.find(filter).sort({ createdAt: -1 });
    } else {
      items = localWellnessStore.listInquiries(email);
    }
    return res.json(items);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
