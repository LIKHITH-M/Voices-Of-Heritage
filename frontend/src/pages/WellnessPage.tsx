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

const FALLBACK_WELLNESS_IMG = 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&auto=format&fit=crop&q=80';

const SITES_FALLBACK = [
  {
    id: 'ws_01',
    name: 'Muktinath Ashtanga Yoga Ashram',
    region: 'Karnataka',
    city: 'Mysuru',
    type: 'Yoga Retreat',
    emoji: '🧘',
    image: FALLBACK_WELLNESS_IMG,
    description: 'Nestled in the foothills of Chamundi Hills, offering classical Mysore-style Ashtanga yoga and Ayurvedic treatments.',
    amenities: ['Ashtanga Yoga Shala', 'Ayurvedic Spa', 'Organic Meals', 'Meditation Garden'],
    rating: 4.9,
    pricePerNight: 3500,
  },
];

const RETREATS_FALLBACK = [
  {
    id: 'ret_01',
    name: 'Mysore Ashtanga Yoga Intensive',
    duration: '14 Days',
    level: 'All Levels',
    style: 'Ashtanga Yoga',
    location: 'Mysuru, Karnataka',
    price: 38000,
    emoji: '🧘',
    description: 'Deep immersion in authentic Mysore-style Ashtanga Yoga with philosophy and Ayurvedic consultation.',
    includes: ['Daily yoga sessions', 'Philosophy talks', 'Ayurvedic consultation', 'Sattvic meals', 'Ashram stay'],
  },
];

const CIRCUITS_FALLBACK = [
  {
    id: 'mc_01',
    name: 'Hampi Sacred Ruins Contemplation Circuit',
    region: 'Karnataka',
    duration: '3 Days / 3.5 hrs daily',
    bestTime: 'Oct – Feb',
    emoji: '🛕',
    description: 'Trace Vijayanagara’s sacred geography from Virupaksha Temple to silent sunrise meditation atop Hemakuta & Matanga hills.',
    temples: ['Virupaksha Temple', 'Hemakuta Hill', 'Matanga Hill', 'Vittala Courtyard'],
    stops: [
      { name: 'Virupaksha Temple', activity: 'Pre-dawn pradakshina & devotional music', duration: '45 min' },
      { name: 'Hemakuta Hill', activity: 'Sunrise silent meditation', duration: '40 min' },
    ],
  },
];

type SectionType = 'sites' | 'retreats' | 'circuits' | 'inquiry';

export default function WellnessPage() {
  const [activeSection, setActiveSection] = useState<SectionType>('sites');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  const [sites, setSites] = useState<any[]>(SITES_FALLBACK);
  const [retreats, setRetreats] = useState<any[]>(RETREATS_FALLBACK);
  const [circuits, setCircuits] = useState<any[]>(CIRCUITS_FALLBACK);

  const [inquiryForm, setInquiryForm] = useState({
    name: '', email: '', phone: '', site: '', category: 'Wellness Retreat', dates: '', groupSize: '1', message: '',
  });
  const [inquiryResult, setInquiryResult] = useState<any>(null);
  const [inquiryError, setInquiryError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savedInquiries, setSavedInquiries] = useState<any[]>([]);

  const REGIONS = ['All', 'Karnataka', 'Rajasthan', 'Uttarakhand', 'Kerala', 'Uttar Pradesh', 'Tamil Nadu', 'Bihar'];
  const TYPES = ['All', 'Yoga Retreat', 'Meditation Centre', 'Ayurveda Centre', 'Temple Meditation', 'Spiritual Experience'];

  useEffect(() => {
    fetch('/api/wellness/sites').then(r => r.ok ? r.json() : null).then(d => { if (Array.isArray(d) && d.length) setSites(d); }).catch(() => {});
    fetch('/api/wellness/retreats').then(r => r.ok ? r.json() : null).then(d => { if (Array.isArray(d) && d.length) setRetreats(d); }).catch(() => {});
    fetch('/api/wellness/circuits').then(r => r.ok ? r.json() : null).then(d => { if (Array.isArray(d) && d.length) setCircuits(d); }).catch(() => {});
    fetch('/api/wellness/inquiries').then(r => r.ok ? r.json() : null).then(d => { if (Array.isArray(d)) setSavedInquiries(d); }).catch(() => {});
  }, []);

  const filteredSites = sites.filter(s =>
    (selectedRegion === 'All' || s.region === selectedRegion) &&
    (selectedType === 'All' || s.type === selectedType)
  );

  const openInquiryFor = (siteName: string, category: string) => {
    setInquiryForm(f => ({ ...f, site: siteName, category }));
    setInquiryResult(null);
    setInquiryError('');
    setActiveSection('inquiry');
  };

  const handleInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setInquiryError('');
    try {
      const { data } = await axios.post('/api/wellness/inquiry', inquiryForm);
      setInquiryResult(data);
      if (data?.inquiry) {
        setSavedInquiries(prev => [data.inquiry, ...prev]);
      }
    } catch (err: any) {
      setInquiryError(err?.response?.data?.error || 'Could not save inquiry. Please check that the backend server is running.');
    } finally {
      setSubmitting(false);
    }
  };

  const css = `
    .wl-root { display:flex; flex-direction:column; min-height:100vh; background:${C.bg}; color:${C.text}; font-family:'Inter',sans-serif; }
    .wl-topbar { padding:1.25rem 2rem; border-bottom:1px solid ${C.border}; background:${C.surface}; display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; z-index:50; }
    .wl-brand { display:flex; align-items:center; gap:1rem; text-decoration:none; }
    .wl-title { font-size:1.4rem; font-weight:800; color:${C.text}; }
    .wl-subtitle { font-size:0.85rem; color:${C.muted}; }

    .wl-hero { padding:3.5rem 2rem 2.75rem; text-align:center; background:linear-gradient(180deg,rgba(16,185,129,0.08) 0%,transparent 100%); border-bottom:1px solid ${C.border}; }
    .wl-hero-emoji { font-size:3.5rem; margin-bottom:0.75rem; }
    .wl-hero-title { font-size:2.6rem; font-weight:900; margin-bottom:0.65rem; background:linear-gradient(135deg,#34d399,#059669); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .wl-hero-sub { font-size:1.05rem; color:${C.muted}; max-width:620px; margin:0 auto; line-height:1.6; }

    .wl-nav { display:flex; border-bottom:1px solid ${C.border}; background:${C.surface}; overflow-x:auto; }
    .wl-nav-btn { flex:1; min-width:150px; padding:1rem; font-weight:700; font-size:0.88rem; border:none; background:none; color:${C.muted}; cursor:pointer; border-bottom:3px solid transparent; transition:all 0.2s; white-space:nowrap; }
    .wl-nav-btn.active { color:#34d399; border-bottom-color:#34d399; }

    .wl-filters { display:flex; gap:0.5rem; flex-wrap:wrap; padding:1.25rem 2rem; border-bottom:1px solid ${C.border}; align-items:center; }
    .wl-filter-label { font-size:0.78rem; font-weight:700; color:${C.muted}; text-transform:uppercase; margin-right:0.4rem; }
    .wl-chip { padding:0.38rem 0.85rem; border-radius:20px; border:1px solid ${C.border}; background:transparent; color:${C.muted}; font-size:0.82rem; cursor:pointer; transition:all 0.2s; white-space:nowrap; }
    .wl-chip.active { background:#059669; color:#fff; border-color:#059669; font-weight:700; }
    .wl-chip:hover:not(.active) { border-color:#34d399; color:#34d399; }

    .wl-content { padding:2rem; max-width:1400px; margin:0 auto; width:100%; }

    .wl-site-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:1.5rem; }
    .wl-site-card { background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; overflow:hidden; display:flex; flex-direction:column; transition:transform 0.2s,border-color 0.2s; }
    .wl-site-card:hover { transform:translateY(-4px); border-color:#059669; }
    .wl-card-img { position:relative; height:175px; width:100%; overflow:hidden; background:rgba(16,185,129,0.08); }
    .wl-card-img img { width:100%; height:100%; object-fit:cover; }
    .wl-img-tag { position:absolute; top:12px; left:12px; padding:4px 10px; border-radius:20px; background:rgba(0,0,0,0.72); color:#34d399; font-size:0.74rem; font-weight:700; }
    .wl-img-rating { position:absolute; top:12px; right:12px; padding:4px 10px; border-radius:20px; background:rgba(0,0,0,0.72); color:#fff; font-size:0.74rem; font-weight:700; }
    .wl-site-body { padding:1.35rem; display:flex; flex-direction:column; flex:1; }
    .wl-site-name { font-size:1.1rem; font-weight:800; margin-bottom:0.25rem; }
    .wl-site-location { font-size:0.82rem; color:${C.muted}; margin-bottom:0.7rem; }
    .wl-site-desc { font-size:0.86rem; color:${C.muted}; line-height:1.6; flex:1; margin-bottom:0.9rem; }
    .wl-site-amenities { display:flex; flex-wrap:wrap; gap:0.4rem; margin-bottom:1rem; }
    .wl-amenity { font-size:0.74rem; padding:3px 8px; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid ${C.border}; color:${C.muted}; }
    .wl-site-footer { display:flex; justify-content:space-between; align-items:center; margin-top:auto; }
    .wl-site-price { font-weight:800; color:${C.amber}; font-size:0.92rem; }
    .wl-site-btn { padding:0.55rem 1.05rem; border-radius:8px; border:1px solid #059669; background:transparent; color:#34d399; font-weight:700; font-size:0.82rem; cursor:pointer; transition:all 0.2s; }
    .wl-site-btn:hover { background:#059669; color:#fff; }

    .wl-retreat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:1.5rem; }
    .wl-retreat-card { background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; padding:1.5rem; display:flex; flex-direction:column; }
    .wl-retreat-header { display:flex; gap:1rem; align-items:flex-start; margin-bottom:0.9rem; }
    .wl-retreat-name { font-size:1.08rem; font-weight:800; margin-bottom:0.3rem; }
    .wl-retreat-badges { display:flex; gap:0.4rem; flex-wrap:wrap; }
    .wl-badge { font-size:0.72rem; padding:2px 8px; border-radius:10px; font-weight:700; }
    .wl-badge-style { background:rgba(16,185,129,0.12); color:#34d399; }
    .wl-badge-dur { background:rgba(245,158,11,0.12); color:${C.amber}; }
    .wl-badge-level { background:rgba(99,102,241,0.12); color:#818cf8; }
    .wl-retreat-btn { padding:0.55rem 1.1rem; border-radius:8px; border:none; background:#059669; color:#fff; font-weight:700; font-size:0.84rem; cursor:pointer; }

    .wl-circuit-list { display:flex; flex-direction:column; gap:1.5rem; max-width:900px; margin:0 auto; }
    .wl-circuit-card { background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; padding:1.75rem; }
    .wl-temple-pill { font-size:0.78rem; padding:4px 10px; border-radius:20px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); color:#34d399; }

    .wl-inquiry { max-width:680px; margin:0 auto; background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; padding:2rem; }
    .wl-field { margin-bottom:1rem; }
    .wl-label { display:block; font-size:0.78rem; font-weight:700; color:${C.muted}; margin-bottom:0.4rem; text-transform:uppercase; letter-spacing:0.04em; }
    .wl-input { width:100%; padding:0.72rem 1rem; border-radius:10px; border:1px solid ${C.border}; background:rgba(255,255,255,0.03); color:${C.text}; font-size:0.9rem; outline:none; font-family:inherit; }
    .wl-input:focus { border-color:#34d399; }
    .wl-textarea { width:100%; padding:0.72rem 1rem; border-radius:10px; border:1px solid ${C.border}; background:rgba(255,255,255,0.03); color:${C.text}; font-size:0.9rem; outline:none; min-height:110px; resize:vertical; font-family:inherit; }
    .wl-submit { width:100%; padding:0.85rem; border-radius:10px; border:none; background:#059669; color:#fff; font-weight:700; font-size:0.98rem; cursor:pointer; margin-top:0.75rem; }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="wl-root">
        <header className="wl-topbar">
          <Link to="/dashboard" className="wl-brand">
            <VoHLogo size={36} />
            <div>
              <div className="wl-title">Wellness &amp; Spiritual Tourism</div>
              <div className="wl-subtitle">Heritage yoga retreats, Ayurveda &amp; sacred temple circuits</div>
            </div>
          </Link>
          <ThemeToggle />
        </header>

        <div className="wl-hero">
          <div className="wl-hero-emoji">🧘</div>
          <h1 className="wl-hero-title">Wellness &amp; Spiritual Heritage</h1>
          <p className="wl-hero-sub">Sacred ashrams, classical yoga lineages, temple meditation circuits, and centuries-old Ayurvedic sanctuaries across India.</p>
        </div>

        <nav className="wl-nav">
          <button className={`wl-nav-btn ${activeSection === 'sites' ? 'active' : ''}`} onClick={() => setActiveSection('sites')}>🏡 Spiritual &amp; Wellness Sites ({sites.length})</button>
          <button className={`wl-nav-btn ${activeSection === 'retreats' ? 'active' : ''}`} onClick={() => setActiveSection('retreats')}>🌿 Yoga &amp; Ayurveda Retreats ({retreats.length})</button>
          <button className={`wl-nav-btn ${activeSection === 'circuits' ? 'active' : ''}`} onClick={() => setActiveSection('circuits')}>🛕 Meditation Circuits ({circuits.length})</button>
          <button className={`wl-nav-btn ${activeSection === 'inquiry' ? 'active' : ''}`} onClick={() => setActiveSection('inquiry')}>📋 Book Retreat / Inquiry</button>
        </nav>

        {activeSection === 'sites' && (
          <div className="wl-filters">
            <span className="wl-filter-label">Region:</span>
            {REGIONS.map(r => <button key={r} className={`wl-chip ${selectedRegion === r ? 'active' : ''}`} onClick={() => setSelectedRegion(r)}>{r}</button>)}
            <span className="wl-filter-label" style={{ marginLeft: '0.75rem' }}>Experience:</span>
            {TYPES.map(t => <button key={t} className={`wl-chip ${selectedType === t ? 'active' : ''}`} onClick={() => setSelectedType(t)}>{t}</button>)}
          </div>
        )}

        <main className="wl-content">
          {/* ── SITES ── */}
          {activeSection === 'sites' && (
            filteredSites.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', color: C.muted }}>🌿 No spiritual or wellness sites match this filter.</div>
            ) : (
              <div className="wl-site-grid">
                {filteredSites.map(site => (
                  <div key={site.id} className="wl-site-card">
                    <div className="wl-card-img">
                      <img src={site.image || FALLBACK_WELLNESS_IMG} alt={site.name} onError={e => { (e.currentTarget as HTMLImageElement).src = FALLBACK_WELLNESS_IMG; }} />
                      <span className="wl-img-tag">{site.emoji || '🧘'} {site.type}</span>
                      <span className="wl-img-rating">⭐ {site.rating}</span>
                    </div>
                    <div className="wl-site-body">
                      <div className="wl-site-name">{site.name}</div>
                      <div className="wl-site-location">📍 {site.city}, {site.region}</div>
                      <p className="wl-site-desc">{site.description}</p>
                      <div className="wl-site-amenities">
                        {(site.amenities || []).map((a: string) => <span key={a} className="wl-amenity">{a}</span>)}
                      </div>
                      <div className="wl-site-footer">
                        <div className="wl-site-price">
                          {Number(site.pricePerNight) === 0 ? '🙏 Donation Basis' : `₹${Number(site.pricePerNight).toLocaleString('en-IN')} / night`}
                        </div>
                        <button className="wl-site-btn" onClick={() => openInquiryFor(site.name, site.type)}>Inquire →</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── RETREATS ── */}
          {activeSection === 'retreats' && (
            <div className="wl-retreat-grid">
              {retreats.map(r => (
                <div key={r.id} className="wl-retreat-card">
                  <div className="wl-retreat-header">
                    <div style={{ fontSize: '2.4rem' }}>{r.emoji || '🌿'}</div>
                    <div>
                      <div className="wl-retreat-name">{r.name}</div>
                      <div className="wl-retreat-badges">
                        {r.style && <span className="wl-badge wl-badge-style">{r.style}</span>}
                        <span className="wl-badge wl-badge-dur">⏱️ {r.duration}</span>
                        {r.level && <span className="wl-badge wl-badge-level">{r.level}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '0.75rem' }}>📍 {r.location}</div>
                  <p style={{ fontSize: '0.88rem', color: C.muted, lineHeight: 1.6, marginBottom: '1rem' }}>{r.description}</p>
                  <div style={{ marginBottom: '1.1rem', flex: 1 }}>
                    <h4 style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', color: '#34d399', marginBottom: '0.45rem' }}>Included Experiences</h4>
                    <ul style={{ paddingLeft: '1.1rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.83rem', color: C.muted }}>
                      {(r.includes || []).map((inc: string) => <li key={inc}>{inc}</li>)}
                    </ul>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <div style={{ fontWeight: 800, color: C.amber }}>
                      {Number(r.price) === 0 ? '🙏 Donation Basis' : `₹${Number(r.price).toLocaleString('en-IN')}`}
                    </div>
                    <button className="wl-retreat-btn" onClick={() => openInquiryFor(r.name, 'Retreat Program')}>Book Inquiry →</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TEMPLE MEDITATION CIRCUITS ── */}
          {activeSection === 'circuits' && (
            <div className="wl-circuit-list">
              {circuits.map(c => (
                <div key={c.id} className="wl-circuit-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center' }}>
                      <div style={{ fontSize: '2.4rem' }}>{c.emoji || '🛕'}</div>
                      <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{c.name}</div>
                        <div style={{ fontSize: '0.82rem', color: C.muted }}>📍 {c.region} · ⏱️ {c.duration || c.totalDuration} · 🌤️ Best: {c.bestTime || c.best_time}</div>
                      </div>
                    </div>
                    <button className="wl-retreat-btn" onClick={() => openInquiryFor(c.name, 'Temple Meditation Circuit')}>Join Circuit →</button>
                  </div>
                  {c.description && <p style={{ fontSize: '0.9rem', color: C.muted, lineHeight: 1.65, marginBottom: '1rem' }}>{c.description}</p>}

                  {c.stops && c.stops.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                      {c.stops.map((st: any, idx: number) => (
                        <div key={idx} style={{ padding: '0.85rem', borderRadius: '10px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.18)' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#34d399', marginBottom: '3px' }}>{idx + 1}. {st.name}</div>
                          <div style={{ fontSize: '0.8rem', color: C.text }}>{st.activity}</div>
                          <div style={{ fontSize: '0.73rem', color: C.muted, marginTop: '3px' }}>⏱️ {st.duration}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {c.temples && c.temples.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                      {c.temples.map((t: string) => <span key={t} className="wl-temple-pill">🛕 {t}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── BOOK RETREAT / INQUIRY TAB ── */}
          {activeSection === 'inquiry' && (
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
              <div className="wl-inquiry">
                {inquiryResult ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
                    <div style={{ fontSize: '3.2rem', marginBottom: '0.75rem' }}>🙏</div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.4rem', color: '#34d399' }}>Inquiry Saved!</h3>
                    <p style={{ color: C.muted, marginBottom: '1.25rem' }}>{inquiryResult.message}</p>
                    <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '1rem', maxWidth: '380px', margin: '0 auto 1.25rem', fontSize: '0.85rem' }}>
                      Reference ID: <strong style={{ fontFamily: 'monospace', color: '#34d399' }}>{inquiryResult.inquiryId}</strong>
                    </div>
                    <button onClick={() => setInquiryResult(null)} className="wl-retreat-btn" style={{ padding: '0.7rem 1.4rem' }}>Submit Another Inquiry</button>
                  </div>
                ) : (
                  <>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.4rem' }}>📋 Book a Wellness Retreat or Sacred Circuit</h2>
                    <p style={{ color: C.muted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>Your booking inquiry is persisted in our backend database so our spiritual heritage concierge can confirm dates and availability.</p>
                    <form onSubmit={handleInquiry}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                        <div className="wl-field"><label className="wl-label">Full Name *</label><input required className="wl-input" value={inquiryForm.name} onChange={e => setInquiryForm(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" /></div>
                        <div className="wl-field"><label className="wl-label">Email *</label><input required type="email" className="wl-input" value={inquiryForm.email} onChange={e => setInquiryForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" /></div>
                        <div className="wl-field"><label className="wl-label">Phone</label><input type="tel" className="wl-input" value={inquiryForm.phone} onChange={e => setInquiryForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" /></div>
                        <div className="wl-field"><label className="wl-label">Group Size</label><input type="number" min="1" max="30" className="wl-input" value={inquiryForm.groupSize} onChange={e => setInquiryForm(f => ({ ...f, groupSize: e.target.value }))} /></div>
                      </div>
                      <div className="wl-field"><label className="wl-label">Selected Retreat / Ashram / Circuit</label><input className="wl-input" value={inquiryForm.site} onChange={e => setInquiryForm(f => ({ ...f, site: e.target.value }))} placeholder="e.g. Rishikesh Himalayan Yoga, Hampi Meditation Circuit..." /></div>
                      <div className="wl-field"><label className="wl-label">Preferred Dates</label><input type="text" className="wl-input" value={inquiryForm.dates} onChange={e => setInquiryForm(f => ({ ...f, dates: e.target.value }))} placeholder="e.g. Dec 10 – Dec 17, 2026" /></div>
                      <div className="wl-field"><label className="wl-label">Wellness Goals &amp; Dietary / Accessibility Notes</label><textarea className="wl-textarea" value={inquiryForm.message} onChange={e => setInquiryForm(f => ({ ...f, message: e.target.value }))} placeholder="Share yoga experience level, Ayurvedic health goals, sattvic dietary preferences..." /></div>
                      {inquiryError && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 600 }}>⚠️ {inquiryError}</div>}
                      <button type="submit" disabled={submitting} className="wl-submit">{submitting ? '⏳ Saving Inquiry...' : '🙏 Submit Retreat Inquiry'}</button>
                    </form>
                  </>
                )}
              </div>

              {savedInquiries.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.75rem' }}>Recent Saved Inquiries ({savedInquiries.length})</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {savedInquiries.slice(0, 5).map((inq: any) => (
                      <div key={inq.inquiryId || inq._id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{inq.site || 'Wellness Inquiry'}</div>
                          <div style={{ fontSize: '0.8rem', color: C.muted }}>{inq.name} · {inq.dates || 'Flexible dates'} · {inq.groupSize || 1} guest(s)</div>
                        </div>
                        <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', padding: '3px 10px', borderRadius: '14px', background: 'rgba(16,185,129,0.12)', color: '#34d399', fontWeight: 700 }}>
                          {inq.inquiryId} · {inq.status || 'received'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
