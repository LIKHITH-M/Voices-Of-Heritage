/**
 * ActivityTicketingPage.tsx
 * Full Activity Booking & Ticketing System
 *
 * Features:
 *  ✅ Search by place (Hampi, Belur, Ajanta, Konark, etc.)
 *  ✅ Two activity categories: Entry Tickets & Experience Activities
 *  ✅ Differential pricing: Indian 🇮🇳 vs NRI/Foreign 🌍
 *  ✅ Full booking form with all visitor details
 *  ✅ QR code generation (qrcode library) with all booking info encoded
 *  ✅ Downloadable QR ticket as PNG
 *  ✅ Booking confirmation screen
 *  ✅ Animated 3D ambient particle canvas background
 *  ✅ Availability slots, schedules, meeting points
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import VoHLogo from '@/components/VoHLogo';
import QRCode from 'qrcode';
import axios from 'axios';

/* ─── Types ──────────────────────────────────────────────────────────────── */
type Nationality = 'indian' | 'nri';
type ActivityCategory = 'entry-ticket' | 'activity';
type BookingStep = 'search' | 'list' | 'detail' | 'form' | 'qr' | 'confirmation' | 'my-bookings';

interface Activity {
  id: string;
  site: string;
  state: string;
  region: string;
  name: string;
  category: ActivityCategory;
  type: string;
  duration: string;
  difficulty?: 'Easy' | 'Moderate' | 'Challenging';
  maxParticipants: number;
  slots: number;
  pricing: { indian: number; nri: number };
  currency: string;
  description: string;
  highlights: string[];
  schedule: string;
  meetingPoint: string;
  includes: string[];
  tags: string[];
  emoji: string;
  scanPoint: string;
}

interface BookingForm {
  name: string;
  email: string;
  phone: string;
  nationality: Nationality;
  idType: string;
  idNumber: string;
  visitDate: string;
  visitTime: string;
  adults: number;
  children: number;
  seniors: number;
  specialRequirements: string;
}

interface Booking {
  id: string;
  activity: Activity;
  form: BookingForm;
  totalINR: number;
  createdAt: string;
  qrData: string;
  qrImageUrl: string;
}

/* ─── Activity Data ──────────────────────────────────────────────────────── */
const ACTIVITIES: Activity[] = [
  // ── HAMPI ──
  {
    id: 'h-entry-1', site: 'Hampi', state: 'Karnataka', region: 'South India',
    name: 'Vittala Temple Complex — Entry Ticket',
    category: 'entry-ticket', type: 'Heritage Entry',
    duration: 'Self-paced (up to 4 hrs)',
    maxParticipants: 500, slots: 342,
    pricing: { indian: 40, nri: 600 }, currency: '₹',
    description: 'Official ASI entry ticket to the Vittala Temple Complex, home of the iconic Stone Chariot and Musical Pillars. One of the finest examples of Vijayanagara architecture.',
    highlights: ['Stone Chariot (UNESCO Icon)', 'Musical Pillars', 'Ranga Mandapa', 'Ruined bazaar street'],
    schedule: 'Daily 8:30 AM – 5:30 PM', meetingPoint: 'ASI Main Gate, Vittala Temple Road',
    includes: ['Official ASI entry', 'Audio guide QR access', 'Monument map'], tags: ['UNESCO', 'Temple', 'Architecture'],
    emoji: '🏛️', scanPoint: 'ASI Gate — Vittala Temple Complex, Hampi',
  },
  {
    id: 'h-entry-2', site: 'Hampi', state: 'Karnataka', region: 'South India',
    name: 'Virupaksha Temple — Puja Participation',
    category: 'entry-ticket', type: 'Temple Entry & Ritual',
    duration: '1.5 – 2 hrs',
    maxParticipants: 200, slots: 87,
    pricing: { indian: 0, nri: 200 }, currency: '₹',
    description: 'Living temple dedicated to Lord Shiva, continuously worshipped since the 7th century. NRI/foreign visitors require a special entry pass for puja participation.',
    highlights: ['Morning Abhishekam ritual', 'Ancient lingam darshan', 'Temple elephant blessings', 'Hampi bazaar view from gopuram'],
    schedule: 'Puja 6:00 AM & 8:00 PM | Darshan 6:00 AM – 8:30 PM', meetingPoint: 'Virupaksha Temple Main Gopuram, Hampi',
    includes: ['Temple access', 'Puja participation slot', 'Prasad'],
    tags: ['Temple', 'Ritual', 'Living Heritage'], emoji: '🕉️', scanPoint: 'Virupaksha Temple Entry Arch, Hampi',
  },
  {
    id: 'h-trek-1', site: 'Hampi', state: 'Karnataka', region: 'South India',
    name: 'Hampi Heritage Trek — Matanga Hill & Ruins',
    category: 'activity', type: 'Heritage Trek',
    duration: '4 hrs', difficulty: 'Moderate',
    maxParticipants: 15, slots: 9,
    pricing: { indian: 899, nri: 2200 }, currency: '₹',
    description: 'Led by certified heritage guide through the royal enclosure, elephant stables, and up Matanga Hill for a panoramic sunrise view of the Tungabhadra river and temple spires.',
    highlights: ['Matanga Hill sunrise view', 'Elephant Stables (Royal Enclosure)', 'Underground Shiva Temple', 'Lotus Mahal'],
    schedule: 'Daily 6:00 AM & 4:00 PM', meetingPoint: 'Hampi Bazaar Bus Stand (Outside)',
    includes: ['Certified guide', 'Safety gear', 'Water bottle', 'Snack pack', 'ASI entry fees'],
    tags: ['Trek', 'Sunrise', 'Guide'], emoji: '🥾', scanPoint: 'Trek Meetup — Hampi Bazaar Bus Stand Gate',
  },
  {
    id: 'h-sunrise-1', site: 'Hampi', state: 'Karnataka', region: 'South India',
    name: 'Hampi Sunrise Ritual Viewing — Hemakuta Hill',
    category: 'activity', type: 'Sunrise Viewing',
    duration: '2 hrs', difficulty: 'Easy',
    maxParticipants: 20, slots: 14,
    pricing: { indian: 450, nri: 1500 }, currency: '₹',
    description: 'Experience the mystical sunrise from Hemakuta Hill as light floods the Virupaksha Temple spire and Tungabhadra basin. Includes guide commentary on Vijayanagara cosmology.',
    highlights: ['Golden hour temple silhouettes', 'Hemakuta group of temples', 'Cosmological orientation talk', 'Photography spots marked'],
    schedule: 'Daily 5:30 AM (departs sharp)', meetingPoint: 'Hemakuta Hill Staircase Base, Hampi',
    includes: ['Expert guide', 'Hot chai & snacks', 'Photography checklist'],
    tags: ['Sunrise', 'Photography', 'Spiritual'], emoji: '🌅', scanPoint: 'Hemakuta Hill Activity Desk, Hampi',
  },
  {
    id: 'h-photo-1', site: 'Hampi', state: 'Karnataka', region: 'South India',
    name: 'Hampi Photography Walk — Golden Hour Special',
    category: 'activity', type: 'Photography Tour',
    duration: '3 hrs', difficulty: 'Easy',
    maxParticipants: 8, slots: 5,
    pricing: { indian: 1299, nri: 3500 }, currency: '₹',
    description: 'Curated photography walk led by professional heritage photographer. Covers the most photogenic spots in optimized light, with on-site composition coaching.',
    highlights: ['Stone Chariot golden light composition', 'Boulderscape drone views', 'River reflections at dusk', 'Portfolio review session'],
    schedule: 'Tue / Thu / Sat — 5:00 PM', meetingPoint: 'Virupaksha Temple Rear Gate, Hampi',
    includes: ['Professional photographer guide', 'Filtered lens access', 'Edited highlight reel (within 48 hrs)', 'Print-ready exports'],
    tags: ['Photography', 'Professional', 'Portfolio'], emoji: '📸', scanPoint: 'Photography Activity Desk — Virupaksha Rear Gate, Hampi',
  },

  // ── BELUR ──
  {
    id: 'b-entry-1', site: 'Belur', state: 'Karnataka', region: 'South India',
    name: 'Chenakeshava Temple — Entry & Guided Tour',
    category: 'entry-ticket', type: 'Heritage Entry',
    duration: '1.5 – 2.5 hrs',
    maxParticipants: 300, slots: 218,
    pricing: { indian: 25, nri: 500 }, currency: '₹',
    description: 'Entry to the 12th-century Hoysala masterpiece with its extraordinary star-plan layout and 1000+ individual sculptural panels. Guided tour available on-site.',
    highlights: ['Madanikas (celestial damsels)', 'Stellate platform friezes', 'Navaranga hall', 'Elephant and horse friezes'],
    schedule: 'Daily 9:00 AM – 5:30 PM', meetingPoint: 'Chenakeshava Temple Main Gate, Belur',
    includes: ['ASI entry', 'Guide services', 'Brochure'], tags: ['Hoysala', 'Sculpture', 'Temple'],
    emoji: '⭐', scanPoint: 'ASI Gate — Chenakeshava Temple, Belur',
  },

  // ── MAHABALIPURAM ──
  {
    id: 'm-entry-1', site: 'Mahabalipuram', state: 'Tamil Nadu', region: 'South India',
    name: 'Shore Temple & Pancha Rathas — Combined Entry',
    category: 'entry-ticket', type: 'Heritage Entry',
    duration: 'Self-paced (up to 5 hrs)',
    maxParticipants: 600, slots: 412,
    pricing: { indian: 40, nri: 600 }, currency: '₹',
    description: 'UNESCO combined entry covering the Shore Temple (7th c.) and the five monolithic Pancha Rathas carved from single granite boulders.',
    highlights: ['Shore Temple (bay-facing)', 'Five Rathas (monolithic)', "Arjuna's Penance relief", 'Tiger Cave rock-cut'],
    schedule: 'Daily 6:00 AM – 6:00 PM', meetingPoint: 'ASI Ticket Counter, Shore Temple Road',
    includes: ['UNESCO monument entry', 'Digital guide link'], tags: ['UNESCO', 'Pallava', 'Rock-Cut'],
    emoji: '🌊', scanPoint: 'ASI Ticket Counter — Shore Temple Entrance, Mahabalipuram',
  },
  {
    id: 'm-sunrise-1', site: 'Mahabalipuram', state: 'Tamil Nadu', region: 'South India',
    name: 'Shore Temple Sunrise Meditation & Tour',
    category: 'activity', type: 'Sunrise Viewing',
    duration: '2 hrs', difficulty: 'Easy',
    maxParticipants: 12, slots: 7,
    pricing: { indian: 599, nri: 1800 }, currency: '₹',
    description: 'Pre-dawn access to the Shore Temple complex for sunrise meditation session facing the Bay of Bengal with heritage scholar commentary.',
    highlights: ['Pre-dawn exclusive access', 'Bay of Bengal sunrise', 'Meditation session', 'Shore Temple heritage talk'],
    schedule: 'Daily 5:15 AM', meetingPoint: 'Shore Temple Beach Parking, Mahabalipuram',
    includes: ['Special pre-dawn entry permit', 'Yoga mat', 'Hot breakfast post-session'],
    tags: ['Sunrise', 'Meditation', 'Exclusive'], emoji: '🧘', scanPoint: 'Shore Temple Beach Gate (Pre-Dawn Access), Mahabalipuram',
  },

  // ── AJANTA ──
  {
    id: 'a-entry-1', site: 'Ajanta', state: 'Maharashtra', region: 'West India',
    name: 'Ajanta Caves — UNESCO Entry Ticket',
    category: 'entry-ticket', type: 'Heritage Entry',
    duration: 'Self-paced (3–5 hrs)',
    maxParticipants: 400, slots: 287,
    pricing: { indian: 40, nri: 600 }, currency: '₹',
    description: 'World-renowned Buddhist cave complex with 29 caves featuring India\'s finest surviving ancient murals dating from 2nd century BCE to 6th century CE.',
    highlights: ['29 rock-cut cave temples', 'Ancient Buddhist murals (2nd c. BCE)', 'Sculpture in situ', 'Natural gorge amphitheatre'],
    schedule: 'Tue – Sun 9:00 AM – 5:00 PM (Closed Mondays)', meetingPoint: 'MTDC Ajanta Ticket Counter, Ajanta Village',
    includes: ['UNESCO monument entry', 'MSRTC shuttle to caves'], tags: ['UNESCO', 'Buddhist', 'Mural', 'Cave'],
    emoji: '🪔', scanPoint: 'MTDC Entry Gate — Ajanta Caves Bus Point',
  },

  // ── KONARK ──
  {
    id: 'k-entry-1', site: 'Konark', state: 'Odisha', region: 'East India',
    name: 'Konark Sun Temple — UNESCO Entry',
    category: 'entry-ticket', type: 'Heritage Entry',
    duration: 'Self-paced (2–3 hrs)',
    maxParticipants: 500, slots: 391,
    pricing: { indian: 40, nri: 600 }, currency: '₹',
    description: 'Entry to the 13th-century chariot-form Sun Temple — one of UNESCO\'s most iconic monuments with 24 intricately carved stone wheels and astronomical precision.',
    highlights: ['24 giant stone wheels', 'Erotic sculpture panels', 'Astronomical sun calculation', 'Jagamohana dancing hall'],
    schedule: 'Daily 6:00 AM – 8:00 PM', meetingPoint: 'ASI Main Gate, Konark Sun Temple',
    includes: ['UNESCO monument entry', 'Digital brochure'], tags: ['UNESCO', 'Sun Temple', 'Ganga'],
    emoji: '☀️', scanPoint: 'ASI Main Gate — Konark Sun Temple',
  },
  {
    id: 'k-dance-1', site: 'Konark', state: 'Odisha', region: 'East India',
    name: 'Konark Dance Festival — Performance Pass',
    category: 'activity', type: 'Cultural Performance',
    duration: '3 hrs (evening)',
    maxParticipants: 250, slots: 143,
    pricing: { indian: 300, nri: 800 }, currency: '₹',
    description: 'Annual classical dance festival held against the backdrop of the Sun Temple. Featuring Odissi, Bharatanatyam, Kuchipudi, and Manipuri dance forms.',
    highlights: ['Open-air amphitheatre', 'Odissi premiere performances', 'Temple floodlit backdrop', 'Pre-event heritage walk'],
    schedule: 'Dec 1–5 annually | 6:30 PM – 9:30 PM', meetingPoint: 'Festival Amphitheatre, Konark Sun Temple Ground',
    includes: ['Reserved seating', 'Event program booklet', 'Heritage trail pass'],
    tags: ['Festival', 'Dance', 'Culture', 'Odissi'], emoji: '💃', scanPoint: 'Festival Main Gate — Konark Dance Amphitheatre',
  },

  // ── THANJAVUR ──
  {
    id: 't-entry-1', site: 'Thanjavur', state: 'Tamil Nadu', region: 'South India',
    name: 'Brihadeeswarar Temple — UNESCO Entry',
    category: 'entry-ticket', type: 'Heritage Entry',
    duration: 'Self-paced (1.5–2.5 hrs)',
    maxParticipants: 800, slots: 634,
    pricing: { indian: 0, nri: 500 }, currency: '₹',
    description: 'The largest Chola-era temple in India — free for Indian nationals. UNESCO World Heritage Site since 1987 with the 66-metre Brihadeeswarar vimana that casts no shadow at noon.',
    highlights: ['66m vimana (shadow-less)', '10th-century Nandi monolith', 'Chola fresco paintings', 'Royal inscriptions'],
    schedule: 'Daily 6:00 AM – 12:30 PM & 4:00 PM – 8:30 PM', meetingPoint: 'ASI East Gate, Brihadeeswarar Temple',
    includes: ['Monument entry', 'Free for Indians'], tags: ['UNESCO', 'Chola', 'Free Entry'],
    emoji: '🕌', scanPoint: 'ASI East Gate — Brihadeeswarar Temple, Thanjavur',
  },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const SITES = [...new Set(ACTIVITIES.map(a => a.site))].sort();

const generateBookingId = () =>
  'VH-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

const calcTotal = (activity: Activity, form: BookingForm): number => {
  const price = form.nationality === 'indian' ? activity.pricing.indian : activity.pricing.nri;
  // Children 50% off, seniors 25% off on Indian prices; NRI full price for all
  const adultCost = price * form.adults;
  const childCost = form.nationality === 'indian' ? (price * 0.5) * form.children : price * form.children;
  const seniorCost = form.nationality === 'indian' ? (price * 0.75) * form.seniors : price * form.seniors;
  return Math.round(adultCost + childCost + seniorCost);
};

const formatCurrency = (amount: number, nationality: Nationality) =>
  nationality === 'indian'
    ? `₹${amount.toLocaleString('en-IN')}`
    : `₹${amount.toLocaleString('en-IN')} (≈ $${(amount / 84).toFixed(0)} USD)`;

/* ═══════════════════════════════════════════════════════════════════════════
   PARTICLE CANVAS (animated 3D-like background)
═══════════════════════════════════════════════════════════════════════════ */

// ─── Particle Canvas ────────────────────────────────────────────────────────
function ParticleCanvas({ theme }: { theme: 'dark' | 'light' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Particles
    const PARTICLE_COUNT = 50;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      alpha: Math.random() * 0.4 + 0.1,
      hue: theme === 'dark' ? 38 : 25, // warmer hues
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = theme === 'dark' 
          ? `hsla(${p.hue}, 90%, 65%, ${p.alpha})`
          : `hsla(${p.hue}, 60%, 45%, ${p.alpha * 0.6})`;
        ctx.fill();
      }
      // Connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = theme === 'dark'
              ? `rgba(217, 156, 83, ${0.05 * (1 - d / 120)})`
              : `rgba(161, 91, 23, ${0.08 * (1 - d / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [theme]);

  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      pointerEvents: 'none', opacity: 0.7,
    }} />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ActivityTicketingPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step,          setStep]          = useState<BookingStep>('search');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [suggestions,   setSuggestions]   = useState<string[]>([]);
  const [selectedSite,  setSelectedSite]  = useState<string>('');
  const [catFilter,     setCatFilter]     = useState<'all' | ActivityCategory>('all');
  const [selectedAct,   setSelectedAct]   = useState<Activity | null>(null);
  const [booking,       setBooking]       = useState<Booking | null>(null);
  const [generating,    setGenerating]    = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // New state for real Razorpay integration + My Bookings
  const [bookingConfirmed, setBookingConfirmed] = useState<any>(null);
  const [paymentError,     setPaymentError]     = useState('');
  const [paymentStatusNote, setPaymentStatusNote] = useState('');
  const [myBookings,       setMyBookings]       = useState<any[]>([]);
  const [myBookingsLoading, setMyBookingsLoading] = useState(false);

  const [form, setForm] = useState<BookingForm>({
    name: '', email: '', phone: '', nationality: 'indian',
    idType: 'aadhaar', idNumber: '', visitDate: '', visitTime: '',
    adults: 1, children: 0, seniors: 0, specialRequirements: '',
  });

  /* ─── AI Staff Auto-Fill from Query or Session ────────────────────────── */
  useEffect(() => {
    let aiData: any = null;
    try {
      const stored = sessionStorage.getItem('voh_ai_booking');
      if (stored) {
        aiData = JSON.parse(stored);
        sessionStorage.removeItem('voh_ai_booking');
      }
    } catch (e) {
      // Ignore parse error
    }

    const siteParam = searchParams.get('site') || aiData?.site;
    const actIdParam = searchParams.get('act') || searchParams.get('activityId') || aiData?.actId;
    const actNameParam = searchParams.get('name') || searchParams.get('activity') || aiData?.actName;
    const emailParam = searchParams.get('email') || aiData?.email;
    const nameParam = searchParams.get('userName') || searchParams.get('name') || aiData?.name;
    const phoneParam = searchParams.get('phone') || aiData?.phone;
    const dateParam = searchParams.get('date') || aiData?.date;
    const idTypeParam = searchParams.get('idType') || aiData?.idType;
    const idNumParam = searchParams.get('idNumber') || searchParams.get('aadhar') || searchParams.get('aadhaar') || aiData?.idNumber;
    const adultsParam = searchParams.get('adults') || aiData?.adults;
    const autoOpen = searchParams.get('auto') === 'true' || searchParams.get('autoOpen') === 'true' || !!aiData;

    if (siteParam || actIdParam || actNameParam || autoOpen) {
      let matchedAct: Activity | undefined;

      if (actIdParam) {
        matchedAct = ACTIVITIES.find(a => a.id.toLowerCase() === actIdParam.toLowerCase());
      }
      if (!matchedAct && actNameParam) {
        const q = actNameParam.toLowerCase();
        matchedAct = ACTIVITIES.find(a => a.name.toLowerCase().includes(q) || q.includes(a.name.toLowerCase()));
      }
      if (!matchedAct && siteParam) {
        const s = siteParam.toLowerCase();
        matchedAct = ACTIVITIES.find(a => a.site.toLowerCase().includes(s) && (a.id === 'h-entry-1' || a.category === 'entry-ticket' || a.name.toLowerCase().includes('entry') || a.name.toLowerCase().includes('vittala')));
        if (!matchedAct) {
          matchedAct = ACTIVITIES.find(a => a.site.toLowerCase().includes(s));
        }
      }

      const activeSite = siteParam || matchedAct?.site || 'Hampi';
      setSelectedSite(activeSite);
      setSearchQuery(activeSite);

      if (matchedAct) {
        setSelectedAct(matchedAct);
      }

      setForm(prev => ({
        ...prev,
        ...(nameParam ? { name: nameParam } : {}),
        ...(emailParam ? { email: emailParam } : {}),
        ...(phoneParam ? { phone: phoneParam } : {}),
        ...(dateParam ? { visitDate: dateParam } : {}),
        ...(idTypeParam ? { idType: idTypeParam } : {}),
        ...(idNumParam ? { idNumber: idNumParam } : {}),
        ...(adultsParam ? { adults: Math.max(1, Number(adultsParam) || 1) } : {})
      }));

      if (autoOpen || matchedAct) {
        setStep('form');
      } else {
        setStep('list');
      }
    }
  }, [searchParams]);

  const C = {
    bg:      'var(--voh-bg)',
    surface: 'var(--voh-surface, #111118)',
    card:    'var(--voh-card, #18181f)',
    border:  'var(--voh-border, rgba(255,255,255,0.07))',
    amber:   'var(--voh-amber, #f59e0b)',
    gold:    'var(--voh-gold, #d97706)',
    text:    'var(--voh-text, #e2e8f0)',
    muted:   'var(--voh-muted, #94a3b8)',
    green:   'var(--voh-green, #22c55e)',
    red:     'var(--voh-red, #ef4444)',
    blue:    'var(--voh-blue, #3b82f6)',
    purple:  'var(--voh-purple, #8b5cf6)',
  };

  /* Search autocomplete */
  const handleSearch = (val: string) => {
    setSearchQuery(val);
    if (val.length >= 1) {
      setSuggestions(SITES.filter(s => s.toLowerCase().includes(val.toLowerCase())));
    } else {
      setSuggestions([]);
    }
  };

  const selectSite = (site: string) => {
    setSelectedSite(site);
    setSearchQuery(site);
    setSuggestions([]);
    setCatFilter('all');
    setStep('list');
  };

  const siteActivities = ACTIVITIES.filter(a =>
    a.site === selectedSite &&
    (catFilter === 'all' || a.category === catFilter)
  );

  const loadRazorpay = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) { resolve(true); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  /* ── Helper to build QR screen from confirmed backend booking ── */
  const openConfirmedTicket = useCallback(async (confirmedBooking: any, act: Activity, f: BookingForm, totalINR: number) => {
    setBookingConfirmed(confirmedBooking);
    const ticketId = confirmedBooking.bookingId || confirmedBooking.ticketId;
    const qrPayload = confirmedBooking.qrData || JSON.stringify({ bookingId: ticketId, ticketId });
    const qrImageUrl = await QRCode.toDataURL(qrPayload, {
      width: 280, margin: 2,
      color: { dark: '#050505', light: '#fffbe6' },
      errorCorrectionLevel: 'H',
    });
    setBooking({
      id: ticketId,
      activity: act,
      form: f,
      totalINR,
      createdAt: confirmedBooking.createdAt || new Date().toISOString(),
      qrData: qrPayload,
      qrImageUrl,
    });
    setStep('qr');
  }, []);

  /* ── Razorpay Payment Handler ── */
  const handlePayment = useCallback(async () => {
    if (!selectedAct) return;
    setGenerating(true);
    setPaymentError('');
    setPaymentStatusNote('');

    const total = calcTotal(selectedAct, form);
    const userId = localStorage.getItem('voh_user_id') || 'guest';

    try {
      // 1. Create pending booking & Razorpay order in persistent backend database
      const { data } = await axios.post('/api/bookings/create-order', {
        userId,
        monumentId: selectedAct.id,
        monumentName: selectedAct.name,
        site: selectedAct.site,
        state: selectedAct.state,
        category: selectedAct.category,
        meetingPoint: selectedAct.meetingPoint,
        scanPoint: selectedAct.scanPoint,
        visitorName: form.name,
        email: form.email,
        phone: form.phone,
        nationality: form.nationality,
        idType: form.idType,
        idNumber: form.idNumber,
        adults: form.adults,
        children: form.children,
        seniors: form.seniors,
        specialRequirements: form.specialRequirements,
        visitDate: form.visitDate,
        timeSlot: form.visitTime || selectedAct.schedule,
        ticketType: form.nationality === 'indian' ? 'indian' : 'nri',
        numTickets: form.adults + form.children + form.seniors,
        totalAmount: total,
      });

      const createdBookingId = data.bookingId;

      // 2. If total is 0 (free monument entry), verify & issue ticket directly
      if (total === 0) {
        const verify = await axios.post('/api/bookings/verify-payment', {
          bookingId: createdBookingId,
          razorpay_order_id: data.orderId || 'order_free',
          razorpay_payment_id: `FREE_${createdBookingId}`,
          razorpay_signature: 'free_entry',
        });
        await openConfirmedTicket(verify.data.booking, selectedAct, form, 0);
        setGenerating(false);
        return;
      }

      // 3. Load Razorpay Checkout SDK
      const loaded = await loadRazorpay();
      if (!loaded) {
        await axios.patch(`/api/bookings/${createdBookingId}/status`, {
          paymentStatus: 'failed',
          failureReason: 'Razorpay SDK failed to load (network blocked or offline).',
          paymentErrorCode: 'SDK_LOAD_ERROR',
        }).catch(() => {});
        throw new Error('Failed to load Razorpay SDK. Check your internet connection and retry.');
      }

      // 4. Open Razorpay test checkout using test key rzp_test_ToUXkFkXqdjYh8
      let paymentHandled = false;
      const options: Record<string, any> = {
        key: data.keyId || 'rzp_test_ToUXkFkXqdjYh8',
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'Voices of Heritage',
        description: `ASI Ticket: ${selectedAct.name}`,
        notes: {
          bookingId: createdBookingId,
          monument: selectedAct.name,
          visitDate: form.visitDate,
        },
        handler: async (response: any) => {
          paymentHandled = true;
          try {
            const verify = await axios.post('/api/bookings/verify-payment', {
              bookingId: createdBookingId,
              razorpay_order_id: response.razorpay_order_id || data.orderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature || '',
            });
            await openConfirmedTicket(verify.data.booking, selectedAct, form, total);
          } catch (err: any) {
            setPaymentError(err?.response?.data?.error || 'Payment completed, but verification failed. Reference ID: ' + createdBookingId);
          } finally {
            setGenerating(false);
          }
        },
        prefill: {
          name: form.name || 'Heritage Traveller',
          email: form.email,
          contact: form.phone,
        },
        theme: { color: '#d97706' },
        modal: {
          ondismiss: async () => {
            if (!paymentHandled) {
              await axios.patch(`/api/bookings/${createdBookingId}/status`, {
                paymentStatus: 'cancelled',
                failureReason: 'Payment cancelled by visitor in Razorpay checkout.',
                paymentErrorCode: 'USER_CANCELLED',
              }).catch(() => {});
              setPaymentStatusNote(`Payment cancelled (Booking ${createdBookingId} marked as Cancelled). You can retry anytime.`);
              setGenerating(false);
            }
          },
        },
      };

      // Only pass server-created Razorpay order_id when it's a real Razorpay order (not test-key-only mock ID)
      if (!data.isMock && data.orderId) {
        options.order_id = data.orderId;
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', async (resp: any) => {
        paymentHandled = true;
        const desc = resp?.error?.description || 'Payment failed in Razorpay checkout.';
        const code = resp?.error?.code || 'PAYMENT_FAILED';
        await axios.patch(`/api/bookings/${createdBookingId}/status`, {
          paymentStatus: 'failed',
          failureReason: desc,
          paymentErrorCode: code,
          razorpayPaymentId: resp?.error?.metadata?.payment_id || '',
        }).catch(() => {});
        setPaymentError(`Payment Failed: ${desc} (Ref: ${createdBookingId}). Please retry.`);
        setGenerating(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error('Payment error:', err);
      setPaymentError(err?.response?.data?.error || err.message || 'Failed to initiate payment. Ensure backend is running.');
      setGenerating(false);
    }
  }, [selectedAct, form, openConfirmedTicket]);

  /* ── Fetch My Bookings ── */
  const fetchMyBookings = useCallback(async () => {
    const userId = localStorage.getItem('voh_user_id') || 'guest';
    setMyBookingsLoading(true);
    try {
      const { data } = await axios.get(`/api/bookings/user/${userId}`);
      setMyBookings(Array.isArray(data) ? data : data.bookings || []);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    }
    setMyBookingsLoading(false);
  }, []);

  const downloadQR = () => {
    if (!booking) return;
    const link = document.createElement('a');
    link.download = `VoH-Ticket-${booking.id}.png`;
    link.href = booking.qrImageUrl;
    link.click();
  };

  const formValid = form.name && form.email && form.visitDate && form.adults >= 1 && form.idNumber;

  /* ─────────────────────────────────────────────────────────────────
     CSS
  ───────────────────────────────────────────────────────────────── */
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

    @keyframes at-fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
    @keyframes at-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    @keyframes at-spin    { to{transform:rotate(360deg)} }

    * { box-sizing:border-box; }

    .at-page {
      min-height:100vh; background: ${theme === 'dark' ? 'radial-gradient(circle at 50% -20%, #151515, #050505)' : 'radial-gradient(circle at 80% 20%, rgba(247,243,233,0.4) 0%, rgba(253,251,247,0.8) 100%), ' + C.bg}; 
      color:${C.text};
      font-family:'Plus Jakarta Sans',system-ui,sans-serif; position:relative; overflow-x:hidden;
      display:flex; flex-direction:column;
    }

    /* Topbar logo and name styling */
    .at-topbar {
      height:60px; background:${C.surface}; border-bottom:1px solid ${C.border};
      display:flex; align-items:center; justify-content:space-between; padding:0 2rem;
      position:sticky; top:0; z-index:100; flex-shrink:0;
      box-shadow: 0 4px 24px rgba(0,0,0,${theme === 'dark' ? '0.3' : '0.02'});
    }
    .at-topbar-brand { display:flex;align-items:center;gap:.7rem;cursor:pointer; }
    .at-topbar-title { font-family:'Cinzel',serif; font-weight:700;font-size:1rem;color:${C.text};letter-spacing: 0.05em; text-transform:uppercase; }
    .at-topbar-sub   { font-size:.65rem;color:${C.muted}; margin-top:2px; font-weight: 500; }
    
    .at-icon-btn {
      width:38px; height:38px; border-radius:50%; background:${C.surface}; border:1px solid ${C.border};
      display:flex; align-items:center; justify-content:center; cursor:pointer; color:${C.text};
      font-size: 1rem; transition: all 0.2s;
    }
    .at-icon-btn:hover { border-color:${C.gold}; color:${C.gold}; }

    .at-back-btn { 
      padding:.5rem 1.2rem; border-radius:8px; border:1px solid rgba(217, 156, 83, 0.4);
      background:none; color:${C.gold}; font-weight:600; font-size:.8rem; cursor:pointer; transition:all .2s ease;
    }
    .at-back-btn:hover { background:rgba(217, 156, 83, 0.1); border-color:${C.gold}; }

    /* Hero section */
    .at-hero {
      position:relative; overflow:hidden;
      padding:4rem 2rem 3.5rem; text-align:center; flex-shrink:0;
      background:linear-gradient(180deg, rgba(217,156,83,.05) 0%, transparent 100%);
      border-bottom: 1px solid ${C.border};
    }
    .at-hero-tag { display:inline-flex;align-items:center;gap:.4rem;font-size:.65rem;font-weight:700;color:${C.gold};background:rgba(217,156,83,.1);border:1px solid rgba(217,156,83,.2);border-radius:20px;padding:4px 12px;margin-bottom:.9rem;text-transform:uppercase;letter-spacing:.08em; }
    .at-hero-title { font-family:'Cinzel',serif; font-size:2.2rem;font-weight:700;margin:0 0 .6rem;line-height:1.2; color:${C.text}; letter-spacing: 0.02em; }
    .at-hero-sub { color:${C.muted};font-size:.9rem;max-width:560px;margin:0 auto 1.8rem;line-height:1.6; }

    /* Search components */
    .at-search-wrap { position:relative;max-width:540px;margin:0 auto;animation:at-fadeUp .4s ease; z-index: 10; }
    .at-search-input {
      width:100%;padding:.85rem 1.2rem .85rem 3.2rem;border-radius:14px;font-size:.95rem;
      background:${C.surface};border:1.5px solid ${C.border};color:${C.text};
      outline:none;font-family:inherit;transition:border-color .2s,box-shadow .2s;
    }
    .at-search-input:focus { border-color:${C.gold};box-shadow:0 0 0 4px rgba(217,156,83,.1); }
    .at-search-icon { position:absolute;left:1.2rem;top:50%;transform:translateY(-50%);font-size:1.1rem;pointer-events:none; }
    .at-suggestions {
      position:absolute;top:calc(100% + 6px);left:0;right:0;
      background:${C.surface};border:1px solid ${C.border};border-radius:12px;
      overflow:hidden;z-index:50;box-shadow:0 12px 40px rgba(0,0,0,.3);
    }
    .at-suggestion-item { padding:.75rem 1.25rem;cursor:pointer;font-size:.85rem;display:flex;align-items:center;gap:.6rem;color:${C.text};transition:background .12s; }
    .at-suggestion-item:hover { background:rgba(217,156,83,.08); }

    .at-sites-row { display:flex;flex-wrap:wrap;justify-content:center;gap:.5rem;margin-top:1.25rem; }
    .at-site-pill { padding:.35rem .9rem;border-radius:8px;border:1px solid ${C.border};background:${C.surface};color:${C.muted};font-size:.78rem;font-weight:600;cursor:pointer;transition:all .15s; }
    .at-site-pill:hover { border-color:${C.gold};color:${C.gold};background:rgba(217,156,83,.06); }

    /* Results */
    .at-content { max-width:980px;width:100%;margin:0 auto;padding:2rem;animation:at-fadeUp .35s ease; }
    .at-filter-strip { display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:.5rem; }
    .at-chips { display:flex;gap:.5rem; }
    .at-chip { padding:.35rem 1rem;border-radius:20px;font-size:.75rem;font-weight:600;cursor:pointer;border:1px solid ${C.border};background:${C.surface};color:${C.muted};transition:all .15s; }
    .at-chip:hover { border-color:${C.gold};color:${C.gold}; }
    .at-chip.active { background:rgba(217,156,83,.1);border-color:${C.gold};color:${C.gold}; }
    .at-result-count { font-size:.78rem;color:${C.muted}; }

    /* Activity Card */
    .at-card {
      border-radius:16px;border:1px solid ${C.border};background:${C.surface};
      transition:all .25s cubic-bezier(0.25, 0.8, 0.25, 1);cursor:pointer;overflow:hidden;
      display:flex;flex-direction:column;
      box-shadow:0 4px 12px rgba(0,0,0,0.02);
    }
    .at-card:hover { border-color:${C.gold};transform:translateY(-3px);box-shadow:0 12px 30px rgba(0,0,0,${theme==='dark'?'0.4':'0.06'}); }
    .at-card-header { padding:1.4rem; }
    .at-card-type { font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px; }
    .at-card-name { font-family:'Cinzel',serif; font-size:.95rem;font-weight:700;color:${C.text};margin:0 0 4px;line-height:1.3; }
    .at-card-site { font-size:.75rem;color:${C.muted}; }
    .at-card-desc { font-size:.78rem;color:${theme==='dark'?'#999':'#666'};margin:.6rem 0;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden; }
    .at-card-footer { margin-top:auto;padding:1.0rem 1.4rem;border-top:1px solid ${C.border};display:flex;align-items:center;justify-content:space-between;gap:.5rem; }
    .at-price-indian { font-size:.85rem;color:${C.gold};font-weight:700; }
    .at-price-nri    { font-size:.7rem;color:${C.muted}; margin-top:2px; }
    .at-slots-pill { font-size:.65rem;font-weight:700;padding:3px 8px;border-radius:4px; }
    .at-book-btn { padding:.5rem 1rem;border-radius:8px;background:linear-gradient(135deg,${C.amber},${C.gold});color:#fff;font-weight:700;font-size:.78rem;border:none;cursor:pointer;flex-shrink:0;transition:opacity .15s; }
    .at-book-btn:hover { opacity:.9; }
    .at-tag { display:inline-flex;font-size:.65rem;font-weight:600;padding:2px 8px;border-radius:4px;background:${theme==='dark'?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.04)'};color:${C.muted};margin:2px;border: 1px solid ${C.border}; }

    /* Modal dialog */
    .at-overlay { position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1.5rem; }
    .at-modal { width:100%;max-width:680px;background:${C.surface};border-radius:16px;border:1px solid ${C.border};overflow:hidden;max-height:92vh;display:flex;flex-direction:column;box-shadow: 0 20px 50px rgba(0,0,0,0.4); }
    .at-modal-head { padding:1.2rem 1.5rem;border-bottom:1px solid ${C.border};display:flex;justify-content:space-between;align-items:flex-start;flex-shrink:0; }
    .at-modal-body { flex:1;overflow-y:auto;padding:1.5rem; }
    .at-modal-body::-webkit-scrollbar { width:5px; }
    .at-modal-body::-webkit-scrollbar-thumb { background:rgba(217,156,83,0.25);border-radius:3px; }
    .at-modal-foot { padding:1rem 1.5rem;border-top:1px solid ${C.border};display:flex;gap:.75rem;justify-content:flex-end;flex-shrink:0; }

    /* Form items */
    .at-form-grid { display:grid;grid-template-columns:1fr 1fr;gap:1rem; }
    .at-form-grid-3 { display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem; }
    .at-label { font-size:.75rem;font-weight:600;color:${C.muted};margin-bottom:6px;display:block; }
    .at-input {
      width:100%;padding:.65rem .9rem;border-radius:8px;background:${C.bg};
      border:1px solid ${C.border};color:${C.text};font-size:.85rem;outline:none;font-family:inherit;
      transition:border-color .15s;
    }
    .at-input:focus { border-color:${C.gold};box-shadow:0 0 0 3px rgba(217,156,83,.06); }
    .at-input::placeholder { color:${C.muted}; opacity: 0.6; }
    .at-select { appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23${theme==='dark'?'94a3b8':'786a5e'}'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .8rem center;padding-right:2rem; }

    .at-nat-toggle { display:flex;gap:.5rem;margin-bottom:1rem; }
    .at-nat-btn { flex:1;padding:.65rem;border-radius:8px;border:1.5px solid ${C.border};background:none;color:${C.muted};font-size:.8rem;font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:.4rem; }
    .at-nat-btn.active { border-color:${C.gold};background:rgba(217,156,83,.1);color:${C.gold}; }
    .at-nat-btn:hover:not(.active) { border-color:rgba(217,156,83,.25);color:${C.text}; }

    .at-price-box { border-radius:12px;padding:1.2rem;background:${theme==='dark'?'rgba(255,255,255,0.01)':'rgba(0,0,0,0.02)'};border:1px solid ${C.border};margin-top:.85rem; }
    .at-price-row { display:flex;justify-content:space-between;align-items:center;font-size:.8rem;color:${C.muted};margin-bottom:6px; }
    .at-price-total { display:flex;justify-content:space-between;align-items:center;font-size:1.05rem;color:${C.gold};font-weight:800;border-top:1px solid ${C.border};margin-top:.6rem;padding-top:.6rem; }
    .at-nri-note { font-size:.7rem;color:${C.gold};font-weight:600;margin-top:6px; }
    .at-free-note { font-size:.85rem;color:${C.green};font-weight:700; }

    /* QR output styling */
    .at-qr-screen { max-width:520px;margin:2rem auto;text-align:center;animation:at-fadeUp .4s ease; }
    .at-qr-card { border-radius:16px;border:1px solid ${C.border};background:${C.surface};padding:2rem;position:relative;overflow:hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.15); }
    .at-qr-img { border-radius:12px;box-shadow:0 8px 32px rgba(217,156,83,.1); }
    .at-qr-details { text-align:left;margin-top:1.25rem;background:${C.bg};border-radius:12px;border:1px solid ${C.border};overflow:hidden; }
    .at-qr-detail-row { display:flex;justify-content:space-between;padding:.7rem 1.1rem;font-size:.8rem;border-bottom:1px solid ${C.border}; }
    .at-qr-detail-row:last-child { border-bottom:none; }
    .at-qr-key { color:${C.muted}; }
    .at-qr-val { color:${C.text};font-weight:600;text-align:right;max-width:55%; }
    .at-qr-actions { display:flex;gap:.75rem;margin-top:1.25rem; }
    .at-dl-btn { flex:1;padding:.7rem;border-radius:8px;background:linear-gradient(135deg,${C.amber},${C.gold});color:#fff;font-weight:800;font-size:.85rem;border:none;cursor:pointer;transition:opacity .15s;display:flex;align-items:center;justify-content:center;gap:.5rem; }
    .at-dl-btn:hover { opacity:.9; }
    
    .at-scan-info { margin-top:1.2rem;padding:1rem;border-radius:12px;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.15);text-align:left; }
    .at-scan-info-title { font-size:.8rem;font-weight:700;color:${C.green};margin-bottom:4px; }
    .at-scan-info-text  { font-size:.75rem;color:${C.muted};line-height:1.45; }

    .at-btn-primary { padding:.65rem 1.6rem;border-radius:8px;background:linear-gradient(135deg,${C.amber},${C.gold});color:#fff;font-weight:800;font-size:.85rem;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:.45rem;transition:opacity .15s; }
    .at-btn-primary:hover:not(:disabled) { opacity:.9; }
    .at-btn-primary:disabled { opacity:.4;cursor:not-allowed; }
    
    .at-btn-ghost { padding:.65rem 1.4rem;border-radius:8px;border:1px solid ${C.border};background:none;color:${C.muted};font-size:.85rem;font-weight:600;cursor:pointer;transition:all .15s; }
    .at-btn-ghost:hover { border-color:${C.gold};color:${C.gold}; }
    .at-close-btn { width:32px;height:32px;border-radius:8px;background:${C.bg};border:1px solid ${C.border};color:${C.text};cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;flex-shrink:0; transition: all .15s; }
    .at-close-btn:hover { border-color:${C.gold};color:${C.gold}; }

    .at-section-label { font-family:'Cinzel',serif; font-size:.75rem;font-weight:700;color:${C.gold};text-transform:uppercase;letter-spacing:.08em;margin:1.2rem 0 .5rem; }
    .at-divider { border:none;border-top:1px solid ${C.border};margin:.75rem 0; }

    .at-highlight { background:rgba(217,156,83,.06);border:1px solid rgba(217,156,83,.15);border-radius:10px;padding:1rem;font-size:.8rem;color:${C.muted};line-height:1.55; }
    .at-highlight-list { margin:.4rem 0 0;padding-left:1.2rem;list-style:disc; }
    .at-highlight-list li { margin-bottom:3px; }
    .at-includes-list { list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:5px; }
    .at-includes-list li::before { content:'✓ ';font-weight:bold;color:${C.gold};margin-right:4px; }
    .at-includes-list li { font-size:.78rem;color:${C.muted}; }

    @media (max-width:640px) {
      .at-hero-title { font-size:1.5rem; }
      .at-form-grid, .at-form-grid-3 { grid-template-columns:1fr; }
      .at-modal { max-width:100%; margin:0; border-radius:16px 16px 0 0; max-height:98vh; position:fixed;bottom:0; }
      .at-overlay { align-items:flex-end;padding:0; }
      .at-topbar { padding:0 1rem; flex-wrap: wrap; height: auto; padding-top: 10px; padding-bottom: 10px; }
      .at-topbar > div:last-child { display: none !important; } /* Hide the right side buttons on mobile, MobileNav handles navigation */
    }
  `;

  /* ─── Booking Form Modal ─────────────────────────────────────────────── */
  const renderBookingModal = () => {
    if (!selectedAct) return null;
    const total = calcTotal(selectedAct, form);
    const price = form.nationality === 'indian' ? selectedAct.pricing.indian : selectedAct.pricing.nri;

    return (
      <div className="at-overlay" onClick={() => setStep('list')}>
        <div className="at-modal" onClick={e => e.stopPropagation()}>
          <div className="at-modal-head">
            <div>
              <div style={{ fontSize: '.65rem', fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {selectedAct.category === 'entry-ticket' ? '🎟️ Entry Ticket' : '🎒 Activity Booking'}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: C.text, maxWidth: '420px', lineHeight: 1.3, marginTop: '2px' }}>{selectedAct.name}</div>
              <div style={{ fontSize: '.75rem', color: C.muted, marginTop: '2px' }}>📍 {selectedAct.site}, {selectedAct.state} · {selectedAct.duration}</div>
            </div>
            <button className="at-close-btn" onClick={() => setStep('list')}>✕</button>
          </div>

          <div className="at-modal-body">
            {/* Nationality selector */}
            <div style={{ marginBottom: '1.1rem' }}>
              <label className="at-label">Visitor Nationality *</label>
              <div className="at-nat-toggle">
                <button className={`at-nat-btn ${form.nationality === 'indian' ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, nationality: 'indian', idType: 'aadhaar' })}>
                  🇮🇳 Indian Citizen
                </button>
                <button className={`at-nat-btn ${form.nationality === 'nri' ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, nationality: 'nri', idType: 'passport' })}>
                  🌍 NRI / Foreign National
                </button>
              </div>
              {form.nationality === 'nri' && (
                <div style={{ fontSize: '.72rem', color: C.gold, background: 'rgba(217,156,83,.05)', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                  🌍 NRI / Foreign pricing applies — Governed by ASI Monument Regulations
                </div>
              )}
            </div>

            {/* Personal details */}
            <div className="at-section-label">Visitor Details</div>
            <div className="at-form-grid" style={{ marginBottom: '.85rem' }}>
              <div>
                <label className="at-label">Full Name *</label>
                <input className="at-input" type="text" placeholder="As on ID document" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="at-label">Email Address *</label>
                <input className="at-input" type="email" placeholder="Ticket will be sent here" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="at-label">Phone Number</label>
                <input className="at-input" type="tel" placeholder="+91 XXXXX XXXXX" value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="at-label">
                  {form.nationality === 'indian' ? 'ID Type *' : 'Document Type *'}
                </label>
                <select className="at-input at-select" value={form.idType}
                  onChange={e => setForm({ ...form, idType: e.target.value })}>
                  {form.nationality === 'indian'
                    ? (<><option value="aadhaar">Aadhaar Card</option><option value="pan">PAN Card</option><option value="voter">Voter ID</option><option value="passport">Passport</option><option value="driving">Driving License</option></>)
                    : (<><option value="passport">Passport</option><option value="oci">OCI Card</option><option value="visa">Visa + Passport</option></>)
                  }
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="at-label">Document Number *</label>
                <input className="at-input" type="text"
                  placeholder={form.nationality === 'indian' ? 'Last 4 digits accepted for entry' : 'Passport number'}
                  value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })} />
              </div>
            </div>

            {/* Visit details */}
            <div className="at-section-label">Visit Schedule</div>
            <div className="at-form-grid" style={{ marginBottom: '.85rem' }}>
              <div>
                <label className="at-label">Visit Date *</label>
                <input className="at-input" type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={form.visitDate} onChange={e => setForm({ ...form, visitDate: e.target.value })} />
              </div>
              <div>
                <label className="at-label">Preferred Time</label>
                <select className="at-input at-select" value={form.visitTime}
                  onChange={e => setForm({ ...form, visitTime: e.target.value })}>
                  <option value="">Site default schedule</option>
                  <option value="06:00 AM">6:00 AM (Sunrise slot)</option>
                  <option value="08:30 AM">8:30 AM (Morning)</option>
                  <option value="10:00 AM">10:00 AM (Mid-morning)</option>
                  <option value="12:00 PM">12:00 PM (Midday)</option>
                  <option value="03:00 PM">3:00 PM (Afternoon)</option>
                  <option value="05:00 PM">5:00 PM (Golden hour)</option>
                </select>
              </div>
            </div>

            {/* Visitor count */}
            <div className="at-section-label">Number of Visitors</div>
            <div className="at-form-grid-3" style={{ marginBottom: '.85rem' }}>
              {(['adults', 'children', 'seniors'] as const).map(type => (
                <div key={type}>
                  <label className="at-label">
                    {type === 'adults' ? '👤 Adults' : type === 'children' ? '👶 Children (under 15)' : '👴 Seniors (60+)'}
                    {type === 'adults' ? ' *' : ''}
                    {type !== 'adults' && form.nationality === 'indian' && (
                      <span style={{ color: C.green, fontSize: '.6rem', marginLeft: '4px' }}>
                        {type === 'children' ? '50% off' : '25% off'}
                      </span>
                    )}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <button style={{ width: 34, height: 34, border: `1px solid ${C.border}`, borderRadius: '8px', background: C.bg, color: C.text, fontSize: '1.1rem', cursor: 'pointer' }}
                      onClick={() => setForm({ ...form, [type]: Math.max(type === 'adults' ? 1 : 0, form[type] - 1) })}>−</button>
                    <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: '.9rem' }}>{form[type]}</span>
                    <button style={{ width: 34, height: 34, border: `1px solid ${C.border}`, borderRadius: '8px', background: C.bg, color: C.text, fontSize: '1.1rem', cursor: 'pointer' }}
                      onClick={() => setForm({ ...form, [type]: form[type] + 1 })}>+</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Special requirements */}
            <div>
              <label className="at-label">Special Requirements / Accessibility Needs</label>
              <textarea className="at-input" rows={2} placeholder="Wheelchair access, dietary needs, etc." style={{ resize: 'none' }}
                value={form.specialRequirements} onChange={e => setForm({ ...form, specialRequirements: e.target.value })} />
            </div>

            {/* Price summary */}
            <div className="at-price-box" style={{ marginTop: '.85rem' }}>
              <div style={{ fontWeight: 700, fontSize: '.82rem', color: C.gold, marginBottom: '.5rem' }}>💰 Price Breakdown</div>
              <div className="at-price-row">
                <span>{form.adults} Adult{form.adults > 1 ? 's' : ''}</span>
                <span>{price === 0 ? 'Free' : `₹${price} × ${form.adults} = ₹${price * form.adults}`}</span>
              </div>
              {form.children > 0 && (
                <div className="at-price-row">
                  <span>{form.children} Child{form.children > 1 ? 'ren' : ''}</span>
                  <span>{price === 0 ? 'Free' : `₹${Math.round(price * (form.nationality === 'indian' ? 0.5 : 1))} × ${form.children} = ₹${Math.round(price * (form.nationality === 'indian' ? 0.5 : 1)) * form.children}`}</span>
                </div>
              )}
              {form.seniors > 0 && (
                <div className="at-price-row">
                  <span>{form.seniors} Senior{form.seniors > 1 ? 's' : ''}</span>
                  <span>{price === 0 ? 'Free' : `₹${Math.round(price * (form.nationality === 'indian' ? 0.75 : 1))} × ${form.seniors} = ₹${Math.round(price * (form.nationality === 'indian' ? 0.75 : 1)) * form.seniors}`}</span>
                </div>
              )}
              <div className="at-price-total">
                <span>Total Amount</span>
                <span>{total === 0 ? <span className="at-free-note">FREE ENTRY 🎉</span> : formatCurrency(total, form.nationality)}</span>
              </div>
              {form.nationality === 'nri' && (
                <div className="at-nri-note">🌍 NRI pricing as per ASI Monument Regulations. Payment is accepted in INR at the gate or via UPI/card online.</div>
              )}
            </div>

            {/* Meeting point */}
            <div className="at-highlight" style={{ marginTop: '.85rem' }}>
              <strong>📍 Meeting Point:</strong> {selectedAct.meetingPoint}<br />
              <strong>⏰ Schedule:</strong> {selectedAct.schedule}
            </div>

            {/* Includes */}
            <div className="at-section-label" style={{ marginTop: '.85rem' }}>Included in Ticket</div>
            <ul className="at-includes-list">
              {selectedAct.includes.map((item, i) => <li key={i}>{item}</li>)}
            </ul>

            {paymentError && (
              <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', fontSize: '.82rem', fontWeight: 600 }}>
                ⚠️ {paymentError}
              </div>
            )}
            {paymentStatusNote && (
              <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', borderRadius: '10px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', color: C.amber, fontSize: '.82rem', fontWeight: 600 }}>
                ℹ️ {paymentStatusNote}
              </div>
            )}
          </div>

          <div className="at-modal-foot">
            <button className="at-btn-ghost" onClick={() => setStep('list')}>Cancel</button>
            <button className="at-btn-primary" disabled={!formValid || generating} onClick={handlePayment}>
              {generating
                ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'at-spin 1s linear infinite' }} /> Processing…</>
                : total === 0 ? '🎟️ Confirm Free Ticket' : `💳 Pay ₹${total.toLocaleString('en-IN')} with Razorpay`}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ─── QR Confirmation Screen ─────────────────────────────────────────── */
  const renderQRScreen = () => {
    if (!booking) return null;
    return (
      <div className="at-qr-screen">
        <div style={{ fontSize: '.65rem', fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '6px' }}>
          ✅ Booking Confirmed
        </div>
        <h2 style={{ fontFamily: 'Cinzel', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 1.25rem', lineHeight: 1.2 }}>Your Heritage Ticket is Ready!</h2>

        <div className="at-qr-card">
          <img src={booking.qrImageUrl} alt="Booking QR Code" width={220} height={220} className="at-qr-img"
            style={{ display: 'block', margin: '0 auto 1.2rem', borderRadius: '12px' }} />

          <div style={{ fontFamily: 'Cinzel', fontWeight: 700, fontSize: '1rem', color: C.text, marginBottom: '4px' }}>{booking.activity.name}</div>
          <div style={{ fontSize: '.75rem', color: C.muted, marginBottom: '1.2rem' }}>
            📍 {booking.activity.site}, {booking.activity.state} · 🆔 {booking.id}
          </div>

          {/* Details */}
          <div className="at-qr-details">
            {[
              ['Visitor', booking.form.name],
              ['Date & Slot', `${booking.form.visitDate}${booking.form.visitTime ? ' · ' + booking.form.visitTime : ''}`],
              ['Visitors', `${booking.form.adults} Adult${booking.form.adults > 1 ? 's' : ''} ${booking.form.children > 0 ? `+ ${booking.form.children} Child` : ''} ${booking.form.seniors > 0 ? `+ ${booking.form.seniors} Senior` : ''}`],
              ['Nationality', booking.form.nationality === 'indian' ? '🇮🇳 Indian Citizen' : '🌍 NRI / Foreign'],
              ['Total Paid', booking.totalINR === 0 ? '🎉 Free Entry' : `₹${booking.totalINR.toLocaleString('en-IN')}`],
              ['Payment Status', (bookingConfirmed?.paymentStatus || 'paid').toUpperCase()],
              ...(bookingConfirmed?.razorpayPaymentId ? [['Transaction Ref', bookingConfirmed.razorpayPaymentId]] : []),
              ['Meeting Point', booking.activity.meetingPoint.split(',')[0]],
            ].map(([k, v]) => (
              <div key={k} className="at-qr-detail-row">
                <span className="at-qr-key">{k}</span>
                <span className="at-qr-val">{v}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="at-qr-actions">
            <button className="at-dl-btn" onClick={downloadQR}>
              📥 Download QR Ticket
            </button>
            <button style={{ padding: '.7rem .9rem', borderRadius: '8px', background: C.bg, border: `1px solid ${C.border}`, color: C.muted, fontSize: '.82rem', cursor: 'pointer', transition: 'all .15s' }}
              onClick={() => { navigator.clipboard.writeText(booking.id); }}>
              📋 Copy ID
            </button>
          </div>

          {/* Where to scan */}
          <div className="at-scan-info">
            <div className="at-scan-info-title">📡 Where to Scan This QR Code</div>
            <div className="at-scan-info-text">
              Present this QR at: <strong>{booking.activity.scanPoint}</strong><br /><br />
              The site entry officer will scan using the <strong>Voices of Heritage Verifier App</strong> or any standard QR reader. The code contains your full booking details and a verification link. No printout needed — works on phone screen.<br /><br />
              🔗 Manual verify: <a href={`${window.location.origin}/verify/${booking.id}`} target="_blank" rel="noopener noreferrer" style={{ color: C.gold, textDecoration: 'underline' }}>{window.location.origin}/verify/{booking.id}</a>
            </div>
          </div>
        </div>

        <button className="at-btn-ghost" style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center' }}
          onClick={() => { setStep('list'); setBooking(null); setForm({ name: '', email: '', phone: '', nationality: 'indian', idType: 'aadhaar', idNumber: '', visitDate: '', visitTime: '', adults: 1, children: 0, seniors: 0, specialRequirements: '' }); }}>
          ← Book Another Activity
        </button>
      </div>
    );
  };

  /* ─── Activity list grid ─────────────────────────────────────────────── */
  const renderActivityGrid = () => (
    <>
      <div className="at-filter-strip">
        <div className="at-chips">
          {(['all', 'entry-ticket', 'activity'] as const).map(f => (
            <button key={f} className={`at-chip ${catFilter === f ? 'active' : ''}`} onClick={() => setCatFilter(f)}>
              {f === 'all' ? 'All' : f === 'entry-ticket' ? '🎟️ Entry Tickets' : '🎒 Activities'}
            </button>
          ))}
        </div>
        <span className="at-result-count">{siteActivities.length} result{siteActivities.length !== 1 ? 's' : ''} in <strong>{selectedSite}</strong></span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.2rem' }}>
        {siteActivities.map(act => {
          const slotsColor = act.slots > 20 ? C.green : act.slots > 5 ? C.gold : C.red;
          return (
            <div key={act.id} className="at-card" onClick={() => { setSelectedAct(act); setStep('form'); }}>
              <div className="at-card-header">
                <div className="at-card-type" style={{ color: act.category === 'entry-ticket' ? C.blue : C.gold }}>
                  {act.emoji} {act.type}
                </div>
                <div className="at-card-name">{act.name}</div>
                <div className="at-card-site">📍 {act.site}, {act.state}</div>
                <p className="at-card-desc">{act.description}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {act.tags.map(t => <span key={t} className="at-tag">{t}</span>)}
                  {act.difficulty && <span className="at-tag" style={{ color: C.gold }}>{act.difficulty}</span>}
                </div>
              </div>
              <div className="at-card-footer">
                <div>
                  <div className="at-price-indian">
                    🇮🇳 {act.pricing.indian === 0 ? 'Free' : `₹${act.pricing.indian}`}
                    <span style={{ color: C.muted, fontSize: '.7rem', fontWeight: 400, marginLeft: '4px' }}>/ adult</span>
                  </div>
                  <div className="at-price-nri">
                    🌍 NRI: {act.pricing.nri === 0 ? 'Free' : `₹${act.pricing.nri}`}
                  </div>
                  <div style={{ marginTop: '5px' }}>
                    <span className="at-slots-pill" style={{ background: `${slotsColor}15`, color: slotsColor, border: `1px solid ${slotsColor}33` }}>
                      {act.slots} slots left
                    </span>
                  </div>
                </div>
                <button className="at-book-btn" onClick={(e) => { e.stopPropagation(); setSelectedAct(act); setStep('form'); }}>
                  Book Now →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  /* ─── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="at-page">
      <style>{css}</style>

      {/* Topbar */}
      <div className="at-topbar">
        <div className="at-topbar-brand" onClick={() => navigate('/dashboard')}>
          <VoHLogo size={32} />
          <div>
            <div className="at-topbar-title">Voices of Heritage</div>
            <div className="at-topbar-sub">Activity &amp; Ticketing</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <button
            className="at-back-btn"
            onClick={() => { fetchMyBookings(); setStep('my-bookings'); }}
          >
            🎟️ My Bookings
          </button>
          <button
            style={{
              padding: '.35rem 1rem', borderRadius: '8px',
              background: 'linear-gradient(135deg,var(--voh-amber,#f59e0b),var(--voh-gold,#d97706))',
              color: '#fff', border: 'none', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '.4rem',
            }}
            onClick={() => navigate('/trip-planner')}
          >
            ✈️ Trip Planner (AI)
          </button>
          <ThemeToggle />
          <button className="at-back-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        </div>
      </div>

      {/* Hero + search */}
      <div className="at-hero">
        <ParticleCanvas theme={theme} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="at-hero-tag">🎟️ Heritage Tickets &amp; Activity Booking</div>
          <h1 className="at-hero-title">Discover &amp; Book Heritage Experiences</h1>
          <p className="at-hero-sub">
            Search any heritage site to find official entry tickets, guided treks, sunrise viewings, and cultural activities — with Indian &amp; NRI pricing, instant QR ticket generation.
          </p>

          {/* Search */}
          <div className="at-search-wrap">
            <span className="at-search-icon">🔍</span>
            <input className="at-search-input" type="text" placeholder="Search a heritage site (e.g. Hampi, Ajanta, Konark…)"
              value={searchQuery} onChange={e => handleSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && suggestions.length > 0) selectSite(suggestions[0]); }} />
            {suggestions.length > 0 && (
              <div className="at-suggestions">
                {suggestions.map(s => (
                  <div key={s} className="at-suggestion-item" onClick={() => selectSite(s)}>
                    🏛️ {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick site pills */}
          <div className="at-sites-row">
            {SITES.map(s => (
              <button key={s} className="at-site-pill" onClick={() => selectSite(s)}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1 }}>
        {step === 'list' && (
          <div className="at-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1.2rem' }}>
              <button style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '.8rem' }}
                onClick={() => { setStep('search'); setSelectedSite(''); setSearchQuery(''); }}>
                ← Change site
              </button>
              <div style={{ fontSize: '.65rem', padding: '3px 10px', borderRadius: '4px', background: 'rgba(217,156,83,.08)', color: C.gold, border: '1px solid rgba(217,156,83,.15)', fontWeight: 700 }}>
                {selectedSite}
              </div>
            </div>
            {renderActivityGrid()}
          </div>
        )}

        {(step === 'qr' || step === 'confirmation') && (
          <div className="at-content">
            {renderQRScreen()}
          </div>
        )}

        {step === 'my-bookings' && (
          <div className="at-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.4rem', margin: 0 }}>My Monument Tickets &amp; Bookings</h2>
                <p style={{ color: C.muted, fontSize: '.82rem', margin: '4px 0 0' }}>Persisted booking records with payment status &amp; QR verification</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="at-btn-ghost" onClick={fetchMyBookings}>🔄 Refresh</button>
                <button className="at-btn-primary" onClick={() => setStep(selectedSite ? 'list' : 'search')}>+ Book Monument</button>
              </div>
            </div>

            {myBookingsLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>Loading your bookings…</div>
            ) : myBookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: C.surface, borderRadius: '16px', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎟️</div>
                <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No monument bookings yet</div>
                <p style={{ color: C.muted, fontSize: '.85rem', marginBottom: '1.25rem' }}>Select a heritage site above to book official ASI entry tickets.</p>
                <button className="at-btn-primary" onClick={() => setStep('search')}>Browse Sites</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {myBookings.map((b: any) => {
                  const statusColor =
                    b.paymentStatus === 'paid' ? C.green :
                    b.paymentStatus === 'failed' ? C.red :
                    b.paymentStatus === 'cancelled' ? C.muted : C.amber;
                  const id = b.bookingId || b.ticketId;
                  return (
                    <div key={id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: '1rem' }}>{b.monumentName || b.activityName}</span>
                          <span style={{ fontSize: '.68rem', fontWeight: 800, textTransform: 'uppercase', padding: '2px 10px', borderRadius: '20px', background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}44` }}>
                            {b.paymentStatus}
                          </span>
                          {b.ticketStatus === 'scanned' && (
                            <span style={{ fontSize: '.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
                              ✓ Scanned
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '.78rem', color: C.muted }}>
                          🆔 <span style={{ fontFamily: 'monospace' }}>{id}</span> · 📅 {b.visitDate} · 👥 {b.numTickets || 1} visitor(s) · ₹{(b.totalAmount ?? b.totalINR ?? 0).toLocaleString('en-IN')}
                        </div>
                        {b.razorpayPaymentId && (
                          <div style={{ fontSize: '.72rem', color: C.muted, marginTop: '3px' }}>
                            Payment Ref: <span style={{ fontFamily: 'monospace' }}>{b.razorpayPaymentId}</span>
                          </div>
                        )}
                        {b.failureReason && (
                          <div style={{ fontSize: '.74rem', color: C.red, marginTop: '4px' }}>
                            Reason: {b.failureReason}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {b.paymentStatus === 'paid' && (
                          <Link
                            to={`/verify/${id}`}
                            style={{ padding: '.5rem 1rem', borderRadius: '8px', background: 'rgba(217,156,83,0.15)', color: C.gold, border: `1px solid ${C.gold}44`, textDecoration: 'none', fontSize: '.78rem', fontWeight: 700 }}
                          >
                            🔍 Verify / View Ticket
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking modal overlaid on top */}
      {step === 'form' && renderBookingModal()}
    </div>
  );
}
