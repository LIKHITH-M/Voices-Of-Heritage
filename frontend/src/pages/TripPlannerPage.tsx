/**
 * TripPlannerPage.tsx — Voices of Heritage
 * Heritage Trip Planner — Split-screen Journal + Interactive Map
 *
 * Layout: Sticky map right, scrollable journal left
 * Map: Leaflet with numbered day markers, routes, POI overlays
 * Selecting a day updates map + highlights markers
 * PDF: full offline journal with map links
 * Save: localStorage → Profile page
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import VoHLogo from '@/components/VoHLogo';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '@/context/AuthContext';
import { lazy, Suspense } from 'react';
import { ResearchModeToggle, PlannerMode } from '@/components/research/ResearchModeToggle';
import ExplainabilityPanel from '@/components/research/ExplainabilityPanel';
import TripResultHeroCard from '@/components/trip/TripResultHeroCard';
import InteractiveTripMap from '@/components/trip/InteractiveTripMap';
import { exportItineraryToPDF } from '@/components/trip/PDFExportService';
import EditActivityModal, { EditableActivity } from '@/components/trip/EditActivityModal';

const PostVisitFeedbackModal = lazy(
  () => import('@/components/research/PostVisitFeedbackModal')
);

const AI_PLANNER_API = import.meta.env.VITE_AI_PLANNER_API_URL || 'http://localhost:5002/api';
const RESEARCH_API = import.meta.env.VITE_RESEARCH_SERVICE_URL || 'http://localhost:5003/api';

/** Save a generated trip to the backend research-service (non-blocking) */
async function persistTripToBackend(tripPayload: any): Promise<string | null> {
  try {
    const res = await fetch(`${RESEARCH_API}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tripPayload),
    });
    if (res.ok) {
      const json = await res.json();
      return json.tripId || null;
    }
  } catch {
    // Non-critical — backend persistence failure does not break the UI
    console.warn('[VoH] Trip persistence to backend failed (offline or service down)');
  }
  return null;
}

async function persistTripItinerary(userId: string, tripId: string, itinerary: any[]) {
  if (!userId || !tripId || tripId.startsWith('trip_')) return;
  try {
    await fetch(`${RESEARCH_API}/trips/${encodeURIComponent(userId)}/${encodeURIComponent(tripId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itinerary }),
    });
  } catch {
    console.warn('[VoH] Updated itinerary could not be synced to research service');
  }
}

async function generateHeritageItinerary(payload: any): Promise<any> {
  const res = await fetch(`${AI_PLANNER_API}/ai/generate-heritage-itinerary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Fix Leaflet default icon paths in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* ═══════════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════════ */
type WStep = 1 | 2 | 3 | 4;

interface TripForm {
  destination: string; travelers: number;
  startDate: string;   endDate: string;
  budget: string;      currency: string;
  interests: string[]; travelStyle: string;
  pace: string;        dietary: string[];
  includeHotels: boolean; includeTransport: boolean;
}

interface Activity {
  time: string; name: string; type: string;
  duration: string; cost: number; note: string;
  emoji: string; address?: string; isLive?: boolean; rating?: number;
  lat: number; lng: number;
  preferenceMatch?: string;
}

interface DayPlan {
  day: number; date: string; title: string; subtitle: string;
  totalCost: number; weather: string;
  activities: Activity[];
  meals: { breakfast: string; lunch: string; dinner: string };
  hotel: string; hotelCost: number;
  transport: string; transportCost: number;
  tips: string[];
  mapQuery: string;
}

export interface SavedTrip {
  id: string; savedAt: string;
  destination: string; totalDays: number;
  startDate?: string; endDate?: string;
  totalCost: number; currency: string;
  travelers: number; summary: string;
  heritageTheme?: string;
  travelStyle: string; budget: string;
  highlights: string[];
  days: DayPlan[];
  costBreakdown: { accommodation: number; food: number; activities: number; transport: number; misc: number };
  liveEvents: { name: string; date: string; type: string; venue: string; cost: number; emoji: string; bookable: boolean }[];
  packingList: string[];
  emergencyContacts: { name: string; number: string }[];
  mapCenter: [number, number];
}

/* ═══════════════════════════════════════════════════════════════════════════════
   STATIC OPTIONS
   ═══════════════════════════════════════════════════════════════════════════════ */
const INTERESTS = [
  { id: 'heritage', label: 'Heritage & History', emoji: '🏛️' }, { id: 'temples', label: 'Temples & Spirituality', emoji: '🛕' },
  { id: 'nature', label: 'Nature & Trekking', emoji: '🌿' }, { id: 'food', label: 'Culinary & Food Tours', emoji: '🍛' },
  { id: 'art', label: 'Art & Architecture', emoji: '🎨' }, { id: 'wildlife', label: 'Wildlife & Safaris', emoji: '🐆' },
  { id: 'adventure', label: 'Adventure & Sports', emoji: '🧗' }, { id: 'shopping', label: 'Local Crafts & Markets', emoji: '🛍️' },
  { id: 'wellness', label: 'Wellness & Yoga', emoji: '🧘' }, { id: 'festivals', label: 'Festivals & Events', emoji: '🎉' },
  { id: 'photography', label: 'Photography & Sunrise', emoji: '📸' }, { id: 'offbeat', label: 'Offbeat Hidden Gems', emoji: '🗺️' },
];
const BUDGETS = [
  { id: 'budget', label: '₹1.5–3K/day', emoji: '💵' }, { id: 'mid', label: '₹3–7K/day', emoji: '💳' },
  { id: 'comfort', label: '₹7–15K/day', emoji: '✨' }, { id: 'luxury', label: '₹15K+/day', emoji: '👑' },
];
const STYLES = [
  { id: 'solo', label: 'Solo', emoji: '🧳' }, { id: 'couple', label: 'Couple', emoji: '💑' },
  { id: 'family', label: 'Family', emoji: '👨‍👩‍👧' }, { id: 'friends', label: 'Friends', emoji: '👯' },
  { id: 'senior', label: 'Senior', emoji: '🧓' }, { id: 'business', label: 'Business', emoji: '💼' },
];
const PACE = [
  { id: 'relaxed', label: 'Relaxed · 2–3 spots', emoji: '🌅' },
  { id: 'balanced', label: 'Balanced · 4–5 spots', emoji: '⚖️' },
  { id: 'packed', label: 'Packed · 6–8 spots', emoji: '⚡' },
];
const DIETARY = [
  { id: 'veg', label: 'Vegetarian', emoji: '🥗' }, { id: 'vegan', label: 'Vegan', emoji: '🌱' },
  { id: 'nonveg', label: 'Non-Veg', emoji: '🍗' }, { id: 'jain', label: 'Jain', emoji: '🪷' },
  { id: 'halal', label: 'Halal', emoji: '☪️' }, { id: 'gf', label: 'Gluten-Free', emoji: '🌾' },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   KNOWN DESTINATION COORDINATES
   ═══════════════════════════════════════════════════════════════════════════════ */
const DEST_COORDS: Record<string, [number, number]> = {
  hampi: [15.335, 76.461], jaipur: [26.9124, 75.7873], varanasi: [25.3176, 82.9739],
  agra: [27.1767, 78.0081], delhi: [28.6139, 77.209], mumbai: [19.076, 72.8777],
  udaipur: [24.5854, 73.7125], jodhpur: [26.2389, 73.0243], goa: [15.2993, 74.124],
  mysore: [12.2958, 76.6394], chennai: [13.0827, 80.2707], kolkata: [22.5726, 88.3639],
  khajuraho: [24.8318, 79.9199], konark: [19.8876, 86.0945], mahabalipuram: [12.6172, 80.1927],
  ajanta: [20.5519, 75.7033], ellora: [20.0258, 75.1776], madurai: [9.9252, 78.1198],
  orchha: [25.3519, 78.6418], lucknow: [26.8467, 80.9462], amritsar: [31.634, 74.8723],
  rishikesh: [30.0869, 78.2676], pushkar: [26.4898, 74.5511], bhopal: [23.2599, 77.4126],
  gokarna: [14.5479, 74.3188], tokyo: [35.6762, 139.6503], kyoto: [35.0116, 135.7681],
  rome: [41.9028, 12.4964], paris: [48.8566, 2.3522], london: [51.5074, -0.1278],
  cairo: [30.0444, 31.2357], athens: [37.9838, 23.7275], istanbul: [41.0082, 28.9784],
  barcelona: [41.3874, 2.1686], lisbon: [38.7223, -9.1393], prague: [50.0755, 14.4378],
  bangkok: [13.7563, 100.5018], singapore: [1.3521, 103.8198], bali: [-8.3405, 115.092],
  hanoi: [21.0285, 105.8542],
};

function getCoords(dest: string): [number, number] {
  const key = dest.toLowerCase().split(',')[0].trim();
  for (const [k, v] of Object.entries(DEST_COORDS)) { if (key.includes(k)) return v; }
  return [20.5937, 78.9629]; // India centre fallback
}

/* scatter activities around the center with realistic offsets */
function scatterCoords(center: [number, number], count: number, radius = 0.025): [number, number][] {
  const golden = 2.399963;
  return Array.from({ length: count }, (_, i) => {
    const r = radius * Math.sqrt((i + 1) / count);
    const theta = i * golden;
    return [center[0] + r * Math.cos(theta), center[1] + r * Math.sin(theta)] as [number, number];
  });
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TRIP BUILDER — DYNAMIC MULTI-PARAMETER ENGINE
   ═══════════════════════════════════════════════════════════════════════════════ */
function buildTrip(form: TripForm): SavedTrip {
  const dest  = form.destination.trim() || 'Hampi';
  const short = dest.split(',')[0].trim();
  const days  = form.startDate && form.endDate
    ? Math.max(1, Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000)) : 3;
  const bpd   = form.budget === 'budget' ? 2500 : form.budget === 'mid' ? 5000 : form.budget === 'comfort' ? 10000 : 20000;
  const cur   = form.currency || '₹';
  const center = getCoords(dest);

  // 1. Dietary specific meals
  const dDiet = form.dietary && form.dietary.length > 0 ? form.dietary[0] : 'veg';
  const getDietaryMeals = (d: string, b: number) => {
    const bC = Math.round(b * 0.05);
    const lC = Math.round(b * 0.09);
    const dC = Math.round(b * 0.12);
    if (form.dietary.includes('jain')) {
      return {
        breakfast: `Jain Sattvic Eatery — Steamed Poha, Fruit Platter & Herbal Brew (${cur}${bC})`,
        lunch: `Pure Jain Bhojanalaya — Sattvic Thali with Dal, Rotis & Gourd Curries [No root veg/onion/garlic] (${cur}${lC})`,
        dinner: `Jain Heritage Dining Hall — Traditional Dal Baati Churma & Moong Halwa (${cur}${dC})`,
        tag: 'Strict Jain Sattvic'
      };
    }
    if (form.dietary.includes('vegan')) {
      return {
        breakfast: `Plant-Based Heritage Café — Red Rice Poha, Tender Coconut & Filter Coffee (${cur}${bC})`,
        lunch: `Farm-to-Table Vegan Kitchen — Organic Millet Thali, Coconut Gravies & Greens (${cur}${lC})`,
        dinner: `Vegan Courtyard Dining — Jackfruit Biryani & Almond Milk Payasam (${cur}${dC})`,
        tag: '100% Plant-Based Vegan'
      };
    }
    if (form.dietary.includes('halal')) {
      return {
        breakfast: `Halal Heritage Kitchen — Fresh Kulcha, Keema & Spiced Chai (${cur}${bC})`,
        lunch: `Certified Halal Royal Dining — Fragrant Dum Biryani & Mirchi Ka Salan (${cur}${lC})`,
        dinner: `Mughal Heritage Courtyard — Slow-Cooked Nihari & Tandoori Breads [100% Halal] (${cur}${dC})`,
        tag: 'Certified Halal Cuisine'
      };
    }
    if (form.dietary.includes('gf')) {
      return {
        breakfast: `Gluten-Free Heritage Kitchen — Ragi Idlis, Coconut Chutney & Tea (${cur}${bC})`,
        lunch: `Heirloom Millet Thali — Jowar Rotis, Dal, Ghee & Traditional Rice (${cur}${lC})`,
        dinner: `Naturally Gluten-Free Clay-Pot Dinner — Steamed Rice Curries & Lentil Soups (${cur}${dC})`,
        tag: 'Naturally Gluten-Free'
      };
    }
    if (form.dietary.includes('nonveg')) {
      return {
        breakfast: `Heritage Café — Appam with Vegetable / Egg Stew & Filter Brew (${cur}${bC})`,
        lunch: `Regional Heritage Kitchen — Clay-Pot Mutton/Chicken Thali & Malabar Curries (${cur}${lC})`,
        dinner: `Rooftop Grill & Biryani House — Coastal Fish Curry & Tandoori Specialties (${cur}${dC})`,
        tag: 'Regional Heritage Non-Veg'
      };
    }
    return {
      breakfast: `Udupi Heritage Café — Crispy Masala Dosa, Sambar & Filter Coffee (${cur}${bC})`,
      lunch: `Traditional Banana Leaf Thali — Multi-Course Pure Veg Regional Feast (${cur}${lC})`,
      dinner: `Rooftop Heritage Dining — Paneer Tikka, Dal Tadka & Tandoori Breads (${cur}${dC})`,
      tag: 'Pure Vegetarian'
    };
  };
  const mealConfig = getDietaryMeals(dDiet, bpd);

  // 2. Comprehensive Interest-Based Activity Pools
  const POOLS: Record<string, Omit<Activity, 'lat' | 'lng'>[]> = {
    heritage: [
      { time: '09:30', name: `${short} Archaeological Enclosure & ASI Museum`, type: 'Heritage', duration: '2.5 hrs', cost: 40, note: 'UNESCO world heritage complex with expert guide.', emoji: '🏛️', rating: 4.8 },
      { time: '14:30', name: `Royal Enclosure & Stepped Tank Excavation`, type: 'Heritage', duration: '2 hrs', cost: 25, note: 'Ancient civic architecture and royal aqueduct systems.', emoji: '🏛️', rating: 4.7 },
      { time: '11:00', name: `Zenana Enclosure & Lotus Mahal Pavilions`, type: 'Heritage', duration: '90 min', cost: 40, note: 'Indo-Islamic secular architecture and elephant stables.', emoji: '🏛️', rating: 4.7 },
    ],
    temples: [
      { time: '07:00', name: `${short} Sanctum Darshan & Morning Bell Chimes`, type: 'Spiritual', duration: '90 min', cost: 0, note: 'Early morning tranquility and devotional chanting.', emoji: '🛕', rating: 4.9 },
      { time: '10:30', name: `Monolithic Shrine & Stone Chariot Pilgrimage`, type: 'Spiritual', duration: '2 hrs', cost: 20, note: 'Intricate pillars, musical columns, and relief carvings.', emoji: '🛕', rating: 4.8 },
      { time: '17:30', name: `Sacred River Ghats & Twilight Aarti`, type: 'Spiritual', duration: '1 hr', cost: 0, note: 'Devotional lamps floating on sacred waters.', emoji: '🛕', rating: 4.8 },
    ],
    nature: [
      { time: '06:30', name: `${short} Riverbank Boulder & Forest Trail`, type: 'Nature', duration: '2 hrs', cost: 0, note: 'Pristine riparian ecology and ancient flora.', emoji: '🌿', rating: 4.7 },
      { time: '16:00', name: `Sacred Hillside Eco-Walk & Rock Geomorphology`, type: 'Nature', duration: '2 hrs', cost: 0, note: 'Precambrian natural granite rock formations.', emoji: '🌿', rating: 4.8 },
      { time: '08:30', name: `Botanical Heritage Grove & Medicinal Plants Walk`, type: 'Nature', duration: '90 min', cost: 0, note: 'Native trees preserved through sacred grove traditions.', emoji: '🌿', rating: 4.6 },
    ],
    food: [
      { time: '12:30', name: `Heritage Culinary Trail & Spice Sampling`, type: 'Culinary', duration: '90 min', cost: Math.round(bpd * 0.08), note: `Tasting heirloom family recipes [${mealConfig.tag}].`, emoji: '🍛', rating: 4.8 },
      { time: '17:00', name: `Traditional Chai & Regional Snack Tastings`, type: 'Culinary', duration: '45 min', cost: Math.round(bpd * 0.04), note: 'Clay-cup brews and artisanal jaggery treats.', emoji: '☕', rating: 4.6 },
      { time: '20:30', name: `Courtyard Chef Tasting & Heritage Storytelling`, type: 'Culinary', duration: '2 hrs', cost: Math.round(bpd * 0.12), note: `Curated evening feast with local culinary history.`, emoji: '🍛', rating: 4.9 },
    ],
    art: [
      { time: '11:00', name: `Ancient Fresco Painting & Mural Documentation`, type: 'Art', duration: '2 hrs', cost: 50, note: 'Natural vegetable pigment ceiling murals.', emoji: '🎨', rating: 4.7 },
      { time: '15:30', name: `Artisan Stone-Carving & Sculpture Guild`, type: 'Art', duration: '90 min', cost: 0, note: 'Watch master stone chiselers shaping granite sculptures.', emoji: '🎨', rating: 4.8 },
      { time: '10:00', name: `Traditional Textile Weaving & Indigo Dyeing`, type: 'Art', duration: '90 min', cost: 100, note: 'Hands-on heritage loom weaving demonstration.', emoji: '🎨', rating: 4.7 },
    ],
    wildlife: [
      { time: '06:00', name: `Wetlands Bird Sanctuary & Otter Habitat Walk`, type: 'Wildlife', duration: '2.5 hrs', cost: 150, note: 'Spot migratory waterfowl and smooth-coated otters.', emoji: '🐆', rating: 4.8 },
      { time: '16:30', name: `Nature Reserve Safari & Flora Corridor`, type: 'Wildlife', duration: '2 hrs', cost: 250, note: 'Guided sanctuary trail with local wildlife naturalists.', emoji: '🐆', rating: 4.7 },
    ],
    adventure: [
      { time: '06:30', name: `Granite Bouldering & Ridge Scramble`, type: 'Adventure', duration: '2 hrs', cost: 300, note: 'World-renowned bouldering crags with safety harness.', emoji: '🧗', rating: 4.9 },
      { time: '16:00', name: `Traditional Coracle River Rapids Navigation`, type: 'Adventure', duration: '1 hr', cost: 200, note: 'Round woven boat journey down historical river rapids.', emoji: '🧗', rating: 4.8 },
      { time: '14:30', name: `Historical Rampart Cycle Expedition`, type: 'Adventure', duration: '2 hrs', cost: 150, note: 'Cycle along ancient defense walls and moat systems.', emoji: '🧗', rating: 4.7 },
    ],
    shopping: [
      { time: '17:00', name: `Ancient Bazaar Handicrafts & Weaver Co-Op`, type: 'Crafts', duration: '90 min', cost: 0, note: 'GI-tagged textiles, bronze miniatures, and embroidery.', emoji: '🛍️', rating: 4.6 },
      { time: '19:00', name: `Artisanal Terracotta & Spice Market Guild`, type: 'Crafts', duration: '1 hr', cost: 0, note: 'Direct-from-artisan pottery, organic jaggery, and spices.', emoji: '🛍️', rating: 4.5 },
    ],
    wellness: [
      { time: '06:00', name: `Sunrise Riverside Yoga & Pranayama Session`, type: 'Wellness', duration: '75 min', cost: 100, note: 'Breathing meditation overlooking temple spires.', emoji: '🧘', rating: 4.9 },
      { time: '17:30', name: `Ayurvedic Herbal Therapy & Sound Bath`, type: 'Wellness', duration: '90 min', cost: 450, note: 'Medicated herbal oil rejuvenation and singing bowls.', emoji: '🧘', rating: 4.8 },
    ],
    festivals: [
      { time: '18:30', name: `Folk Music Recital & Classical Dance Guild`, type: 'Culture', duration: '2 hrs', cost: 200, note: 'Live percussion, shadow puppetry, and heritage storytelling.', emoji: '🎉', rating: 4.8, isLive: true },
      { time: '20:30', name: `Sound & Light Grand Historical Spectacle`, type: 'Culture', duration: '1 hr', cost: 150, note: 'Illuminated monuments with dramatized history.', emoji: '🎉', rating: 4.7, isLive: true },
    ],
    photography: [
      { time: '05:30', name: `Golden Hour Dawn Panorama at ${short} Ridge`, type: 'Photography', duration: '90 min', cost: 0, note: 'First light hitting monolithic monuments and boulders.', emoji: '📸', rating: 4.9 },
      { time: '18:00', name: `Blue Hour Monument Reflection & Silhouette Shoot`, type: 'Photography', duration: '75 min', cost: 0, note: 'Deep twilight sky framing ancient stone pillars.', emoji: '📸', rating: 4.8 },
    ],
    offbeat: [
      { time: '10:00', name: `Forgotten Ruins & Overgrown Inscriptions Trail`, type: 'Offbeat', duration: '2 hrs', cost: 0, note: 'Lesser-known epigraphs away from all tourist crowds.', emoji: '🗺️', rating: 4.8 },
      { time: '15:00', name: `Monastic Cave Hermitages & Subterranean Vaults`, type: 'Offbeat', duration: '90 min', cost: 0, note: 'Ancient meditation chambers hidden inside rock fissures.', emoji: '🗺️', rating: 4.7 },
    ],
  };

  // 3. Target activity count per day based on Pace
  const targetPerDay = form.pace === 'relaxed' ? 3 : form.pace === 'packed' ? 7 : 5;

  // Selected interest categories (fall back to heritage & food if empty)
  const selInterests = form.interests.length > 0 ? form.interests : ['heritage', 'food'];

  // 4. Hotel configuration based on includeHotels toggle & budget
  let hotelName = 'Own Accommodation / Arranged Separately';
  let hotelDailyCost = 0;
  if (form.includeHotels) {
    if (form.budget === 'luxury') {
      hotelName = `${short} Palace Heritage Luxury Resort & Spa`;
      hotelDailyCost = 8500;
    } else if (form.budget === 'comfort') {
      hotelName = `${short} Heritage Boutique Retreat`;
      hotelDailyCost = 4200;
    } else if (form.budget === 'mid') {
      hotelName = `${short} Heritage Haveli / Inn`;
      hotelDailyCost = 2200;
    } else {
      hotelName = `${short} Verified Eco Homestay`;
      hotelDailyCost = 950;
    }
  }

  // 5. Transport configuration based on includeTransport toggle & style/budget
  let transportMode = 'Self-Arranged / Walking';
  let transportDailyCost = 0;
  if (form.includeTransport) {
    if (form.travelStyle === 'luxury' || form.budget === 'luxury') {
      transportMode = 'Chauffeured AC Sedan with Guide';
      transportDailyCost = 1800;
    } else if (form.travelStyle === 'family') {
      transportMode = 'Private AC Innova with Family Seating';
      transportDailyCost = 1400;
    } else if (form.travelStyle === 'senior') {
      transportMode = 'AC Cab with Electric Golf-Cart Monument Access';
      transportDailyCost = 1200;
    } else if (form.travelStyle === 'solo') {
      transportMode = 'Heritage Bicycle + Verified E-Rickshaw Passes';
      transportDailyCost = 350;
    } else if (form.travelStyle === 'couple') {
      transportMode = 'Private Auto-rickshaw & Twin Heritage Bicycles';
      transportDailyCost = 500;
    } else {
      transportMode = 'Local Cab + Heritage Cycle Passes';
      transportDailyCost = 650;
    }
  }

  // 6. Style-specific tailored tips
  const STYLE_TIPS: Record<string, string> = {
    couple: 'Romantic golden hour viewpoints scheduled; candlelit courtyards reserved.',
    family: 'Kid-friendly shaded stops, spacious transport & open garden monuments.',
    solo: 'Verified solo routes with secure storage & social heritage café hubs.',
    senior: 'Accessible flat paths, golf-cart assisted monuments & seated pavilions.',
    friends: 'Group adventure & photo challenges included along the trail.',
    business: 'Fast-track monument entries and executive dining with Wi-Fi reserved.',
  };
  const styleTip = STYLE_TIPS[form.travelStyle] || 'Tailored to your travel style.';

  // 7. Day Generation
  let interestRoundRobin = 0;

  const dayPlans: DayPlan[] = Array.from({ length: days }, (_, i) => {
    const n = i + 1;
    const ds = form.startDate
      ? new Date(new Date(form.startDate).getTime() + i * 86400000)
          .toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
      : `Day ${n}`;

    const actsRaw: Omit<Activity, 'lat' | 'lng'>[] = [];

    // Add meals into schedule
    actsRaw.push({
      time: '08:00',
      name: `Breakfast — ${mealConfig.breakfast.split('—')[0].trim()}`,
      type: 'Culinary',
      duration: '45 min',
      cost: Math.round(bpd * 0.05),
      note: mealConfig.tag,
      emoji: '☕',
      rating: 4.7
    });

    // Populate activities matching the user's selected interests
    const dayInterestItems: Omit<Activity, 'lat' | 'lng'>[] = [];
    for (let slot = 0; slot < targetPerDay - 2; slot++) {
      const cat = selInterests[interestRoundRobin % selInterests.length];
      interestRoundRobin++;
      const pool = POOLS[cat] || POOLS['heritage'];
      const act = pool[slot % pool.length];
      if (act && !dayInterestItems.some(x => x.name === act.name)) {
        dayInterestItems.push({
          ...act,
          address: `${act.name.split(' ')[0]} Sector, ${short}`
        });
      }
    }

    // Add Lunch
    actsRaw.push(...dayInterestItems.slice(0, Math.ceil(dayInterestItems.length / 2)));
    actsRaw.push({
      time: '13:00',
      name: `Lunch — ${mealConfig.lunch.split('—')[0].trim()}`,
      type: 'Culinary',
      duration: '1 hr',
      cost: Math.round(bpd * 0.09),
      note: `Regional dining [${mealConfig.tag}]`,
      emoji: '🍛',
      rating: 4.8
    });
    actsRaw.push(...dayInterestItems.slice(Math.ceil(dayInterestItems.length / 2)));

    // Add Dinner
    actsRaw.push({
      time: '20:30',
      name: `Dinner — ${mealConfig.dinner.split('—')[0].trim()}`,
      type: 'Culinary',
      duration: '90 min',
      cost: Math.round(bpd * 0.12),
      note: `Evening ambiance [${mealConfig.tag}]`,
      emoji: '🌃',
      rating: 4.8
    });

    // Sort chronologically by time
    actsRaw.sort((a, b) => a.time.localeCompare(b.time));

    // Scatter coordinates realistically
    const dayCenter: [number, number] = [center[0] + (i * 0.008 - days * 0.004), center[1] + (i * 0.006 - days * 0.003)];
    const pts = scatterCoords(dayCenter, actsRaw.length, 0.018 + i * 0.003);
    const acts: Activity[] = actsRaw.map((a, j) => ({ ...a, lat: pts[j][0], lng: pts[j][1] }));

    const dayActCost = acts.reduce((s, a) => s + a.cost, 0);

    return {
      day: n,
      date: ds,
      title: n === 1 ? `Day 1 — Arrival & ${selInterests[0] || 'Heritage'} Exploration` : n === days ? `Day ${n} — Farewell Twilight & Last Treasures` : `Day ${n} — Deep-Dive ${selInterests[(n - 1) % selInterests.length] || 'Heritage'} & Culture`,
      subtitle: `${acts.length} curated stops matching ${form.pace} pace and ${mealConfig.tag}`,
      activities: acts,
      totalCost: dayActCost + hotelDailyCost + transportDailyCost,
      weather: ['Sunny 28°C', 'Pleasant 26°C', 'Clear 29°C', 'Misty 24°C'][n % 4],
      meals: {
        breakfast: mealConfig.breakfast,
        lunch: mealConfig.lunch,
        dinner: mealConfig.dinner,
      },
      hotel: hotelName,
      hotelCost: hotelDailyCost,
      transport: transportMode,
      transportCost: transportDailyCost,
      tips: [
        styleTip,
        `Dietary note: ${mealConfig.tag} spots prioritized.`,
        form.pace === 'packed' ? 'Packed pace: Wear comfortable shoes and keep water handy.' : 'Relaxed pace: Take time at shaded courtyards.',
        'Carry small notes (₹10–50) for local craft guilds.'
      ],
      mapQuery: encodeURIComponent(`${short}, India`),
    };
  });

  const totalAccommodation = dayPlans.reduce((s, d) => s + d.hotelCost, 0);
  const totalFood = dayPlans.reduce((s, d) => s + (bpd * 0.26), 0);
  const totalActivities = dayPlans.reduce((s, d) => s + d.activities.reduce((a, x) => a + (x.type !== 'Culinary' ? x.cost : 0), 0), 0);
  const totalTransport = dayPlans.reduce((s, d) => s + d.transportCost, 0);
  const misc = Math.round((totalAccommodation + totalFood + totalActivities + totalTransport) * 0.08);

  // Dynamic Highlights reflecting user's selected interests
  const dynamicHighlights = selInterests.slice(0, 6).map(it => {
    const item = INTERESTS.find(i => i.id === it);
    return item ? `${item.emoji} ${item.label}` : it;
  });

  // Dynamic Packing List tailored to options
  const packList = ['Sunscreen SPF50', 'Comfortable walking shoes', 'Water bottle', 'Power bank', 'ID copies', 'Cash (small notes)'];
  if (form.interests.includes('temples')) packList.push('Modest temple scarf / wrap');
  if (form.interests.includes('photography')) packList.push('Camera, extra battery & lens cloth');
  if (form.interests.includes('nature') || form.interests.includes('adventure')) packList.push('Trekking shoes & insect repellent');
  if (form.interests.includes('wellness')) packList.push('Yoga mat / stretch wear');
  if (form.dietary.includes('jain') || form.dietary.includes('gf')) packList.push('Emergency dietary snacks');

  return {
    id: `trip_${Date.now()}`,
    savedAt: new Date().toISOString(),
    destination: dest,
    totalDays: days,
    totalCost: Math.round(totalAccommodation + totalFood + totalActivities + totalTransport + misc),
    currency: cur,
    travelers: form.travelers,
    travelStyle: form.travelStyle,
    budget: form.budget,
    summary: `${days}-day ${form.travelStyle} journey through ${dest} — customized for ${selInterests.join(', ')} with ${mealConfig.tag} dining at a ${form.pace} pace.`,
    highlights: dynamicHighlights.length > 0 ? dynamicHighlights : ['Heritage Complex Tour', 'Artisan Trail', 'Scenic Sunrise'],
    days: dayPlans,
    costBreakdown: {
      accommodation: Math.round(totalAccommodation),
      food: Math.round(totalFood),
      activities: Math.round(totalActivities),
      transport: Math.round(totalTransport),
      misc
    },
    liveEvents: [
      { name: `${short} Heritage Cultural Evening`, date: 'During stay', type: 'Festival', venue: `Heritage Square`, cost: 0, emoji: '🎊', bookable: true },
      { name: 'Classical Music & Folk Recital', date: 'Evening', type: 'Arts', venue: 'Cultural Centre', cost: 350, emoji: '💃', bookable: true },
      { name: 'Traditional Craft & Pottery Workshop', date: 'Weekends', type: 'Workshop', venue: 'Artisan Village', cost: 500, emoji: '🏺', bookable: true },
      { name: 'Riverside Dawn Meditation', date: 'Daily 6 AM', type: 'Wellness', venue: 'Riverside Ghat', cost: 100, emoji: '🧘', bookable: false },
    ],
    packingList: packList,
    emergencyContacts: [{ name: 'Tourist Police', number: '1363' }, { name: 'ASI Helpline', number: '011-23073300' }, { name: 'Emergency', number: '112' }],
    mapCenter: center,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   LOCAL STORAGE
   ═══════════════════════════════════════════════════════════════════════════════ */
const LS_KEY = 'voh_saved_trips';
export function getSavedTrips(): SavedTrip[] { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } }
function saveTrip(t: SavedTrip) { const ex = getSavedTrips().filter(x => x.id !== t.id); localStorage.setItem(LS_KEY, JSON.stringify([t, ...ex])); }

/* ═══════════════════════════════════════════════════════════════════════════════
   PDF PRINT
   ═══════════════════════════════════════════════════════════════════════════════ */
function printTrip(trip: SavedTrip) {
  const { destination, totalDays, totalCost, currency, travelers, summary, days, costBreakdown, liveEvents, packingList, emergencyContacts } = trip;
  const dayHtml = days.map(d => `
    <div class="d"><div class="dh"><span class="dn">Day ${d.day}</span><span class="dt">${d.title} — ${d.date}</span><span class="dc">${currency}${d.totalCost.toLocaleString()}</span></div>
    <div class="dm">🌤 ${d.weather} · 🏨 ${d.hotel} (${currency}${d.hotelCost}/n) · 🚌 ${d.transport}</div>
    <table><thead><tr><th>Time</th><th>Place</th><th>Dur.</th><th>Cost</th><th>Tip</th></tr></thead><tbody>
    ${d.activities.map(a => `<tr><td>${a.time}</td><td>${a.emoji} ${a.name}<br><small>${a.type}${a.rating ? ` ★${a.rating}` : ''}</small></td><td>${a.duration}</td><td>${a.cost === 0 ? 'Free' : currency + a.cost}</td><td>${a.note}</td></tr>`).join('')}
    </tbody></table>
    <div class="ml">Meals: ${d.meals.breakfast} | ${d.meals.lunch} | ${d.meals.dinner}</div>
    <div class="tl">Tips: ${d.tips.join(' · ')}</div>
    <div class="mp">🗺 <a href="https://www.google.com/maps/search/${d.mapQuery}">Day ${d.day} on Google Maps →</a> · Markers: ${d.activities.map(a => `<a href="https://www.google.com/maps?q=${a.lat},${a.lng}">${a.emoji}${a.name}</a>`).join(', ')}</div></div>`).join('');

  const w = window.open('', '_blank'); if (!w) { alert('Allow popups for PDF.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${destination} — ${totalDays}-Day Trip</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Inter:wght@400;500;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}body{font:11px/1.5 'Inter',sans-serif;color:#1a1a1a;background:#fff}
.cv{background:linear-gradient(135deg,#0A0A0B,#1a1a1f);color:#fff;padding:36px 44px 32px}
.cv h1{font:700 26px/1.2 'Cinzel',serif;margin-bottom:6px}.cv h1 span{color:#D99C53}
.cv p{font-size:12px;color:#bbb;max-width:550px;margin-bottom:20px}
.cv .mr{display:flex;gap:18px;flex-wrap:wrap}.cv .mi{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:8px 14px;text-align:center}
.cv .mv{font:700 16px 'Inter';color:#D99C53}.cv .mk{font-size:8px;color:#888;text-transform:uppercase;letter-spacing:.06em}
.ct{padding:0 44px}
.st{font:700 13px 'Cinzel',serif;border-bottom:2px solid #D99C53;padding-bottom:5px;margin:24px 0 12px;color:#0a0a0b}
.d{margin-bottom:26px;page-break-inside:avoid}.dh{display:flex;align-items:baseline;gap:10px;margin-bottom:4px}
.dn{font:700 10px 'Cinzel';color:#D99C53;background:rgba(217,156,83,.1);padding:2px 8px;border-radius:16px;border:1px solid rgba(217,156,83,.25)}
.dt{font:700 12px 'Cinzel';flex:1}.dc{font:700 11px 'Inter';color:#B4773B}.dm{font-size:9px;color:#666;margin-bottom:6px}
table{width:100%;border-collapse:collapse;margin-bottom:6px;font-size:9.5px}
th{background:#0F0F11;color:#D99C53;padding:5px 7px;text-align:left;font-size:8px;text-transform:uppercase;letter-spacing:.04em}
td{padding:4px 7px;border-bottom:1px solid #eee;vertical-align:top}tr:nth-child(even) td{background:#fafafa}small{color:#999;font-size:8px}
.ml{font-size:9px;color:#555;padding:5px 8px;background:#FFF8EE;border-left:3px solid #D99C53;border-radius:0 5px 5px 0;margin:3px 0}
.tl{font-size:9px;color:#555;padding:5px 8px;background:#F0FFF4;border-left:3px solid #22c55e;border-radius:0 5px 5px 0;margin:3px 0}
.mp{font-size:9px;margin-top:3px;color:#2563eb}.mp a{color:#2563eb}
.cg{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px}
.cc{background:#0A0A0B;color:#fff;border-radius:8px;padding:10px 14px}.ccv{font:700 16px 'Inter';color:#D99C53}.cck{font-size:8px;color:#888;text-transform:uppercase;margin-top:1px}
.eg{display:grid;grid-template-columns:1fr 1fr;gap:6px}.ec{border:1px solid #eee;border-radius:7px;padding:8px}
.pk{display:flex;flex-wrap:wrap;gap:4px;margin-top:3px}.pt{background:#F7F3E9;border:1px solid rgba(180,130,80,.15);border-radius:16px;padding:2px 8px;font-size:8px}
.em table{width:100%;font-size:9px;border-collapse:collapse}.em td{padding:4px 7px;border-bottom:1px solid #eee}
.ft{text-align:center;font-size:8px;color:#aaa;margin-top:28px;padding-top:14px;border-top:1px solid #eee}
@page{size:A4;margin:16mm 10mm}@media print{.cv{-webkit-print-color-adjust:exact;print-color-adjust:exact}.d{page-break-inside:avoid}}
</style></head><body>
<div class="cv"><div style="font:700 14px 'Cinzel';color:#D99C53;margin-bottom:2px">Voices of Heritage</div>
<div style="font-size:9px;color:#666;margin-bottom:22px">Heritage Travel Journal · ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</div>
<h1>${destination}<br><span>${totalDays}-Day Heritage Itinerary</span></h1><p>${summary}</p>
<div class="mr"><div class="mi"><div class="mv">${totalDays}</div><div class="mk">Days</div></div>
<div class="mi"><div class="mv">${travelers}</div><div class="mk">Travelers</div></div>
<div class="mi"><div class="mv">${currency}${totalCost.toLocaleString()}</div><div class="mk">Total</div></div>
<div class="mi"><div class="mv">${currency}${Math.round(totalCost/totalDays/travelers).toLocaleString()}</div><div class="mk">Per Person/Day</div></div></div></div>
<div class="ct"><div class="st">Day-by-Day Itinerary</div>${dayHtml}
<div class="st">Cost Breakdown</div><div class="cg">
<div class="cc"><div class="ccv">${currency}${costBreakdown.accommodation.toLocaleString()}</div><div class="cck">Accommodation</div></div>
<div class="cc"><div class="ccv">${currency}${costBreakdown.food.toLocaleString()}</div><div class="cck">Food</div></div>
<div class="cc"><div class="ccv">${currency}${costBreakdown.activities.toLocaleString()}</div><div class="cck">Activities</div></div>
<div class="cc"><div class="ccv">${currency}${costBreakdown.transport.toLocaleString()}</div><div class="cck">Transport</div></div></div>
<div class="st">Events</div><div class="eg">${liveEvents.map(e => `<div class="ec"><strong>${e.emoji} ${e.name}</strong><br><span style="font-size:8px;color:#666">${e.type} · ${e.venue} · ${e.date} · ${e.cost===0?'Free':currency+e.cost}</span></div>`).join('')}</div>
<div class="st">Packing</div><div class="pk">${packingList.map(i => `<span class="pt">${i}</span>`).join('')}</div>
<div class="st">Emergency</div><div class="em"><table>${emergencyContacts.map(c => `<tr><td>${c.name}</td><td><strong>${c.number}</strong></td></tr>`).join('')}</table></div>
<div class="st">Offline Maps</div>
${days.map(d => `<p style="font-size:9px;margin:2px 0"><strong>Day ${d.day}:</strong> <a href="https://www.google.com/maps/search/${d.mapQuery}" style="color:#2563eb">Google Maps → ${decodeURIComponent(d.mapQuery)}</a></p>`).join('')}
<div class="ft">Generated by Voices of Heritage · voicesofheritage.in · Save as PDF (Ctrl+P) for offline use · ${new Date().toLocaleString('en-IN')}</div>
</div></body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 500);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   LEAFLET MAP COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */
const TYPE_COLORS: Record<string, string> = {
  Heritage: '#D99C53', Culinary: '#F97316', Photography: '#EAB308',
  Nature: '#22C55E', Cultural: '#A855F7', default: '#60A5FA',
};

function makeMarkerIcon(emoji: string, color: string, index: number, active: boolean) {
  const sz = active ? 38 : 30;
  return L.divIcon({
    className: '',
    html: `<div style="width:${sz}px;height:${sz}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2.5px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;position:relative;transition:all .2s">
      <span style="transform:rotate(45deg);font-size:${active ? 15 : 11}px;line-height:1">${emoji}</span>
      <span style="position:absolute;top:-6px;right:-6px;width:16px;height:16px;border-radius:50%;background:#0A0A0B;color:#D99C53;font-size:8px;font-weight:800;display:flex;align-items:center;justify-content:center;transform:rotate(45deg);border:1.5px solid ${color}">${index + 1}</span>
    </div>`,
    iconSize: [sz, sz], iconAnchor: [sz / 2, sz], popupAnchor: [0, -sz],
  });
}

function TripMap({ trip, activeDay }: { trip: SavedTrip; activeDay: number }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObjRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup>(L.layerGroup());
  const routeRef = useRef<L.Polyline | null>(null);

  // init map
  useEffect(() => {
    if (!mapRef.current || mapObjRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView(trip.mapCenter, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ position: 'bottomleft' }).addTo(map);
    markersRef.current.addTo(map);
    mapObjRef.current = map;
    return () => { map.remove(); mapObjRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update markers on day change
  useEffect(() => {
    const map = mapObjRef.current; if (!map) return;
    const day = trip.days[activeDay]; if (!day) return;
    markersRef.current.clearLayers();
    if (routeRef.current) { map.removeLayer(routeRef.current); routeRef.current = null; }

    const pts: L.LatLng[] = [];
    day.activities.forEach((act, i) => {
      const ll = L.latLng(act.lat, act.lng);
      pts.push(ll);
      const color = TYPE_COLORS[act.type] || TYPE_COLORS.default;
      const marker = L.marker(ll, { icon: makeMarkerIcon(act.emoji, color, i, false) });
      marker.bindPopup(`
        <div style="font-family:'Inter',sans-serif;min-width:180px">
          <div style="font-weight:700;font-size:13px;margin-bottom:3px">${act.emoji} ${act.name}</div>
          <div style="font-size:11px;color:#666;margin-bottom:2px">${act.time} · ${act.duration} · ${act.cost === 0 ? 'Free' : trip.currency + act.cost}</div>
          <div style="font-size:10px;color:#888;margin-bottom:6px">${act.note}</div>
          <a href="https://www.google.com/maps?q=${act.lat},${act.lng}" target="_blank" rel="noopener"
             style="display:inline-block;padding:4px 10px;border-radius:5px;background:#D99C53;color:#fff;font-size:10px;font-weight:600;text-decoration:none">Open in Google Maps →</a>
        </div>
      `);
      marker.on('mouseover', () => marker.setIcon(makeMarkerIcon(act.emoji, color, i, true)));
      marker.on('mouseout', () => marker.setIcon(makeMarkerIcon(act.emoji, color, i, false)));
      markersRef.current.addLayer(marker);
    });

    // route polyline
    if (pts.length > 1) {
      routeRef.current = L.polyline(pts, { color: '#D99C53', weight: 2.5, opacity: 0.6, dashArray: '6,8' }).addTo(map);
    }

    // fit bounds
    if (pts.length > 0) {
      const bounds = L.latLngBounds(pts);
      map.fitBounds(bounds.pad(0.3), { animate: true, duration: 0.5 });
    }
  }, [trip, activeDay]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PARTICLE CANVAS
   ═══════════════════════════════════════════════════════════════════════════════ */
function Particles({ dark }: { dark: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    let raf: number;
    const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
    resize(); window.addEventListener('resize', resize);
    const pts = Array.from({ length: 40 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, r: Math.random() * 1.2 + .3, vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22, o: Math.random() * .3 + .06 }));
    const tick = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      pts.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0; if (p.y < 0) p.y = c.height; if (p.y > c.height) p.y = 0; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = dark ? `rgba(180,119,59,${p.o})` : `rgba(161,91,23,${p.o * .5})`; ctx.fill(); });
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [dark]);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function TripPlannerPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user: authUser } = useAuth();   // Phase 3: get real userId instead of hardcoded 'voh-user'
  const dk = theme === 'dark';

  const C = {
    bg: dk ? '#050505' : '#FDFBF7', surface: dk ? '#0A0A0B' : '#FFFFFF',
    card: dk ? '#0F0F11' : '#F7F3E9', card2: dk ? '#151518' : '#EEE8DA',
    border: dk ? 'rgba(255,255,255,.05)' : 'rgba(180,130,80,.15)',
    amber: dk ? '#B4773B' : '#A15B17', gold: dk ? '#D99C53' : '#D97706',
    text: dk ? '#EDEDED' : '#2E251E', muted: dk ? '#7A7A7A' : '#786A5E',
    green: dk ? '#4ADE80' : '#16A34A', blue: dk ? '#60A5FA' : '#2563EB',
  };

  const [wStep, setWStep] = useState<WStep>(1);
  const [trip, setTrip] = useState<SavedTrip | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [genPct, setGenPct] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [showCosts, setShowCosts] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [showPack, setShowPack] = useState(false);
  const [heritageMode, setHeritageMode] = useState(true);
  const [plannerMode, setPlannerMode] = useState<PlannerMode>(() => {
    return (localStorage.getItem('voh_planner_mode') as PlannerMode) || 'research';
  });
  const handlePlannerModeChange = (m: PlannerMode) => {
    setPlannerMode(m);
    localStorage.setItem('voh_planner_mode', m);
  };
  const [depkgMeta, setDepkgMeta] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedActivityIndex, setSelectedActivityIndex] = useState<number | null>(null);
  // Phase 4: Post-visit feedback modal state
  const [feedbackSite, setFeedbackSite] = useState<{ siteId: string; siteName: string } | null>(null);
  const [editingActivity, setEditingActivity] = useState<EditableActivity | null>(null);

  const handleSaveActivity = useCallback((updated: EditableActivity, reason: string) => {
    if (!trip) return;
    const newDays = [...trip.days];
    const targetDay = newDays[updated.dayIndex];
    if (!targetDay) return;
    const activities = [...targetDay.activities];
    const previousName = activities[updated.activityIndex]?.name || null;

    if (updated.activityIndex >= activities.length) {
      activities.push({
        time: updated.time,
        name: updated.name,
        duration: String(updated.duration),
        cost: Number(updated.cost) || 0,
        note: updated.note,
        type: updated.type,
        emoji: updated.emoji || '🏛️',
        lat: updated.lat || trip.mapCenter[0],
        lng: updated.lng || trip.mapCenter[1],
        preferenceMatch: updated.preferenceMatch || undefined,
      });
    } else {
      activities[updated.activityIndex] = {
        ...activities[updated.activityIndex],
        time: updated.time,
        name: updated.name,
        duration: String(updated.duration),
        cost: Number(updated.cost) || 0,
        note: updated.note,
        type: updated.type,
        emoji: updated.emoji,
        lat: updated.lat,
        lng: updated.lng,
        preferenceMatch: updated.preferenceMatch || undefined,
      };
    }

    const dayActCost = activities.reduce((s, a) => s + (typeof a.cost === 'number' ? a.cost : 0), 0);
    const updatedDay = {
      ...targetDay,
      activities,
      totalCost: dayActCost + targetDay.hotelCost + targetDay.transportCost,
    };
    newDays[updated.dayIndex] = updatedDay;

    const totalActivities = newDays.reduce((s, d) => s + d.activities.reduce((a, x) => a + (x.type !== 'Culinary' ? x.cost : 0), 0), 0);
    const newTotalCost = newDays.reduce((s, d) => s + d.totalCost, 0);

    const updatedTrip: SavedTrip = {
      ...trip,
      days: newDays,
      totalCost: newTotalCost,
      costBreakdown: {
        ...trip.costBreakdown,
        activities: Math.round(totalActivities),
      },
    };
    setTrip(updatedTrip);
    saveTrip(updatedTrip);
    persistTripItinerary(authUser?.id || authUser?.email || 'voh-user', updatedTrip.id, updatedTrip.days);
    setEditingActivity(null);

    // Research Integration: Log modification event to research PTKG continual learning loop
    const userId = authUser?.id || authUser?.email || 'voh-user';
    fetch(`${RESEARCH_API}/experiences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        tripId: trip.id,
        eventType: 'itinerary_modification',
        payload: {
          action: 'edit_activity',
          originalRecommendation: previousName,
          selectedChoice: updated.name,
          reason: reason || undefined,
          monumentName: updated.name,
          time: updated.time,
          cost: updated.cost,
          destination: trip.destination,
        },
      }),
    }).catch(() => {});
  }, [trip, authUser]);

  const handleDeleteActivity = useCallback((dayIndex: number, actIndex: number, reason: string) => {
    if (!trip) return;
    const newDays = [...trip.days];
    const targetDay = newDays[dayIndex];
    if (!targetDay) return;
    const deletedName = targetDay.activities[actIndex]?.name;
    const activities = targetDay.activities.filter((_, idx) => idx !== actIndex);

    const dayActCost = activities.reduce((s, a) => s + (typeof a.cost === 'number' ? a.cost : 0), 0);
    const updatedDay = {
      ...targetDay,
      activities,
      totalCost: dayActCost + targetDay.hotelCost + targetDay.transportCost,
    };
    newDays[dayIndex] = updatedDay;

    const totalActivities = newDays.reduce((s, d) => s + d.activities.reduce((a, x) => a + (x.type !== 'Culinary' ? x.cost : 0), 0), 0);
    const newTotalCost = newDays.reduce((s, d) => s + d.totalCost, 0);

    const updatedTrip: SavedTrip = {
      ...trip,
      days: newDays,
      totalCost: newTotalCost,
      costBreakdown: {
        ...trip.costBreakdown,
        activities: Math.round(totalActivities),
      },
    };
    setTrip(updatedTrip);
    saveTrip(updatedTrip);
    persistTripItinerary(authUser?.id || authUser?.email || 'voh-user', updatedTrip.id, updatedTrip.days);
    setEditingActivity(null);

    // Research Integration: Log deletion event to PTKG
    const userId = authUser?.id || authUser?.email || 'voh-user';
    fetch(`${RESEARCH_API}/experiences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        tripId: trip.id,
        eventType: 'itinerary_modification',
        payload: {
          action: 'delete_activity',
          originalRecommendation: deletedName,
          reason: reason || undefined,
          monumentName: deletedName,
          destination: trip.destination,
        },
      }),
    }).catch(() => {});
  }, [trip, authUser]);

  const [form, setForm] = useState<TripForm>({
    destination: '', travelers: 2, startDate: '', endDate: '',
    budget: 'mid', currency: '₹',
    interests: ['heritage', 'food'], travelStyle: 'couple', pace: 'balanced',
    dietary: ['veg'], includeHotels: true, includeTransport: true,
  });

  const toggleArr = (key: 'interests' | 'dietary', id: string) =>
    setForm(f => ({ ...f, [key]: f[key].includes(id) ? f[key].filter(x => x !== id) : [...f[key], id] }));

  const generate = useCallback(async () => {
    setWStep(3); setGenPct(0); setIsSaved(false); setAiError(null); setDepkgMeta(null);
    const tStart = Date.now();
    let p = 0;
    const iv = setInterval(() => { p = Math.min(p + Math.random() * 14, 100); setGenPct(Math.round(p)); }, 220);

    // Phase 3: use real userId from Firebase auth, fallback to 'voh-user' for unauthenticated sessions
    const userId = authUser?.id || authUser?.email || 'voh-user';

    try {
      if (heritageMode) {
        // Research Mode A: DEPKG/PTKG-personalized AI generation
        const budgetMap: Record<string,{min:number,max:number}> = { budget:{min:1500,max:3000}, mid:{min:3000,max:7000}, comfort:{min:7000,max:15000}, luxury:{min:15000,max:50000} };
        const b = budgetMap[form.budget] || {min:3000,max:7000};
        const days = form.startDate && form.endDate ? Math.max(1, Math.ceil((new Date(form.endDate).getTime()-new Date(form.startDate).getTime())/86400000)) : 3;

        const result = await generateHeritageItinerary({
          destination: form.destination,
          duration: days,
          startDate: form.startDate,
          endDate: form.endDate,
          budget: { min: b.min*form.travelers, max: b.max*form.travelers, currency:'INR' },
          travelStyle: form.travelStyle,
          interests: form.interests,
          groupSize: form.travelers,
          userId,                    // Phase 3 fix: real userId (was hardcoded 'voh-user')
          mode: plannerMode,         // Phase 14: baseline vs research mode
        });

        clearInterval(iv); setGenPct(100);
        if (result.success) {
          setDepkgMeta(result.depkg);
          const aiData = result.data;

          // ── Phase 3 FIX: Use LLM-generated itinerary, NOT buildTrip() fallback ──
          // The LLM returns a full day-by-day itinerary. We use it as the primary source.
          // buildTrip() is now ONLY used as a last-resort fallback when the backend is completely unavailable.
          const center = getCoords(form.destination);
          const built = buildTrip(form); // Keep for non-itinerary fields (packing, emergency contacts, etc.)

          // Map LLM itinerary to DayPlan format (preserving coordinates from LLM where available)
          const llmDays: DayPlan[] = aiData.itinerary?.map((d: any, idx: number) => {
            const scattered = scatterCoords(center, (d.activities?.length || 1) + 2);
            const acts: Activity[] = (d.activities || []).map((a: any, ai: number) => ({
              time: a.time || `${9 + ai}:00 AM`,
              name: a.activity || a.name || 'Heritage Visit',
              type: a.type || 'heritage',
              duration: a.duration || '2 hours',
              cost: typeof a.cost === 'number' ? a.cost : Number(a.cost?.amount) || 0,
              note: a.heritage_note || a.description || '',
              emoji: a.type === 'dining' ? '🍽️' : a.type === 'transport' ? '🚌' : '🏛️',
              address: a.location?.address || '',
              lat: a.location?.coordinates?.lat ?? scattered[ai]?.[0] ?? center[0],
              lng: a.location?.coordinates?.lng ?? scattered[ai]?.[1] ?? center[1],
              rating: undefined,
              isLive: false,
            }));
            const builtDay = built.days[idx] || built.days[0];
            return {
              day: d.day || idx + 1,
              date: builtDay?.date || '',
              title: d.title || `Day ${d.day || idx + 1} in ${form.destination}`,
              subtitle: d.heritage_summary || '',
              totalCost: acts.reduce((s, a) => s + a.cost, 0),
              weather: builtDay?.weather || '☀️ Pleasant',
              activities: acts,
              meals: builtDay?.meals || { breakfast: 'Local breakfast', lunch: 'Heritage café', dinner: 'Regional cuisine' },
              hotel: builtDay?.hotel || (form.includeHotels ? 'Heritage hotel' : ''),
              hotelCost: builtDay?.hotelCost || 0,
              transport: builtDay?.transport || '',
              transportCost: builtDay?.transportCost || 0,
              tips: builtDay?.tips || [],
              mapQuery: `${form.destination} heritage sites`,
            };
          }) || built.days;

          const enriched: SavedTrip = {
            ...built,
            days: llmDays,                                             // ✅ Real LLM days
            summary: aiData.personalizationSummary || built.summary,
            highlights: aiData.heritageHighlights || built.highlights,
            totalCost: aiData.totalEstimatedCost || built.totalCost,
            mapCenter: center,
          };
          setTrip(enriched);

          // Persist asynchronously, then replace the local ID with the research
          // service ID so feedback and reflection events attach to this trip.
          const localTripId = enriched.id;
          persistTripToBackend({
            userId,
            destination: form.destination,
            startDate: form.startDate,
            endDate: form.endDate,
            travelers: form.travelers,
            budget: form.budget,
            currency: form.currency || 'INR',
            travelStyle: form.travelStyle,
            pace: form.pace,
            interests: form.interests,
            dietary: form.dietary,
            includeHotels: form.includeHotels,
            includeTransport: form.includeTransport,
            itinerary: aiData.itinerary || [],
            summary: aiData.personalizationSummary,
            highlights: aiData.heritageHighlights,
            heritageTheme: aiData.heritageTheme,
            localCuisineRecommendations: aiData.localCuisineRecommendations,
            totalEstimatedCost: aiData.totalEstimatedCost,
            generationMode: plannerMode,               // Phase 14: real mode tracking
            llmModel: result.depkg?.source || 'groq',
            ptkgContextSnapshot: result.depkg,
            verificationScore: result.depkg?.verificationScore,
            generationDurationMs: Date.now() - tStart,
          }).then((backendTripId) => {
            if (!backendTripId) return;
            setTrip(current => {
              if (!current || current.id !== localTripId) return current;
              const linkedTrip = { ...current, id: backendTripId };
              saveTrip(linkedTrip);
              return linkedTrip;
            });
          }).catch(() => { /* local planner remains usable if persistence is offline */ });

        } else {
          throw new Error(result.message || 'Generation failed');
        }
      } else {
        // Offline fallback mode (heritageMode=false)
        setTimeout(() => { clearInterval(iv); setGenPct(100); const t = buildTrip(form); setTrip(t); setActiveDay(0); setExpandedDay(0); setTimeout(() => setWStep(4), 400); }, 3800);
        return;
      }
      setActiveDay(0); setExpandedDay(0);
      setTimeout(() => setWStep(4), 400);
    } catch(err: any) {
      clearInterval(iv);
      const msg = err.message || '';
      const friendly = msg.includes('API key') || msg.includes('Google') || msg.includes('500')
        ? 'AI cloud service offline — loaded verified heritage catalog'
        : msg.length > 80 ? msg.slice(0, 80) + '…' : msg;
      setAiError(friendly);
      // Graceful fallback to local buildTrip() — UI always shows something
      const t = buildTrip(form);
      setTrip(t); setActiveDay(0); setExpandedDay(0);
      setTimeout(() => setWStep(4), 400);
    }
  }, [form, heritageMode, authUser]);

  const handleSave = () => { if (!trip) return; saveTrip(trip); setIsSaved(true); };

  const GEN_MSGS = ['Locating heritage sites…', 'Mapping walking routes…', 'Finding live events…', 'Calculating costs…', 'Curating dining & stays…', 'Assembling journal…'];
  const gIdx = GEN_MSGS.reduce((a, _, i) => genPct >= i * (100 / GEN_MSGS.length) ? i : a, 0);

  /* ── CSS ── */
  const css = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@300;400;500;600;700;800&display=swap');
*{box-sizing:border-box}
.J{display:flex;flex-direction:column;min-height:100vh;background:${C.bg};color:${C.text};font-family:'Inter',system-ui,sans-serif;overflow:hidden}

/* topbar */
.J-top{height:50px;background:${C.surface};border-bottom:1px solid ${C.border};display:flex;align-items:center;justify-content:space-between;padding:0 1.2rem;flex-shrink:0;z-index:100}
.J-brand{display:flex;align-items:center;gap:.5rem;cursor:pointer;flex-shrink:0}
.J-brand b{font:700 .82rem 'Cinzel',serif;color:${C.amber};white-space:nowrap}
.J-brand small{font-size:.58rem;color:${C.muted}}
.J-crumb{font-size:.68rem;color:${C.muted};white-space:nowrap}
.J-crumb a{color:${C.muted};text-decoration:none}.J-crumb a:hover{color:${C.gold}}
.J-crumb em{color:${C.amber};font-style:normal}
.J-acts{display:flex;gap:.45rem;align-items:center;flex-shrink:0}
.J-btn{padding:.28rem .72rem;border-radius:7px;border:1px solid ${C.border};background:none;color:${C.muted};font:500 .72rem 'Inter',sans-serif;cursor:pointer;transition:all .12s;white-space:nowrap}
.J-btn:hover{color:${C.text};border-color:${C.amber}}
.J-btn-g{padding:.28rem .82rem;border-radius:7px;background:linear-gradient(135deg,${C.amber},${C.gold});color:#fff;border:none;font:700 .72rem 'Inter',sans-serif;cursor:pointer;transition:all .12s}
.J-btn-g:hover{filter:brightness(1.12)}
.J-btn-ok{padding:.28rem .82rem;border-radius:7px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);color:${C.green};font:700 .72rem 'Inter',sans-serif;cursor:default}
@media(max-width:640px){
  .J-top{padding:0 .8rem;height:52px}
  .J-brand b{font-size:.76rem}
  .J-brand small{display:none}
  .J-crumb{display:none}
  .J-acts{gap:.35rem}
  .J-acts .J-btn{padding:.24rem .55rem;font-size:.68rem}
}

/* hero (wizard only) */
.J-hero{position:relative;padding:2rem 1.5rem 1.6rem;background:${C.card};border-bottom:1px solid ${C.border};text-align:center;overflow:hidden}
.J-hero-ey{display:inline-flex;gap:.3rem;padding:.2rem .7rem;border-radius:16px;background:rgba(180,119,59,.1);border:1px solid rgba(180,119,59,.18);font-size:.64rem;font-weight:700;color:${C.amber};text-transform:uppercase;letter-spacing:.04em;margin-bottom:.6rem}
.J-hero h1{font:700 clamp(1.2rem,3vw,1.7rem)/1.15 'Cinzel',serif;color:${C.text};margin:0 0 .3rem}
.J-hero h1 em{color:${C.gold};font-style:normal}
.J-hero p{font-size:.82rem;color:${C.muted};max-width:420px;margin:0 auto}
@media(max-width:640px){
  .J-hero{padding:1.4rem 1rem 1.2rem}
  .J-hero h1{font-size:1.18rem}
  .J-hero p{font-size:.76rem}
}

/* steps bar */
.J-sbar{background:${C.surface};border-bottom:1px solid ${C.border};padding:.7rem 1.5rem;flex-shrink:0}
.J-steps{display:flex;max-width:520px;margin:0 auto}
.J-st{display:flex;flex-direction:column;align-items:center;flex:1;position:relative}
.J-stl{position:absolute;top:13px;left:50%;right:-50%;height:2px;background:${C.border};z-index:0;transition:background .3s}
.J-stl.ok{background:${C.amber}}
.J-st:last-child .J-stl{display:none}
.J-stc{width:26px;height:26px;border-radius:50%;border:2px solid ${C.border};display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:700;background:${C.card};color:${C.muted};z-index:1;position:relative;transition:all .2s}
.J-stc.on{border-color:${C.amber};background:rgba(180,119,59,.1);color:${C.amber}}
.J-stc.ok{border-color:${C.amber};background:${C.amber};color:#fff}
.J-stk{font-size:.52rem;font-weight:600;color:${C.muted};margin-top:.2rem;text-align:center}
.J-stk.on{color:${C.amber}}.J-stk.ok{color:${C.gold}}
@media(max-width:640px){
  .J-sbar{padding:.5rem .8rem}
  .J-stc{width:24px;height:24px;font-size:.6rem}
  .J-stk{font-size:.48rem}
}

/* wizard form */
.J-wiz{flex:1;padding:1.5rem;max-width:760px;margin:0 auto;width:100%;overflow-y:auto}
.J-wiz h2{font:700 1rem 'Cinzel',serif;color:${C.text};margin:0 0 .12rem}
.J-wiz .sub{font-size:.78rem;color:${C.muted};margin:0 0 1.2rem}
.J-row{display:grid;grid-template-columns:1fr 1fr;gap:.85rem;margin-bottom:.85rem}
.J-r3{display:grid;grid-template-columns:2fr 1fr;gap:.85rem;margin-bottom:.85rem}
@media(max-width:540px){.J-row,.J-r3{grid-template-columns:1fr}}
.J-lbl{font-size:.68rem;font-weight:600;color:${C.gold};letter-spacing:.02em;margin-bottom:.28rem;display:block}
.J-inp{padding:.52rem .78rem;border-radius:8px;border:1px solid ${C.border};background:${C.card};color:${C.text};font:400 .82rem 'Inter',sans-serif;outline:none;width:100%;transition:border .12s}
.J-inp:focus{border-color:${C.amber}}
.J-sel{padding:.52rem .78rem;border-radius:8px;border:1px solid ${C.border};background:${C.card};color:${C.text};font:400 .82rem 'Inter',sans-serif;outline:none;cursor:pointer;width:100%;-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%237A7A7A' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .6rem center;padding-right:1.8rem}
.J-chips{display:flex;flex-wrap:wrap;gap:.38rem;margin-bottom:.85rem}
.J-chip{padding:.3rem .62rem;border-radius:7px;border:1px solid ${C.border};background:${C.card};color:${C.muted};font:500 .72rem 'Inter',sans-serif;cursor:pointer;transition:all .12s}
.J-chip:hover{border-color:rgba(180,119,59,.3)}
.J-chip.on{background:rgba(180,119,59,.1);border-color:${C.amber};color:${C.amber};font-weight:600}
.J-tog{width:38px;height:20px;border-radius:10px;border:none;cursor:pointer;position:relative;transition:all .2s;background:${dk ? '#2A2A2A' : '#D5D5D5'};flex-shrink:0}
.J-tog.on{background:linear-gradient(135deg,${C.amber},${C.gold})}
.J-tog::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 2px rgba(0,0,0,.25)}
.J-tog.on::after{transform:translateX(18px)}
.J-nav{display:flex;gap:.7rem;justify-content:flex-end;margin-top:1.3rem;padding-top:1rem;border-top:1px solid ${C.border}}
@media(max-width:768px){
  .J-wiz{
    padding:1rem 1rem 140px 1rem !important;
    overflow-y:auto;
    -webkit-overflow-scrolling:touch;
  }
  .J-chips{gap:.32rem}
  .J-chip{padding:.35rem .6rem;font-size:.72rem}
  .J-nav{
    justify-content:space-between;
    gap:.6rem;
    padding-bottom:1.5rem;
  }
  .J-nav .J-btn, .J-nav .J-btn-g{
    flex:1;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:.6rem 1rem;
    font-size:.8rem;
  }
}

/* generation */
.J-gen{flex:1;display:grid;grid-template-columns:1fr 1fr;overflow:hidden}
@media(max-width:700px){.J-gen{grid-template-columns:1fr}}
.J-gen-l{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2.5rem 1.5rem;gap:1rem;text-align:center;border-right:1px solid ${C.border}}
.J-gen-orb{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,${C.amber},${C.gold});display:flex;align-items:center;justify-content:center;font-size:2rem;animation:orbP 2s ease-in-out infinite;box-shadow:0 0 30px rgba(180,119,59,.35)}
@keyframes orbP{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
.J-gen-l h2{font:700 1.1rem 'Cinzel',serif;color:${C.text}}
.J-gen-l p{font-size:.78rem;color:${C.muted};max-width:280px}
.J-gen-l p strong{color:${C.gold}}
.J-pbar{width:240px;max-width:85%;height:5px;border-radius:3px;background:${C.card2};overflow:hidden}
.J-pfill{height:100%;border-radius:3px;background:linear-gradient(90deg,${C.amber},${C.gold});transition:width .25s}
.J-gen-msgs{display:flex;flex-direction:column;gap:.25rem;text-align:left;width:240px;max-width:85%}
.J-gm{display:flex;gap:.4rem;font-size:.72rem;color:${C.muted};padding:.15rem 0;align-items:center}
.J-gm.ok{color:${C.green}}.J-gm.ac{color:${C.amber}}
.J-gmd{width:6px;height:6px;border-radius:50%;background:${C.border};flex-shrink:0}
.J-gm.ok .J-gmd{background:${C.green}}.J-gm.ac .J-gmd{background:${C.amber};animation:gmd .8s infinite}
@keyframes gmd{0%,100%{opacity:1}50%{opacity:.3}}
.J-gen-r{position:relative;background:${C.card};overflow:hidden}
.J-gen-r iframe{width:100%;height:100%;border:none}
.J-gen-ov{position:absolute;top:.6rem;left:.6rem;background:rgba(0,0,0,.6);backdrop-filter:blur(5px);border:1px solid rgba(255,255,255,.07);border-radius:6px;padding:.35rem .7rem;font-size:.68rem;color:#fff;font-weight:600;pointer-events:none}

/* ─── ITINERARY OUTPUT ─── */
.J-out{flex:1;display:grid;grid-template-columns:1fr 420px;grid-template-rows:1fr;overflow:hidden;height:calc(100vh - 50px - 44px)}
@media(max-width:900px){
  .J-out{grid-template-columns:1fr;grid-template-rows:1fr 280px;height:100%}
  .J-map-wrap{order:2;height:280px}
  .J-scroll{height:100%;padding-bottom:100px !important}
}

/* left scroll */
.J-scroll{overflow-y:auto;padding:0}
.J-scroll::-webkit-scrollbar{width:4px}.J-scroll::-webkit-scrollbar-thumb{background:rgba(180,119,59,.18);border-radius:2px}

/* day strip */
.J-dstrip{position:sticky;top:0;z-index:20;display:flex;gap:.35rem;padding:.55rem 1rem;background:${C.surface};border-bottom:1px solid ${C.border};overflow-x:auto;flex-shrink:0}
.J-dstrip::-webkit-scrollbar{height:0}
.J-dpill{padding:.25rem .65rem;border-radius:6px;border:1px solid ${C.border};background:${C.card};color:${C.muted};font:600 .68rem 'Inter',sans-serif;cursor:pointer;white-space:nowrap;transition:all .12s;flex-shrink:0}
.J-dpill:hover{border-color:rgba(180,119,59,.25)}
.J-dpill.on{background:rgba(180,119,59,.12);border-color:${C.amber};color:${C.amber}}

/* compact header */
.J-hdr{padding:.85rem 1.1rem .5rem;border-bottom:1px solid ${C.border}}
.J-hdr h2{font:700 1rem 'Cinzel',serif;color:${C.text};margin:0 0 .15rem;line-height:1.2}
.J-hdr p{font-size:.72rem;color:${C.muted};margin:0}
.J-pills{display:flex;flex-wrap:wrap;gap:.25rem;margin-top:.35rem}
.J-pill{padding:.12rem .45rem;border-radius:14px;font-size:.58rem;font-weight:600;background:${C.card2};border:1px solid ${C.border};color:${C.text}}
.J-hl{padding:.12rem .45rem;border-radius:14px;font-size:.55rem;font-weight:600;background:rgba(180,119,59,.08);border:1px solid rgba(180,119,59,.15);color:${C.gold}}

/* day sections */
.J-day{border-bottom:1px solid ${C.border}}
.J-day-hdr{display:flex;align-items:center;gap:.6rem;padding:.55rem 1.1rem;cursor:pointer;transition:background .1s}
.J-day-hdr:hover{background:rgba(180,119,59,.03)}
.J-day-hdr.on{background:rgba(180,119,59,.05)}
.J-day-num{width:28px;height:28px;border-radius:50%;background:${C.card2};border:1.5px solid ${C.border};display:flex;align-items:center;justify-content:center;font:700 .62rem 'Inter';color:${C.muted};flex-shrink:0;transition:all .15s}
.J-day-hdr.on .J-day-num{background:rgba(180,119,59,.15);border-color:${C.amber};color:${C.amber}}
.J-day-info{flex:1;min-width:0}
.J-day-t{font:600 .78rem 'Inter';color:${C.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.J-day-m{font-size:.6rem;color:${C.muted};display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1px}
.J-day-c{font:700 .72rem 'Inter';color:${C.gold};flex-shrink:0}
.J-day-arr{color:${C.muted};font-size:.7rem;transition:transform .2s}
.J-day-arr.open{transform:rotate(180deg)}

/* expanded day content */
.J-day-body{padding:0 1.1rem .7rem;animation:slideD .2s ease}
@keyframes slideD{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}

/* compact timeline row */
.J-act{display:grid;grid-template-columns:46px 1fr auto;gap:.4rem;padding:.35rem 0;border-bottom:1px solid ${dk ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.04)'};align-items:start}
.J-act:last-child{border-bottom:none}
.J-act-time{font:700 .62rem 'Inter';color:${C.amber};padding-top:1px}
.J-act-mid{min-width:0}
.J-act-n{font:600 .74rem 'Inter';color:${C.text};display:flex;align-items:center;gap:.3rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.J-act-n .badge{display:inline-flex;padding:0 .3rem;border-radius:3px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.15);font-size:.52rem;font-weight:700;color:${C.green};line-height:1.5}
.J-act-sub{font-size:.6rem;color:${C.muted};display:flex;gap:.4rem;flex-wrap:wrap;margin-top:1px}
.J-act-sub a{color:${C.blue};text-decoration:none;font-weight:600}
.J-act-sub a:hover{text-decoration:underline}
.J-act-r{font:700 .66rem 'Inter';color:${C.gold};text-align:right;white-space:nowrap;padding-top:1px}

/* inline info strips */
.J-strip{display:flex;gap:.35rem;margin:.35rem 0;overflow-x:auto;padding-bottom:2px}
.J-strip::-webkit-scrollbar{height:0}
.J-strip-item{padding:.22rem .55rem;border-radius:6px;background:${C.card2};border:1px solid ${C.border};font-size:.6rem;color:${C.text};white-space:nowrap;flex-shrink:0}
.J-strip-item em{font-style:normal;color:${C.gold};font-weight:700}

/* expandable sections */
.J-expander{display:flex;align-items:center;justify-content:space-between;padding:.38rem .65rem;border-radius:7px;background:${C.card};border:1px solid ${C.border};font:600 .7rem 'Inter',sans-serif;color:${C.text};cursor:pointer;margin-top:.4rem;transition:all .12s;width:100%;text-align:left}
.J-expander:hover{border-color:rgba(180,119,59,.2)}
.J-exp-body{padding:.45rem .55rem;border-radius:8px;background:${C.card2};border:1px solid ${C.border};margin-top:.3rem;animation:slideD .18s ease}

/* cost mini bars */
.J-cb{display:flex;gap:2px;height:6px;border-radius:3px;overflow:hidden;margin:.3rem 0}
.J-cbs{height:100%;transition:width .4s ease}
.J-cl{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.3rem}
.J-cli{display:flex;align-items:center;gap:.25rem;font-size:.62rem;color:${C.muted}}
.J-cli-dot{width:7px;height:7px;border-radius:2px;flex-shrink:0}
.J-cli b{color:${C.text};font-weight:700}

/* events mini */
.J-ev-row{display:flex;gap:.4rem;overflow-x:auto;padding:.3rem 0}
.J-ev-row::-webkit-scrollbar{height:0}
.J-evc{padding:.4rem .6rem;border-radius:8px;background:${C.card};border:1px solid ${C.border};flex-shrink:0;min-width:160px;transition:all .12s}
.J-evc:hover{border-color:rgba(180,119,59,.2)}
.J-evc-n{font:600 .7rem 'Inter';color:${C.text};margin-bottom:1px}
.J-evc-d{font-size:.58rem;color:${C.muted}}
.J-evc-c{font:700 .64rem 'Inter';color:${C.gold};margin-top:2px}
.J-evc-b{display:inline-block;padding:.15rem .42rem;border-radius:4px;background:rgba(180,119,59,.08);border:1px solid rgba(180,119,59,.15);font-size:.55rem;color:${C.amber};font-weight:700;cursor:pointer;margin-top:3px}

/* map container */
.J-map-wrap{position:relative;border-left:1px solid ${C.border};overflow:hidden}
.J-map-badge{position:absolute;top:.55rem;left:.55rem;z-index:1000;display:flex;gap:.28rem;flex-wrap:wrap}
.J-map-tag{padding:.2rem .55rem;border-radius:5px;background:rgba(0,0,0,.6);backdrop-filter:blur(5px);border:1px solid rgba(255,255,255,.06);font:600 .62rem 'Inter';color:#fff;display:flex;align-items:center;gap:.25rem;pointer-events:none}
.J-map-tag em{color:${C.gold};font-style:normal}
.J-map-btns{position:absolute;bottom:.55rem;left:.55rem;z-index:1000;display:flex;gap:.25rem;flex-wrap:wrap}
.J-map-btn{padding:.22rem .55rem;border-radius:5px;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,.08);font:600 .6rem 'Inter';color:#fff;cursor:pointer;text-decoration:none;transition:all .12s}
.J-map-btn:hover{background:rgba(180,119,59,.8);border-color:${C.amber}}

/* pack tags */
.J-pack{display:flex;flex-wrap:wrap;gap:.25rem}
.J-packt{padding:.15rem .45rem;border-radius:12px;background:${C.card};border:1px solid ${C.border};font-size:.6rem;color:${C.text}}

.J-emg{font-size:.62rem;color:${C.text}}
.J-emg a{color:${C.gold};font-weight:700;text-decoration:none;margin-left:.3rem}

/* scrollbar global */
::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
  `;

  /* ── step config ── */
  const STEPS = [{ n: 1, l: 'Destination' }, { n: 2, l: 'Preferences' }, { n: 3, l: 'Building' }, { n: 4, l: 'Journal' }];

  /* ── render wizard steps ── */
  const Step1 = (
    <div className="J-wiz">
      <h2>Where are you going?</h2>
      <p className="sub">Enter your destination and travel dates.</p>
      <div className="J-r3">
        <div><label className="J-lbl">Destination</label><input className="J-inp" placeholder="e.g. Hampi, Karnataka" value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} /></div>
        <div><label className="J-lbl">Travelers</label><input className="J-inp" type="number" min={1} max={50} value={form.travelers} onChange={e => setForm(f => ({ ...f, travelers: +e.target.value }))} /></div>
      </div>
      <div className="J-row">
        <div><label className="J-lbl">Start</label><input className="J-inp" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} min={new Date().toISOString().split('T')[0]} /></div>
        <div><label className="J-lbl">End</label><input className="J-inp" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} min={form.startDate || new Date().toISOString().split('T')[0]} /></div>
      </div>
      <label className="J-lbl">Budget</label>
      <div className="J-chips">{BUDGETS.map(b => <button key={b.id} className={`J-chip ${form.budget === b.id ? 'on' : ''}`} onClick={() => setForm(f => ({ ...f, budget: b.id }))}>{b.emoji} {b.label}</button>)}</div>
      <div className="J-row">
        <div><label className="J-lbl">Currency</label>
          <select className="J-sel" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
            <option value="₹">₹ INR</option><option value="$">$ USD</option><option value="€">€ EUR</option><option value="£">£ GBP</option><option value="¥">¥ JPY</option>
          </select>
        </div>
        <div />
      </div>

      {/* AI Recommendation via Knowledge Graph (DEPKG) Toggle */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'.75rem .95rem', margin:'.9rem 0 .4rem', borderRadius:'10px', background:`rgba(180,119,59,0.08)`, border:`1.5px solid ${heritageMode ? C.amber : 'rgba(180,119,59,0.2)'}`, transition:'all .2s' }}>
        <div style={{ flex: 1, paddingRight: '0.8rem' }}>
          <div style={{ fontSize:'.82rem', fontWeight:700, color:C.amber, display:'flex', alignItems:'center', gap:'.4rem' }}>
            <span>🏛️</span>
            <span>AI Knowledge Graph Recommendations (DEPKG)</span>
          </div>
          <div style={{ fontSize:'.66rem', color:C.muted, marginTop:'3px', lineHeight: 1.35 }}>
            {heritageMode ? 'Personalize journey using heritage knowledge graph & past visit history' : 'Standard offline itinerary builder (rule-based schedule)'}
          </div>
        </div>
        <button 
          type="button" 
          aria-label="Toggle AI Knowledge Graph recommendations" 
          className={`J-tog ${heritageMode ? 'on' : ''}`} 
          onClick={() => setHeritageMode(v => !v)} 
        />
      </div>

      {/* Phase 14: Baseline vs PTKG Research Mode Selector */}
      {heritageMode && (
        <ResearchModeToggle
          mode={plannerMode}
          onChange={handlePlannerModeChange}
          className="my-3"
        />
      )}

      <div className="J-nav">
        <button className="J-btn" onClick={() => navigate('/bookings')}>← Back</button>
        <button className="J-btn-g" onClick={() => setWStep(2)} disabled={!form.destination.trim()}>Next →</button>
      </div>
    </div>
  );

  const Step2 = (
    <div className="J-wiz">
      <h2>Shape your journey</h2>
      <p className="sub">Select interests, style, and pace.</p>
      <label className="J-lbl">Interests</label>
      <div className="J-chips">{INTERESTS.map(i => <button key={i.id} className={`J-chip ${form.interests.includes(i.id) ? 'on' : ''}`} onClick={() => toggleArr('interests', i.id)}>{i.emoji} {i.label}</button>)}</div>
      <div className="J-row">
        <div><label className="J-lbl">Style</label><div className="J-chips">{STYLES.map(s => <button key={s.id} className={`J-chip ${form.travelStyle === s.id ? 'on' : ''}`} onClick={() => setForm(f => ({ ...f, travelStyle: s.id }))}>{s.emoji} {s.label}</button>)}</div></div>
        <div><label className="J-lbl">Pace</label><div className="J-chips">{PACE.map(p => <button key={p.id} className={`J-chip ${form.pace === p.id ? 'on' : ''}`} onClick={() => setForm(f => ({ ...f, pace: p.id }))}>{p.emoji} {p.label}</button>)}</div></div>
      </div>
      <label className="J-lbl">Dietary</label>
      <div className="J-chips">{DIETARY.map(d => <button key={d.id} className={`J-chip ${form.dietary.includes(d.id) ? 'on' : ''}`} onClick={() => toggleArr('dietary', d.id)}>{d.emoji} {d.label}</button>)}</div>
      {[{ k: 'includeHotels', l: 'Hotels & stays' }, { k: 'includeTransport', l: 'Transport routes' }].map(o => (
        <div key={o.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.42rem 0', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: '.78rem' }}>{o.l}</span>
          <button className={`J-tog ${(form as any)[o.k] ? 'on' : ''}`} onClick={() => setForm(f => ({ ...f, [o.k]: !(f as any)[o.k] }))} />
        </div>
      ))}

      <div className="J-nav">
        <button className="J-btn" onClick={() => setWStep(1)}>← Back</button>
        <button className="J-btn-g" onClick={generate} disabled={form.interests.length === 0}>
          {heritageMode ? '🧠 Generate Heritage Itinerary' : 'Build Journal ✈️'}
        </button>
      </div>
    </div>
  );

  const Step3 = (
    <div className="J-gen">
      <div className="J-gen-l">
        <div className="J-gen-orb">{heritageMode ? '🧠' : '✈️'}</div>
        <h2>{heritageMode ? 'Personalizing Heritage Journey…' : 'Building Your Journal'}</h2>
        <p>{heritageMode ? <>Matching heritage sites to your preferences for <strong>{form.destination || 'destination'}</strong>.</> : <>Mapping <strong>{form.destination || 'destination'}</strong> day by day.</>}</p>
        <div className="J-pbar"><div className="J-pfill" style={{ width: `${genPct}%` }} /></div>
        <span style={{ fontSize: '.7rem', color: C.muted }}>{genPct}%</span>
        <div className="J-gen-msgs">
          {(heritageMode ? ['Fetching your preference profile…','Scoring heritage sites…','Building personalized context…','Calling AI with your preferences…','Verifying itinerary quality…','Assembling journal…'] : GEN_MSGS).map((msg, i) => {
            const thr = Math.round(i * 100 / GEN_MSGS.length);
            const s = genPct > thr + 16 ? 'ok' : genPct >= thr ? 'ac' : '';
            return <div key={i} className={`J-gm ${s}`}><div className="J-gmd" />{s === 'ok' ? '✓ ' : ''}{msg}</div>;
          })}
        </div>
      </div>
      <div className="J-gen-r">
        <div className="J-gen-ov">📍 {form.destination || 'Destination'}</div>
        <iframe title="Map" src={`https://www.openstreetmap.org/export/embed.html?bbox=${getCoords(form.destination)[1] - .4}%2C${getCoords(form.destination)[0] - .3}%2C${getCoords(form.destination)[1] + .4}%2C${getCoords(form.destination)[0] + .3}&layer=mapnik&marker=${getCoords(form.destination)[0]}%2C${getCoords(form.destination)[1]}`} style={{ width: '100%', height: '100%', border: 'none' }} />
      </div>
    </div>
  );

  /* ── itinerary output ── */
  const renderOutput = () => {
    if (!trip) return null;
    const cur = trip.currency;
    const d = trip.days[activeDay];
    const total = trip.totalCost;
    const cb = trip.costBreakdown;
    const cbArr = [
      { l: 'Stay', v: cb.accommodation, c: '#D99C53' }, { l: 'Food', v: cb.food, c: '#F97316' },
      { l: 'Activities', v: cb.activities, c: '#22C55E' }, { l: 'Transport', v: cb.transport, c: '#60A5FA' },
      { l: 'Misc', v: cb.misc, c: '#A855F7' },
    ];

    return (
      <div className="J-out">
        {/* LEFT: scrollable journal */}
        <div className="J-scroll">
          {/* day strip */}
          <div className="J-dstrip">
            {trip.days.map((day, i) => (
              <button key={day.day} className={`J-dpill ${i === activeDay ? 'on' : ''}`}
                onClick={() => { setActiveDay(i); setExpandedDay(i); setSelectedActivityIndex(null); }}>
                Day {day.day} · {day.date}
              </button>
            ))}
          </div>

          {/* Destination Hero Header (adapted from AI-TripPlanner-main) */}
          <div style={{ padding: '.8rem 1.1rem .3rem' }}>
            <TripResultHeroCard
              destination={trip.destination}
              duration={trip.totalDays}
              startDate={trip.startDate}
              endDate={trip.endDate}
              travelers={trip.travelers}
              totalCost={{ amount: total, currency: cur }}
              heritageTheme={trip.heritageTheme || trip.summary}
              personalizationSummary={trip.summary}
              itinerary={trip.days}
              depkgMeta={depkgMeta}
              onFocusMap={() => {
                const mapEl = document.querySelector('.J-map-wrap');
                if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </div>

          {/* DEPKG Personalization Banner */}
          {depkgMeta && (
            <div style={{ padding:'.5rem 1.1rem', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:'.6rem', background:`linear-gradient(90deg,rgba(180,119,59,0.07),rgba(180,119,59,0.02))` }}>
              <span style={{ fontSize:'1.1rem' }}>{depkgMeta.personalized ? '🧠' : '✨'}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'.72rem', fontWeight:700, color:C.amber }}>
                  {depkgMeta.personalized ? `Personalized using your ${depkgMeta.totalTripsInHistory} past heritage trips` : 'Heritage-optimized itinerary'}
                </div>
                <div style={{ fontSize:'.6rem', color:C.muted, marginTop:'1px' }}>
                  {depkgMeta.candidateSitesConsidered} sites analysed{depkgMeta.preferencesApplied > 0 ? ` · ${depkgMeta.preferencesApplied} preferences applied` : ''}{depkgMeta.verificationScore ? ` · Verified ${depkgMeta.verificationScore}` : ''}
                </div>
              </div>
              {depkgMeta.personalized && (
                <span style={{ fontSize:'.58rem', padding:'2px 7px', borderRadius:'12px', fontWeight:700, background:'rgba(180,119,59,0.12)', border:`1px solid rgba(180,119,59,0.3)`, color:C.amber, flexShrink:0 }}>DEPKG</span>
              )}
              <span style={{ fontSize:'.56rem', padding:'2px 7px', borderRadius:'12px', fontWeight:700, background: plannerMode === 'research' ? 'rgba(217,119,6,0.18)' : 'rgba(120,120,120,0.18)', border: plannerMode === 'research' ? '1px solid rgba(217,119,6,0.45)' : '1px solid rgba(150,150,150,0.35)', color: plannerMode === 'research' ? '#fbbf24' : '#9ca3af', flexShrink:0 }}>
                {plannerMode === 'research' ? '🔬 MODE B: PTKG' : '📄 MODE A: BASELINE'}
              </span>
            </div>
          )}
          {aiError && (
            <div style={{ padding:'.45rem 1.1rem', borderBottom:`1px solid ${C.border}`, fontSize:'.68rem', color:'#f97316', background:'rgba(249,115,22,0.08)', display:'flex', alignItems:'center', gap:'.5rem' }}>
              <span>ℹ️</span>
              <span>Showing offline verified itinerary ({aiError.includes('API key') || aiError.includes('Google') || aiError.includes('500') ? 'AI cloud service offline — synthesized from verified heritage registry' : aiError.slice(0, 100)})</span>
            </div>
          )}

          {/* cost mini-bar */}
          <div style={{ padding: '.5rem 1.1rem', borderBottom: `1px solid ${C.border}` }}>
            <div className="J-cb">
              {cbArr.map(c => <div key={c.l} className="J-cbs" style={{ width: `${(c.v / total) * 100}%`, background: c.c }} />)}
            </div>
            <div className="J-cl">
              {cbArr.map(c => (
                <div key={c.l} className="J-cli">
                  <div className="J-cli-dot" style={{ background: c.c }} />
                  {c.l} <b>{cur}{c.v.toLocaleString()}</b>
                </div>
              ))}
            </div>
          </div>

          {/* Phase 16: Research Explainability Panel */}
          <div style={{ padding: '.6rem 1.1rem .3rem' }}>
            <ExplainabilityPanel
              itinerary={trip.days}
              depkgMeta={depkgMeta}
              destination={trip.destination}
            />
          </div>

          {/* day accordion */}
          {trip.days.map((day, i) => (
            <div key={day.day} className="J-day">
              <div className={`J-day-hdr ${expandedDay === i ? 'on' : ''}`}
                onClick={() => { setExpandedDay(expandedDay === i ? null : i); setActiveDay(i); }}>
                <div className="J-day-num">{day.day}</div>
                <div className="J-day-info">
                  <div className="J-day-t">{day.title} — {day.date}</div>
                  <div className="J-day-m">
                    <span>🌤 {day.weather}</span>
                    <span>🏨 {day.hotel}</span>
                    <span>🚌 {day.transport}</span>
                  </div>
                </div>
                <div className="J-day-c">{cur}{day.totalCost.toLocaleString()}</div>
                <span className={`J-day-arr ${expandedDay === i ? 'open' : ''}`}>▼</span>
              </div>

              {expandedDay === i && (
                <div className="J-day-body">
                  {/* activities */}
                  {day.activities.map((a, j) => (
                    <div
                      key={j}
                      className="J-act"
                      onClick={() => setSelectedActivityIndex(j)}
                      style={{
                        cursor: 'pointer',
                        border: selectedActivityIndex === j ? `1.5px solid ${C.amber}` : undefined,
                        background: selectedActivityIndex === j ? 'rgba(217,156,83,0.08)' : undefined,
                        borderRadius: '8px',
                        transition: 'all .15s ease',
                      }}
                    >
                      <div className="J-act-time">{a.time}</div>
                      <div className="J-act-mid">
                        <div className="J-act-n">
                          <span style={{ fontSize: '.68rem', fontWeight: 800, color: C.gold, marginRight: '4px' }}>#{j + 1}</span>
                          {a.emoji} {a.name}
                          {a.isLive && <span className="badge">LIVE</span>}
                          {a.rating && <span style={{ fontSize: '.58rem', color: C.gold }}>★{a.rating}</span>}
                        </div>
                        <div className="J-act-sub">
                          <span>{a.type} · {a.duration}</span>
                          {a.note && <span>— {a.note}</span>}
                          <a href={`https://www.google.com/maps?q=${a.lat},${a.lng}`} target="_blank" rel="noopener noreferrer">Maps ↗</a>
                        </div>
                        {(a as any).preferenceMatch && (
                          <div style={{ fontSize: '.6rem', color: '#fbbf24', marginTop: '3px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span>✨</span>
                            <span>{(a as any).preferenceMatch}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                        <div className="J-act-r">{a.cost === 0 ? 'Free' : `${cur}${a.cost}`}</div>
                        <button
                          type="button"
                          title="Edit activity details, swap monuments, or adjust timing"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingActivity({
                              dayIndex: i,
                              activityIndex: j,
                              time: a.time,
                              name: a.name,
                              type: a.type,
                              duration: a.duration,
                              cost: a.cost,
                              note: a.note,
                              emoji: a.emoji,
                              lat: a.lat,
                              lng: a.lng,
                              preferenceMatch: (a as any).preferenceMatch,
                            });
                          }}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '5px',
                            fontSize: '.62rem',
                            fontWeight: 600,
                            background: 'rgba(217,156,83,0.12)',
                            border: '1px solid rgba(217,156,83,0.35)',
                            color: C.gold,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            transition: 'all .15s ease',
                          }}
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add Activity Button */}
                  <div style={{ marginTop: '.35rem', marginBottom: '.5rem', display: 'flex', justifyContent: 'flex-start' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingActivity({
                          dayIndex: i,
                          activityIndex: day.activities.length,
                          time: '16:00',
                          name: 'Custom Heritage Visit',
                          type: 'Heritage',
                          duration: '1 hr',
                          cost: 50,
                          note: 'Added monument visit',
                          emoji: '🏛️',
                          lat: day.activities[0]?.lat || 20.0,
                          lng: day.activities[0]?.lng || 78.0,
                        });
                      }}
                      style={{
                        padding: '.35rem .75rem',
                        borderRadius: '6px',
                        fontSize: '.65rem',
                        fontWeight: 600,
                        background: 'transparent',
                        border: `1px dashed ${C.border}`,
                        color: C.gold,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all .15s ease',
                      }}
                    >
                      + Add Activity to Day {day.day}
                    </button>
                  </div>

                  {/* inline strips */}
                  <div className="J-strip">
                    <div className="J-strip-item">☕ {day.meals.breakfast}</div>
                    <div className="J-strip-item">🍛 {day.meals.lunch}</div>
                    <div className="J-strip-item">🌃 {day.meals.dinner}</div>
                  </div>
                  <div className="J-strip">
                    <div className="J-strip-item">🏨 {day.hotel} — <em>{cur}{day.hotelCost}/n</em></div>
                    <div className="J-strip-item">🚌 {day.transport} — <em>{cur}{day.transportCost}</em></div>
                  </div>

                  {/* tips */}
                  <div style={{ marginTop: '.25rem' }}>
                    {day.tips.map((t, k) => <div key={k} style={{ fontSize: '.62rem', color: C.muted, padding: '.12rem 0', display: 'flex', gap: '.3rem' }}><span style={{ color: C.amber }}>→</span> {t}</div>)}
                  </div>
                  
                  {/* route companion integration */}
                  <div style={{ marginTop: '.6rem' }}>
                    <button 
                      onClick={() => {
                        const o = { lat: day.activities[0]?.lat || 20, lng: day.activities[0]?.lng || 78, label: 'Hotel' };
                        const d = { lat: day.activities[day.activities.length-1]?.lat || 20, lng: day.activities[day.activities.length-1]?.lng || 78, label: 'Dinner' };
                        window.dispatchEvent(new CustomEvent('openRouteCompanion', { detail: { o, d } }));
                      }}
                      style={{ padding: '.35rem .6rem', borderRadius: 6, background: 'rgba(180,119,59,.1)', border: `1px solid rgba(180,119,59,.3)`, color: C.gold, font: '600 .65rem Inter', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}
                    >
                      🧭 Open in Route Companion
                    </button>
                    {/* Phase 4: Post-visit feedback trigger */}
                    {day.activities.filter(a => a.type === 'heritage' || a.type === 'temple' || a.type === 'museum').slice(0, 1).map(a => (
                      <button
                        key={a.name}
                        onClick={() => setFeedbackSite({ siteId: (a as any).siteId || a.name.toLowerCase().replace(/\s+/g, '-'), siteName: a.name })}
                        style={{ marginLeft: '.4rem', padding: '.35rem .6rem', borderRadius: 6, background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.3)', color: C.green, font: '600 .65rem Inter', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}
                      >
                        ⭐ Visited? Rate it
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* collapsible sections below days */}
          <div style={{ padding: '.55rem 1.1rem .85rem' }}>
            {/* costs */}
            <button className="J-expander" onClick={() => setShowCosts(!showCosts)}>
              💰 Cost Breakdown — {cur}{total.toLocaleString()} total
              <span style={{ color: C.muted, fontSize: '.65rem' }}>{showCosts ? '▲' : '▼'}</span>
            </button>
            {showCosts && (
              <div className="J-exp-body">
                {cbArr.map(c => (
                  <div key={c.l} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.2rem 0', fontSize: '.7rem' }}>
                    <div className="J-cli-dot" style={{ background: c.c }} />
                    <span style={{ flex: 1, color: C.text }}>{c.l}</span>
                    <span style={{ fontWeight: 700, color: C.gold }}>{cur}{c.v.toLocaleString()}</span>
                    <span style={{ fontSize: '.58rem', color: C.muted, width: 32, textAlign: 'right' }}>{Math.round((c.v / total) * 100)}%</span>
                  </div>
                ))}
                <div style={{ fontSize: '.58rem', color: C.muted, marginTop: '.3rem' }}>Tip: ASI monuments free on 1st Sunday. Book stays 2–3 wks ahead for 40% off.</div>
              </div>
            )}

            {/* events */}
            <button className="J-expander" onClick={() => setShowEvents(!showEvents)}>
              🎉 Live Events · {trip.liveEvents.length} during your stay
              <span style={{ color: C.muted, fontSize: '.65rem' }}>{showEvents ? '▲' : '▼'}</span>
            </button>
            {showEvents && (
              <div className="J-exp-body" style={{ padding: '.35rem .2rem' }}>
                <div className="J-ev-row">
                  {trip.liveEvents.map((ev, i) => (
                    <div key={i} className="J-evc">
                      <div className="J-evc-n">{ev.emoji} {ev.name}</div>
                      <div className="J-evc-d">{ev.type} · {ev.venue} · {ev.date}</div>
                      <div className="J-evc-c">{ev.cost === 0 ? 'Free' : `${cur}${ev.cost}`}</div>
                      {ev.bookable && <span className="J-evc-b">Reserve</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* packing */}
            <button className="J-expander" onClick={() => setShowPack(!showPack)}>
              🎒 Packing & Emergency
              <span style={{ color: C.muted, fontSize: '.65rem' }}>{showPack ? '▲' : '▼'}</span>
            </button>
            {showPack && (
              <div className="J-exp-body">
                <div className="J-pack" style={{ marginBottom: '.4rem' }}>
                  {trip.packingList.map((p, i) => <span key={i} className="J-packt">{p}</span>)}
                </div>
                <div className="J-emg">
                  {trip.emergencyContacts.map((c, i) => <div key={i} style={{ padding: '.15rem 0' }}>{c.name}<a href={`tel:${c.number}`}>{c.number}</a></div>)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: sticky map */}
        <div className="J-map-wrap">
          <div className="J-map-badge">
            <div className="J-map-tag">📍 <em>Day {(trip.days[activeDay]?.day) || 1}</em> · {trip.days[activeDay]?.activities.length || 0} stops</div>
          </div>
          <div className="J-map-btns">
            <a className="J-map-btn" href={`https://www.google.com/maps/search/${trip.days[activeDay]?.mapQuery || ''}`} target="_blank" rel="noopener noreferrer">Google Maps</a>
            <a className="J-map-btn" href={`https://www.google.com/maps/search/restaurants+near+${encodeURIComponent(trip.destination)}`} target="_blank" rel="noopener noreferrer">Restaurants</a>
            <a className="J-map-btn" href={`https://www.google.com/maps/search/hotels+near+${encodeURIComponent(trip.destination)}`} target="_blank" rel="noopener noreferrer">Hotels</a>
            <a className="J-map-btn" href={`https://www.google.com/maps/dir/${trip.days[activeDay]?.activities.map(a => `${a.lat},${a.lng}`).join('/')}`} target="_blank" rel="noopener noreferrer">Route</a>
          </div>
          <InteractiveTripMap
            activities={trip.days[activeDay]?.activities || []}
            center={trip.mapCenter}
            selectedActivityIndex={selectedActivityIndex}
            onSelectActivity={setSelectedActivityIndex}
            className="w-full h-full min-h-[460px]"
          />
        </div>
      </div>
    );
  };

  /* ── MAIN RENDER ── */
  return (
    <div className="J">
      <style>{css}</style>

      {/* Topbar */}
      <div className="J-top">
        <div className="J-brand" onClick={() => navigate('/dashboard')}>
          <VoHLogo size={26} />
          <div><b>Voices of Heritage</b><br /><small>Trip Planner</small></div>
        </div>
        <div className="J-crumb">
          <Link to="/bookings">Activity</Link> › <em>Trip Planner</em>
        </div>
        <div className="J-acts">
          {wStep === 4 && trip && (
            <>
              <button
                className="J-btn-g"
                onClick={() => exportItineraryToPDF({
                  destination: trip.destination,
                  duration: trip.totalDays,
                  startDate: trip.startDate,
                  endDate: trip.endDate,
                  travelers: trip.travelers,
                  totalEstimatedCost: { amount: trip.totalCost, currency: trip.currency },
                  heritageTheme: trip.heritageTheme || trip.summary,
                  personalizationSummary: trip.summary,
                  itinerary: trip.days,
                  depkgMeta,
                })}
              >
                ⬇ PDF
              </button>
              {isSaved ? <span className="J-btn-ok">✓ Saved</span> : <button className="J-btn" onClick={handleSave}>💾 Save</button>}
              <button className="J-btn" onClick={() => { setWStep(1); setTrip(null); setGenPct(0); }}>+ New</button>
            </>
          )}
          <ThemeToggle />
          <button className="J-btn" onClick={() => navigate('/dashboard')}>Dashboard</button>
        </div>
      </div>

      {/* Hero (wizard only) */}
      {wStep <= 2 && (
        <div className="J-hero">
          <Particles dark={dk} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="J-hero-ey">✈️ Heritage Planner</div>
            <h1>Plan Your <em>Heritage Journey</em></h1>
            <p>Every day, every meal, every monument — mapped and costed.</p>
          </div>
        </div>
      )}

      {/* Steps bar */}
      <div className="J-sbar">
        <div className="J-steps">
          {STEPS.map(s => {
            const state = wStep > s.n ? 'ok' : wStep === s.n ? 'on' : '';
            return (
              <div key={s.n} className="J-st">
                <div className={`J-stl ${wStep > s.n ? 'ok' : ''}`} />
                <div className={`J-stc ${state}`}>{wStep > s.n ? '✓' : s.n}</div>
                <div className={`J-stk ${state}`}>{s.l}</div>
              </div>
            );
          })}
        </div>
      </div>

      {wStep === 1 && Step1}
      {wStep === 2 && Step2}
      {wStep === 3 && Step3}
      {wStep === 4 && renderOutput()}

      {/* Phase 4: Post-Visit Feedback Modal (lazy-loaded) */}
      <Suspense fallback={null}>
        {feedbackSite && (
          <PostVisitFeedbackModal
            isOpen={!!feedbackSite}
            onClose={() => setFeedbackSite(null)}
            siteName={feedbackSite.siteName}
            siteId={feedbackSite.siteId}
            userId={authUser?.id || authUser?.email || 'voh-user'}
            tripId={trip?.id}
            onSuccess={() => setFeedbackSite(null)}
          />
        )}
      </Suspense>

      {/* Edit Activity Modal (AI-TripPlanner-main inspired plan editing) */}
      {editingActivity && (
        <EditActivityModal
          activity={editingActivity}
          onSave={handleSaveActivity}
          onDelete={handleDeleteActivity}
          onClose={() => setEditingActivity(null)}
        />
      )}
    </div>
  );
}
