import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import VoHLogo from '@/components/VoHLogo';

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

export default function FoodHeritagePage() {
  const css = `
    .tmpl-root { display: flex; flex-direction: column; min-height: 100vh; background: ${C.bg}; color: ${C.text}; font-family: 'Inter', sans-serif; }
    .tmpl-topbar { padding: 1.25rem 2rem; border-bottom: 1px solid ${C.border}; background: ${C.surface}; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 50; }
    .tmpl-brand { display: flex; align-items: center; gap: 1rem; text-decoration: none; }
    .tmpl-title { font-size: 1.4rem; font-weight: 800; color: ${C.text}; }
    .tmpl-subtitle { font-size: 0.85rem; color: ${C.muted}; }
    
    .tmpl-main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4rem 2rem; }
    .tmpl-icon { font-size: 5rem; margin-bottom: 1.5rem; filter: drop-shadow(0 4px 20px rgba(245,158,11,0.2)); }
    .tmpl-heading { font-size: 3rem; font-weight: 900; margin-bottom: 1rem; background: linear-gradient(135deg, ${C.amber}, ${C.gold}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .tmpl-desc { font-size: 1.2rem; color: ${C.muted}; max-width: 600px; line-height: 1.6; margin-bottom: 3rem; }
    
    .tmpl-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; max-width: 1000px; width: 100%; }
    .tmpl-card { background: ${C.surface}; border: 1px solid ${C.border}; padding: 2rem; border-radius: 16px; transition: transform 0.2s; }
    .tmpl-card:hover { transform: translateY(-4px); border-color: ${C.amber}; }
    .tmpl-card h3 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: ${C.text}; }
    .tmpl-card p { color: ${C.muted}; font-size: 0.95rem; line-height: 1.5; }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="tmpl-root">
        <header className="tmpl-topbar">
          <Link to="/dashboard" className="tmpl-brand">
            <VoHLogo size={36} />
            <div>
              <div className="tmpl-title">Culinary Heritage</div>
              <div className="tmpl-subtitle">Module early access</div>
            </div>
          </Link>
          <ThemeToggle />
        </header>

        <main className="tmpl-main">
          <div className="tmpl-icon">🍛</div>
          <h1 className="tmpl-heading">Coming Soon</h1>
          <p className="tmpl-desc">
            The <strong>Culinary Heritage</strong> module is currently in active development. 
            Heritage food trails and recipe archives and more features will be available in the next major update.
          </p>
          
          <div className="tmpl-grid">
            <div className="tmpl-card">
              <h3>Get Notified</h3>
              <p>Join the waitlist to get early access when this module goes live.</p>
              <button style={{ marginTop: '1rem', padding: '0.6rem 1.2rem', background: C.amber, color: '#000', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Join Waitlist</button>
            </div>
            <div className="tmpl-card">
              <h3>Explore Now</h3>
              <p>While you wait, explore our fully functional Immersive Experiences and Smart Utilities.</p>
              <Link to="/immersive" style={{ display: 'inline-block', marginTop: '1rem', padding: '0.6rem 1.2rem', background: 'rgba(245,158,11,0.1)', color: C.amber, textDecoration: 'none', borderRadius: '8px', fontWeight: 700 }}>Go to Immersive</Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
