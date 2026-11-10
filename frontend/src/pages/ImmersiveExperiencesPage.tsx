import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import VoHLogo from '@/components/VoHLogo';
import PanoramaViewer from '@/components/PanoramaViewer';

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

type ImmersiveMode = 'webrtc' | 'ar' | 'vr' | '360';

const LIVE_TOURS = [
  { id: 1, title: 'Hampi Sunrise Trek', guide: 'Arjun K.', viewers: 240, location: 'Karnataka', time: 'LIVE' },
  { id: 2, title: 'Ajanta Cave Walkthrough', guide: 'Priya M.', viewers: 89, location: 'Maharashtra', time: 'Starting in 5m' },
];

export default function ImmersiveExperiencesPage() {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState<ImmersiveMode>('webrtc');
  const [showPano, setShowPano] = useState(false);

  const css = `
    .ie-root { display: flex; height: 100vh; background: ${C.bg}; color: ${C.text}; font-family: 'Inter', system-ui, sans-serif; overflow: hidden; }
    
    /* Sidebar */
    .ie-sidebar { width: 320px; flex-shrink: 0; background: ${C.surface}; border-right: 1px solid ${C.border}; display: flex; flex-direction: column; z-index: 10; }
    .ie-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid ${C.border}; }
    .ie-header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .ie-title { font-size: 1.25rem; font-weight: 700; color: ${C.text}; line-height: 1.2; display: flex; align-items: center; gap: 0.5rem; }
    .ie-subtitle { font-size: 0.8rem; color: ${C.muted}; margin-top: 0.25rem; }
    
    /* Navigation Modes */
    .ie-nav { flex: 1; overflow-y: auto; padding: 1.5rem; }
    .ie-nav-btn { display: flex; flex-direction: column; padding: 1.25rem; border-radius: 16px; background: transparent; border: 1px solid transparent; cursor: pointer; text-align: left; transition: all 0.2s ease; margin-bottom: 1rem; color: ${C.text}; }
    .ie-nav-btn:hover { background: rgba(245,158,11,0.04); border-color: rgba(245,158,11,0.1); }
    .ie-nav-btn.active { background: rgba(245,158,11,0.08); border-color: ${C.amber}; box-shadow: 0 4px 12px rgba(245,158,11,0.05); }
    .ie-nav-icon { font-size: 1.8rem; margin-bottom: 0.5rem; }
    .ie-nav-label { font-weight: 700; font-size: 1.05rem; margin-bottom: 0.25rem; }
    .ie-nav-desc { font-size: 0.8rem; color: ${C.muted}; line-height: 1.4; }

    /* Main Content Area */
    .ie-main { flex: 1; display: flex; flex-direction: column; position: relative; }
    
    /* Viewport Area */
    .ie-viewport { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; background: #000; overflow: hidden; }
    .ie-viewport-placeholder { text-align: center; color: rgba(255,255,255,0.6); z-index: 10; max-width: 500px; padding: 2rem; }
    .ie-viewport-bg { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0.4; filter: blur(10px); }
    
    /* Bottom Control Bar */
    .ie-control-bar { height: 80px; background: ${C.surface}; border-top: 1px solid ${C.border}; display: flex; align-items: center; justify-content: space-between; padding: 0 2rem; }
    .ie-control-group { display: flex; gap: 1rem; align-items: center; }
    .ie-icon-btn { width: 44px; height: 44px; border-radius: 50%; border: 1px solid ${C.border}; background: rgba(255,255,255,0.05); color: ${C.text}; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; font-size: 1.1rem; }
    .ie-icon-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }
    .ie-action-btn { padding: 0.6rem 1.5rem; border-radius: 12px; background: linear-gradient(135deg, ${C.amber}, ${C.gold}); color: #000; font-weight: 700; border: none; cursor: pointer; font-size: 0.95rem; }
    
    /* Floating Overlays */
    .ie-overlay-panel { position: absolute; top: 1.5rem; right: 1.5rem; width: 300px; background: rgba(18,18,31,0.85); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 1.25rem; color: #fff; z-index: 20; }
    .ie-tour-card { display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-radius: 12px; background: rgba(255,255,255,0.05); margin-bottom: 0.75rem; border: 1px solid rgba(255,255,255,0.05); }
    .ie-tour-title { font-weight: 600; font-size: 0.9rem; margin-bottom: 0.2rem; }
    .ie-tour-guide { font-size: 0.75rem; color: rgba(255,255,255,0.6); }
    .ie-tour-badge { padding: 0.2rem 0.5rem; border-radius: 6px; font-size: 0.7rem; font-weight: 700; }
    .ie-tour-badge.live { background: rgba(239,68,68,0.2); color: #fca5a5; }
    .ie-tour-badge.upcoming { background: rgba(59,130,246,0.2); color: #93c5fd; }
    
    @media (max-width: 768px) {
      .ie-root { flex-direction: column; }
      .ie-sidebar { width: 100%; border-right: none; border-bottom: 1px solid ${C.border}; flex: 0 0 auto; max-height: 40vh; }
      .ie-overlay-panel { position: relative; top: auto; right: auto; width: 100%; border-radius: 0; border: none; border-bottom: 1px solid rgba(255,255,255,0.1); }
      .ie-control-bar { padding: 0 1rem; flex-wrap: wrap; }
    }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="ie-root">
        {/* SIDEBAR */}
        <aside className="ie-sidebar">
          <div className="ie-header">
            <div className="ie-header-top">
              <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                <VoHLogo size={28} />
              </Link>
              <ThemeToggle />
            </div>
            <div className="ie-title">🥽 Immersive Experiences</div>
            <div className="ie-subtitle">Step inside India's heritage from anywhere.</div>
          </div>
          
          <div className="ie-nav">
            <button className={`ie-nav-btn ${activeMode === 'webrtc' ? 'active' : ''}`} onClick={() => setActiveMode('webrtc')}>
              <div className="ie-nav-icon">🎥</div>
              <div className="ie-nav-label">Live Virtual Tours</div>
              <div className="ie-nav-desc">WebRTC-powered real-time guided streams with local experts.</div>
            </button>
            <button className={`ie-nav-btn ${activeMode === 'ar' ? 'active' : ''}`} onClick={() => setActiveMode('ar')}>
              <div className="ie-nav-icon">🪄</div>
              <div className="ie-nav-label">AR Reconstruction</div>
              <div className="ie-nav-desc">Overlay ancient ruins with their original architectural glory.</div>
            </button>
            <button className={`ie-nav-btn ${activeMode === 'vr' ? 'active' : ''}`} onClick={() => setActiveMode('vr')}>
              <div className="ie-nav-icon">👓</div>
              <div className="ie-nav-label">VR Environments</div>
              <div className="ie-nav-desc">Fully immersive 3D walkthroughs for Meta Quest / WebXR.</div>
            </button>
            <button className={`ie-nav-btn ${activeMode === '360' ? 'active' : ''}`} onClick={() => setActiveMode('360')}>
              <div className="ie-nav-icon">🌐</div>
              <div className="ie-nav-label">360° Storytelling</div>
              <div className="ie-nav-desc">Interactive panoramic narratives of historical monuments.</div>
            </button>
          </div>
        </aside>

        {/* MAIN AREA */}
        <main className="ie-main">
          <div className="ie-viewport">
            {/* Conditional Viewport Overlays & Backgrounds based on mode */}
            {activeMode === 'webrtc' && (
              <>
                <div className="ie-viewport-bg" style={{ backgroundImage: "url('/images/dashboard_top_bg.jpeg')" }} />
                <div className="ie-overlay-panel">
                  <div style={{ fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>🔴 Live Tours Now</div>
                  {LIVE_TOURS.map(tour => (
                    <div key={tour.id} className="ie-tour-card">
                      <div>
                        <div className="ie-tour-title">{tour.title}</div>
                        <div className="ie-tour-guide">Guide: {tour.guide} • 📍 {tour.location}</div>
                      </div>
                      <div className={`ie-tour-badge ${tour.time === 'LIVE' ? 'live' : 'upcoming'}`}>
                        {tour.time}
                      </div>
                    </div>
                  ))}
                  <button className="ie-action-btn" style={{ width: '100%', marginTop: '0.5rem' }}>Join Stream 🎙️</button>
                </div>
                <div className="ie-viewport-placeholder">
                  <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#fff' }}>WebRTC Live Stream</h2>
                  <p>Connect with local verified guides in real-time. Experience heritage sites through their lens with ultra-low latency streaming.</p>
                </div>
              </>
            )}

            {activeMode === 'ar' && (
              <>
                <div className="ie-viewport-bg" style={{ backgroundImage: "url('/images/real_heritage_bg.png')" }} />
                <div className="ie-overlay-panel">
                  <div style={{ fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>🪄 AR Toolkit</div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                    <input type="checkbox" defaultChecked /> Show Original Colors
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                    <input type="checkbox" defaultChecked /> Reconstruct Roofs
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                    <input type="checkbox" /> Historical Figures
                  </label>
                </div>
                <div className="ie-viewport-placeholder">
                  <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#fff' }}>Augmented Reality Layer</h2>
                  <p>Point your mobile device camera at physical ruins to instantly overlay 3D historical reconstructions.</p>
                </div>
              </>
            )}

            {activeMode === 'vr' && (
              <>
                <div className="ie-viewport-bg" style={{ backgroundImage: "url('/images/stone_chariot.png')" }} />
                <div className="ie-viewport-placeholder">
                  <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#fff' }}>WebXR / VR Mode</h2>
                  <p>Put on your headset. Step directly into fully modeled 3D environments of inaccessible or highly protected heritage zones.</p>
                  <button className="ie-action-btn" style={{ marginTop: '1.5rem', background: '#3b82f6', color: '#fff' }}>Enter WebXR</button>
                </div>
              </>
            )}

            {activeMode === '360' && (
              <>
                <div className="ie-viewport-bg" style={{ background: '#000' }} />
                <div className="ie-viewport-placeholder">
                  <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#fff' }}>360° Interactive Narratives</h2>
                  <p>Explore high-resolution panoramas accompanied by immersive spatial audio storytelling.</p>
                  <button className="ie-action-btn" style={{ marginTop: '1.5rem' }} onClick={() => setShowPano(true)}>Launch Hampi 360° Viewer</button>
                </div>
              </>
            )}
          </div>

          <div className="ie-control-bar">
            <div className="ie-control-group">
              <button className="ie-icon-btn" title="Toggle Audio">🔊</button>
              <button className="ie-icon-btn" title="Toggle Captions">CC</button>
            </div>
            <div className="ie-control-group">
              <button className="ie-icon-btn" title="Information">ℹ️</button>
              <button className="ie-icon-btn" title="Fullscreen">⛶</button>
            </div>
          </div>
        </main>
      </div>

      {showPano && (
        <PanoramaViewer
          lat={15.3350}
          lng={76.4600}
          siteName="Hampi Virupaksha Temple"
          subTitle="Immersive 360° Narrative"
          onClose={() => setShowPano(false)}
        />
      )}
    </>
  );
}
