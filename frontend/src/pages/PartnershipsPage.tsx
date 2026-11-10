import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

export default function PartnershipsPage() {
  const css = `
    .p-root { display: flex; flex-direction: column; min-height: 100vh; background: ${C.bg}; color: ${C.text}; font-family: 'Inter', sans-serif; }
    
    .p-topbar { padding: 1.25rem 2rem; border-bottom: 1px solid ${C.border}; background: ${C.surface}; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 50; }
    .p-brand { display: flex; align-items: center; gap: 1rem; text-decoration: none; }
    .p-title { font-size: 1.4rem; font-weight: 800; color: ${C.text}; }
    .p-subtitle { font-size: 0.85rem; color: ${C.muted}; }

    .p-layout { display: flex; flex: 1; flex-direction: column; max-width: 1400px; margin: 0 auto; width: 100%; padding: 2rem; gap: 2rem; }
    
    .p-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
    .p-card { background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 16px; padding: 1.5rem; display: flex; flex-direction: column; }
    
    .p-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
    .p-card-title { font-size: 1.15rem; font-weight: 700; }
    .p-card-badge { padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
    .p-card-badge.sync { background: rgba(34,197,94,0.1); color: #22c55e; border: 1px solid rgba(34,197,94,0.2); }
    .p-card-badge.auth { background: rgba(59,130,246,0.1); color: #3b82f6; border: 1px solid rgba(59,130,246,0.2); }
    
    .p-card-desc { color: ${C.muted}; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem; flex: 1; }
    
    .p-btn { padding: 0.75rem 1.25rem; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; transition: all 0.2s; text-align: center; }
    .p-btn-primary { background: ${C.amber}; color: #000; }
    .p-btn-primary:hover { filter: brightness(1.1); }
    
    .p-stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
    .p-stat { background: rgba(0,0,0,0.15); padding: 1rem; border-radius: 8px; border: 1px solid ${C.border}; }
    .p-stat-val { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.25rem; }
    .p-stat-lbl { font-size: 0.75rem; color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.05em; }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="p-root">
        <header className="p-topbar">
          <Link to="/dashboard" className="p-brand">
            <VoHLogo size={36} />
            <div>
              <div className="p-title">Partnerships & Integrations</div>
              <div className="p-subtitle">Manage B2B connections, APIs & Tourism Syncs</div>
            </div>
          </Link>
          <ThemeToggle />
        </header>

        <div className="p-layout">
          <div style={{ marginBottom: '1rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Active Integrations</h1>
            <p style={{ color: C.muted }}>Monitor and manage real-time API integrations with government bodies and service providers.</p>
          </div>

          <div className="p-grid">
            <div className="p-card">
              <div className="p-card-header">
                <div className="p-card-title">ASI Data Sync</div>
                <div className="p-card-badge sync">Connected</div>
              </div>
              <div className="p-card-desc">Real-time synchronization with the Archaeological Survey of India database for monument status, ticketing restrictions, and restoration alerts.</div>
              <div className="p-stat-grid">
                <div className="p-stat">
                  <div className="p-stat-val">3,691</div>
                  <div className="p-stat-lbl">Monuments Tracked</div>
                </div>
                <div className="p-stat">
                  <div className="p-stat-val" style={{ color: '#22c55e' }}>2ms</div>
                  <div className="p-stat-lbl">Latency</div>
                </div>
              </div>
              <button className="p-btn p-btn-primary">Manage Webhooks</button>
            </div>

            <div className="p-card">
              <div className="p-card-header">
                <div className="p-card-title">State Tourism Boards</div>
                <div className="p-card-badge auth">OAuth Active</div>
              </div>
              <div className="p-card-desc">Aggregated API connections with Karnataka, Maharashtra, and Rajasthan State Tourism boards for verified guide listings and official itineraries.</div>
              <div className="p-stat-grid">
                <div className="p-stat">
                  <div className="p-stat-val">12</div>
                  <div className="p-stat-lbl">Active States</div>
                </div>
                <div className="p-stat">
                  <div className="p-stat-val">14K+</div>
                  <div className="p-stat-lbl">Verified Guides</div>
                </div>
              </div>
              <button className="p-btn p-btn-primary">View API Keys</button>
            </div>

            <div className="p-card">
              <div className="p-card-header">
                <div className="p-card-title">Travel Aggregators</div>
                <div className="p-card-badge sync">Connected</div>
              </div>
              <div className="p-card-desc">Two-way integration with major transport (IRCTC, MakeMyTrip) and hotel booking platforms to offer seamless end-to-end trip planning.</div>
              <div className="p-stat-grid">
                <div className="p-stat">
                  <div className="p-stat-val">2.4M</div>
                  <div className="p-stat-lbl">Queries / Day</div>
                </div>
                <div className="p-stat">
                  <div className="p-stat-val">$45K</div>
                  <div className="p-stat-lbl">Revenue Generated</div>
                </div>
              </div>
              <button className="p-btn p-btn-primary">Aggregator Dashboard</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
