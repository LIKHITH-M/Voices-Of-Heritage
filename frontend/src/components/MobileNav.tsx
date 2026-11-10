import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NAV_ITEMS = [
  { id: 'overview',     icon: '🏠', label: 'Home',    href: '/dashboard' },
  { id: 'explore',      icon: '🗺️', label: 'Explore', href: '/explore' },
  { id: 'ai-planner',   icon: '✈️', label: 'Planner', href: '/trip-planner' },
];

const MENU_ITEMS = [
  { id: 'archives',     icon: '📚', label: 'Archives',       href: '/archives' },
  { id: 'experiences',  icon: '🎭', label: 'Experiences',  href: '/immersive' },
  { id: 'utilities',    icon: '🧠', label: 'Utilities',        href: '/smart-utilities' },
  { id: 'bookings',     icon: '🎟️', label: 'Activity & Ticketing',   href: '/activity' },
  { id: 'stay',         icon: '🏠', label: 'Smart Stay',             href: '/stay' },
  { id: 'conservation', icon: '🌿', label: 'Conservation',           href: '/conservation' },
  { id: 'wellness',     icon: '🧘', label: 'Wellness',               href: '/wellness' },
  { id: 'food',         icon: '🍛', label: 'Culinary Heritage',      href: '/food' },
  { id: 'school',       icon: '🎓', label: 'School Programs',        href: '/school' },
  { id: 'artisan',      icon: '🛍️', label: 'Marketplace',  href: '/artisan' },
  { id: 'community',    icon: '💰', label: 'Community',              href: '/community' },
];

export default function MobileNav() {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Hide entirely on auth/landing pages
  if (['/', '/auth/login', '/auth/register'].includes(location.pathname)) return null;

  const isDark = theme === 'dark';
  const bg = isDark ? 'rgba(10,10,11,0.85)' : 'rgba(255,255,255,0.85)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(180,130,80,0.18)';
  const text = isDark ? '#EDEDED' : '#2E251E';
  const gold = isDark ? '#D99C53' : '#D97706';
  const muted = isDark ? '#7A7A7A' : '#786A5E';

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <>
      <style>{`
        .voh-mobile-nav { display: none; }
        @media (max-width: 768px) {
          .voh-mobile-nav { display: flex; }
          .voh-sidebar { display: none !important; }
          /* Add padding to root containers so content isn't hidden behind bottom nav */
          .voh-page, .es-root, .J-out, .J-wiz, .at-root, .tmpl-root, .da-page, .ie-root, .su-page { padding-bottom: 70px !important; }
        }
      `}</style>

      {/* Menu Overlay */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: bg, backdropFilter: 'blur(14px)', display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top)', color: text, animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ padding: '1rem', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${gold}, #B4773B)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff' }}>
                {user?.name?.[0] || 'U'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{user?.name || 'User'}</div>
                <div style={{ fontSize: 11, color: muted }}>Traveller</div>
              </div>
            </div>
            <button onClick={() => setMenuOpen(false)} style={{ background: 'transparent', border: 'none', color: text, fontSize: '1.5rem', cursor: 'pointer', padding: '4px 8px' }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              {MENU_ITEMS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(item.href);
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '1rem 0.5rem',
                    borderRadius: 12,
                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    border: `1px solid ${border}`,
                    color: text,
                    textAlign: 'center',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '1.4rem' }}>{item.icon}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600 }}>{item.label}</span>
                </button>
              ))}
            </div>
            <button onClick={handleLogout} style={{ width: '100%', marginTop: '1.5rem', padding: '0.8rem', borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 700, cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <div className="voh-mobile-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 70, background: bg, backdropFilter: 'blur(12px)', borderTop: `1px solid ${border}`, zIndex: 9997, paddingBottom: 'env(safe-area-inset-bottom)', justifyContent: 'space-around', alignItems: 'center' }}>
        {NAV_ITEMS.map(item => {
          const active = location.pathname.includes(item.href);
          return (
            <Link key={item.id} to={item.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none', color: active ? gold : muted, flex: 1, padding: '10px 0' }}>
              <span style={{ fontSize: 20, filter: active ? 'drop-shadow(0 0 8px rgba(217,156,83,0.5))' : 'grayscale(100%)', opacity: active ? 1 : 0.6 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{item.label}</span>
            </Link>
          );
        })}
        <button onClick={() => setMenuOpen(true)} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: menuOpen ? gold : muted, flex: 1, padding: '10px 0', cursor: 'pointer' }}>
          <span style={{ fontSize: 20, filter: menuOpen ? 'drop-shadow(0 0 8px rgba(217,156,83,0.5))' : 'grayscale(100%)', opacity: menuOpen ? 1 : 0.6 }}>☰</span>
          <span style={{ fontSize: 10, fontWeight: menuOpen ? 700 : 500 }}>Menu</span>
        </button>
      </div>
    </>
  );
}
