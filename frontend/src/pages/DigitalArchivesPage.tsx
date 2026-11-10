/**
 * DigitalArchivesPage.tsx
 * Phase 7 — Digital Archives & Research Hub
 *
 * Sections:
 *  • Sidebar navigation (same pattern as AITripPlannerPage)
 *  • Overview  — hero stats + featured 3D scan
 *  • Artifacts — heritage artifact cards with 3D viewer modal
 *  • Documents — manuscripts, inscriptions, maps, recipes
 *  • Research  — scholar notes, upload CTA, announcements
 *  • Sites     — linked heritage place profiles
 */
import React, { useState, Suspense, lazy } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import VoHLogo from '@/components/VoHLogo';

/* Lazy-load the heavy 3D viewer so it doesn't block initial paint */
const Artifact3DViewer = lazy(() => import('@/components/Artifact3DViewer'));

/* ── Types ───────────────────────────────────────────────────────────────── */
type Tab = 'overview' | 'artifacts' | 'documents' | 'research' | 'sites';

interface Artifact {
  id: string;
  name: string;
  site: string;
  state: string;
  era: string;
  type: string;
  material: string;
  tags: string[];
  desc: string;
  imgUrl?: string;
  has3d?: boolean;
  objUrl?: string;
  mtlUrl?: string;
  lat: number;
  lng: number;
  discovered: string;
  condition: 'Excellent' | 'Good' | 'Fragile' | 'Restored';
}

interface Document {
  id: string;
  title: string;
  type: 'manuscript' | 'inscription' | 'map' | 'photograph' | 'recipe' | 'scroll';
  language: string;
  era: string;
  site: string;
  state: string;
  size: string;
  desc: string;
  added: string;
  researcher: string;
  tags: string[];
}

interface HeritageSite {
  id: string;
  name: string;
  state: string;
  type: string;
  era: string;
  desc: string;
  artifacts: number;
  documents: number;
  lat: number;
  lng: number;
  tags: string[];
  imgEmoji: string;
}

/* ── Data ────────────────────────────────────────────────────────────────── */

const REAL_MODEL = {
  obj: '/models/Scaniverse_2026_05_10_120446.obj',
  mtl: '/models/Scaniverse_2026_05_10_120446.mtl',
  jpg: '/models/Scaniverse_2026_05_10_120446.jpg',
};

const ARTIFACTS: Artifact[] = [
  {
    id: 'a1',
    name: 'Vijayanagara Column Capital',
    site: 'Hampi',
    state: 'Karnataka',
    era: '14th–16th Century CE',
    type: 'Architecture',
    material: 'Granite',
    tags: ['Vijayanagara', 'Temple', 'Sculpture'],
    desc: '3D-scanned granite column capital from the Vittala Temple complex. Exhibits intricate horse-rider motifs characteristic of the Vijayanagara empire. Captured using LiDAR Scaniverse in May 2026.',
    has3d: true,
    objUrl: REAL_MODEL.obj,
    mtlUrl: REAL_MODEL.mtl,
    lat: 15.335, lng: 76.461,
    discovered: 'May 2026',
    condition: 'Good',
  },
  {
    id: 'a2',
    name: 'Hoysala Star Bracket',
    site: 'Belur',
    state: 'Karnataka',
    era: '12th Century CE',
    type: 'Sculpture',
    material: 'Chloritic Schist',
    tags: ['Hoysala', 'Temple', 'Stellate'],
    desc: 'A stellar-plan bracket figure from the Chenakeshava Temple depicting a Madanika (celestial damsel) in the traditional tribhanga pose.',
    lat: 13.164, lng: 75.863,
    discovered: 'January 2024',
    condition: 'Excellent',
  },
  {
    id: 'a3',
    name: 'Pallava Inscription Slab',
    site: 'Mahabalipuram',
    state: 'Tamil Nadu',
    era: '7th Century CE',
    type: 'Inscription',
    material: 'Granite',
    tags: ['Pallava', 'Tamil Brahmi', 'Seaport'],
    desc: 'Partially deciphered Tamil Brahmi inscription found near the Shore Temple documenting trade routes between Pallava ports and Sri Lanka.',
    lat: 12.626, lng: 80.192,
    discovered: 'March 2022',
    condition: 'Fragile',
  },
  {
    id: 'a4',
    name: 'Chola Bronze Nataraja',
    site: 'Thanjavur',
    state: 'Tamil Nadu',
    era: '10th–11th Century CE',
    type: 'Bronze Cast',
    material: 'Bronze (Panchalokha)',
    tags: ['Chola', 'Bronze', 'Shiva', 'Nataraja'],
    desc: 'A digitally documented Nataraja figure in the lost-wax (cire perdue) casting tradition, depicting the cosmic dance in the ring of flames (Ananda Tandava).',
    lat: 10.787, lng: 79.137,
    discovered: 'August 2023',
    condition: 'Excellent',
  },
  {
    id: 'a5',
    name: 'Mural Fragment — Lepakshi',
    site: 'Lepakshi',
    state: 'Andhra Pradesh',
    era: '16th Century CE',
    type: 'Mural',
    material: 'Lime Plaster & Pigment',
    tags: ['Vijayanagara', 'Fresco', 'Painting'],
    desc: 'A high-resolution photogrammetric capture of a Vijayanagara-era mural fragment from the Veerabhadra Temple ceiling showing a royal procession.',
    lat: 13.802, lng: 77.608,
    discovered: 'November 2023',
    condition: 'Restored',
  },
  {
    id: 'a6',
    name: 'Konark Wheel Panel',
    site: 'Konark',
    state: 'Odisha',
    era: '13th Century CE',
    type: 'Architecture',
    material: 'Khondalite Stone',
    tags: ['Ganga', 'Sun Temple', 'Wheel', 'UNESCO'],
    desc: 'One of the 24 giant spoked wheel carvings from the Sun Temple. This digitised panel shows calendrical and astronomical carvings with remarkable precision.',
    lat: 19.887, lng: 86.094,
    discovered: 'February 2024',
    condition: 'Good',
  },
];

const DOCUMENTS: Document[] = [
  {
    id: 'd1',
    title: 'Mackenzie Collection — Hampi Manuscripts',
    type: 'manuscript',
    language: 'Kannada / Telugu',
    era: '1800 CE (Copies of 15th C originals)',
    site: 'Hampi',
    state: 'Karnataka',
    size: '847 folios',
    desc: 'Digitised folios from the Colin Mackenzie survey documenting temple endowments, land grants, and ritual calendars of the Vijayanagara court.',
    added: '2024-03-14',
    researcher: 'Dr. Priya Nair',
    tags: ['Vijayanagara', 'Land Grant', 'Ritual'],
  },
  {
    id: 'd2',
    title: 'Ajanta Cave Survey Maps — ASI 1920',
    type: 'map',
    language: 'English / Devanagari',
    era: '1920 CE',
    site: 'Ajanta',
    state: 'Maharashtra',
    size: '34 plates',
    desc: 'Archival survey maps prepared by the Archaeological Survey of India detailing cave dimensions, mural extents, and sculpture inventories.',
    added: '2023-11-08',
    researcher: 'Dr. Arjun Mehta',
    tags: ['ASI', 'Survey', 'Cave', 'Buddhist'],
  },
  {
    id: 'd3',
    title: 'Brihadeeswarar Temple Copper Plate',
    type: 'inscription',
    language: 'Tamil / Grantha',
    era: '1010 CE',
    site: 'Thanjavur',
    state: 'Tamil Nadu',
    size: '8 plates',
    desc: 'Royal copper plate inscription by Raja Raja Chola I detailing the consecration gifts of the Brihadeeswarar temple — a primary epigraphic source.',
    added: '2024-01-22',
    researcher: 'Prof. Lakshmi Subramanian',
    tags: ['Chola', 'Copper Plate', 'Temple', 'Primary Source'],
  },
  {
    id: 'd4',
    title: 'Hampi Bazaar — 1930s Photographic Archive',
    type: 'photograph',
    language: 'Visual',
    era: '1930–1940 CE',
    site: 'Hampi',
    state: 'Karnataka',
    size: '214 prints',
    desc: 'Glass plate negatives and silver gelatin prints documenting the pre-independence state of the Hampi bazaar, chariot street, and temple gopurams.',
    added: '2024-06-01',
    researcher: 'Heritage Documentation Cell',
    tags: ['Photography', 'Bazaar', 'Colonial Period'],
  },
  {
    id: 'd5',
    title: 'Saraswat Bhojan Cookbook — Traditional Recipes',
    type: 'recipe',
    language: 'Konkani / Marathi',
    era: '18th–19th Century CE',
    site: 'Goa',
    state: 'Goa',
    size: '312 recipes',
    desc: 'A digitised culinary archive of traditional Saraswat cuisine from temple kitchens and merchant households, including seasonal festival menus.',
    added: '2024-04-12',
    researcher: 'Cultural Culinary Trust',
    tags: ['Food', 'Recipe', 'Saraswat', 'Tradition'],
  },
  {
    id: 'd6',
    title: 'Rajput Miniature Painting Scrolls',
    type: 'scroll',
    language: 'Braj Bhasha / Persian',
    era: '17th Century CE',
    site: 'Jaipur',
    state: 'Rajasthan',
    size: '62 scrolls',
    desc: 'Phad-style narrative scroll paintings depicting Krishna Leela, royal hunts, and court ceremonies from the Amber kingdom.',
    added: '2024-02-28',
    researcher: 'Dr. Vinita Sharma',
    tags: ['Rajput', 'Miniature', 'Painting', 'Court'],
  },
];

const HERITAGE_SITES: HeritageSite[] = [
  {
    id: 's1', name: 'Hampi — Vijayanagara Capital', state: 'Karnataka',
    type: 'UNESCO World Heritage Site', era: '14th–16th Century',
    desc: 'Ruins of the last great Hindu empire spanning 650 sq km. Home to the iconic Vittala Temple, stone chariot, and the Virupaksha complex.',
    artifacts: 18, documents: 34, lat: 15.335, lng: 76.461,
    tags: ['UNESCO', 'Empire', 'Dravidian', 'Rock-Cut'], imgEmoji: '🏛️',
  },
  {
    id: 's2', name: 'Mahabalipuram Shore Temple', state: 'Tamil Nadu',
    type: 'UNESCO World Heritage Site', era: '7th–8th Century',
    desc: 'Pallava-era rock-cut cave temples and monolithic rathas carved directly from granite boulders on the Bay of Bengal coast.',
    artifacts: 11, documents: 19, lat: 12.626, lng: 80.192,
    tags: ['UNESCO', 'Pallava', 'Rock-Cut', 'Shore'], imgEmoji: '🌊',
  },
  {
    id: 's3', name: 'Konark Sun Temple', state: 'Odisha',
    type: 'UNESCO World Heritage Site', era: '13th Century',
    desc: 'The Black Pagoda — a 13th-century chariot-form temple dedicated to Surya with 24 giant decorated wheels and astronomical precision.',
    artifacts: 9, documents: 14, lat: 19.887, lng: 86.094,
    tags: ['UNESCO', 'Ganga', 'Sun', 'Astronomy'], imgEmoji: '☀️',
  },
  {
    id: 's4', name: 'Ajanta Caves', state: 'Maharashtra',
    type: 'UNESCO World Heritage Site', era: '2nd Century BCE – 6th Century CE',
    desc: 'Buddhist monastic complex of 29 caves with the finest surviving examples of ancient Indian paintings and sculpture in polychrome pigment.',
    artifacts: 23, documents: 41, lat: 20.551, lng: 75.703,
    tags: ['UNESCO', 'Buddhist', 'Mural', 'Cave'], imgEmoji: '🪔',
  },
  {
    id: 's5', name: 'Belur & Halebidu Temples', state: 'Karnataka',
    type: 'World Heritage Nominee', era: '12th Century',
    desc: 'The finest expression of Hoysala temple architecture — star-shaped platforms with friezes of elephants, horses, scrolls, and divine figures.',
    artifacts: 14, documents: 22, lat: 13.164, lng: 75.863,
    tags: ['Hoysala', 'Stellate', 'Sculpture', 'Karnataka'], imgEmoji: '⭐',
  },
  {
    id: 's6', name: 'Brihadeeswarar Temple', state: 'Tamil Nadu',
    type: 'UNESCO World Heritage Site', era: '1010 CE',
    desc: 'The tallest temple vimana of its age — a 66 m pyramidal tower built by Raja Raja Chola I without a shadow at noon due to engineering precision.',
    artifacts: 16, documents: 28, lat: 10.787, lng: 79.137,
    tags: ['UNESCO', 'Chola', 'Dravidian', 'Architecture'], imgEmoji: '🕌',
  },
];

/* ── Colour tokens ────────────────────────────────────────────────────────── */
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

const TYPE_COLORS: Record<string, string> = {
  manuscript: '#5B21B6',
  inscription:'#0F766E',
  map:        '#15803D',
  photograph: '#B45309',
  recipe:     '#C2410C',
  scroll:     '#BE185D',
};

const CONDITION_COLORS: Record<string, string> = {
  Excellent: '#15803D',
  Good:      '#B45309',
  Fragile:   '#B91C1C',
  Restored:  '#6D28D9',
};

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════ */
export default function DigitalArchivesPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [tab,        setTab]        = useState<Tab | 'exhibitions' | 'collections'>('overview');
  const [docFilter,  setDocFilter]  = useState('all');
  const [search,     setSearch]     = useState('');
  const [viewer3d,   setViewer3d]   = useState<Artifact | null>(null);
  const [artFilter,  setArtFilter]  = useState('all');

  const SIDEBAR_ITEMS: { id: Tab | 'exhibitions' | 'collections'; iconUrl: string; label: string; sub: string }[] = [
    { id: 'overview',   iconUrl: '🏠', label: 'Overview',    sub: '' },
    { id: 'artifacts',  iconUrl: '🗿', label: 'Artifacts',   sub: '3D Scans & Objects' },
    { id: 'documents',  iconUrl: '📜', label: 'Documents',   sub: 'Manuscripts & Maps' },
    { id: 'research',   iconUrl: '🔬', label: 'Research Hub',sub: 'Scholars & Papers' },
    { id: 'sites',      iconUrl: '🏛️', label: 'Heritage Sites',sub: 'Linked Locations' },
    { id: 'exhibitions',iconUrl: '🖼️', label: 'Exhibitions', sub: 'Virtual Galleries' },
    { id: 'collections',iconUrl: '📦', label: 'Collections', sub: 'Curated Themes' },
  ];

  const totalArtifacts  = ARTIFACTS.length + 286;
  const totalDocuments  = DOCUMENTS.length + 1294;
  const totalSites      = HERITAGE_SITES.length + 84;
  const totalResearchers= 312;

  const filteredArtifacts = ARTIFACTS.filter(a => {
    if (artFilter !== 'all' && a.type.toLowerCase() !== artFilter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.site.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredDocs = DOCUMENTS.filter(d => {
    if (docFilter !== 'all' && d.type !== docFilter) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.site.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  /* ─────────────────────────────────────────────────────────────────
     CSS
  ───────────────────────────────────────────────────────────────── */
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

    @keyframes da-fade-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulse-ring { 0%{transform:scale(0.8);opacity:0.5;} 100%{transform:scale(1.2);opacity:0;} }
    @keyframes da-spin { to{transform:rotate(360deg)} }

    .da-page { 
      display:flex; 
      height:100vh; 
      background: ${theme === 'dark' ? 'radial-gradient(circle at 50% -20%, #151515, #050505)' : 'radial-gradient(circle at 80% 20%, rgba(247,243,233,0.4) 0%, rgba(253,251,247,0.8) 100%), ' + C.bg}; 
      overflow:hidden; 
      font-family:'Plus Jakarta Sans',system-ui,sans-serif; 
      color:${C.text}; 
    }

    /* Sidebar */
    .da-sidebar {
      width:240px; flex-shrink:0; background:${C.surface};
      border-right:1px solid ${C.border};
      display:flex; flex-direction:column; overflow:hidden;
      position:relative;
      box-shadow: 4px 0 24px rgba(0,0,0,${theme === 'dark' ? '0.5' : '0.04'});
    }
    .da-sidebar-watermark {
      position:absolute; bottom:0; left:0; width:100%; height:200px;
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="%23${theme === 'dark' ? '333' : 'e0cda7'}" d="M50 10 L10 40 L10 90 L90 90 L90 40 Z"/></svg>');
      background-size: cover; background-position: center bottom;
      opacity: ${theme === 'dark' ? '0.1' : '0.2'};
      pointer-events:none; z-index:0;
      mask-image: linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
      -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
    }

    .da-logo { padding:1.2rem 1.2rem; display:flex; align-items:center; gap:.7rem; z-index:1; }
    .da-logo-icon { 
      width:40px;height:40px;
      display:flex;align-items:center;justify-content:center;
      font-size:1.5rem;flex-shrink:0; 
      color:${C.gold};
    }
    .da-logo-title { font-family:'Cinzel',serif; font-weight:700;font-size:.9rem;color:${C.text};line-height:1.2; letter-spacing: 0.05em; text-transform:uppercase; }
    .da-logo-sub   { font-size:.65rem;color:${C.muted};margin-top:2px; font-weight: 500; }
    
    .da-nav-list { flex:1; overflow-y:auto; padding: 1rem 0; z-index:1; }
    .da-nav-btn {
      display:flex;align-items:center;gap:.75rem;padding:.75rem 1.2rem;
      background:none;border:none;cursor:pointer;color:${C.muted};
      text-align:left;width:100%;transition:all .2s ease;
    }
    .da-nav-btn:hover { color:${C.gold}; }
    .da-nav-btn.active { 
      background:${theme === 'dark' ? 'rgba(217, 156, 83, 0.1)' : '#F5EFE4'}; 
      color:${C.gold}; 
      border-radius:0 20px 20px 0;
      width:92%;
    }
    .da-nav-title { font-size:.85rem;font-weight:600;line-height:1.2; }
    .da-nav-sub   { font-size:.65rem;color:${theme === 'dark' ? '#555' : '#999'}; margin-top:2px; }
    .da-nav-btn.active .da-nav-title { color:${C.gold}; }
    
    .da-sidebar-footer { padding:1.2rem;margin-top:auto;display:flex;flex-direction:column;gap:.8rem; z-index:1; }
    .da-upload-btn {
      width:100%;padding:.8rem;border-radius:12px;
      background:none;
      color:${C.gold};font-weight:600;font-size:.85rem;
      border:1px solid rgba(217, 156, 83, 0.4);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.4rem;
      transition:all .2s ease;
    }
    .da-upload-btn:hover { background:rgba(217, 156, 83, 0.1); border-color:${C.gold}; }

    /* Main Content */
    .da-main    { flex:1;display:flex;flex-direction:column;overflow:hidden; }
    
    /* Header */
    .da-header  {
      padding:1.5rem 2rem;
      display:flex;align-items:center;justify-content:space-between;
    }
    .da-header-left h1 { font-family:'Plus Jakarta Sans',sans-serif; font-size:1.3rem; font-weight:600; margin:0 0 4px; color:${C.text}; }
    .da-header-left p { margin:0; font-size:.85rem; color:${C.muted}; }
    
    .da-header-right { display:flex; align-items:center; gap:1rem; }
    .da-search-box {
      background:${C.surface}; border:1px solid ${C.border};
      padding: .6rem 1rem; border-radius:30px; display:flex; align-items:center; gap:.5rem;
      width:280px; box-shadow:0 2px 8px rgba(0,0,0,${theme==='dark'?'0.2':'0.02'});
    }
    .da-search-box input { background:none; border:none; color:${C.text}; outline:none; font-size:.8rem; width:100%; }
    .da-search-box input::placeholder { color:${C.muted}; }
    
    .da-icon-btn {
      width:38px; height:38px; border-radius:50%; background:${C.surface}; border:1px solid ${C.border};
      display:flex; align-items:center; justify-content:center; cursor:pointer; color:${C.text}; position:relative;
    }
    .da-icon-btn:hover { border-color:${C.gold}; color:${C.gold}; }
    .da-notification-dot { position:absolute; top:8px; right:10px; width:6px; height:6px; background:#ef4444; border-radius:50%; }
    .da-avatar { width:38px; height:38px; border-radius:50%; background:${C.surface}; border:1px solid ${C.border}; display:flex; align-items:center; justify-content:center; font-size:.8rem; font-weight:600; color:${C.text}; }

    /* Scrollable Area */
    .da-content { flex:1;overflow-y:auto;padding:0 2rem 2rem; display:flex; flex-direction:column; gap:1.5rem; }
    .da-content::-webkit-scrollbar { width:6px; }
    .da-content::-webkit-scrollbar-thumb { background:rgba(217, 156, 83, 0.25);border-radius:3px; }

    /* Stats Grid */
    .da-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1.2rem; }
    .da-stat-card {
      background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; padding:1.2rem;
      display:flex; flex-direction:column; position:relative; overflow:hidden;
      box-shadow:0 4px 12px rgba(0,0,0,${theme==='dark'?'0.2':'0.02'});
    }
    .da-stat-icon { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.4rem; margin-bottom:1rem; }
    .da-stat-val { font-size:1.8rem; font-weight:600; color:${C.text}; line-height:1.1; margin-bottom:4px; }
    .da-stat-label { font-size:.8rem; color:${C.muted}; }
    .da-stat-sparkline { position:absolute; bottom:10px; left:0; width:100%; height:30px; }

    /* Main Dashboard Layout */
    .da-dashboard-main { display:grid; grid-template-columns:1.6fr 1fr; gap:1.2rem; }
    
    /* Center Featured Card */
    .da-featured-card {
      background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; padding:1.5rem;
      display:flex; flex-direction:column; position:relative; overflow:hidden;
      box-shadow:0 4px 20px rgba(0,0,0,${theme==='dark'?'0.3':'0.03'});
    }
    .da-featured-tag { font-size:.65rem; font-weight:700; color:${C.gold}; text-transform:uppercase; letter-spacing:.1em; margin-bottom:6px; }
    .da-featured-title { font-size:1.6rem; font-weight:600; color:${C.text}; line-height:1.2; margin-bottom:10px; }
    .da-meta-val { font-size:.85rem;color:${C.text};font-weight:600;display:flex;align-items:center;gap:.4rem; }
    .da-featured-meta { font-size:.8rem; color:${C.muted}; display:flex; align-items:center; gap:6px; margin-bottom:1rem; }

    @media (max-width: 768px) {
      .da-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 0.8rem; }
      .da-dashboard-main { grid-template-columns: 1fr; }
      .da-category-grid { grid-template-columns: repeat(2, 1fr); gap: 0.8rem; }
      .da-hero-title { font-size: 1.5rem; }
      .da-modal-body { grid-template-columns: 1fr; overflow-y: auto; }
      .da-modal { max-height: 98vh; width: 100%; border-radius: 16px 16px 0 0; position: absolute; bottom: 0; }
      .da-topbar { padding: 0 1rem; flex-wrap: wrap; height: auto; padding-top: 10px; padding-bottom: 10px; }
      .da-topbar > div:last-child { display: none !important; }
    }

    .da-featured-desc { font-size:.85rem; color:${theme==='dark'?'#999':'#666'}; max-width:60%; line-height:1.5; margin-bottom:1.5rem; }
    .da-btn-launch { 
      padding:.7rem 1.2rem; border-radius:8px; border:1px solid rgba(217, 156, 83, 0.4);
      background:none; color:${C.gold}; font-weight:600; font-size:.85rem; cursor:pointer;
      display:inline-flex; align-items:center; gap:.5rem; width:fit-content;
    }
    .da-btn-launch:hover { background:rgba(217, 156, 83, 0.1); border-color:${C.gold}; }

    /* 3D Model Stage */
    .da-stage {
      position:absolute; right:10px; top:10px; bottom:90px; left:40%;
      display:flex; align-items:center; justify-content:center;
    }
    .da-stage-grid {
      position:absolute; bottom:0; left:50%; transform:translateX(-50%) rotateX(70deg);
      width:300px; height:300px; border-radius:50%;
      border:1px solid rgba(59, 130, 246, 0.2);
      box-shadow: inset 0 0 40px rgba(59, 130, 246, 0.1), 0 0 20px rgba(59, 130, 246, 0.1);
    }
    .da-stage-grid::before {
      content:''; position:absolute; inset:20px; border-radius:50%; border:1px solid rgba(59, 130, 246, 0.4);
    }
    .da-stage-grid::after {
      content:''; position:absolute; inset:60px; border-radius:50%; border:1px dashed rgba(59, 130, 246, 0.6);
      animation: pulse-ring 4s infinite;
    }
    
    .da-controls {
      position:absolute; right:20px; top:50%; transform:translateY(-50%);
      display:flex; flex-direction:column; gap:6px; z-index:10;
    }
    .da-ctrl-btn {
      width:32px; height:32px; border-radius:8px; background:${theme==='dark'?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.05)'};
      border:1px solid ${C.border}; display:flex; align-items:center; justify-content:center;
      color:${C.text}; cursor:pointer; font-size:1rem;
    }
    .da-ctrl-btn:hover { background:${theme==='dark'?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)'}; }

    /* Thumbnails */
    .da-thumbnails { position:absolute; bottom:20px; left:20px; right:20px; display:flex; gap:10px; align-items:center; }
    .da-thumb {
      width:60px; height:60px; border-radius:10px; border:1px solid ${C.border};
      background:${theme==='dark'?'#111':'#F5F5F5'}; display:flex; align-items:center; justify-content:center;
      cursor:pointer; overflow:hidden; opacity:0.6; transition:all .2s;
    }
    .da-thumb.active, .da-thumb:hover { opacity:1; border-color:${C.gold}; }
    .da-thumb img { width:70%; height:70%; object-fit:contain; }
    .da-thumb-nav { width:24px; height:24px; display:flex; align-items:center; justify-content:center; color:${C.muted}; cursor:pointer; }

    /* Right Column Sections */
    .da-right-col { display:flex; flex-direction:column; gap:1.2rem; }
    .da-section-card {
      background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; padding:1.2rem;
      position:relative; overflow:hidden;
      box-shadow:0 4px 12px rgba(0,0,0,${theme==='dark'?'0.2':'0.02'});
    }
    .da-section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; }
    .da-section-title { font-size:.75rem; font-weight:700; color:${C.muted}; text-transform:uppercase; letter-spacing:.1em; }
    .da-view-all { font-size:.75rem; color:${C.gold}; cursor:pointer; }
    .da-view-all:hover { text-decoration:underline; }
    
    .da-recent-item { display:flex; align-items:center; justify-content:space-between; padding:.6rem 0; border-bottom:1px solid ${C.border}; cursor:pointer; }
    .da-recent-item:last-child { border-bottom:none; }
    .da-recent-item-left { display:flex; gap:.75rem; align-items:center; }
    .da-recent-img { width:32px; height:32px; border-radius:6px; background:${theme==='dark'?'#1a1a1a':'#F0F0F0'}; display:flex; align-items:center; justify-content:center; font-size:1.2rem; }
    .da-recent-name { font-size:.85rem; font-weight:600; color:${C.text}; margin-bottom:2px; }
    .da-recent-meta { font-size:.7rem; color:${C.muted}; }
    .da-recent-item-right { color:${C.gold}; font-size:.8rem; }
    
    .da-temple-bg {
      position:absolute; right:0; top:0; bottom:0; width:150px;
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="%23${theme === 'dark' ? '333' : 'e0cda7'}" d="M50 20 L20 40 L20 80 L80 80 L80 40 Z"/></svg>');
      background-size:cover; background-position:right center; opacity:${theme==='dark'?'0.1':'0.15'}; pointer-events:none;
      mask-image: linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 100%);
      -webkit-mask-image: linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 100%);
    }

    /* Tags */
    .da-tags-container { display:flex; flex-wrap:wrap; gap:.6rem; }
    .da-site-tag {
      padding:.4rem .8rem; border-radius:8px; border:1px solid ${C.border};
      color:${C.gold}; font-size:.75rem; background:none; cursor:pointer; display:flex; align-items:center; gap:.4rem;
      transition:all .15s;
    }
    .da-site-tag:hover { border-color:${C.gold}; background:rgba(217, 156, 83, 0.1); }
    
    /* Category Bottom */
    .da-category-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:1rem; margin-top:1rem; }
    .da-cat-card {
      background:${C.surface}; border:1px solid ${C.border}; border-radius:12px; overflow:hidden;
      cursor:pointer; transition:all .2s;
      box-shadow:0 4px 12px rgba(0,0,0,${theme==='dark'?'0.2':'0.02'});
    }
    .da-cat-card:hover { border-color:${C.gold}; transform:translateY(-2px); box-shadow:0 8px 16px rgba(0,0,0,${theme==='dark'?'0.3':'0.05'}); }
    .da-cat-img { height:100px; background:${theme==='dark'?'#111':'#F5F5F5'}; display:flex; align-items:center; justify-content:center; font-size:3rem; }
    .da-cat-info { padding:.8rem; }
    .da-cat-title { font-size:.85rem; font-weight:600; color:${C.text}; margin-bottom:2px; }
    .da-cat-sub { font-size:.7rem; color:${C.muted}; }

    /* 3D Modal */
    .da-modal-overlay { position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1.5rem; }
    .da-modal { width:100%;max-width:880px;background:${C.surface};border-radius:16px;border:1px solid ${C.border};overflow:hidden;display:flex;flex-direction:column;max-height:90vh; box-shadow: 0 20px 50px rgba(0,0,0,0.4); }
    .da-modal-header { padding:1.2rem 1.5rem;border-bottom:1px solid ${C.border};display:flex;justify-content:space-between;align-items:flex-start; }
    .da-modal-close { width:32px;height:32px;border-radius:8px;background:${C.bg};border:1px solid ${C.border};color:${C.text};cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center; transition: all .15s; }
    .da-modal-close:hover { border-color:${C.gold};color:${C.gold}; }
    .da-modal-body { display:grid;grid-template-columns:1.4fr 1fr;overflow:hidden;flex:1; }
    .da-modal-viewer { background:${C.bg};border-right:1px solid ${C.border}; }
    .da-modal-info  { padding:1.5rem;overflow-y:auto; background:${C.surface}; }
    .da-info-row    { display:flex;gap:.5rem;font-size:.82rem;margin-bottom:.65rem; border-bottom: 1px solid ${C.border}; padding-bottom: .4rem; }
    .da-info-label  { color:${C.muted};flex-shrink:0;min-width:90px; font-weight: 500; }
    .da-info-value  { color:${C.text};font-weight:700; }
    .da-tag { display:inline-flex;font-size:.65rem;font-weight:600;padding:3px 8px;border-radius:4px;background:${theme==='dark'?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.05)'};color:${C.muted};margin:2px;border: 1px solid ${C.border}; }

    /* Filter chips */
    .da-chip {
      padding:.4rem 1rem;border-radius:20px;font-size:.78rem;font-weight:600;
      cursor:pointer;border:1px solid ${C.border};
      background:${C.surface};color:${C.muted};transition:all .2s;
      white-space:nowrap;flex-shrink:0;
      box-shadow: 0 2px 6px rgba(0,0,0,0.01);
    }
    .da-chip:hover  { border-color:${C.gold};color:${C.gold}; }
    .da-chip.active { background:rgba(217, 156, 83, 0.1);border-color:${C.gold};color:${C.gold}; }

    /* Artifact cards */
    .da-artifact {
      border-radius:14px;overflow:hidden;
      background:${C.surface}; border:1px solid ${C.border};
      box-shadow: 0 4px 12px rgba(0,0,0, ${theme==='dark'?'0.2':'0.03'});
      transition:all .3s cubic-bezier(0.25, 0.8, 0.25, 1);cursor:pointer;
    }
    .da-artifact:hover { 
      border-color:${C.gold}; 
      transform:translateY(-4px); 
      box-shadow:0 12px 30px rgba(0,0,0, ${theme==='dark'?'0.4':'0.08'}); 
    }
    .da-artifact-img { height:200px;object-fit:cover;width:100%;display:block;background:${C.bg}; }
    .da-artifact-body { padding:1.1rem; }
    .da-artifact-era { font-size:.65rem;font-weight:700;color:${C.gold};text-transform:uppercase;letter-spacing:.08em; }
    .da-artifact-name { font-family:'Cinzel',serif; font-size:.95rem;font-weight:700;color:${C.text};margin:4px 0 2px; }
    .da-artifact-site { font-size:.75rem;color:${C.muted}; }
    .da-artifact-desc { font-size:.78rem;color:${theme==='dark'?'#888':'#4B5563'};margin-top:8px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden; }
    .da-3d-badge { display:inline-flex;align-items:center;gap:.3rem;font-size:.65rem;font-weight:700;padding:3px 9px;border-radius:20px;background:rgba(217, 156, 83, 0.1);color:${C.gold};border:1px solid rgba(217, 156, 83, 0.2);margin-top:6px; }
    .da-condition { display:inline-block;font-size:.65rem;font-weight:700;padding:3px 8px;border-radius:4px;border:1px solid;margin-left:6px; }

  `;

  return (
    <div className="da-page">
      <style>{css}</style>
      
      {/* 3D VIEWER MODAL */}
      {viewer3d && (
        <div className="da-modal-overlay" onClick={() => setViewer3d(null)}>
          <div className="da-modal" onClick={e => e.stopPropagation()}>
            <div className="da-modal-header">
              <div>
                <div style={{ fontSize: '.65rem', fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  3D Interactive Artifact
                </div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '2px 0 0', color: C.text }}>{viewer3d.name}</h2>
              </div>
              <button className="da-modal-close" onClick={() => setViewer3d(null)}>✕</button>
            </div>
            <div className="da-modal-body">
              <div className="da-modal-viewer">
                <Suspense fallback={
                  <div style={{ height: 440, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: C.muted, fontSize: '.82rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.gold, animation: 'da-spin 1s linear infinite' }} />
                    Loading 3D viewer…
                  </div>
                }>
                  <Artifact3DViewer
                    objUrl={viewer3d.objUrl!}
                    mtlUrl={viewer3d.mtlUrl!}
                    height={440}
                    bgColor={C.bg}
                    autoRotate
                  />
                </Suspense>
              </div>
              <div className="da-modal-info">
                <div style={{ fontWeight: 700, fontSize: '.82rem', marginBottom: '.85rem', color: C.gold }}>Artifact Details</div>
                {([
                  ['Site',       viewer3d.site],
                  ['State',      viewer3d.state],
                  ['Era',        viewer3d.era],
                  ['Type',       viewer3d.type],
                  ['Material',   viewer3d.material],
                  ['Condition',  viewer3d.condition],
                  ['Discovered', viewer3d.discovered],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="da-info-row">
                    <span className="da-info-label">{k}</span>
                    <span className="da-info-value">{v}</span>
                  </div>
                ))}
                <p style={{ fontSize: '.78rem', color: theme==='dark'?'#888':'#6B7280', lineHeight: 1.5, marginTop: '.75rem', borderTop: `1px solid ${C.border}`, paddingTop: '.75rem' }}>
                  {viewer3d.desc}
                </p>
                <div style={{ marginTop: '.85rem', display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>
                  {viewer3d.tags.map(t => <span key={t} className="da-tag">{t}</span>)}
                </div>
                <div style={{ marginTop: '1rem', padding: '.75rem', borderRadius: '8px', background: 'rgba(217, 156, 83,.06)', border: '1px solid rgba(217, 156, 83,.15)', fontSize: '.72rem', color: C.muted, lineHeight: 1.4 }}>
                  📍 Coordinates: {viewer3d.lat.toFixed(3)}°N, {viewer3d.lng.toFixed(3)}°E<br/>
                  Captured using <strong style={{ color: C.gold }}>LiDAR Scaniverse</strong> technology
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SIDEBAR ═══ */}
      <aside className="da-sidebar">
        <div className="da-sidebar-watermark"></div>
        <div className="da-logo">
          <div className="da-logo-icon">🏛️</div>
          <div>
            <div className="da-logo-title">Heritage Vault</div>
            <div className="da-logo-sub">Digital Archives & Research Hub</div>
          </div>
        </div>
        <div className="da-nav-list">
          {SIDEBAR_ITEMS.map(item => (
            <button key={item.id} className={`da-nav-btn ${tab === item.id ? 'active' : ''}`} onClick={() => setTab(item.id)}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.iconUrl}</span>
              <div>
                <div className="da-nav-title">{item.label}</div>
                <div className="da-nav-sub">{item.sub}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="da-sidebar-footer">
          <button className="da-upload-btn">⬆️ Upload Artifact</button>
          <button style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '1.5rem', flexShrink: 0 }}
            onClick={() => navigate('/')} title="Back to Home">
            <VoHLogo size={32} />
          </button>
        </div>
      </aside>

      {/* ═══ MAIN AREA ═══ */}
      <div className="da-main">
        {/* Header */}
        <header className="da-header">
          <div className="da-header-left">
            <h1>Welcome back, Researcher 👋</h1>
            <p>Preserving India's heritage for generations to come.</p>
          </div>
          <div className="da-header-right">
            <div className="da-search-box">
              <span style={{ color: C.muted }}>🔍</span>
              <input type="text" placeholder="Search archives, artifacts, documents..." />
            </div>
            
            {/* Theme Toggle Button */}
            <ThemeToggle />

            <div className="da-icon-btn">
              🔔
              <span className="da-notification-dot"></span>
            </div>
            <div className="da-avatar">RV</div>
          </div>
        </header>

        {/* Content Area */}
        <div className="da-content">
          {tab === 'overview' && (
            <>
              {/* Top Stats */}
              <div className="da-stats-grid">
                {[
                  { label: 'Artifacts Digitized', val: totalArtifacts, icon: '🧊', color: '#a855f7', path: 'M0,20 Q20,10 40,25 T80,15 T120,20' },
                  { label: 'Documents Archived', val: totalDocuments, icon: '📄', color: '#3b82f6', path: 'M0,15 Q20,25 40,15 T80,20 T120,10' },
                  { label: 'Heritage Sites Linked', val: totalSites, icon: '🏛️', color: '#22c55e', path: 'M0,25 Q30,5 50,15 T100,5 T120,20' },
                  { label: 'Active Researchers', val: totalResearchers, icon: '👥', color: '#f97316', path: 'M0,20 Q20,30 50,10 T90,25 T120,15' },
                ].map((s,i) => (
                  <div key={i} className="da-stat-card">
                    <div className="da-stat-icon" style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}40` }}>{s.icon}</div>
                    <div className="da-stat-val">{s.val.toLocaleString()}</div>
                    <div className="da-stat-label">{s.label}</div>
                    <svg className="da-stat-sparkline" viewBox="0 0 120 30" preserveAspectRatio="none">
                      <path d={s.path} fill="none" stroke={s.color} strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                ))}
              </div>

              {/* Middle Dashboard */}
              <div className="da-dashboard-main">
                {/* Left: Featured 3D */}
                <div className="da-featured-card">
                  <div className="da-featured-tag">FEATURED 3D SCAN</div>
                  <div className="da-featured-title">Vijayanagara<br/>Column Capital</div>
                  <div className="da-featured-meta">
                    <span style={{color: C.gold}}>📍</span> Hampi, Karnataka • 14th–16th Century CE
                  </div>
                  <div className="da-featured-desc">
                    A masterpiece of Vijayanagara architecture, carved with precision and symbolism.
                  </div>
                  <button className="da-btn-launch" onClick={() => setViewer3d(ARTIFACTS[0])}>
                    🧊 Launch 3D Viewer
                  </button>

                  <div className="da-stage">
                    <div className="da-stage-grid"></div>
                    <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '300px', filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.5))' }}>
                      <Suspense fallback={
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, flexDirection: 'column', gap: '1rem', fontSize: '.82rem' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.gold, animation: 'da-spin 1s linear infinite' }} />
                          Loading 3D model…
                        </div>
                      }>
                        <Artifact3DViewer
                          objUrl="/models/Scaniverse_2026_05_10_120446.obj"
                          mtlUrl="/models/Scaniverse_2026_05_10_120446.mtl"
                          height={300}
                          bgColor="transparent"
                          autoRotate
                        />
                      </Suspense>
                    </div>
                  </div>

                  <div className="da-controls">
                    <button className="da-ctrl-btn">+</button>
                    <button className="da-ctrl-btn">-</button>
                    <button className="da-ctrl-btn">↻</button>
                    <button className="da-ctrl-btn" onClick={() => setViewer3d(ARTIFACTS[0])}>⤢</button>
                  </div>

                  <div className="da-thumbnails">
                    <div className="da-thumb-nav">&lt;</div>
                    {[
                      { active: true, emoji: '🗿' },
                      { active: false, emoji: '📜' },
                      { active: false, emoji: '🗿' },
                      { active: false, emoji: '💍' },
                    ].map((t, i) => (
                      <div key={i} className={`da-thumb ${t.active ? 'active' : ''}`}>
                        <span style={{fontSize:'2rem'}}>{t.emoji}</span>
                      </div>
                    ))}
                    <div className="da-thumb-nav">&gt;</div>
                  </div>
                </div>

                {/* Right: Lists */}
                <div className="da-right-col">
                  {/* Recently Added */}
                  <div className="da-section-card">
                    <div className="da-temple-bg"></div>
                    <div className="da-section-header">
                      <div className="da-section-title">RECENTLY ADDED</div>
                      <div className="da-view-all">View all &rarr;</div>
                    </div>
                    <div>
                      {[
                        { name: 'Vijayanagara Column Capital', meta: 'Hampi • 14th–16th Century CE', emoji: '🗿' },
                        { name: 'Hoysala Star Bracket', meta: 'Belur • 12th Century CE', emoji: '🗿' },
                        { name: 'Pallava Inscription Slab', meta: 'Mahabalipuram • 7th Century CE', emoji: '📜' },
                      ].map((item, i) => (
                        <div key={i} className="da-recent-item" onClick={() => setViewer3d(ARTIFACTS[i])}>
                          <div className="da-recent-item-left">
                            <div className="da-recent-img">{item.emoji}</div>
                            <div>
                              <div className="da-recent-name">{item.name}</div>
                              <div className="da-recent-meta">{item.meta}</div>
                            </div>
                          </div>
                          <div className="da-recent-item-right">&gt;</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Linked Heritage Sites */}
                  <div className="da-section-card">
                    <div className="da-section-header">
                      <div className="da-section-title">LINKED HERITAGE SITES</div>
                      <div className="da-view-all">View all &rarr;</div>
                    </div>
                    <div className="da-tags-container">
                      {[
                        { n: 'Hampi', e: '🏛️' },
                        { n: 'Mahabalipuram Shore Temple', e: '🏛️' },
                        { n: 'Konark Sun Temple', e: '🏛️' },
                        { n: 'Belur & Halebidu Temples', e: '🏛️' },
                        { n: 'Brihadeeswarar Temple', e: '🏛️' },
                        { n: 'Ajanta Caves', e: '🏛️' },
                        { n: 'Ellora Caves', e: '🏛️' },
                      ].map((tag, i) => (
                         <button key={i} className="da-site-tag">
                           {tag.e} {tag.n}
                         </button>
                      ))}
                      <button className="da-site-tag" style={{ borderStyle: 'dashed' }}>+ 3 more</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom: Browse by Category */}
              <div style={{ marginTop: '1.5rem' }}>
                <div className="da-section-header" style={{ marginBottom: 0 }}>
                  <div className="da-section-title">BROWSE BY CATEGORY</div>
                  <div className="da-view-all" onClick={() => setTab('artifacts')}>Explore all categories &rarr;</div>
                </div>
                <div className="da-category-grid">
                  {[
                    { t: 'Sculptures', s: 'Stone & Metal Art', e: '🗿', filter: 'sculpture' },
                    { t: 'Manuscripts', s: 'Ancient Texts', e: '📜', filter: 'manuscript' },
                    { t: 'Inscriptions', s: 'Stone & Copper Plates', e: '🪨', filter: 'inscription' },
                    { t: 'Maps', s: 'Historical Maps', e: '🗺️', filter: 'map' },
                    { t: 'Photographs', s: 'Vintage Collection', e: '📷', filter: 'photograph' },
                    { t: 'Recipes', s: 'Culinary Heritage', e: '🍛', filter: 'recipe' },
                  ].map((cat, i) => (
                    <div key={i} className="da-cat-card" onClick={() => {
                        if(['manuscript','map','photograph','recipe'].includes(cat.filter)) {
                            setTab('documents');
                            setDocFilter(cat.filter);
                        } else {
                            setTab('artifacts');
                            setArtFilter(cat.filter);
                        }
                    }}>
                      <div className="da-cat-img">{cat.e}</div>
                      <div className="da-cat-info">
                        <div className="da-cat-title">{cat.t}</div>
                        <div className="da-cat-sub">{cat.s}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ═══════════════════════════ ARTIFACTS TAB ═══════════════════════════ */}
          {tab === 'artifacts' && (
            <div>
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.75rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 3px', fontFamily: "'Cinzel', serif" }}>🗿 Heritage Artifacts</h1>
                  <p style={{ color: C.muted, fontSize: '.82rem', margin: 0 }}>Digitally preserved artifacts with interactive 3D viewers, linked to heritage sites</p>
                </div>
                <button className="da-btn-launch" style={{ background: `linear-gradient(135deg, ${C.amber}, ${C.gold})`, color: '#fff', border: 'none' }}>⬆️ Submit Artifact</button>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: '.4rem', marginBottom: '1.5rem', flexWrap: 'wrap', overflowX: 'auto' }}>
                {['all','architecture','sculpture','inscription','mural','bronze cast'].map(f => (
                  <button key={f} className={`da-chip ${artFilter === f ? 'active' : ''}`} onClick={() => setArtFilter(f)}>
                    {f === 'all' ? 'All Types' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {/* Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '1.2rem' }}>
                {filteredArtifacts.map(a => (
                  <div key={a.id} className="da-artifact" onClick={() => a.has3d ? setViewer3d(a) : undefined}>
                    {/* Image placeholder with emoji */}
                    <div className="da-artifact-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', flexDirection: 'column', gap: '.25rem' }}>
                      {a.type === 'Architecture' ? '🏛️' : a.type === 'Sculpture' ? '🗿' : a.type === 'Inscription' ? '📜' : a.type === 'Bronze Cast' ? '🥉' : '🎨'}
                      {a.has3d && <div style={{ fontSize: '.62rem', background: 'rgba(217, 156, 83,.9)', color: '#09090C', padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>🔄 3D Model Available</div>}
                    </div>
                    <div className="da-artifact-body">
                      <div className="da-artifact-era">{a.era}</div>
                      <div className="da-artifact-name">{a.name}</div>
                      <div className="da-artifact-site">📍 {a.site}, {a.state}</div>
                      <p className="da-artifact-desc">{a.desc}</p>
                      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '.4rem' }}>
                        <span style={{ fontSize: '.65rem', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', background: `${theme==='dark'?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.05)'}`, color: C.text, border: `1px solid ${C.border}` }}>
                          {a.material}
                        </span>
                        <span className="da-condition" style={{ color: CONDITION_COLORS[a.condition], borderColor: `${CONDITION_COLORS[a.condition]}44`, background: `${CONDITION_COLORS[a.condition]}11` }}>
                          {a.condition}
                        </span>
                        {a.has3d && <span className="da-3d-badge">🔄 3D View</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab !== 'overview' && tab !== 'artifacts' && (
             <div style={{ padding: '4rem', textAlign: 'center', color: C.muted }}>
               <h2>{SIDEBAR_ITEMS.find(s => s.id === tab)?.label} Segment</h2>
               <p>Content for this tab is available in the full repository context.</p>
               <button className="da-btn-launch" onClick={() => setTab('overview')} style={{ marginTop: '1rem' }}>Return to Overview</button>
             </div>
          )}

        </div>
      </div>
    </div>
  );
}
