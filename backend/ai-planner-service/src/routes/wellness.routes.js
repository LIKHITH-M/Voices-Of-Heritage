const express = require('express');
const router = express.Router();

const wellnessSites = [
  {
    id: 'ws_01',
    name: 'Muktinath Wellness Ashram',
    region: 'Karnataka',
    city: 'Mysuru',
    type: 'Yoga Retreat',
    description: 'Nestled in the foothills of Chamundi Hills, this ashram offers classical Mysore-style Ashtanga yoga and Ayurvedic treatments.',
    amenities: ['Yoga hall', 'Ayurvedic spa', 'Organic meals', 'Meditation garden'],
    rating: 4.9,
    pricePerNight: 3500,
    image: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800',
    tags: ['yoga', 'Ayurveda', 'Karnataka'],
  },
  {
    id: 'ws_02',
    name: 'Pushkar Ghats Meditation Centre',
    region: 'Rajasthan',
    city: 'Pushkar',
    type: 'Meditation Centre',
    description: 'On the banks of the sacred Pushkar Lake, this centre offers silence retreats, Vedic chanting, and sunrise meditation.',
    amenities: ['Silent retreat rooms', 'Vedic library', 'Ghee lamp ceremonies', 'Rooftop meditation space'],
    rating: 4.8,
    pricePerNight: 2200,
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
    tags: ['meditation', 'sacred lake', 'Rajasthan'],
  },
  {
    id: 'ws_03',
    name: 'Auroville Integral Healing Centre',
    region: 'Tamil Nadu',
    city: 'Auroville (Puducherry)',
    type: 'Holistic Healing',
    description: 'An experimental township offering integral yoga, Ayurveda, and energy healing influenced by Sri Aurobindo\'s philosophy.',
    amenities: ['Integral yoga sessions', 'Energy healing', 'Organic farm', 'Nature walks'],
    rating: 4.7,
    pricePerNight: 2800,
    image: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800',
    tags: ['integral yoga', 'holistic', 'Tamil Nadu'],
  },
  {
    id: 'ws_04',
    name: 'Varkala Cliff Ayurveda Spa',
    region: 'Kerala',
    city: 'Varkala',
    type: 'Ayurveda Spa',
    description: 'Perched on the dramatic Varkala cliffs, this spa offers traditional Kerala Panchakarma and Kalari therapy with ocean views.',
    amenities: ['Panchakarma', 'Kalari bodywork', 'Herbal steam bath', 'Beach yoga'],
    rating: 4.9,
    pricePerNight: 4500,
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
    tags: ['Ayurveda', 'Panchakarma', 'Kerala'],
  },
  {
    id: 'ws_05',
    name: 'Varanasi Ganga Dhyan Kendra',
    region: 'Uttar Pradesh',
    city: 'Varanasi',
    type: 'Spiritual Wellness',
    description: 'On the sacred banks of the Ganga, this centre offers dawn meditation, Ganga aarti witnessing, and Vedic studies.',
    amenities: ['Sunrise meditation', 'Ganga aarti viewing', 'Sanskrit classes', 'Ayurvedic consultations'],
    rating: 4.8,
    pricePerNight: 2000,
    image: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800',
    tags: ['Ganga', 'spiritual', 'Varanasi'],
  },
  {
    id: 'ws_06',
    name: 'Coorg Forest Healing Retreat',
    region: 'Karnataka',
    city: 'Coorg',
    type: 'Nature Retreat',
    description: 'Deep in the coffee-scented forests of Coorg, this retreat offers forest bathing (Shinrin-yoku), yoga, and tribal wellness practices.',
    amenities: ['Forest bathing', 'Coffee plantation walks', 'Tribal healing', 'Waterfall meditation'],
    rating: 4.6,
    pricePerNight: 3800,
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
    tags: ['forest', 'nature', 'Karnataka'],
  },
  {
    id: 'ws_07',
    name: 'Jaisalmer Desert Silence Retreat',
    region: 'Rajasthan',
    city: 'Jaisalmer',
    type: 'Desert Wellness',
    description: 'Sleep under a billion stars in the Thar Desert and experience deep silence meditation, sand therapy, and Rajasthani herbal remedies.',
    amenities: ['Stargazing deck', 'Sand therapy', 'Herbal tea ritual', 'Camel sunrise rides'],
    rating: 4.7,
    pricePerNight: 5000,
    image: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800',
    tags: ['desert', 'silence', 'Rajasthan'],
  },
  {
    id: 'ws_08',
    name: 'Kumarakom Backwater Wellness Village',
    region: 'Kerala',
    city: 'Kumarakom',
    type: 'Wellness Village',
    description: 'A serene wellness village on Vembanad Lake offering Ayurvedic detox, Njavara rice therapy, and waterside yoga.',
    amenities: ['Njavara therapy', 'Houseboat meditation', 'Yoga pier', 'Bird watching walks'],
    rating: 4.9,
    pricePerNight: 6000,
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
    tags: ['backwaters', 'Ayurveda', 'Kerala'],
  },
  {
    id: 'ws_09',
    name: 'Rishikesh Himalayan Yoga Ashram',
    region: 'Uttar Pradesh',
    city: 'Rishikesh',
    type: 'Yoga Ashram',
    description: 'The Yoga Capital of the World — offering 200/300hr TTC, Pranayama, and spiritual immersion on the Ganga banks.',
    amenities: ['Yoga Teacher Training', 'Ganga-side meditation', 'Sattvic meals', 'Rafting & trekking'],
    rating: 4.8,
    pricePerNight: 1500,
    image: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800',
    tags: ['yoga', 'Himalayan', 'Rishikesh'],
  },
  {
    id: 'ws_10',
    name: 'Madurai Siddha Healing Centre',
    region: 'Tamil Nadu',
    city: 'Madurai',
    type: 'Siddha Medicine',
    description: 'Near the ancient Meenakshi Temple, this centre preserves the ancient Tamil Siddha medicine tradition with herbal treatments and marma therapy.',
    amenities: ['Siddha consultations', 'Marma therapy', 'Herbal steam', 'Temple visits'],
    rating: 4.6,
    pricePerNight: 2400,
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
    tags: ['Siddha', 'Tamil healing', 'ancient'],
  },
];

const retreats = [
  {
    id: 'ret_01',
    name: '7-Day Panchakarma Detox',
    location: 'Kerala',
    duration: '7 days',
    price: 35000,
    description: 'Complete Ayurvedic detoxification through traditional Panchakarma therapies — Abhyanga, Shirodhara, Virechana, and Basti.',
    includes: ['Daily physician consultation', 'Personalised treatments', 'Herbal medicines', 'Sattvic meals', 'Yoga & pranayama'],
    suitable: ['Stress & burnout', 'Digestive disorders', 'Joint issues', 'Skin conditions'],
    rating: 4.9,
  },
  {
    id: 'ret_02',
    name: '5-Day Vipassana Silent Retreat',
    location: 'Uttar Pradesh',
    duration: '5 days',
    price: 0,
    description: 'Noble silence Vipassana meditation in the tradition of S.N. Goenka — 10 hours of daily meditation, no phones, no books.',
    includes: ['Accommodation', 'Vegetarian meals', 'Dhamma discourses', 'Guidance from experienced teachers'],
    suitable: ['Beginners to advanced meditators', 'Stress relief', 'Self-discovery'],
    rating: 4.9,
  },
  {
    id: 'ret_03',
    name: '3-Day Desert Vision Quest',
    location: 'Rajasthan',
    duration: '3 days',
    price: 15000,
    description: 'Alone with the dunes — guided solitary time in the Thar Desert for deep reflection, silence, and personal clarity.',
    includes: ['Tent accommodation', 'Basic meals', 'Entry/exit ceremony', 'Integration circle'],
    suitable: ['Life transitions', 'Creative blocks', 'Burnout recovery'],
    rating: 4.7,
  },
  {
    id: 'ret_04',
    name: '10-Day Yoga Immersion',
    location: 'Karnataka',
    duration: '10 days',
    price: 25000,
    description: 'Intensive Mysore-style Ashtanga yoga immersion at an authorised shala in Mysuru — suitable for all levels.',
    includes: ['Daily 2 Mysore sessions', 'Philosophy talks', 'Ayurvedic oil massage', 'Group dinner'],
    suitable: ['Yoga practitioners', 'Flexibility training', 'Mind-body balance'],
    rating: 4.8,
  },
  {
    id: 'ret_05',
    name: '4-Day Tamil Siddha Wellness',
    location: 'Tamil Nadu',
    duration: '4 days',
    price: 12000,
    description: 'Immerse in ancient Siddha medicine at a heritage centre near Madurai — marma therapy, varma treatments, and herbal steam baths.',
    includes: ['Siddha doctor consultation', 'Daily treatments', 'Herbal diet', 'Temple tour'],
    suitable: ['Chronic pain', 'Respiratory issues', 'Immunity boost'],
    rating: 4.6,
  },
  {
    id: 'ret_06',
    name: '6-Day Himalayan Breathwork Journey',
    location: 'Uttar Pradesh',
    duration: '6 days',
    price: 18000,
    description: 'Pranayama and breathwork in Rishikesh — Kapalbhati, Bhramari, Anulom Vilom, and Sudarshan Kriya with certified instructors.',
    includes: ['Group sessions', 'Individual coaching', 'River-side practice', 'Ayurvedic snacks'],
    suitable: ['Anxiety', 'Respiratory health', 'Energy enhancement'],
    rating: 4.8,
  },
];

const meditationCircuits = [
  {
    id: 'mc_01',
    name: 'Varanasi Ghat Meditation Circuit',
    region: 'Uttar Pradesh',
    stops: [
      { name: 'Assi Ghat', activity: 'Sunrise yoga and chanting', duration: '45 min' },
      { name: 'Manikarnika Ghat', activity: 'Contemplation on impermanence', duration: '30 min' },
      { name: 'Dashashwamedh Ghat', activity: 'Witness Ganga Aarti', duration: '60 min' },
      { name: 'Panchaganga Ghat', activity: 'Silent sitting meditation', duration: '30 min' },
    ],
    totalDuration: '3.5 hours',
    bestTime: 'Early morning (5–9 AM)',
    rating: 4.9,
  },
  {
    id: 'mc_02',
    name: 'Mysuru Temple Meditation Walk',
    region: 'Karnataka',
    stops: [
      { name: 'Chamundeshwari Temple', activity: 'Pradakshina and silent prayer', duration: '45 min' },
      { name: 'Mysuru Palace Gardens', activity: 'Walking meditation', duration: '30 min' },
      { name: 'Suttur Mutt', activity: 'Vedic chanting', duration: '30 min' },
      { name: 'Karanji Lake', activity: 'Nature mindfulness', duration: '40 min' },
    ],
    totalDuration: '3 hours',
    bestTime: 'Morning (6–9 AM)',
    rating: 4.7,
  },
  {
    id: 'mc_03',
    name: 'Pushkar Sacred Lake Circuit',
    region: 'Rajasthan',
    stops: [
      { name: 'Pushkar Lake Ghats', activity: 'Sunrise reflection and chanting', duration: '30 min' },
      { name: 'Brahma Temple', activity: 'Prayers at the only Brahma temple', duration: '45 min' },
      { name: 'Savitri Temple hill', activity: 'Panoramic meditation hike', duration: '90 min' },
      { name: 'Sunset Ghat', activity: 'Evening flame meditation', duration: '30 min' },
    ],
    totalDuration: '4 hours',
    bestTime: 'Early morning or evening',
    rating: 4.8,
  },
  {
    id: 'mc_04',
    name: 'Auroville Spiral Walking Circuit',
    region: 'Tamil Nadu',
    stops: [
      { name: 'Matrimandir Inner Chamber', activity: 'Silent concentration meditation', duration: '60 min' },
      { name: 'Sacred grove', activity: 'Forest bathing walk', duration: '40 min' },
      { name: 'Visitor Centre garden', activity: 'Guided breathing exercise', duration: '20 min' },
      { name: 'Sunset terrace', activity: 'Group Om chanting', duration: '20 min' },
    ],
    totalDuration: '2.5 hours',
    bestTime: 'Morning 9 AM entry',
    rating: 4.8,
  },
  {
    id: 'mc_05',
    name: 'Kerala Backwater Mindfulness Route',
    region: 'Kerala',
    stops: [
      { name: 'Kumarakom Bird Sanctuary', activity: 'Mindful bird-watching walk', duration: '60 min' },
      { name: 'Vembanad Lake boat', activity: 'Open-water sitting meditation', duration: '45 min' },
      { name: 'Coconut grove path', activity: 'Barefoot grounding walk', duration: '30 min' },
      { name: 'Sunset pier', activity: 'Gratitude journaling and sky gazing', duration: '30 min' },
    ],
    totalDuration: '3 hours',
    bestTime: 'Morning or late afternoon',
    rating: 4.9,
  },
  {
    id: 'mc_06',
    name: 'Hampi Ruins Contemplation Trail',
    region: 'Karnataka',
    stops: [
      { name: 'Virupaksha Temple', activity: 'Pradakshina and devotional music', duration: '45 min' },
      { name: 'Hemakuta Hill', activity: 'Sunrise sitting amid ancient temples', duration: '30 min' },
      { name: 'Matanga Hill', activity: 'Silent panoramic meditation', duration: '50 min' },
      { name: 'Lotus Mahal garden', activity: 'Slow walking meditation', duration: '30 min' },
    ],
    totalDuration: '3.5 hours',
    bestTime: 'Early morning (5:30–9 AM)',
    rating: 4.8,
  },
];

// GET /api/wellness/sites
router.get('/sites', (req, res) => {
  const { region } = req.query;
  if (region) {
    return res.json(wellnessSites.filter(s => s.region.toLowerCase() === region.toLowerCase()));
  }
  return res.json(wellnessSites);
});

// GET /api/wellness/retreats
router.get('/retreats', (req, res) => {
  const { location } = req.query;
  if (location) {
    return res.json(retreats.filter(r => r.location.toLowerCase() === location.toLowerCase()));
  }
  return res.json(retreats);
});

// GET /api/wellness/circuits
router.get('/circuits', (req, res) => {
  const { region } = req.query;
  if (region) {
    return res.json(meditationCircuits.filter(c => c.region.toLowerCase() === region.toLowerCase()));
  }
  return res.json(meditationCircuits);
});

// POST /api/wellness/inquiry
router.post('/inquiry', (req, res) => {
  const { name, email, phone, site, dates, groupSize, message } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
  console.log('[Wellness] Inquiry received from:', email, 'for:', site);
  return res.status(201).json({ success: true, message: 'Inquiry received. Our team will contact you within 24 hours.' });
});

module.exports = router;

