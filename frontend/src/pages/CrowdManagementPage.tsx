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

export default function CrowdManagementPage() {
  const css = `
    .cm-root { display: flex; flex-direction: column; min-height: 100vh; background: ${C.bg}; color: ${C.text}; font-family: 'Inter', sans-serif; }
    
    .cm-topbar { padding: 1.25rem 2rem; border-bottom: 1px solid ${C.border}; background: ${C.surface}; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 50; }
    .cm-brand { display: flex; align-items: center; gap: 1rem; text-decoration: none; }
    .cm-title { font-size: 1.4rem; font-weight: 800; color: ${C.text}; }
    .cm-subtitle { font-size: 0.85rem; color: ${C.muted}; }

    .cm-layout { display: flex; flex: 1; flex-direction: column; max-width: 1400px; margin: 0 auto; width: 100%; padding: 2rem; gap: 2rem; }
    
    .cm-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; }
    .cm-card { background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 16px; padding: 1.5rem; }
    
    .cm-map-area { height: 400px; background: rgba(0,0,0,0.2); border-radius: 12px; margin-top: 1rem; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .cm-heatmap-bg { position: absolute; inset: 0; background-size: cover; background-position: center; filter: blur(4px); opacity: 0.5; }
    
    .cm-stat { margin-bottom: 1.25rem; }
    .cm-stat-title { font-size: 0.85rem; color: ${C.muted}; text-transform: uppercase; font-weight: 700; margin-bottom: 0.25rem; }
    .cm-stat-val { font-size: 1.8rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem; }
    .cm-stat-val.high { color: #ef4444; }
    .cm-stat-val.med { color: ${C.amber}; }
    .cm-stat-val.low { color: #22c55e; }
    
    .cm-alert { padding: 1rem; border-radius: 8px; border-left: 4px solid #ef4444; background: rgba(239,68,68,0.1); margin-bottom: 1rem; }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="cm-root">
        <header className="cm-topbar">
          <Link to="/dashboard" className="cm-brand">
            <VoHLogo size={36} />
            <div>
              <div className="cm-title">Crowd & Safety Management</div>
              <div className="cm-subtitle">Real-time density analytics & IoT monitoring</div>
            </div>
          </Link>
          <ThemeToggle />
        </header>

        <div className="cm-layout">
          <div className="cm-grid">
            <div className="cm-card">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Live Crowd Density Heatmap</h2>
              <p style={{ color: C.muted, fontSize: '0.9rem', marginBottom: '1rem' }}>Data aggregated from CCTV and IoT sensors across Hampi.</p>
              
              <div className="cm-map-area">
                <div className="cm-heatmap-bg" style={{ backgroundImage: "url('/images/dashboard_top_bg.jpeg')" }}></div>
                <div style={{ position: 'absolute', top: '30%', left: '40%', width: '80px', height: '80px', background: 'radial-gradient(circle, rgba(239,68,68,0.8) 0%, rgba(239,68,68,0) 70%)' }}></div>
                <div style={{ position: 'absolute', top: '50%', left: '60%', width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(245,158,11,0.8) 0%, rgba(245,158,11,0) 70%)' }}></div>
                <div style={{ position: 'relative', zIndex: 10, background: 'rgba(0,0,0,0.6)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
                  🔴 Virupaksha Temple: High Density
                </div>
              </div>
            </div>

            <div className="cm-card">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Current Metrics</h2>
              
              <div className="cm-alert">
                <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: '0.25rem' }}>Area Limit Reached</div>
                <div style={{ fontSize: '0.85rem' }}>Virupaksha main courtyard has exceeded 400 persons. Diverting new tours to Hemakuta Hill.</div>
              </div>

              <div className="cm-stat">
                <div className="cm-stat-title">Total Active Visitors</div>
                <div className="cm-stat-val">1,245</div>
              </div>
              <div className="cm-stat">
                <div className="cm-stat-title">Average Wait Time</div>
                <div className="cm-stat-val med">25 mins <span>↗</span></div>
              </div>
              <div className="cm-stat">
                <div className="cm-stat-title">Safety Incidents Today</div>
                <div className="cm-stat-val low">0</div>
              </div>
            </div>
          </div>

          <div className="cm-card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Predictive Forecasting (ML)</h2>
            <p style={{ color: C.muted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>Expected footfall for the next 24 hours based on historical data and current weather.</p>
            
            <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '4px', paddingBottom: '1rem', borderBottom: `1px solid ${C.border}` }}>
              {/* Mock Bar Chart */}
              {[40, 30, 20, 15, 10, 10, 15, 30, 60, 85, 100, 95, 80, 75, 60, 50, 70, 90, 80, 60, 40, 25, 20, 15].map((val, i) => (
                <div key={i} style={{ flex: 1, background: val > 80 ? '#ef4444' : val > 50 ? C.amber : '#22c55e', height: `${val}%`, borderRadius: '4px 4px 0 0', opacity: 0.8 }}></div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', color: C.muted, fontSize: '0.8rem' }}>
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>11 PM</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
