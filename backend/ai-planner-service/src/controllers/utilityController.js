/**
 * Smart Utilities Controller
 * Provides live weather (Open-Meteo), audio narration scripts,
 * verified Indian emergency helplines, and heritage AI chatbot.
 */

const HERITAGE_CITIES = {
  Hampi: { lat: 15.335, lon: 76.46, state: 'Karnataka' },
  Bangalore: { lat: 12.9716, lon: 77.5946, state: 'Karnataka' },
  Mysore: { lat: 12.2958, lon: 76.6394, state: 'Karnataka' },
  Delhi: { lat: 28.6139, lon: 77.209, state: 'Delhi' },
  Agra: { lat: 27.1767, lon: 78.0081, state: 'Uttar Pradesh' },
  Jaipur: { lat: 26.9124, lon: 75.7873, state: 'Rajasthan' },
  Varanasi: { lat: 25.3176, lon: 82.9739, state: 'Uttar Pradesh' },
  Mumbai: { lat: 19.076, lon: 72.8777, state: 'Maharashtra' },
  Aurangabad: { lat: 19.8762, lon: 75.3433, state: 'Maharashtra' },
  Chennai: { lat: 13.0827, lon: 80.2707, state: 'Tamil Nadu' },
  Madurai: { lat: 9.9252, lon: 78.1198, state: 'Tamil Nadu' },
  Konark: { lat: 19.8876, lon: 86.0945, state: 'Odisha' },
  Kolkata: { lat: 22.5726, lon: 88.3639, state: 'West Bengal' },
  Khajuraho: { lat: 24.8318, lon: 79.9199, state: 'Madhya Pradesh' },
};

const weatherCache = new Map();
const WEATHER_TTL_MS = 10 * 60 * 1000;

function describeWeatherCode(code) {
  if (code === 0) return { label: 'Clear Sky', icon: '☀️' };
  if (code <= 3) return { label: 'Partly Cloudy', icon: '⛅' };
  if (code <= 48) return { label: 'Foggy / Misty', icon: '🌫️' };
  if (code <= 67) return { label: 'Rainy', icon: '🌧️' };
  if (code <= 77) return { label: 'Snowy', icon: '❄️' };
  if (code <= 82) return { label: 'Rain Showers', icon: '🌦️' };
  if (code >= 95) return { label: 'Thunderstorm', icon: '⛈️' };
  return { label: 'Fair', icon: '🌤️' };
}

function buildHeritageAdvisory(temp, code, humidity) {
  if (code >= 95) return 'Thunderstorm alert: Avoid open stone ruins, hilltops, and exposed temple courtyards.';
  if (code >= 51 && code <= 82) return 'Wet weather: Ancient granite & marble steps can be slippery. Carry rain gear and grip footwear.';
  if (temp >= 36) return 'High heat advisory: Visit open-air monuments early (6–9 AM) or golden hour (4–6 PM). Stay hydrated.';
  if (humidity >= 80) return 'High humidity: Carry water and wear breathable cotton attire for walking tours.';
  return 'Ideal heritage sightseeing weather! Great visibility for outdoor photography and walking circuits.';
}

// GET /api/utilities/weather?city=Hampi  (or ?lat=..&lon=..)
exports.getLiveWeather = async (req, res) => {
  try {
    const cityParam = req.query.city || 'Hampi';
    const cityMeta = HERITAGE_CITIES[cityParam] || HERITAGE_CITIES.Hampi;
    const lat = req.query.lat ? Number(req.query.lat) : cityMeta.lat;
    const lon = req.query.lon ? Number(req.query.lon) : cityMeta.lon;
    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;

    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < WEATHER_TTL_MS) {
      return res.json({ ...cached.payload, cached: true });
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset,uv_index_max&timezone=Asia%2FKolkata&forecast_days=5`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP ${response.status}`);
    }

    const raw = await response.json();
    const cur = raw.current || {};
    const cond = describeWeatherCode(cur.weather_code ?? 0);

    const payload = {
      success: true,
      source: 'open-meteo-live',
      city: req.query.lat ? 'Current Location' : cityParam,
      state: cityMeta.state,
      coordinates: { lat, lon },
      current: cur,
      condition: cond,
      advisory: buildHeritageAdvisory(cur.temperature_2m ?? 28, cur.weather_code ?? 0, cur.relative_humidity_2m ?? 50),
      daily: raw.daily || {},
      cities: Object.keys(HERITAGE_CITIES),
      fetchedAt: new Date().toISOString(),
    };

    weatherCache.set(cacheKey, { ts: Date.now(), payload });
    return res.json(payload);
  } catch (err) {
    console.warn('[Utilities] Live weather fetch failed:', err.message);
    return res.status(503).json({
      success: false,
      error: 'Unable to reach live weather provider right now.',
      details: err.message,
    });
  }
};

// GET /api/utilities/narrations
const NARRATIONS = [
  {
    id: 'nar_hampi',
    site: 'Hampi — Vittala Temple & Stone Chariot',
    region: 'Karnataka',
    duration: '2 min',
    lang: 'en-IN',
    emoji: '🏛️',
    script:
      'Welcome to the Vittala Temple complex of Hampi, the crowning jewel of the Vijayanagara Empire. Built in the sixteenth century under Emperor Krishnadevaraya, this courtyard houses the iconic Stone Chariot — a shrine dedicated to Garuda, the celestial mount of Lord Vishnu. Notice how the chariot is sculpted from massive blocks of granite with intricate floral bands and once featured freely rotating stone wheels. Just behind it stands the Maha Mandapa, famous for its fifty-six musical granite pillars that emit distinct classical Carnatic notes when gently tapped.',
  },
  {
    id: 'nar_taj',
    site: 'Taj Mahal — Ivory-White Marble Mausoleum',
    region: 'Uttar Pradesh',
    duration: '2 min',
    lang: 'en-IN',
    emoji: '🕌',
    script:
      'You are standing before the Taj Mahal on the southern bank of the Yamuna River in Agra. Commissioned in 1632 by Mughal Emperor Shah Jahan in memory of Mumtaz Mahal, the monument took over twenty thousand artisans and twenty-two years to complete. Look closely at the four outer minarets — they are subtly angled outward by a few degrees so that in the event of an earthquake, they would fall away from the central dome. The translucent Makrana marble inlaid with semi-precious stones shifts colour from soft pink at dawn to luminous gold under the moonlight.',
  },
  {
    id: 'nar_ajanta',
    site: 'Ajanta Caves — Ancient Buddhist Murals',
    region: 'Maharashtra',
    duration: '2 min',
    lang: 'en-IN',
    emoji: '🪷',
    script:
      'Carved into a horseshoe-shaped basalt cliff overlooking the Waghora River, the thirty rock-cut caves of Ajanta date from the second century BCE to the fifth century CE. Created in two phases under the Satavahana and Vakataka dynasties, these monasteries and prayer halls preserve the finest surviving murals of ancient Indian art. Using natural mineral pigments — lapis lazuli blue, red ochre, and lamp black — monastic painters illustrated the Jataka tales of the Buddha’s previous lives, including the serene Bodhisattva Padmapani in Cave One.',
  },
  {
    id: 'nar_konark',
    site: 'Konark Sun Temple — Chariot of Surya',
    region: 'Odisha',
    duration: '2 min',
    lang: 'en-IN',
    emoji: '☀️',
    script:
      'Conceived as a colossal stone chariot for Surya, the Sun God, the thirteenth-century Konark Sun Temple was built by King Narasimhadeva the First of the Eastern Ganga dynasty. Twenty-four richly carved stone wheels — each nearly ten feet in diameter — act as precision sundials capable of telling time to the minute using the shadow cast by the central axle. Seven spirited stone horses strain forward at the base, symbolizing the seven days of the week pulling the sun across the heavens.',
  },
  {
    id: 'nar_mysore',
    site: 'Mysore Palace — Amba Vilas Heritage',
    region: 'Karnataka',
    duration: '2 min',
    lang: 'en-IN',
    emoji: '👑',
    script:
      'Welcome to Amba Vilas, the royal residence of the Wadiyar dynasty of Mysuru. Designed by British architect Henry Irwin in 1912 in the Indo-Saracenic style, the palace harmonizes Hindu, Mughal, Rajput, and Gothic elements. Step into the Kalyana Mantapa, or marriage pavilion, with its octagonal stained-glass ceiling crafted in Glasgow and depicting a peacock motif, while twenty-six wall murals vividly chronicle the grand Mysuru Dasara procession.',
  },
  {
    id: 'nar_brihadeeswarar',
    site: 'Brihadeeswarar Temple — Chola Masterpiece',
    region: 'Tamil Nadu',
    duration: '2 min',
    lang: 'en-IN',
    emoji: '🛕',
    script:
      'Rising over two hundred and sixteen feet above Thanjavur, the Brihadeeswarar Temple was completed in 1010 CE by the great Chola emperor Rajaraja the First. Constructed entirely from interlocking granite blocks without mortar, its hollow vimana tower is crowned by a single carved capstone weighing eighty tons. Ancient inscriptions chiseled along the plinth record the names of dancers, musicians, goldsmiths, and temple administrators who sustained this living UNESCO World Heritage marvel over a thousand years ago.',
  },
  {
    id: 'nar_hindi_hampi',
    site: 'हम्पी — विठ्ठल मंदिर एवं पत्थर का रथ (Hindi)',
    region: 'Karnataka',
    duration: '1.5 min',
    lang: 'hi-IN',
    emoji: '🇮🇳',
    script:
      'हम्पी के ऐतिहासिक विठ्ठल मंदिर में आपका स्वागत है। सोलहवीं शताब्दी में विजयनगर साम्राज्य के सम्राट कृष्णदेवराय के शासनकाल में निर्मित यह मंदिर अपनी अद्भुत द्रविड़ वास्तुकला के लिए विश्व प्रसिद्ध है। इसके प्रांगण में स्थित प्रसिद्ध पत्थर का रथ वास्तव में भगवान विष्णु के वाहन गरुड़ को समर्पित एक मंदिर है। यहाँ के छप्पन संगीतमय स्तंभ आज भी भारतीय शिल्पकला का अद्वितीय चमत्कार हैं।',
  },
];

exports.getAudioNarrations = (req, res) => {
  const { region } = req.query;
  if (region && region !== 'All') {
    return res.json(NARRATIONS.filter((n) => n.region.toLowerCase() === region.toLowerCase()));
  }
  return res.json(NARRATIONS);
};

// GET /api/utilities/helplines
const HELPLINES = [
  { id: 'hl_1', name: 'National Single Emergency Number', number: '112', category: 'Emergency', state: 'National', availability: '24×7 Multilingual', description: 'Police, Fire, Medical & Disaster unified emergency response across India.' },
  { id: 'hl_2', name: 'Incredible India Tourist Helpline', number: '1800-11-1363', shortCode: '1363', category: 'Tourist', state: 'National', availability: '24×7 (12 Languages)', description: 'Ministry of Tourism 24x7 toll-free helpline for domestic and international travellers.' },
  { id: 'hl_3', name: 'Medical Ambulance Emergency', number: '108', category: 'Medical', state: 'National', availability: '24×7', description: 'Free emergency ambulance & trauma response across most Indian states.' },
  { id: 'hl_4', name: 'Police Control Room', number: '100', category: 'Police', state: 'National', availability: '24×7', description: 'Direct emergency police assistance and tourist safety dispatch.' },
  { id: 'hl_5', name: 'Women Safety Helpline', number: '1091', category: 'Women Safety', state: 'National', availability: '24×7', description: 'Dedicated women safety and distress assistance helpline.' },
  { id: 'hl_6', name: 'Archaeological Survey of India (ASI) Helpline', number: '011-23075340', category: 'Heritage', state: 'National', availability: 'Mon–Fri, 9:30 AM – 6 PM', description: 'ASI monument information, ticketing grievances, and heritage conservation reporting.' },
  { id: 'hl_7', name: 'Railway Enquiry & Security (RPF)', number: '139', category: 'Transport', state: 'National', availability: '24×7', description: 'Indian Railways integrated helpline for passenger security, medical aid, and train status.' },
  { id: 'hl_8', name: 'Karnataka Tourism & Hampi Helpline', number: '080-22352828', category: 'Tourist', state: 'Karnataka', availability: '24×7', description: 'Karnataka State Tourism (KSTDC) assistance for Hampi, Mysore, Belur, and Gokarna.' },
  { id: 'hl_9', name: 'Rajasthan Tourist Assistance Force', number: '0141-5110598', category: 'Tourist', state: 'Rajasthan', availability: '24×7', description: 'Jaipur, Jodhpur, Udaipur, and Jaisalmer heritage tourist protection & support.' },
  { id: 'hl_10', name: 'Uttar Pradesh Tourist Helpline (Agra / Varanasi)', number: '1800-180-5131', category: 'Tourist', state: 'Uttar Pradesh', availability: '24×7', description: 'Official UP Tourism support for Taj Mahal, Fatehpur Sikri, and Varanasi ghats.' },
  { id: 'hl_11', name: 'Maharashtra Tourism (Ajanta & Ellora)', number: '1800-22-9930', category: 'Tourist', state: 'Maharashtra', availability: '24×7', description: 'MTDC helpline for Aurangabad, Ajanta Caves, Ellora Caves, and Mumbai heritage.' },
  { id: 'hl_12', name: 'Tamil Nadu Tourism Helpline', number: '1800-425-31111', category: 'Tourist', state: 'Tamil Nadu', availability: '24×7', description: 'TTDC support for Madurai, Thanjavur, Mahabalipuram, and Chettinad heritage circuits.' },
  { id: 'hl_13', name: 'Kerala Tourism Toll-Free', number: '1800-425-4747', category: 'Tourist', state: 'Kerala', availability: '24×7', description: 'Kerala Tourism assistance for backwaters, Fort Kochi, and Ayurveda retreats.' },
];

exports.getEmergencyHelplines = (req, res) => {
  const { state, category } = req.query;
  let result = HELPLINES;
  if (state && state !== 'All') {
    result = result.filter((h) => h.state.toLowerCase() === state.toLowerCase() || h.state === 'National');
  }
  if (category && category !== 'All') {
    result = result.filter((h) => h.category.toLowerCase() === category.toLowerCase());
  }
  return res.json(result);
};

// POST /api/utilities/chat
const KNOWLEDGE_FAQ = [
  {
    keywords: ['hampi', 'stone chariot', 'vittala', 'vijayanagara'],
    reply:
      'The Stone Chariot in Hampi is a 16th-century Garuda shrine inside the Vittala Temple complex, commissioned by Emperor Krishnadevaraya of the Vijayanagara Empire. Entry is ₹40 (Indian) / ₹600 (Foreign), open 8:30 AM – 5:30 PM. Best visited at sunrise or late afternoon to avoid heat.',
  },
  {
    keywords: ['taj', 'agra', 'mumtaz', 'shah jahan'],
    reply:
      'The Taj Mahal in Agra is open sunrise to sunset (approx. 6:00 AM – 6:30 PM) and CLOSED on Fridays for prayers. ASI entry is ₹50 (Indian) + ₹200 optional mausoleum ticket, or ₹1,100 + ₹200 for foreign visitors. Book official QR tickets directly in our Monument Ticketing portal!',
  },
  {
    keywords: ['ajanta', 'ellora', 'caves', 'aurangabad'],
    reply:
      'Ajanta Caves (Buddhist rock-cut paintings, 2nd c. BCE–5th c. CE) are CLOSED on Mondays, while Ellora Caves (Kailasa Temple, Hindu/Buddhist/Jain) are CLOSED on Tuesdays. Plan both from Aurangabad over 2 days and bring a torch/good footwear for cave floors.',
  },
  {
    keywords: ['konark', 'sun temple', 'odisha', 'surya'],
    reply:
      'Konark Sun Temple (13th century, Eastern Ganga dynasty) is shaped as a 24-wheel stone chariot of Surya. Each wheel functions as a sundial! Best visited early morning (6:30–9 AM) when sunrise illuminates the natamandira.',
  },
  {
    keywords: ['mysore', 'mysuru', 'palace', 'wadiyar', 'dasara'],
    reply:
      'Mysore Palace (Amba Vilas) is open daily 10:00 AM – 5:30 PM. Don’t miss the spectacular illumination with nearly 100,000 bulbs every Sunday and public holiday from 7:00 PM to 7:45 PM!',
  },
  {
    keywords: ['ticket', 'book', 'razorpay', 'qr', 'asi', 'timing', 'fee', 'price'],
    reply:
      'You can book official ASI monument entry tickets and guided walks in the Activity & Ticketing section (/bookings). Tickets support Indian & NRI differential pricing, Razorpay checkout, and instant QR codes verifiable at the gate.',
  },
  {
    keywords: ['emergency', 'help', 'police', 'ambulance', 'hospital', 'lost', 'sos'],
    reply:
      'For immediate emergencies in India dial 112 (Unified Emergency), 100 (Police), 108 (Ambulance), or 1800-11-1363 / 1363 (24×7 Multilingual Incredible India Tourist Helpline). Switch to the Emergency Helplines tab for one-tap state numbers.',
  },
  {
    keywords: ['translate', 'namaste', 'kannada', 'tamil', 'hindi', 'marathi', 'hello', 'thank'],
    reply:
      'Heritage Phrase Guide:\n• Hello: Namaste (Hindi), Namaskara (Kannada), Vanakkam (Tamil), Namaskar (Marathi)\n• Thank you: Dhanyavaad (Hindi), Dhanyavaadagalu (Kannada), Nandri (Tamil)\n• Where is the entrance?: Pravesh dwar kahan hai? (Hindi)',
  },
  {
    keywords: ['food', 'cuisine', 'eat', 'dish', 'recipe', 'mysore pak', 'biryani'],
    reply:
      'India’s heritage sites pair wonderfully with local royal and temple cuisines — try Mysore Pak & Bisi Bele Bath in Karnataka, Dal Baati Churma in Rajasthan, Chettinad curries in Tamil Nadu, or Awadhi Dum Biryani in UP. Explore full recipes & culinary trails in our Food Heritage section (/food)!',
  },
  {
    keywords: ['wellness', 'yoga', 'meditation', 'ayurveda', 'spiritual', 'retreat'],
    reply:
      'For spiritual & wellness heritage, consider Rishikesh (Himalayan yoga), Mysuru (Ashtanga yoga), Kerala (Panchakarma Ayurveda), Bodh Gaya (Vipassana), or Hampi/Varanasi temple meditation circuits. Browse our Wellness & Spiritual Tourism page (/wellness)!',
  },
];

exports.handleHeritageChat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userText = message.trim();

    // 1. Try Groq LLM if configured
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey && !groqKey.includes('your_') && groqKey.length > 12) {
      try {
        const Groq = require('groq-sdk');
        const groq = new Groq({ apiKey: groqKey });
        const completion = await groq.chat.completions.create({
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content:
                'You are Heritage AI, the official multilingual travel & cultural guide for Voices of Heritage (India). Give accurate, concise, helpful answers about Indian monuments, ASI timings, architecture, history, translations, etiquette, and travel tips in 2-5 sentences.',
            },
            ...history.slice(-6).map((m) => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text,
            })),
            { role: 'user', content: userText },
          ],
          max_tokens: 320,
          temperature: 0.6,
        });
        const reply = completion.choices?.[0]?.message?.content;
        if (reply) {
          return res.json({ success: true, reply, source: 'groq-llm' });
        }
      } catch (llmErr) {
        console.warn('[Utilities Chat] Groq fallback:', llmErr.message);
      }
    }

    // 2. Knowledge-base intelligent responder
    const lower = userText.toLowerCase();
    for (const item of KNOWLEDGE_FAQ) {
      if (item.keywords.some((kw) => lower.includes(kw))) {
        return res.json({ success: true, reply: item.reply, source: 'heritage-knowledge' });
      }
    }

    return res.json({
      success: true,
      source: 'heritage-knowledge',
      reply: `Namaste! Regarding "${userText}" — Indian UNESCO and ASI heritage sites are generally open sunrise to sunset (6 AM – 6 PM), with best photography during early morning and golden hour. You can ask me specifically about Hampi, Taj Mahal, Ajanta & Ellora, Konark, Mysore Palace, ASI tickets, local phrases/translations, food trails, wellness circuits, or emergency numbers!`,
    });
  } catch (err) {
    console.error('[Utilities Chat] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
