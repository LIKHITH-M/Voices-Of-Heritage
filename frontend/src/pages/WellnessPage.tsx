import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import VoHLogo from '@/components/VoHLogo';
import axios from 'axios';

const C = {
  bg:      'var(--voh-bg)',
  surface: 'var(--voh-surface, #12121f)',
  card:    'var(--voh-card)',
  border:  'var(--voh-border)',
  amber:   'var(--voh-amber, #f59e0b)',
  gold:    'var(--voh-gold, #d97706)',
  text:    'var(--voh-text)',
  muted:   'var(--voh-muted)',
};

const SITES_STATIC = [
  { id: 'ws_01', name: 'Muktinath Wellness Ashram', region: 'Karnataka', city: 'Mysuru', type: 'Yoga Retreat', description: 'Nestled in the foothills of Chamundi Hills, this ashram offers classical Mysore-style Ashtanga yoga and Ayurvedic treatments.', amenities: ['Yoga hall', 'Ayurvedic spa', 'Organic meals', 'Meditation garden'], rating: 4.9, pricePerNight: 3500, tags: ['yoga', 'Ayurveda', 'Karnataka'], emoji: '🧘' },
  { id: 'ws_02', name: 'Pushkar Ghats Meditation Centre', region: 'Rajasthan', city: 'Pushkar', type: 'Meditation Centre', description: 'On the banks of the sacred Pushkar Lake, this centre offers silence retreats, Vedic chanting, and sunrise meditation.', amenities: ['Silent retreat rooms', 'Vedic library', 'Ghee lamp ceremonies', 'Rooftop meditation'], rating: 4.8, pricePerNight: 2200, tags: ['meditation', 'sacred lake', 'Rajasthan'], emoji: '🌅' },
  { id: 'ws_03', name: 'Rishikesh Himalayan Yoga Retreat', region: 'Uttarakhand', city: 'Rishikesh', type: 'Yoga & Pranayama', description: 'The world capital of yoga — multi-day immersive programs in Hatha, Vinyasa, Kundalini and pranayama on the banks of the Ganga.', amenities: ['Riverside yoga deck', 'Satsang hall', 'Ayurvedic kitchen', 'Ganga aarti access'], rating: 4.9, pricePerNight: 2800, tags: ['yoga', 'Himalaya', 'Ganga'], emoji: '🏔️' },
  { id: 'ws_04', name: 'Kerala Ayurveda Heritage Resort', region: 'Kerala', city: 'Thrissur', type: 'Ayurveda Centre', description: 'A 200-year-old Ayurvedic center following the traditional Ashtavaidya lineage of Kerala. Offers Panchakarma detox and rejuvenation.', amenities: ['Panchakarma treatments', 'Herbal medicine garden', 'Yoga sessions', 'Sattvic vegetarian meals'], rating: 4.7, pricePerNight: 5500, tags: ['Ayurveda', 'Panchakarma', 'Kerala'], emoji: '🌿' },
  { id: 'ws_05', name: 'Hampi Virupaksha Temple Circuit', region: 'Karnataka', city: 'Hampi', type: 'Temple Meditation', description: 'The living Vijayanagara temple complex at Hampi — attend pre-dawn pujas, circumambulate the sacred Hemakuta Hill, and meditate by the Tungabhadra.', amenities: ['Pre-dawn puja access', 'Sanskrit chanting classes', 'Sacred walk routes', 'Priest-guided circuits'], rating: 4.8, pricePerNight: 1800, tags: ['temple', 'meditation', 'Karnataka'], emoji: '🛕' },
  { id: 'ws_06', name: 'Varanasi Ganga Aarti & Meditation', region: 'Uttar Pradesh', city: 'Varanasi', type: 'Spiritual Experience', description: 'The eternal city of Shiva — attend the grand Ganga Aarti at Dashashwamedh Ghat, dawn boat rides and meditation in ancient ashrams.', amenities: ['Ganga aarti front-row access', 'Dawn boat ride', 'Ashram stay', 'Vedic philosophy classes'], rating: 4.9, pricePerNight: 2000, tags: ['spiritual', 'Ganga', 'Varanasi'], emoji: '🔥' },
  { id: 'ws_07', name: 'Tirupati Balaji Spiritual Circuit', region: 'Andhra Pradesh', city: 'Tirupati', type: 'Pilgrimage Circuit', description: 'The world\'s most visited pilgrimage — guided spiritual circuit covering the seven hills, Alipiri foot-path, and Kapila Theertham.', amenities: ['Guided pilgrimage', 'VIP darshan facilitation', 'Prasadam experience', 'Accommodation on hills'], rating: 4.9, pricePerNight: 2500, tags: ['pilgrimage', 'temple', 'Andhra Pradesh'], emoji: '⛪' },
  { id: 'ws_08', name: 'Madurai Meenakshi Temple Retreat', region: 'Tamil Nadu', city: 'Madurai', type: 'Temple Stay', description: 'Stay within the ancient city of Madurai and experience daily rituals at the magnificent Meenakshi Amman Temple — one of India\'s most awe-inspiring Dravidian masterpieces.', amenities: ['Early morning puja access', 'Temple town walking tour', 'Carnatic music sessions', 'Brahmin cuisine meals'], rating: 4.8, pricePerNight: 2200, tags: ['Dravidian', 'temple', 'Tamil Nadu'], emoji: '🌺' },
  { id: 'ws_09', name: 'Bodh Gaya Vipassana Retreat', region: 'Bihar', city: 'Bodh Gaya', type: 'Vipassana Meditation', description: 'Under the sacred Bodhi Tree where the Buddha attained enlightenment — 10-day Vipassana courses, Buddhist pilgrimages, and mindfulness immersion.', amenities: ['Bodhi Tree meditation', 'Mahabodhi Temple access', '10-day Vipassana courses', 'Multi-faith interfaith sessions'], rating: 5.0, pricePerNight: 0, tags: ['Buddhism', 'Vipassana', 'Bihar'], emoji: '🌳' },
  { id: 'ws_10', name: 'Auroville Integral Yoga Centre', region: 'Tamil Nadu', city: 'Pondicherry', type: 'Integral Yoga', description: 'The unique international community of Auroville near Pondicherry — Integral Yoga in the tradition of Sri Aurobindo and The Mother, with the Matrimandir as the spiritual center.', amenities: ['Matrimandir meditation access', 'Integral Yoga classes', 'Silence walks', 'Conscious living workshops'], rating: 4.7, pricePerNight: 3200, tags: ['Integral Yoga', 'spiritual community', 'Tamil Nadu'], emoji: '✨' },
];

const RETREATS_STATIC = [
  { id: 'ret_01', name: 'Mysore Ashtanga Intensive', duration: '21 Days', level: 'All Levels', style: 'Ashtanga Yoga', location: 'Mysuru, Karnataka', price: 45000, description: '3-week deep immersion in the authentic Mysore method of Ashtanga Yoga — daily Mysore-style practice, led classes, pranayama, and philosophy.', includes: ['Daily yoga sessions', 'Philosophy talks', 'Ayurvedic consultation', 'Vegetarian meals', 'Accommodation'], emoji: '🧘' },
  { id: 'ret_02', name: 'Kerala Panchakarma Detox', duration: '14 Days', level: 'All Ages', style: 'Ayurveda', location: 'Thrissur, Kerala', price: 85000, description: 'Complete Ayurvedic detox program — daily Panchakarma treatments (Abhyanga, Shirodhara, Basti), customized herbal medicines and sattvic diet.', includes: ['14 Panchakarma sessions', 'Doctor consultations', 'Herbal medicines', '3 Ayurvedic meals/day', 'Cottage stay'], emoji: '🌿' },
  { id: 'ret_03', name: 'Himalayan Silence Retreat', duration: '10 Days', level: 'Intermediate', style: 'Vipassana + Yoga', location: 'Rishikesh, Uttarakhand', price: 25000, description: 'Noble Silence retreat in the Himalayas combining Vipassana meditation, pranayama, yoga nidra, and sattvic living on the banks of the Ganga.', includes: ['10-day noble silence', 'Yoga nidra sessions', 'Pranayama practice', 'Ganga bank meditation', 'Ashram meals & stay'], emoji: '🏔️' },
  { id: 'ret_04', name: 'Rajasthan Desert Yoga Journey', duration: '7 Days', level: 'All Levels', style: 'Hatha + Meditation', location: 'Pushkar & Jaisalmer', price: 32000, description: 'A unique spiritual journey through the Thar Desert — sunrise yoga sessions in the dunes, stargazing meditation, and ancient temple rituals.', includes: ['Desert sunrise yoga', 'Pushkar Lake ritual', 'Camel safari meditation', 'Heritage haveli stay', 'All meals'], emoji: '🏜️' },
  { id: 'ret_05', name: 'Tamil Nadu Sacred Pilgrim Circuit', duration: '5 Days', level: 'All Levels', style: 'Pilgrimage + Chanting', location: 'Madurai-Rameswaram-Kanyakumari', price: 18000, description: 'Sacred south India pilgrimage circuit — Meenakshi Amman, Ramanathaswamy Temple, and sunrise at India\'s southern tip. Includes Carnatic music and temple ritual experiences.', includes: ['5 temple visits', 'Guided spiritual history', 'Carnatic music session', 'Pilgrim meals', 'Comfortable A/C transport'], emoji: '🌸' },
];

const CIRCUITS_STATIC = [
  { id: 'cir_01', name: 'Karnataka Temple Heritage Circuit', temples: ['Hampi Virupaksha', 'Belur Chennakeshava', 'Halebidu Hoysaleswara', 'Sravanabelagola', 'Shravanabelagola Gommateshwara'], duration: '5 Days', best_time: 'Oct – Feb', description: 'The greatest concentration of medieval temple architecture in South India — Vijayanagara, Hoysala, and Jain heritage in one circuit.', emoji: '🛕' },
  { id: 'cir_02', name: 'Varanasi–Bodh Gaya–Sarnath Circuit', temples: ['Kashi Vishwanath', 'Sankat Mochan', 'Mahabodhi Temple', 'Dhamek Stupa Sarnath', 'Dashashwamedh Ghat'], duration: '4 Days', best_time: 'Nov – Mar', description: 'The heartland of two of the world\'s great religions — the eternal city of Shiva and the birthplace of the Buddha\'s teaching, side by side.', emoji: '☸️' },
  { id: 'cir_03', name: 'South India\'s Big Four Shaiva Temples', temples: ['Madurai Meenakshi', 'Thanjavur Brihadeeswarar', 'Chidambaram Nataraja', 'Tiruvannamalai Arunachaleswarar'], duration: '6 Days', best_time: 'Sep – Mar', description: 'Tamil Nadu\'s greatest Shaiva temples — from the dancing Nataraja to the fire mountain of Arunachala, an unbroken 2,000-year sacred tradition.', emoji: '🌺' },
  { id: 'cir_04', name: 'Rajasthan Jain Pilgrimage Circuit', temples: ['Ranakpur Chaturmukha Temple', 'Dilwara Temples (Mount Abu)', 'Osian Mahavira Temple', 'Shri Kesariyaji', 'Nakoda Bhairav'], duration: '5 Days', best_time: 'Oct – Mar', description: 'Rajasthan holds the world\'s finest Jain temple complexes — the marble filigree of Dilwara is considered the apex of Indian religious art.', emoji: '🕉️' },
];

type SectionType = 'sites' | 'retreats' | 'circuits';

export default function WellnessPage() {
  const [activeSection, setActiveSection] = useState<SectionType>('sites');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [sites, setSites] = useState(SITES_STATIC);
  const [retreats] = useState(RETREATS_STATIC);
  const [circuits] = useState(CIRCUITS_STATIC);
  const [inquiryForm, setInquiryForm] = useState({ name: '', email: '', phone: '', site: '', dates: '', groupSize: '1', message: '' });
  const [inquirySent, setInquirySent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const REGIONS = ['All', 'Karnataka', 'Rajasthan', 'Uttarakhand', 'Kerala', 'Uttar Pradesh', 'Tamil Nadu', 'Bihar', 'Andhra Pradesh'];
  const TYPES = ['All', 'Yoga Retreat', 'Meditation Centre', 'Ayurveda Centre', 'Temple Meditation', 'Spiritual Experience', 'Pilgrimage Circuit', 'Temple Stay', 'Vipassana Meditation', 'Integral Yoga'];

  useEffect(() => {
    fetch('/api/wellness/sites').then(r => r.ok ? r.json() : null).then(d => { if (d && Array.isArray(d)) setSites(d); }).catch(() => {});
  }, []);

  const filteredSites = sites.filter(s =>
    (selectedRegion === 'All' || s.region === selectedRegion) &&
    (selectedType === 'All' || s.type === selectedType)
  );

  const handleInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post('/api/wellness/inquiry', inquiryForm);
    } catch { /* graceful fail */ }
    setInquirySent(true);
    setSubmitting(false);
  };

  const css = `
    .wl-root { display:flex; flex-direction:column; min-height:100vh; background:${C.bg}; color:${C.text}; font-family:'Inter',sans-serif; }
    .wl-topbar { padding:1.25rem 2rem; border-bottom:1px solid ${C.border}; background:${C.surface}; display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; z-index:50; }
    .wl-brand { display:flex; align-items:center; gap:1rem; text-decoration:none; }
    .wl-title { font-size:1.4rem; font-weight:800; color:${C.text}; }
    .wl-subtitle { font-size:0.85rem; color:${C.muted}; }

    .wl-hero { padding:4rem 2rem 3rem; text-align:center; background:linear-gradient(180deg,rgba(16,185,129,0.06) 0%,transparent 100%); border-bottom:1px solid ${C.border}; }
    .wl-hero-emoji { font-size:4rem; margin-bottom:1rem; }
    .wl-hero-title { font-size:2.8rem; font-weight:900; margin-bottom:0.75rem; background:linear-gradient(135deg,#34d399,#059669); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .wl-hero-sub { font-size:1.1rem; color:${C.muted}; max-width:600px; margin:0 auto; line-height:1.6; }

    .wl-nav { display:flex; border-bottom:1px solid ${C.border}; background:${C.surface}; }
    .wl-nav-btn { flex:1; padding:1rem; font-weight:700; font-size:0.9rem; border:none; background:none; color:${C.muted}; cursor:pointer; border-bottom:3px solid transparent; transition:all 0.2s; }
    .wl-nav-btn.active { color:#34d399; border-bottom-color:#34d399; }

    .wl-filters { display:flex; gap:0.5rem; flex-wrap:wrap; padding:1.5rem 2rem; border-bottom:1px solid ${C.border}; align-items:center; }
    .wl-filter-label { font-size:0.8rem; font-weight:700; color:${C.muted}; text-transform:uppercase; margin-right:0.5rem; }
    .wl-chip { padding:0.4rem 0.9rem; border-radius:20px; border:1px solid ${C.border}; background:transparent; color:${C.muted}; font-size:0.82rem; cursor:pointer; transition:all 0.2s; white-space:nowrap; }
    .wl-chip.active { background:#059669; color:#fff; border-color:#059669; font-weight:700; }
    .wl-chip:hover:not(.active) { border-color:#34d399; color:#34d399; }

    .wl-content { padding:2rem; max-width:1400px; margin:0 auto; width:100%; }

    /* Sites */
    .wl-site-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:1.5rem; }
    .wl-site-card { background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; padding:1.5rem; display:flex; flex-direction:column; transition:transform 0.2s,border-color 0.2s; }
    .wl-site-card:hover { transform:translateY(-4px); border-color:#059669; }
    .wl-site-emoji { font-size:2.5rem; margin-bottom:0.75rem; }
    .wl-site-name { font-size:1.1rem; font-weight:800; margin-bottom:0.3rem; }
    .wl-site-type { font-size:0.75rem; padding:3px 10px; background:rgba(16,185,129,0.1); color:#34d399; border-radius:12px; display:inline-block; margin-bottom:0.5rem; font-weight:700; }
    .wl-site-location { font-size:0.82rem; color:${C.muted}; margin-bottom:0.75rem; }
    .wl-site-desc { font-size:0.88rem; color:${C.muted}; line-height:1.6; flex:1; margin-bottom:1rem; }
    .wl-site-amenities { display:flex; flex-wrap:wrap; gap:0.4rem; margin-bottom:1rem; }
    .wl-amenity { font-size:0.75rem; padding:3px 8px; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid ${C.border}; color:${C.muted}; }
    .wl-site-footer { display:flex; justify-content:space-between; align-items:center; }
    .wl-site-price { font-weight:700; color:${C.amber}; font-size:0.9rem; }
    .wl-site-rating { font-size:0.85rem; color:${C.muted}; }
    .wl-site-btn { padding:0.5rem 1rem; border-radius:8px; border:1px solid #059669; background:transparent; color:#34d399; font-weight:700; font-size:0.82rem; cursor:pointer; transition:all 0.2s; }
    .wl-site-btn:hover { background:#059669; color:#fff; }

    /* Retreats */
    .wl-retreat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:1.5rem; }
    .wl-retreat-card { background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; padding:1.5rem; }
    .wl-retreat-header { display:flex; gap:1rem; align-items:flex-start; margin-bottom:1rem; }
    .wl-retreat-emoji { font-size:2.5rem; }
    .wl-retreat-name { font-size:1.05rem; font-weight:800; margin-bottom:0.3rem; }
    .wl-retreat-badges { display:flex; gap:0.4rem; flex-wrap:wrap; }
    .wl-badge { font-size:0.72rem; padding:2px 8px; border-radius:10px; font-weight:700; }
    .wl-badge-style { background:rgba(16,185,129,0.12); color:#34d399; }
    .wl-badge-dur { background:rgba(245,158,11,0.12); color:${C.amber}; }
    .wl-badge-level { background:rgba(99,102,241,0.12); color:#818cf8; }
    .wl-retreat-location { font-size:0.82rem; color:${C.muted}; margin-bottom:0.75rem; display:flex; align-items:center; gap:0.3rem; }
    .wl-retreat-desc { font-size:0.88rem; color:${C.muted}; line-height:1.6; margin-bottom:1rem; }
    .wl-retreat-includes { margin-bottom:1rem; }
    .wl-retreat-includes h4 { font-size:0.78rem; font-weight:700; text-transform:uppercase; color:#34d399; margin-bottom:0.5rem; letter-spacing:0.05em; }
    .wl-retreat-includes ul { padding-left:1.2rem; margin:0; display:flex; flex-direction:column; gap:0.3rem; }
    .wl-retreat-includes ul li { font-size:0.83rem; color:${C.muted}; }
    .wl-retreat-footer { display:flex; justify-content:space-between; align-items:center; }
    .wl-retreat-price { font-weight:800; color:${C.amber}; }
    .wl-retreat-btn { padding:0.5rem 1rem; border-radius:8px; border:none; background:#059669; color:#fff; font-weight:700; font-size:0.82rem; cursor:pointer; }

    /* Circuits */
    .wl-circuit-list { display:flex; flex-direction:column; gap:1.5rem; max-width:860px; margin:0 auto; }
    .wl-circuit-card { background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; padding:2rem; }
    .wl-circuit-header { display:flex; gap:1rem; align-items:center; margin-bottom:1rem; }
    .wl-circuit-emoji { font-size:2.5rem; }
    .wl-circuit-name { font-size:1.2rem; font-weight:800; }
    .wl-circuit-meta { display:flex; gap:1rem; margin-bottom:0.75rem; flex-wrap:wrap; }
    .wl-circuit-meta span { font-size:0.8rem; color:${C.muted}; display:flex; align-items:center; gap:0.3rem; }
    .wl-circuit-desc { font-size:0.9rem; color:${C.muted}; line-height:1.6; margin-bottom:1rem; }
    .wl-circuit-temples { display:flex; flex-wrap:wrap; gap:0.5rem; }
    .wl-temple-pill { font-size:0.78rem; padding:4px 10px; border-radius:20px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); color:#34d399; }

    /* Inquiry form */
    .wl-inquiry { max-width:600px; margin:0 auto; background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; padding:2rem; }
    .wl-inquiry h2 { font-size:1.5rem; font-weight:800; margin-bottom:0.5rem; }
    .wl-inquiry p { color:${C.muted}; font-size:0.9rem; margin-bottom:1.5rem; }
    .wl-field { margin-bottom:1rem; }
    .wl-label { display:block; font-size:0.82rem; font-weight:700; color:${C.muted}; margin-bottom:0.4rem; text-transform:uppercase; letter-spacing:0.04em; }
    .wl-input { width:100%; padding:0.75rem 1rem; border-radius:10px; border:1px solid ${C.border}; background:rgba(255,255,255,0.03); color:${C.text}; font-size:0.9rem; outline:none; transition:border-color 0.2s; font-family:inherit; }
    .wl-input:focus { border-color:#34d399; }
    .wl-textarea { width:100%; padding:0.75rem 1rem; border-radius:10px; border:1px solid ${C.border}; background:rgba(255,255,255,0.03); color:${C.text}; font-size:0.9rem; outline:none; min-height:120px; resize:vertical; font-family:inherit; }
    .wl-textarea:focus { border-color:#34d399; }
    .wl-submit { width:100%; padding:0.9rem; border-radius:10px; border:none; background:#059669; color:#fff; font-weight:700; font-size:1rem; cursor:pointer; margin-top:1rem; transition:filter 0.2s; }
    .wl-submit:hover { filter:brightness(1.1); }
    .wl-submit:disabled { opacity:0.6; cursor:wait; }
    .wl-success { text-align:center; padding:2rem; }
    .wl-success-icon { font-size:3rem; margin-bottom:1rem; }

    .wl-empty { text-align:center; padding:4rem 2rem; color:${C.muted}; }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="wl-root">

        <header className="wl-topbar">
          <Link to="/dashboard" className="wl-brand">
            <VoHLogo size={36} />
            <div>
              <div className="wl-title">Wellness & Spiritual Tourism</div>
              <div className="wl-subtitle">Heritage retreats & sacred circuits</div>
            </div>
          </Link>
          <ThemeToggle />
        </header>

        <div className="wl-hero">
          <div className="wl-hero-emoji">🧘</div>
          <h1 className="wl-hero-title">Wellness & Spiritual Heritage</h1>
          <p className="wl-hero-sub">Sacred retreats, ancient yoga traditions, temple meditation circuits, and Ayurvedic healing — a journey within India's spiritual soul.</p>
        </div>

        <nav className="wl-nav">
          {(['sites', 'retreats', 'circuits'] as SectionType[]).map(s => (
            <button key={s} className={`wl-nav-btn ${activeSection === s ? 'active' : ''}`} onClick={() => setActiveSection(s)}>
              {s === 'sites' ? '🏡 Wellness Sites' : s === 'retreats' ? '🌿 Retreat Programs' : s === 'circuits' ? '🛕 Meditation Circuits' : '📋 Book Inquiry'}
            </button>
          ))}
        </nav>

        {/* Filters for sites */}
        {activeSection === 'sites' && (
          <div className="wl-filters">
            <span className="wl-filter-label">Region:</span>
            {REGIONS.map(r => <button key={r} className={`wl-chip ${selectedRegion === r ? 'active' : ''}`} onClick={() => setSelectedRegion(r)}>{r}</button>)}
            <span className="wl-filter-label" style={{ marginLeft: '1rem' }}>Type:</span>
            {TYPES.slice(0, 5).map(t => <button key={t} className={`wl-chip ${selectedType === t ? 'active' : ''}`} onClick={() => setSelectedType(t)}>{t}</button>)}
          </div>
        )}

        <main className="wl-content">

          {/* ── SITES ── */}
          {activeSection === 'sites' && (
            filteredSites.length === 0
              ? <div className="wl-empty">🌿 No sites found for this filter.</div>
              : <div className="wl-site-grid">
                {filteredSites.map(site => (
                  <div key={site.id} className="wl-site-card">
                    <div className="wl-site-emoji">{site.emoji}</div>
                    <span className="wl-site-type">{site.type}</span>
                    <div className="wl-site-name">{site.name}</div>
                    <div className="wl-site-location">📍 {site.city}, {site.region}</div>
                    <p className="wl-site-desc">{site.description}</p>
                    <div className="wl-site-amenities">
                      {site.amenities.map((a: string) => <span key={a} className="wl-amenity">{a}</span>)}
                    </div>
                    <div className="wl-site-footer">
                      <div>
                        <div className="wl-site-price">
                          {site.pricePerNight === 0 ? '🙏 Donation basis' : `₹${site.pricePerNight?.toLocaleString('en-IN')}/night`}
                        </div>
                        <div className="wl-site-rating">⭐ {site.rating}/5.0</div>
                      </div>
                      <button className="wl-site-btn" onClick={() => setActiveSection('circuits')}>Inquire →</button>
                    </div>
                  </div>
                ))}
              </div>
          )}

          {/* ── RETREATS ── */}
          {activeSection === 'retreats' && (
            <div className="wl-retreat-grid">
              {retreats.map(r => (
                <div key={r.id} className="wl-retreat-card">
                  <div className="wl-retreat-header">
                    <div className="wl-retreat-emoji">{r.emoji}</div>
                    <div>
                      <div className="wl-retreat-name">{r.name}</div>
                      <div className="wl-retreat-badges">
                        <span className="wl-badge wl-badge-style">{r.style}</span>
                        <span className="wl-badge wl-badge-dur">⏱️ {r.duration}</span>
                        <span className="wl-badge wl-badge-level">{r.level}</span>
                      </div>
                    </div>
                  </div>
                  <div className="wl-retreat-location">📍 {r.location}</div>
                  <p className="wl-retreat-desc">{r.description}</p>
                  <div className="wl-retreat-includes">
                    <h4>Included</h4>
                    <ul>{r.includes.map((inc: string) => <li key={inc}>✓ {inc}</li>)}</ul>
                  </div>
                  <div className="wl-retreat-footer">
                    <div className="wl-retreat-price">₹{r.price.toLocaleString('en-IN')}</div>
                    <button className="wl-retreat-btn" onClick={() => { setInquiryForm(f => ({ ...f, site: r.name })); setActiveSection('circuits'); }}>Book Inquiry</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── CIRCUITS ── */}
          {activeSection === 'circuits' && (
            <div>
              <div className="wl-circuit-list">
                {circuits.map(c => (
                  <div key={c.id} className="wl-circuit-card">
                    <div className="wl-circuit-header">
                      <div className="wl-circuit-emoji">{c.emoji}</div>
                      <div className="wl-circuit-name">{c.name}</div>
                    </div>
                    <div className="wl-circuit-meta">
                      <span>⏱️ {c.duration}</span>
                      <span>🌤️ Best: {c.best_time}</span>
                    </div>
                    <p className="wl-circuit-desc">{c.description}</p>
                    <div className="wl-circuit-temples">
                      {c.temples.map(t => <span key={t} className="wl-temple-pill">🛕 {t}</span>)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Inquiry form */}
              <div style={{ height: '2rem' }} />
              <div className="wl-inquiry">
                {inquirySent ? (
                  <div className="wl-success">
                    <div className="wl-success-icon">🙏</div>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>Inquiry Received!</h3>
                    <p style={{ color: C.muted }}>Thank you for your interest. Our spiritual travel team will contact you within 24 hours.</p>
                    <button onClick={() => setInquirySent(false)} style={{ marginTop: '1rem', padding: '0.6rem 1.2rem', background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Submit Another</button>
                  </div>
                ) : (
                  <>
                    <h2>📋 Book a Retreat / Inquiry</h2>
                    <p>Tell us your dates and preferences. Our team will curate a personalized wellness journey for you.</p>
                    <form onSubmit={handleInquiry}>
                      <div className="wl-field"><label className="wl-label">Full Name *</label><input required className="wl-input" value={inquiryForm.name} onChange={e => setInquiryForm(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" /></div>
                      <div className="wl-field"><label className="wl-label">Email *</label><input required type="email" className="wl-input" value={inquiryForm.email} onChange={e => setInquiryForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" /></div>
                      <div className="wl-field"><label className="wl-label">Phone</label><input type="tel" className="wl-input" value={inquiryForm.phone} onChange={e => setInquiryForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" /></div>
                      <div className="wl-field"><label className="wl-label">Preferred Retreat / Site</label><input className="wl-input" value={inquiryForm.site} onChange={e => setInquiryForm(f => ({ ...f, site: e.target.value }))} placeholder="e.g. Rishikesh Yoga, Kerala Ayurveda..." /></div>
                      <div className="wl-field"><label className="wl-label">Preferred Dates</label><input type="text" className="wl-input" value={inquiryForm.dates} onChange={e => setInquiryForm(f => ({ ...f, dates: e.target.value }))} placeholder="e.g. Jan 15 – Jan 25, 2027" /></div>
                      <div className="wl-field"><label className="wl-label">Group Size</label><input type="number" min="1" max="30" className="wl-input" value={inquiryForm.groupSize} onChange={e => setInquiryForm(f => ({ ...f, groupSize: e.target.value }))} /></div>
                      <div className="wl-field"><label className="wl-label">Message / Special Requirements</label><textarea className="wl-textarea" value={inquiryForm.message} onChange={e => setInquiryForm(f => ({ ...f, message: e.target.value }))} placeholder="Tell us about your wellness goals, health conditions, dietary requirements, or specific interests..." /></div>
                      <button type="submit" disabled={submitting} className="wl-submit">{submitting ? '⏳ Sending...' : '🙏 Submit Inquiry'}</button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}
