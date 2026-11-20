import { useEffect, useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import VoHLogo from '@/components/VoHLogo';

// ─── Data ───────────────────────────────────────────────────────────────────

const MODULES = [
  { emoji: '🌐', title: 'Immersive Experiences', desc: 'VR/AR tours & 360° storytelling',    href: '/immersive',       phase: 3  },
  { emoji: '🧠', title: 'Smart Utilities',        desc: 'AI chatbot, weather & offline nav',  href: '/smart-utilities', phase: 4  },
  { emoji: '📚', title: 'Digital Archives',       desc: 'Manuscripts, murals & artifacts',    href: '/archives',        phase: 7  },
  { emoji: '🤝', title: 'Partnerships',           desc: 'UNESCO, tourism boards & transport', href: '/partnerships',    phase: 8  },
  { emoji: '🏠', title: 'Smart Stay',             desc: 'Homestays & eco-camp booking',       href: '/stay',            phase: 9  },
  { emoji: '🌿', title: 'Conservation',           desc: 'Adopt, volunteer & report damage',   href: '/conservation',    phase: 10 },
  { emoji: '🧘', title: 'Wellness',               desc: 'Meditation retreats & rituals',      href: '/wellness',        phase: 11 },
  { emoji: '🍛', title: 'Culinary Heritage',      desc: 'Food trails & Cook with a Local',    href: '/food',            phase: 12 },
  { emoji: '🎒', title: 'Activity Booking',       desc: 'Treks, viewings & photo tours',      href: '/activity',        phase: 13 },
  { emoji: '🛍️', title: 'Artisan Marketplace',   desc: 'Certified crafts & live demos',      href: '/artisan',         phase: 15 },
  { emoji: '💰', title: 'Community',              desc: 'Guides, bonds & barter board',       href: '/community',       phase: 16 },
];

const NAV_ITEMS = [
  { id: 'overview',     icon: '🏠', label: 'Overview'           },
  { id: 'explore',      icon: '🗺️', label: 'Explore Sites'     },
  { id: 'ai-planner',   icon: '✈️', label: 'Trip Planner (AI)' },
  { id: 'archives',     icon: '📚', label: 'Archives'          },
  { id: 'experiences',  icon: '🎭', label: 'Experiences'       },
  { id: 'saved',        icon: '🔖', label: 'Saved'             },
  { id: 'bookings',     icon: '🎟️', label: 'Activity/Ticketing'},
];

const ANNOUNCEMENTS = [
  { id: 1, tag: '🎉 New',    title: 'Phase 3 launches April 2026',      body: 'Immersive VR/AR tours of 12 UNESCO-listed temples go live next month.' },
  { id: 2, tag: '📣 Update', title: 'Digital Archives beta is open',    body: 'Upload and explore rare manuscripts from the Vijayanagara empire.' },
  { id: 3, tag: '🌿 Impact', title: '500 sites now conservation-mapped', body: 'Join 3,400 volunteers protecting endangered heritage landmarks.' },
];

const SPOTLIGHT = {
  name:     'Hampi — Vijayanagara Empire',
  location: 'Karnataka, India',
  desc:     'Wander through the ruins of a 14th-century empire spanning 650 sq km. Bazaar streets, chariot temples, and monolithic bulls await.',
  tags:     ['UNESCO', 'Karnataka', 'Medieval', 'Temple Architecture'],
};

const ROLE_LABELS: Record<string, string> = {
  user:        '🧳 Traveller',
  researcher:  '📚 Researcher',
  guide:       '🗺️ Heritage Guide',
  institution: '🎓 Institution',
  admin:       '⚙️ Admin',
};

/* ── Colour tokens ────────────────────────────────────────────────────────── */
const DARK_THEME = {
  bg:      '#050505',
  surface: '#0A0A0B',
  card:    '#0F0F11',
  border:  'rgba(255, 255, 255, 0.05)',
  amber:   '#B4773B',
  gold:    '#D99C53',
  text:    '#EDEDED',
  muted:   '#7A7A7A',
};

const LIGHT_THEME = {
  bg:      '#FDFBF7',
  surface: '#FFFFFF',
  card:    '#F7F3E9',
  border:  'rgba(180, 130, 80, 0.18)',
  amber:   '#A15B17',
  gold:    '#D97706',
  text:    '#2E251E',
  muted:   '#786A5E',
};

// ─── Support Modal ───────────────────────────────────────────────────────────

function SupportModal({ onClose, theme }: { onClose: () => void; theme: 'dark' | 'light' }) {
  const { user } = useAuth();
  const [form,    setForm]    = useState({ name: user?.name || '', email: user?.email || '', subject: '', message: '' });
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);

  const C = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setSent(true);
    setLoading(false);
  };

  return (
    <div style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'1.5rem',fontFamily:"'Plus Jakarta Sans', sans-serif" }} onClick={onClose}>
      <div style={{ width:'100%',maxWidth:'500px',background:C.surface,borderRadius:'16px',border:`1px solid ${C.border}`,overflow:'hidden',boxShadow:'0 20px 50px rgba(0,0,0,0.4)', color: C.text }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:'1.2rem 1.5rem',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <span style={{ fontWeight: 600, color: C.text }}>💬 Contact Support</span>
          <button style={{ background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'1.2rem' }} onClick={onClose}>✕</button>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>✅</div>
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '1.1rem' }}>Message sent!</h3>
            <p style={{ color: C.muted, fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Our heritage team will get back to you within 24 hours.
            </p>
            <button style={{ background:`linear-gradient(135deg, ${C.amber}, ${C.gold})`,color:'#fff',padding:'.6rem 2.5rem',borderRadius:'8px',border:'none',cursor:'pointer',fontWeight:600 }} onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form style={{ padding: '1.5rem' }} onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display:'block',fontSize:'.75rem',fontWeight:600,color:C.muted,marginBottom:'6px' }}>Name</label>
                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  style={{ width:'100%',padding:'.7rem',borderRadius:'8px',border:`1px solid ${C.border}`,background:C.bg,color:C.text,outline:'none' }}/>
              </div>
              <div>
                <label style={{ display:'block',fontSize:'.75rem',fontWeight:600,color:C.muted,marginBottom:'6px' }}>Email</label>
                <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  style={{ width:'100%',padding:'.7rem',borderRadius:'8px',border:`1px solid ${C.border}`,background:C.bg,color:C.text,outline:'none' }}/>
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <label style={{ display:'block',fontSize:'.75rem',fontWeight:600,color:C.muted,marginBottom:'6px' }}>Subject</label>
              <select required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                style={{ width:'100%',padding:'.7rem',borderRadius:'8px',border:`1px solid ${C.border}`,background:C.bg,color:C.text,outline:'none' }}>
                <option value="">Select a topic…</option>
                <option value="account">Account &amp; Profile</option>
                <option value="booking">Booking &amp; Payments</option>
                <option value="heritage">Heritage Site Information</option>
                <option value="technical">Technical Issue</option>
                <option value="partnership">Partnership Enquiry</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <label style={{ display:'block',fontSize:'.75rem',fontWeight:600,color:C.muted,marginBottom:'6px' }}>Message</label>
              <textarea rows={4} required placeholder="Describe your issue or question…" style={{ width:'100%',padding:'.7rem',borderRadius:'8px',border:`1px solid ${C.border}`,background:C.bg,color:C.text,outline:'none',resize:'vertical' }}
                value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}/>
            </div>
            <button type="submit" disabled={loading} style={{ width:'100%',marginTop:'1rem',background:`linear-gradient(135deg, ${C.amber}, ${C.gold})`,color:'#fff',padding:'.8rem',borderRadius:'8px',border:'none',cursor:'pointer',fontWeight:600 }}>
              {loading ? '⏳ Sending…' : '📨 Send Message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [activeNav,     setActiveNav]     = useState('overview');
  const [supportOpen,   setSupportOpen]   = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [expStats, setExpStats] = useState({ sitesVisited: 0, experiencesRecorded: 0, tripsCompleted: 0, preferencesCount: 0 });

  useEffect(() => {
    if (!loading && !user) navigate('/auth/login');
  }, [user, loading, navigate]);

  useEffect(() => {
    const uid = user?.id || localStorage.getItem('voh_user_id');
    if (!uid) return;
    axios.get(`/api/experiences/summary?userId=${encodeURIComponent(uid)}`, { headers: { 'x-user-id': uid } })
      .then(({ data }) => {
        if (data?.success && data?.stats) {
          setExpStats({
            sitesVisited: data.stats.placesVisited || 0,
            experiencesRecorded: data.stats.experiencesRecorded || 0,
            tripsCompleted: data.stats.tripsCompleted || 0,
            preferencesCount: (data.prefers?.length || 0) + (data.avoids?.length || 0),
          });
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.voh-avatar-container')) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505' }}>
        <div style={{ fontSize: '3.5rem' }}>🏛️</div>
      </div>
    );
  }

  const C = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

  const hour  = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const initials = user?.name?.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  /* ─────────────────────────────────────────────────────────────────
     CSS
  ───────────────────────────────────────────────────────────────── */
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

    .voh-page { 
      display:flex; 
      height:100vh; 
      background: ${theme === 'dark' ? 'radial-gradient(circle at 50% -20%, #151515, #050505)' : 'radial-gradient(circle at 80% 20%, rgba(247,243,233,0.4) 0%, rgba(253,251,247,0.8) 100%), ' + C.bg}; 
      overflow:hidden; 
      font-family:'Plus Jakarta Sans',system-ui,sans-serif; 
      color:${C.text}; 
      position:relative;
    }

    /* Background image at the top behind the name */
    .voh-epic-bg {
      position:absolute; top:0; left:0; right:0; height:450px;
      background: url('/images/dashboard_top_bg.jpeg') no-repeat center top;
      background-size: cover; z-index: 0;
      opacity: ${theme === 'dark' ? '0.22' : '0.15'};
      mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
      -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
      pointer-events:none;
    }

    /* Sidebar */
    .voh-sidebar {
      width:240px; flex-shrink:0; background:${C.surface};
      border-right:1px solid ${C.border};
      display:flex; flex-direction:column; overflow:hidden;
      position:relative; z-index:10;
      box-shadow: 4px 0 24px rgba(0,0,0,${theme === 'dark' ? '0.5' : '0.04'});
    }
    .voh-sidebar-watermark {
      position:absolute; bottom:0; left:0; width:100%; height:200px;
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="%23${theme === 'dark' ? '333' : 'e0cda7'}" d="M50 10 L10 40 L10 90 L90 90 L90 40 Z"/></svg>');
      background-size: cover; background-position: center bottom;
      opacity: ${theme === 'dark' ? '0.1' : '0.2'};
      pointer-events:none; z-index:0;
      mask-image: linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
      -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
    }

    .voh-logo { padding:1.2rem 1.2rem; display:flex; align-items:center; gap:.7rem; z-index:1; }
    .voh-logo-icon { 
      width:40px;height:40px;
      display:flex;align-items:center;justify-content:center;
      font-size:1.5rem;flex-shrink:0; 
      color:${C.gold};
    }
    .voh-logo-title { font-family:'Cinzel',serif; font-weight:700;font-size:.95rem;color:${C.text};line-height:1.2; letter-spacing: 0.05em; text-transform:uppercase; }
    .voh-logo-sub   { font-size:.65rem;color:${C.muted};margin-top:2px; font-weight: 500; }
    
    .voh-nav-list { flex:1; overflow-y:auto; padding: 1rem 0; z-index:1; }
    .voh-nav-section-label { font-size: .65rem; font-weight: 700; color: ${C.muted}; text-transform: uppercase; letter-spacing: .1em; padding: 0 1.2rem .5rem; margin-top: .5rem; }
    .voh-nav-btn {
      display:flex;align-items:center;gap:.75rem;padding:.75rem 1.2rem;
      background:none;border:none;cursor:pointer;color:${C.muted};
      text-align:left;width:100%;transition:all .2s ease;
      font-weight: 500; font-size: .85rem;
    }
    .voh-nav-btn:hover { color:${C.gold}; }
    .voh-nav-btn.active { 
      background:${theme === 'dark' ? 'rgba(217, 156, 83, 0.1)' : '#F5EFE4'}; 
      color:${C.gold}; 
      border-radius:0 20px 20px 0;
      width:92%;
      border-left: 3px solid ${C.gold};
    }
    .voh-nav-divider { height:1px; background:${C.border}; margin: .5rem 1.2rem; }
    
    .voh-sidebar-footer { padding:1.2rem;margin-top:auto;display:flex;flex-direction:column;gap:.8rem; z-index:1; border-top: 1px solid ${C.border}; }
    
    .voh-profile-chip {
      display:flex; align-items:center; gap:.8rem; padding:0.8rem 1rem; cursor:pointer;
      border-radius:12px; border:1px solid ${C.border}; background:${theme==='dark'?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)'};
      text-decoration:none; transition: border .2s; z-index:1;
    }
    .voh-profile-chip:hover { border-color:${C.gold}; }
    
    /* Main Content */
    .voh-main { flex:1;display:flex;flex-direction:column;overflow:hidden; position:relative; z-index:1; }
    
    /* Header */
    .voh-header {
      padding:1.5rem 2rem; display:flex;align-items:center;justify-content:space-between; z-index:2;
    }
    .voh-icon-btn {
      width:38px; height:38px; border-radius:50%; background:${C.surface}; border:1px solid ${C.border};
      display:flex; align-items:center; justify-content:center; cursor:pointer; color:${C.text}; position:relative;
      font-size: 1rem; transition: all 0.2s;
    }
    .voh-icon-btn:hover { border-color:${C.gold}; color:${C.gold}; }
    .voh-avatar { width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg, ${C.amber}, ${C.gold}); border:1px solid ${C.border}; display:flex; align-items:center; justify-content:center; font-size:.8rem; font-weight:700; color:#fff; }

    /* Scrollable Area */
    .voh-content { flex:1;overflow-y:auto;padding:0 2rem 2rem; display:flex; flex-direction:column; gap:1.8rem; z-index:1; }
    .voh-content::-webkit-scrollbar { width:6px; }
    .voh-content::-webkit-scrollbar-thumb { background:rgba(217, 156, 83, 0.25);border-radius:3px; }

    /* Hero & Greeting */
    .voh-hero { display:flex; justify-content:space-between; align-items:flex-end; }
    .voh-hero-sub { color:${C.muted}; font-size:.9rem; margin:0 0 .3rem; font-weight:500; }
    .voh-hero-name { font-family:'Cinzel',serif; font-size:2.2rem; font-weight:700; margin:0 0 .5rem; color:${C.text}; letter-spacing:0.02em; }
    .voh-role-badge { display:inline-flex; align-items:center; gap:.4rem; padding:.2rem .7rem; background:rgba(217,156,83,0.1); color:${C.gold}; border-radius:20px; font-size:.7rem; font-weight:700; border:1px solid rgba(217,156,83,0.2); }

    /* Stats Grid */
    .voh-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:1.2rem; }
    .voh-stat-card {
      background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; padding:1.2rem;
      display:flex; align-items:center; gap:1rem;
      box-shadow:0 4px 12px rgba(0,0,0,${theme==='dark'?'0.2':'0.02'});
      backdrop-filter: blur(10px);
    }
    .voh-stat-icon { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; background:Professional-grade gold color token${theme==='dark'?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.03)'}; border:1px solid Professional-grade gold color token${C.border}; }
    
    /* Layout: Spotlight + Announcements */
    .voh-two-col { display:grid; grid-template-columns:1.68fr 1fr; gap:1.2rem; }
    
    /* Heritage Spotlight Card */
    .voh-spotlight {
      background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; padding:2rem;
      position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:center;
      box-shadow:0 4px 20px rgba(0,0,0,${theme==='dark'?'0.3':'0.03'});
      min-height: 320px; backdrop-filter: blur(10px);
    }
    .voh-spotlight-tag { display:inline-flex; align-items:center; gap:.4rem; color:${C.gold}; font-size:.65rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; margin-bottom:1rem; }
    .voh-spotlight-title { font-family:'Cinzel',serif; font-size:1.6rem; font-weight:700; color:${C.text}; margin:0 0 .5rem; max-width:55%; line-height:1.2; }
    .voh-spotlight-loc { color:${C.muted}; font-size:.85rem; font-weight:500; margin:0 0 1rem; display:flex; align-items:center; gap:.4rem; }
    .voh-spotlight-desc { font-size:.85rem; color:${theme==='dark'?'#a1a1aa':'#52525b'}; line-height:1.55; max-width:52%; margin:0 0 1.5rem; }
    .voh-tags { display:flex; gap:.5rem; flex-wrap:wrap; margin-bottom:1.5rem; }
    .voh-tag { padding:.2rem .6rem; border:1px solid ${C.border}; border-radius:4px; font-size:.68rem; font-weight:600; color:${C.muted}; background:${theme==='dark'?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.02)'}; }
    .voh-spotlight-img {
      position:absolute; right: 2%; top: 50%; transform:translateY(-50%); height: 85%; width: 42%; object-fit: cover;
      border-radius: 12px; border: 1px solid ${C.border};
      box-shadow: 0 10px 30px rgba(0,0,0,0.3); pointer-events:none; z-index:0;
    }

    /* Announcements */
    .voh-announcements { display:flex; flex-direction:column; gap:0.8rem; }
    .voh-section-title { display:flex; justify-content:space-between; align-items:center; font-family:'Cinzel',serif; font-size:1.05rem; font-weight:700; color:${C.text}; letter-spacing: 0.03em; }
    .voh-ann-card { background:${C.surface}; border:1px solid ${C.border}; border-radius:12px; padding:1rem; display:flex; flex-direction:column; gap:.4rem; transition:all .2s; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.02); }
    .voh-ann-card:hover { border-color:${C.gold}; transform: translateY(-1px); }
    .voh-ann-tag { font-size:.65rem; font-weight:700; color:${C.gold}; text-transform:uppercase; }
    .voh-ann-title { font-size:.85rem; font-weight:700; color:${C.text}; }
    .voh-ann-body { font-size:.78rem; color:${C.muted}; line-height:1.4; }
    
    /* Modules */
    .voh-modules { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:1.2rem; }
    .voh-module-card {
      background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; padding:1.4rem;
      cursor:pointer; transition:all .3s cubic-bezier(0.25, 0.8, 0.25, 1);
      display:flex; flex-direction:column; height:100%; position:relative; overflow:hidden;
      box-shadow:0 4px 12px rgba(0,0,0,0.02);
    }
    .voh-module-card:hover { border-color:${C.gold}; transform:translateY(-4px); box-shadow:0 12px 30px rgba(0,0,0,${theme==='dark'?'0.4':'0.08'}); }
    
    .voh-btn-primary {
      padding:.6rem 1.2rem; background:linear-gradient(135deg, ${C.amber}, ${C.gold}); border:none; border-radius:8px;
      color:#fff; font-weight:700; font-size:.85rem; cursor:pointer; display:inline-flex; align-items:center; gap:.5rem; z-index:1;
      transition:transform .2s;
    }
    .voh-btn-primary:hover { transform:scale(1.02); }
    
    .voh-btn-outline {
      padding:.6rem 1.2rem; background:none; border:1px solid rgba(217, 156, 83, 0.4); border-radius:8px;
      color:${C.gold}; font-weight:700; font-size:.85rem; cursor:pointer; display:inline-flex; align-items:center; gap:.5rem; z-index:1;
      transition:all .2s;
    }
    .voh-btn-outline:hover { background:rgba(217, 156, 83, 0.1); border-color:${C.gold}; }

    .voh-footer { display:flex; justify-content:space-between; align-items:center; padding:1.5rem 0; border-top:1px solid ${C.border}; margin-top:2rem; font-size:.78rem; color:${C.muted}; }

    @media (max-width: 768px) {
      .voh-stats { grid-template-columns: repeat(2, 1fr); gap: 0.8rem; }
      .voh-two-col { grid-template-columns: 1fr; display: flex; flex-direction: column-reverse; }
      .voh-modules { grid-template-columns: 1fr; }
      .voh-hero { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .voh-content { padding: 1rem; }
      .voh-spotlight-img { position: relative; width: 100%; height: 200px; transform: none; top: auto; right: auto; margin-bottom: 1rem; }
      .voh-spotlight-title { max-width: 100%; }
      .voh-spotlight-desc { max-width: 100%; }
    }

    /* Avatar Container and Dropdown Menu */
    .voh-avatar-container {
      position: relative;
      display: inline-block;
    }
    
    .voh-avatar-btn {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      border-radius: 50%;
      outline: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .voh-avatar-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 0 0 3px rgba(217, 156, 83, 0.2);
    }
    
    .voh-profile-dropdown {
      position: absolute;
      top: calc(100% + 12px);
      right: 0;
      width: 280px;
      background: ${C.surface};
      border: 1px solid ${C.border};
      border-radius: 16px;
      box-shadow: 0 16px 36px rgba(0,0,0,${theme === 'dark' ? '0.6' : '0.12'});
      padding: 1.2rem;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      z-index: 1000;
      animation: voh-dropdown-fade 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      backdrop-filter: blur(12px);
    }
    
    .voh-dropdown-header {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid ${C.border};
      margin-bottom: 0.4rem;
    }
    
    .voh-dropdown-name {
      font-weight: 700;
      font-size: 0.95rem;
      color: ${C.text};
      line-height: 1.2;
    }
    
    .voh-dropdown-role {
      font-size: 0.72rem;
      color: ${C.gold};
      font-weight: 700;
      margin-top: 3px;
    }
    
    .voh-dropdown-email {
      font-size: 0.7rem;
      color: ${C.muted};
      margin-top: 1px;
      word-break: break-all;
    }
    
    .voh-dropdown-divider {
      height: 1px;
      background: ${C.border};
      margin: 0.4rem -1.2rem;
    }
    
    .voh-dropdown-section-label {
      font-size: 0.65rem;
      font-weight: 800;
      color: ${C.muted};
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 0.3rem 0.6rem;
    }
    
    .voh-dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      padding: 0.7rem 0.8rem;
      background: none;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      color: ${C.text};
      font-size: 0.85rem;
      font-weight: 500;
      text-decoration: none;
      text-align: left;
      width: 100%;
      transition: all 0.2s ease;
    }
    
    .voh-dropdown-item:hover {
      background: ${theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
      color: ${C.gold};
      transform: translateX(4px);
    }
    
    .voh-dropdown-icon {
      font-size: 1.1rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
    }
    
    .voh-logout-item {
      color: #ef4444;
      font-weight: 600;
    }
    
    .voh-logout-item:hover {
      background: rgba(239, 68, 68, 0.08);
      color: #ef4444;
    }
    
    @keyframes voh-dropdown-fade {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  return (
    <div className="voh-page">
      <style>{css}</style>
      
      {/* ═══ Epic Background ═══ */}
      <div className="voh-epic-bg" />

      {/* ═══ Sidebar ═══ */}
      <aside className="voh-sidebar">
        <div className="voh-sidebar-watermark"></div>
        <div className="voh-logo">
          <VoHLogo size={40} />
          <div style={{ marginLeft: '10px' }}>
            <div className="voh-logo-title">Voices of Heritage</div>
            <div className="voh-logo-sub">Cultural Platform</div>
          </div>
        </div>
        
        <nav className="voh-nav-list">
          <div className="voh-nav-section-label">Navigate</div>
          {NAV_ITEMS.map(item => (
            <button key={item.id}
              className={`voh-nav-btn ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => {
                if (item.id === 'explore') { navigate('/explore'); return; }
                if (item.id === 'ai-planner') { navigate('/trip-planner'); return; }
                if (item.id === 'archives') { navigate('/archives'); return; }
                if (item.id === 'experiences') { navigate('/experiences'); return; }
                if (item.id === 'bookings') { navigate('/bookings'); return; }
                setActiveNav(item.id);
                setSidebarOpen(false);
              }}>
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          
        </nav>

        <div className="voh-sidebar-footer">
          <Link to="/profile" className="voh-profile-chip">
            <div style={{ width:32, height:32, borderRadius:'50%', background:`linear-gradient(135deg, ${C.amber}, ${C.gold})`, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{initials}</div>
            <div>
              <div style={{ fontSize:'.8rem', fontWeight:600, color:C.text }}>{user?.name}</div>
              <div style={{ fontSize:'.65rem', color:C.muted }}>{ROLE_LABELS[user?.role || 'user']}</div>
            </div>
          </Link>
        </div>
      </aside>

      {/* ═══ Main Content ═══ */}
      <main className="voh-main">
        <header className="voh-header">
          <div /> {/* Placeholder for left flex */}
          <div style={{ display:'flex', gap:'1rem', alignItems:'center' }}>
            <ThemeToggle />
            <div className="voh-icon-btn">
              🔔
              <div style={{ position:'absolute', top:8, right:10, width:6, height:6, background:'#ef4444', borderRadius:'50%' }} />
            </div>
            
            <div className="voh-avatar-container">
              <button 
                className="voh-avatar-btn"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                aria-label="User menu"
              >
                <div className="voh-avatar">{initials}</div>
              </button>
              
              {profileDropdownOpen && (
                <div className="voh-profile-dropdown">
                  <div className="voh-dropdown-header">
                    <div className="voh-avatar" style={{ width: '40px', height: '40px', fontSize: '.95rem' }}>{initials}</div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div className="voh-dropdown-name">{user?.name}</div>
                      <div className="voh-dropdown-role">{ROLE_LABELS[user?.role || 'user']}</div>
                      <div className="voh-dropdown-email">{user?.email}</div>
                    </div>
                  </div>
                  
                  <div className="voh-dropdown-section-label">Account Options</div>
                  
                  <Link to="/profile" className="voh-dropdown-item" onClick={() => setProfileDropdownOpen(false)}>
                    <span className="voh-dropdown-icon">👤</span>
                    <span>My Profile</span>
                  </Link>
                  
                  <Link to="/profile" className="voh-dropdown-item" onClick={() => setProfileDropdownOpen(false)}>
                    <span className="voh-dropdown-icon">⚙️</span>
                    <span>Settings</span>
                  </Link>
                  
                  <button className="voh-dropdown-item" onClick={() => { setSupportOpen(true); setProfileDropdownOpen(false); }}>
                    <span className="voh-dropdown-icon">💬</span>
                    <span>Contact Support</span>
                  </button>
                  
                  <div className="voh-dropdown-divider" />
                  
                  <button className="voh-dropdown-item voh-logout-item" onClick={handleLogout}>
                    <span className="voh-dropdown-icon">🚪</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="voh-content">
          
          <section className="voh-hero">
            <div>
              <p className="voh-hero-sub">{greet},</p>
              <h1 className="voh-hero-name">{user?.name} <span style={{ color: C.gold }}>✨</span></h1>
              <div className="voh-role-badge">{ROLE_LABELS[user?.role || 'user']}</div>
            </div>
            <div style={{ display:'flex', gap:'1rem', zIndex:1 }}>
              <button className="voh-btn-primary" onClick={() => navigate('/explore')}>🏛️ Explore Sites</button>
              <button className="voh-btn-outline" onClick={() => setSupportOpen(true)}>💬 Get Help</button>
            </div>
          </section>

          <section className="voh-stats">
            {[
              { emoji: '📍', value: String(expStats.sitesVisited), label: 'Sites Visited', color: C.gold, href: '/experiences' },
              { emoji: '🧳', value: String(expStats.tripsCompleted), label: 'Trips Completed', color: C.gold, href: '/experiences' },
              { emoji: '🎭', value: String(expStats.experiencesRecorded), label: 'Experiences', color: C.gold, href: '/experiences' },
              { emoji: '🧠', value: String(expStats.preferencesCount), label: 'DEPKG Signals', color: C.gold, href: '/experiences' },
            ].map(s => (
              <div key={s.label} className="voh-stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate(s.href)}>
                <div className="voh-stat-icon" style={{ color: s.color }}>{s.emoji}</div>
                <div>
                  <div style={{ fontSize:'1.4rem', fontWeight:700, color:C.text }}>{s.value}</div>
                  <div style={{ fontSize:'.75rem', color:C.muted, fontWeight:500 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </section>

          <section className="voh-two-col">
            <div className="voh-spotlight">
              <img src="/images/real_stone_chariot.jpeg" alt="Real Stone Chariot" className="voh-spotlight-img" />
              <div className="voh-spotlight-tag">🏛️ Heritage Spotlight</div>
              <h2 className="voh-spotlight-title">{SPOTLIGHT.name}</h2>
              <p className="voh-spotlight-loc">📍 {SPOTLIGHT.location}</p>
              <p className="voh-spotlight-desc">{SPOTLIGHT.desc}</p>
              <div className="voh-tags">
                {SPOTLIGHT.tags.map(t => <span key={t} className="voh-tag">{t}</span>)}
              </div>
              <button className="voh-btn-primary" style={{ width:'fit-content' }}>Explore Spotlight →</button>
            </div>

            <div className="voh-announcements">
              <div className="voh-section-title">
                <span>📣 Announcements</span>
                <span style={{ fontSize:'.75rem', color:C.gold, cursor:'pointer' }}>View All →</span>
              </div>
              {ANNOUNCEMENTS.map(a => (
                <div key={a.id} className="voh-ann-card">
                  <div className="voh-ann-tag">{a.tag}</div>
                  <div className="voh-ann-title">{a.title}</div>
                  <div className="voh-ann-body">{a.body}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="voh-section-title" style={{ marginBottom:'1.2rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                🌏 Platform Modules
                <span style={{ fontSize:'.65rem', background:`${theme==='dark'?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)'}`, padding:'4px 10px', borderRadius:'20px', color:C.muted, fontWeight:600, fontFamily:"'Plus Jakarta Sans'" }}>12 modules</span>
              </div>
              <span style={{ fontSize:'.75rem', color:C.gold, cursor:'pointer', fontFamily:"'Plus Jakarta Sans'" }}>View All Modules →</span>
            </div>
            
            <div className="voh-modules">
              {MODULES.map(mod => (
                <div key={mod.href} className="voh-module-card" onClick={() => {
                  navigate(mod.href);
                }}>
                  <div style={{ fontSize:'2.2rem', marginBottom:'.8rem' }}>{mod.emoji}</div>
                  <h3 style={{ fontSize:'.9rem', fontWeight:700, margin:'0 0 6px', color:C.text }}>{mod.title}</h3>
                  <p style={{ fontSize:'.78rem', color:C.muted, margin:'0 0 1.2rem', lineHeight:1.4 }}>{mod.desc}</p>
                  
                  <div style={{ marginTop:'auto', display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:`1px solid ${C.border}`, paddingTop:'.8rem' }}>
                    <span style={{ fontSize:'.65rem', color:C.gold, fontWeight:700, background:'rgba(217,156,83,0.1)', padding:'3px 8px', borderRadius:'6px' }}>Phase {mod.phase}</span>
                    <span style={{ color:C.muted }}>→</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <footer className="voh-footer">
            <div style={{ display:'flex', alignItems:'center', gap:'.5rem', fontWeight:600 }}>
              <span style={{ color:C.gold }}>🏛️</span> Voices of Heritage © {new Date().getFullYear()}
            </div>
            <div style={{ display:'flex', gap:'1.5rem' }}>
              <span style={{ cursor:'pointer' }} onClick={() => setSupportOpen(true)}>Contact Support</span>
              <span style={{ cursor:'pointer' }} onClick={() => navigate('/profile')}>Profile</span>
              <a href="mailto:support@voicesofheritage.in" style={{ color:C.muted, textDecoration:'none' }}>Email Us</a>
            </div>
          </footer>

        </div>
      </main>

      {supportOpen && <SupportModal onClose={() => setSupportOpen(false)} theme={theme} />}
    </div>
  );
}
