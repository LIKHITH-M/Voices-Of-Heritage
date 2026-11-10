import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';
import VoHLogo from '@/components/VoHLogo';

// ─── Static particle seeds (SSR-safe, stable) ──────────────────────────────
const PARTICLES = [
  { id: 0,  left: 3,   delay: 0.0,  dur: 10, size: 3, opacity: 0.5 },
  { id: 1,  left: 8,   delay: 1.4,  dur: 8,  size: 2, opacity: 0.35 },
  { id: 2,  left: 13,  delay: 3.2,  dur: 12, size: 4, opacity: 0.4 },
  { id: 3,  left: 19,  delay: 0.8,  dur: 9,  size: 2, opacity: 0.5 },
  { id: 4,  left: 25,  delay: 5.0,  dur: 11, size: 3, opacity: 0.3 },
  { id: 5,  left: 31,  delay: 2.1,  dur: 7,  size: 2, opacity: 0.45 },
  { id: 6,  left: 37,  delay: 4.3,  dur: 10, size: 4, opacity: 0.35 },
  { id: 7,  left: 43,  delay: 0.6,  dur: 13, size: 2, opacity: 0.5 },
  { id: 8,  left: 49,  delay: 6.5,  dur: 8,  size: 3, opacity: 0.4 },
  { id: 9,  left: 55,  delay: 1.9,  dur: 7,  size: 2, opacity: 0.35 },
  { id: 10, left: 61,  delay: 3.7,  dur: 11, size: 4, opacity: 0.5 },
  { id: 11, left: 67,  delay: 7.2,  dur: 9,  size: 2, opacity: 0.3 },
  { id: 12, left: 73,  delay: 2.4,  dur: 8,  size: 3, opacity: 0.45 },
  { id: 13, left: 79,  delay: 5.6,  dur: 12, size: 2, opacity: 0.4 },
  { id: 14, left: 85,  delay: 1.0,  dur: 7,  size: 4, opacity: 0.5 },
  { id: 15, left: 91,  delay: 8.3,  dur: 10, size: 2, opacity: 0.35 },
  { id: 16, left: 96,  delay: 4.7,  dur: 9,  size: 3, opacity: 0.4 },
  { id: 17, left: 16,  delay: 0.2,  dur: 14, size: 2, opacity: 0.3 },
  { id: 18, left: 46,  delay: 5.9,  dur: 10, size: 3, opacity: 0.45 },
  { id: 19, left: 70,  delay: 2.8,  dur: 8,  size: 2, opacity: 0.5 },
  { id: 20, left: 88,  delay: 0.4,  dur: 11, size: 4, opacity: 0.35 },
  { id: 21, left: 33,  delay: 6.8,  dur: 9,  size: 2, opacity: 0.4 },
  { id: 22, left: 57,  delay: 3.4,  dur: 7,  size: 3, opacity: 0.3 },
  { id: 23, left: 77,  delay: 1.6,  dur: 12, size: 2, opacity: 0.5 },
];

const FEATURES = [
  {
    icon: '🌐',
    title: 'Immersive Experiences',
    desc: "Step inside India's heritage — VR/AR tours, 360° storytelling, and live WebRTC-guided journeys through ancient sites.",
    color: '#f59e0b',
  },
  {
    icon: '📚',
    title: 'Digital Archives',
    desc: 'Explore centuries of history — manuscripts, 3D artifact scans, research papers, and a living knowledge hub.',
    color: '#60a5fa',
  },
  {
    icon: '🎒',
    title: 'Activity Booking',
    desc: 'Book heritage treks, sunrise viewings, photography tours, and culinary trails — all in one place.',
    color: '#34d399',
  },
  {
    icon: '🛍️',
    title: 'Artisan Marketplace',
    desc: 'Discover and support certified heritage crafts, live demonstrations, and authentic regional artisans.',
    color: '#f472b6',
  },
  {
    icon: '🌿',
    title: 'Conservation Tools',
    desc: "Adopt a heritage element, report damage, or join a volunteer field team — be part of preservation.",
    color: '#a78bfa',
  },
  {
    icon: '🔐',
    title: 'Blockchain Ticketing',
    desc: 'Tamper-proof, QR-verified digital tickets powered by blockchain — secure, transparent, and instant.',
    color: '#fb923c',
  },
  {
    icon: '🧠',
    title: 'AI Smart Utilities',
    desc: "Get AI-powered heritage guides, real-time crowd insights, weather alerts, and offline navigation.",
    color: '#22d3ee',
  },
  {
    icon: '🤝',
    title: 'Partnerships',
    desc: 'Integrated with UNESCO, ASI, tourism boards, transport operators, and heritage hotels nationwide.',
    color: '#f59e0b',
  },
];

const STATS = [
  { value: '3,718+', label: 'Heritage Sites', icon: '🏛️' },
  { value: '1.2M+', label: 'Registered Travellers', icon: '🧳' },
  { value: '840+', label: 'Artisan Partners', icon: '🛍️' },
  { value: '94',    label: 'Districts Covered', icon: '🗺️' },
];

const NAV_LINKS = [
  { label: 'Home',        href: '#hero' },
  { label: 'Features',    href: '#features' },
  { label: 'About',       href: '#about' },
  { label: 'Archives',    href: '#archives' },
  { label: 'Experiences', href: '#experiences' },
];

// ─── Logo SVG ─────────────────────────────────────────────────────────────────
// ─── Main Page ────────────────────────────────────────────────────────────────

// ─── Mandala background decoration ───────────────────────────────────────────
function LandingMandala() {
  const petals8 = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45) * Math.PI / 180;
    return { cx: 300 + Math.cos(a) * 80, cy: 300 + Math.sin(a) * 80, rot: i * 45 + 90 };
  });
  const petals16 = Array.from({ length: 16 }, (_, i) => {
    const a = (i * 22.5) * Math.PI / 180;
    return { cx: 300 + Math.cos(a) * 170, cy: 300 + Math.sin(a) * 170, rot: i * 22.5 + 90 };
  });
  const ticks = Array.from({ length: 32 }, (_, i) => {
    const a = (i * 11.25) * Math.PI / 180;
    return {
      x1: 300 + Math.cos(a) * 230, y1: 300 + Math.sin(a) * 230,
      x2: 300 + Math.cos(a) * 248, y2: 300 + Math.sin(a) * 248,
    };
  });
  return (
    <svg className="landing-mandala-svg" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="300" cy="300" r="280" stroke="rgba(245,158,11,0.04)" strokeWidth="1"/>
      <circle cx="300" cy="300" r="250" stroke="rgba(245,158,11,0.05)" strokeWidth="0.5"/>
      <circle cx="300" cy="300" r="220" stroke="rgba(245,158,11,0.06)" strokeWidth="1"/>
      <circle cx="300" cy="300" r="190" stroke="rgba(245,158,11,0.07)" strokeWidth="0.5"/>
      <circle cx="300" cy="300" r="160" stroke="rgba(245,158,11,0.08)" strokeWidth="1"/>
      <circle cx="300" cy="300" r="120" stroke="rgba(245,158,11,0.1)" strokeWidth="0.5"/>
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke="rgba(245,158,11,0.12)" strokeWidth="0.8"/>
      ))}
      {petals8.map((p, i) => (
        <ellipse key={i} cx={p.cx} cy={p.cy} rx="14" ry="30"
          fill="rgba(245,158,11,0.06)" stroke="rgba(245,158,11,0.12)" strokeWidth="0.5"
          transform={`rotate(${p.rot} ${p.cx} ${p.cy})`}/>
      ))}
      {petals16.map((p, i) => (
        <ellipse key={i} cx={p.cx} cy={p.cy} rx="8" ry="20"
          fill="rgba(245,158,11,0.04)" stroke="rgba(245,158,11,0.1)" strokeWidth="0.5"
          transform={`rotate(${p.rot} ${p.cx} ${p.cy})`}/>
      ))}
      <circle cx="300" cy="300" r="40" stroke="rgba(245,158,11,0.15)" strokeWidth="1"/>
      <circle cx="300" cy="300" r="22" fill="rgba(245,158,11,0.06)" stroke="rgba(245,158,11,0.2)" strokeWidth="1"/>
      <circle cx="300" cy="300" r="8" fill="rgba(245,158,11,0.2)"/>
    </svg>
  );
}

// ─── Animated temple silhouette for hero ─────────────────────────────────────
function HeroTemple() {
  return (
    <svg className="landing-hero-temple" viewBox="0 0 480 320" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Ground */}
      <rect x="0" y="300" width="480" height="20" fill="rgba(245,158,11,0.08)" rx="2"/>
      {/* Main gopuram */}
      <rect x="160" y="270" width="160" height="30" rx="3" fill="rgba(245,158,11,0.12)"/>
      <rect x="175" y="240" width="130" height="30" rx="3" fill="rgba(245,158,11,0.14)"/>
      <rect x="190" y="210" width="100" height="30" rx="3" fill="rgba(245,158,11,0.16)"/>
      <rect x="205" y="182" width="70" height="28" rx="3" fill="rgba(245,158,11,0.18)"/>
      <rect x="215" y="158" width="50" height="24" rx="3" fill="rgba(245,158,11,0.20)"/>
      <rect x="222" y="138" width="36" height="20" rx="3" fill="rgba(245,158,11,0.24)"/>
      <rect x="227" y="120" width="26" height="18" rx="3" fill="rgba(245,158,11,0.28)"/>
      <rect x="231" y="104" width="18" height="16" rx="2" fill="rgba(245,158,11,0.32)"/>
      {/* Spire / kalasha */}
      <path d="M236 104 L240 72 L244 104Z" fill="rgba(245,158,11,0.5)"/>
      <circle cx="240" cy="68" r="5" fill="rgba(245,158,11,0.7)"/>
      <ellipse cx="240" cy="76" rx="8" ry="4" fill="rgba(245,158,11,0.3)"/>
      {/* Main door arch */}
      <path d="M222 300 L222 260 Q240 242 258 260 L258 300Z" fill="rgba(245,158,11,0.1)" stroke="rgba(245,158,11,0.25)" strokeWidth="0.8"/>
      {/* Left wing structure */}
      <rect x="100" y="280" width="60" height="20" rx="2" fill="rgba(245,158,11,0.08)"/>
      <rect x="110" y="260" width="40" height="20" rx="2" fill="rgba(245,158,11,0.1)"/>
      <rect x="120" y="244" width="22" height="16" rx="2" fill="rgba(245,158,11,0.12)"/>
      <path d="M128 244 L131 228 L134 244Z" fill="rgba(245,158,11,0.28)"/>
      <circle cx="131" cy="224" r="3" fill="rgba(245,158,11,0.5)"/>
      {/* Right wing structure */}
      <rect x="320" y="280" width="60" height="20" rx="2" fill="rgba(245,158,11,0.08)"/>
      <rect x="330" y="260" width="40" height="20" rx="2" fill="rgba(245,158,11,0.1)"/>
      <rect x="338" y="244" width="22" height="16" rx="2" fill="rgba(245,158,11,0.12)"/>
      <path d="M346 244 L349 228 L352 244Z" fill="rgba(245,158,11,0.28)"/>
      <circle cx="349" cy="224" r="3" fill="rgba(245,158,11,0.5)"/>
      {/* Decorative niches on main tiers */}
      {[0,1,2].map(i => (
        <ellipse key={i} cx={215 + i * 12} cy={225} rx="4" ry="6"
          fill="rgba(245,158,11,0.08)" stroke="rgba(245,158,11,0.15)" strokeWidth="0.5"/>
      ))}
      {[0,1,2,3].map(i => (
        <ellipse key={i} cx={200 + i * 12} cy={255} rx="4" ry="6"
          fill="rgba(245,158,11,0.07)" stroke="rgba(245,158,11,0.12)" strokeWidth="0.5"/>
      ))}
      {/* Flag poles */}
      <line x1="175" y1="240" x2="175" y2="215" stroke="rgba(245,158,11,0.3)" strokeWidth="1"/>
      <line x1="305" y1="240" x2="305" y2="215" stroke="rgba(245,158,11,0.3)" strokeWidth="1"/>
      <path d="M175 215 L188 219 L175 223Z" fill="rgba(245,158,11,0.4)"/>
      <path d="M305 215 L292 219 L305 223Z" fill="rgba(245,158,11,0.4)"/>
      {/* Glow under kalasha */}
      <ellipse cx="240" cy="300" rx="60" ry="6" fill="rgba(245,158,11,0.06)"/>
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  // Header shadow on scroll
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="landing-root">
      {/* ── Floating particles ────────────────────────────────────────────── */}
      <div className="landing-particles" aria-hidden="true">
        {PARTICLES.map(p => (
          <span
            key={p.id}
            className="landing-particle"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* ── Background orbs ──────────────────────────────────────────────── */}
      <div className="landing-orb landing-orb--gold"  aria-hidden="true"/>
      <div className="landing-orb landing-orb--blue"  aria-hidden="true"/>
      <div className="landing-orb landing-orb--purple" aria-hidden="true"/>
      <div className="landing-orb landing-orb--teal"  aria-hidden="true"/>

      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <header className={`landing-header${scrolled ? ' landing-header--scrolled' : ''}`}>
        <div className="landing-header-inner">
          {/* Logo */}
          <Link to="/" className="landing-logo" aria-label="Voices of Heritage – Home">
            <VoHLogo size={38} />
            <span className="landing-logo-text">
              <span className="landing-logo-voices">Voices</span>
              <span className="landing-logo-of"> of </span>
              <span className="landing-logo-heritage">Heritage</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="landing-nav" aria-label="Main navigation">
            {NAV_LINKS.map(link => (
              <button key={link.label} className="landing-nav-link" onClick={() => scrollTo(link.href)}>
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="landing-header-actions">
            <ThemeToggle />
            {user ? (
              <button className="lnd-btn-primary" onClick={() => navigate('/dashboard')}>
                Go to Dashboard →
              </button>
            ) : (
              <>
                <Link to="/auth/login" className="lnd-btn-ghost">Sign In</Link>
                <Link to="/auth/register" className="lnd-btn-primary">Sign Up</Link>
              </>
            )}
            {/* Mobile hamburger */}
            <button
              className={`landing-hamburger${menuOpen ? ' is-open' : ''}`}
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <span/><span/><span/>
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {menuOpen && (
          <nav className="landing-mobile-nav" aria-label="Mobile navigation">
            {NAV_LINKS.map(link => (
              <button key={link.label} className="landing-mobile-nav-link" onClick={() => scrollTo(link.href)}>
                {link.label}
              </button>
            ))}
            <div className="landing-mobile-nav-divider"/>
            {user ? (
              <button className="lnd-btn-primary landing-mobile-cta" onClick={() => { setMenuOpen(false); navigate('/dashboard'); }}>
                Go to Dashboard →
              </button>
            ) : (
              <>
                <Link to="/auth/login" className="lnd-btn-ghost landing-mobile-cta" onClick={() => setMenuOpen(false)}>Sign In</Link>
                <Link to="/auth/register" className="lnd-btn-primary landing-mobile-cta" onClick={() => setMenuOpen(false)}>Sign Up Free</Link>
              </>
            )}
          </nav>
        )}
      </header>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section id="hero" className="landing-hero" ref={heroRef}>
        {/* Mandala */}
        <div className="landing-mandala-wrap" aria-hidden="true">
          <LandingMandala />
        </div>

        <div className="landing-hero-content">
          <div className="landing-hero-badge">
            <span className="landing-hero-badge-dot"/>
            🏛️ India's Living Heritage Platform
          </div>

          <h1 className="landing-hero-title">
            <span className="landing-hero-title-line1">Voices of</span>
            <span className="landing-hero-title-accent">Heritage</span>
          </h1>

          <p className="landing-hero-subtitle">
            Connecting travellers, researchers, and communities with India's cultural legacy
            through immersive technology, digital archives, and living experiences.
          </p>

          <div className="landing-hero-ctas">
            <Link to="/auth/register" className="lnd-cta-primary">
              <span>Start Exploring</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
            <button className="lnd-cta-ghost" onClick={() => scrollTo('#features')}>
              Discover Features
            </button>
          </div>

          <div className="landing-hero-stats">
            {STATS.map(s => (
              <div key={s.label} className="landing-hero-stat">
                <span className="landing-hero-stat-icon">{s.icon}</span>
                <span className="landing-hero-stat-value">{s.value}</span>
                <span className="landing-hero-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Temple illustration */}
        <div className="landing-hero-visual" aria-hidden="true">
          <HeroTemple />
        </div>

        {/* Scroll indicator */}
        <div className="landing-scroll-indicator" aria-hidden="true">
          <span/>
        </div>
      </section>

      {/* ── Features Section ─────────────────────────────────────────────── */}
      <section id="features" className="landing-section landing-features-section">
        <div className="landing-section-inner">
          <div className="landing-section-header">
            <span className="landing-section-tag">What We Offer</span>
            <h2 className="landing-section-title">Everything Heritage, <span className="landing-text-gold">In One Place</span></h2>
            <p className="landing-section-desc">
              A full-stack cultural platform combining immersive tech, AI, blockchain, and community tools
              — built to preserve and celebrate India's extraordinary heritage.
            </p>
          </div>
          <div className="landing-features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="landing-feature-card glass-card">
                <div className="landing-feature-icon" style={{ color: f.color, background: `${f.color}18` }}>
                  {f.icon}
                </div>
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-desc">{f.desc}</p>
                <div className="landing-feature-line" style={{ background: `linear-gradient(90deg, ${f.color}, transparent)` }}/>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About Section ────────────────────────────────────────────────── */}
      <section id="about" className="landing-section landing-about-section">
        <div className="landing-section-inner landing-about-inner">
          <div className="landing-about-visual" aria-hidden="true">
            <div className="landing-about-orb-ring">
              <div className="landing-about-ring ring-1"/>
              <div className="landing-about-ring ring-2"/>
              <div className="landing-about-ring ring-3"/>
              <div className="landing-about-center-icon">🏛️</div>
            </div>
            <div className="landing-about-badges">
              <span className="landing-about-badge" style={{ top: '10%', left: '-18%' }}>🌐 UNESCO Partner</span>
              <span className="landing-about-badge" style={{ top: '45%', right: '-22%' }}>🔐 Blockchain Verified</span>
              <span className="landing-about-badge" style={{ bottom: '10%', left: '-14%' }}>🧠 AI Powered</span>
            </div>
          </div>
          <div className="landing-about-content">
            <span className="landing-section-tag">Who We Are</span>
            <h2 className="landing-section-title">
              Preserving India's Past,<br/>
              <span className="landing-text-gold">Powering Its Future</span>
            </h2>
            <p className="landing-about-text">
              <strong>Voices of Heritage</strong> is a feature-rich cultural platform built for anyone who cares about India's living legacy —
              from first-time travellers to academic researchers, school institutions to professional heritage guides.
            </p>
            <p className="landing-about-text">
              We believe that ancient stories deserve modern tools. That's why we combine cutting-edge VR/AR technology,
              AI-powered guides, blockchain-secured ticketing, and a thriving artisan marketplace — all in a single,
              unified experience.
            </p>
            <p className="landing-about-text">
              Founded on the principle that <em>culture belongs to everyone</em>, we work with UNESCO, the Archaeological Survey
              of India, state tourism boards, and thousands of local communities to bring authentic heritage closer to you.
            </p>
            <div className="landing-about-pills">
              {['Open Platform', 'Community First', 'ASI Integrated', 'Privacy Focused', 'Offline Ready'].map(p => (
                <span key={p} className="landing-pill">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Archives Teaser ──────────────────────────────────────────────── */}
      <section id="archives" className="landing-section landing-archives-section">
        <div className="landing-section-inner">
          <div className="landing-section-header">
            <span className="landing-section-tag">Digital Archives</span>
            <h2 className="landing-section-title">Centuries of Knowledge,<br/><span className="landing-text-gold">Now Searchable</span></h2>
          </div>
          <div className="landing-archives-grid">
            {[
              { icon: '📜', label: 'Manuscripts', count: '12,400+', color: '#f59e0b' },
              { icon: '🏺', label: '3D Artifacts', count: '3,800+',  color: '#60a5fa' },
              { icon: '📖', label: 'Research Papers', count: '6,200+', color: '#34d399' },
              { icon: '🖼️', label: 'Heritage Photos', count: '85,000+', color: '#f472b6' },
              { icon: '🎵', label: 'Folk Recordings', count: '2,100+', color: '#a78bfa' },
              { icon: '🗿', label: 'Inscriptions', count: '9,500+', color: '#fb923c' },
            ].map(item => (
              <div key={item.label} className="landing-archive-card glass-card">
                <span className="landing-archive-icon" style={{ color: item.color }}>{item.icon}</span>
                <span className="landing-archive-count" style={{ color: item.color }}>{item.count}</span>
                <span className="landing-archive-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Experiences Teaser ───────────────────────────────────────────── */}
      <section id="experiences" className="landing-section landing-exp-section">
        <div className="landing-section-inner">
          <div className="landing-section-header">
            <span className="landing-section-tag">Immersive Experiences</span>
            <h2 className="landing-section-title">Walk Through History<br/><span className="landing-text-gold">Like Never Before</span></h2>
            <p className="landing-section-desc">
              From a moonlit walk through Hampi's ruins to a VR flyover of the Brihadeeswarar Temple — we bring heritage alive.
            </p>
          </div>
          <div className="landing-exp-cards">
            {[
              {
                title: 'Hampi Ruins Walk',
                type: 'VR Experience',
                place: 'Karnataka',
                color: 'from-amber-900/60 to-yellow-900/40',
                emoji: '🏔️',
              },
              {
                title: 'Ajanta Cave Stories',
                type: '360° Tour',
                place: 'Maharashtra',
                color: 'from-blue-900/60 to-indigo-900/40',
                emoji: '🕌',
              },
              {
                title: 'Rajasthan Haveli Trail',
                type: 'Live Guide Tour',
                place: 'Rajasthan',
                color: 'from-rose-900/60 to-pink-900/40',
                emoji: '🏰',
              },
              {
                title: 'Khajuraho Insight',
                type: 'AR Overlay',
                place: 'Madhya Pradesh',
                color: 'from-purple-900/60 to-violet-900/40',
                emoji: '🗿',
              },
            ].map(e => (
              <div key={e.title} className="landing-exp-card glass-card">
                <div className="landing-exp-emoji">{e.emoji}</div>
                <div className="landing-exp-type">{e.type}</div>
                <div className="landing-exp-title">{e.title}</div>
                <div className="landing-exp-place">📍 {e.place}</div>
                <div className="landing-exp-cta">Explore →</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────── */}
      <section className="landing-cta-section">
        <div className="landing-cta-mandala" aria-hidden="true">
          <svg viewBox="0 0 300 300" fill="none" width="300" height="300">
            <circle cx="150" cy="150" r="140" stroke="rgba(245,158,11,0.08)" strokeWidth="1"/>
            <circle cx="150" cy="150" r="110" stroke="rgba(245,158,11,0.1)" strokeWidth="0.5"/>
            <circle cx="150" cy="150" r="80" stroke="rgba(245,158,11,0.12)" strokeWidth="1"/>
            <circle cx="150" cy="150" r="50" stroke="rgba(245,158,11,0.15)" strokeWidth="0.5"/>
            <circle cx="150" cy="150" r="20" fill="rgba(245,158,11,0.06)"/>
          </svg>
        </div>
        <div className="landing-cta-inner">
          <h2 className="landing-cta-title">
            Begin Your Heritage Journey
          </h2>
          <p className="landing-cta-subtitle">
            Join over 1.2 million travellers, researchers, and heritage lovers. Free to start — forever.
          </p>
          <div className="landing-cta-buttons">
            <Link to="/auth/register" className="lnd-cta-primary lnd-cta-primary--large">
              Create Free Account
            </Link>
            <Link to="/auth/login" className="lnd-cta-ghost lnd-cta-ghost--large">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <Link to="/" className="landing-logo" aria-label="Voices of Heritage">
              <VoHLogo size={32} />
              <span className="landing-logo-text">
                <span className="landing-logo-voices">Voices</span>
                <span className="landing-logo-of"> of </span>
                <span className="landing-logo-heritage">Heritage</span>
              </span>
            </Link>
            <p className="landing-footer-tagline">
              Connecting people with India's living cultural heritage through technology, community, and care.
            </p>
          </div>
          <div className="landing-footer-links">
            <div className="landing-footer-col">
              <span className="landing-footer-col-title">Platform</span>
              {['Features', 'Archives', 'Experiences', 'Artisan Market', 'Conservation'].map(l => (
                <a key={l} href="#features" className="landing-footer-link">{l}</a>
              ))}
            </div>
            <div className="landing-footer-col">
              <span className="landing-footer-col-title">Community</span>
              {['Heritage Guides', 'Researchers', 'Schools', 'Institutions', 'Volunteers'].map(l => (
                <a key={l} href="#about" className="landing-footer-link">{l}</a>
              ))}
            </div>
            <div className="landing-footer-col">
              <span className="landing-footer-col-title">Company</span>
              {['About Us', 'Blog', 'Partnerships', 'Press Kit', 'Contact'].map(l => (
                <a key={l} href="#about" className="landing-footer-link">{l}</a>
              ))}
            </div>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span>© 2026 Voices of Heritage. All rights reserved.</span>
          <div className="landing-footer-bottom-links">
            <a href="#" className="landing-footer-link">Privacy Policy</a>
            <a href="#" className="landing-footer-link">Terms of Service</a>
            <a href="#" className="landing-footer-link">Accessibility</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
