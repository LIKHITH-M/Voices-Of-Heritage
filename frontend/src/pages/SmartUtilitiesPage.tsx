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

export default function SmartUtilitiesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('weather');

  const css = `
    .su-root { display: flex; flex-direction: column; min-height: 100vh; background: ${C.bg}; color: ${C.text}; font-family: 'Inter', sans-serif; }
    
    /* Topbar */
    .su-topbar { padding: 1.25rem 2rem; border-bottom: 1px solid ${C.border}; background: ${C.surface}; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 50; }
    .su-brand { display: flex; align-items: center; gap: 1rem; text-decoration: none; }
    .su-title { font-size: 1.4rem; font-weight: 800; color: ${C.text}; }
    .su-subtitle { font-size: 0.85rem; color: ${C.muted}; }

    /* Layout */
    .su-layout { display: flex; flex: 1; overflow: hidden; max-width: 1400px; margin: 0 auto; width: 100%; padding: 2rem; gap: 2rem; }
    
    /* Sidebar */
    .su-sidebar { width: 260px; display: flex; flex-direction: column; gap: 0.5rem; }
    .su-nav-btn { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem; border-radius: 12px; background: transparent; border: 1px solid transparent; cursor: pointer; color: ${C.text}; font-weight: 600; font-size: 0.95rem; transition: all 0.2s; text-align: left; }
    .su-nav-btn:hover { background: rgba(245,158,11,0.05); }
    .su-nav-btn.active { background: rgba(245,158,11,0.1); border-color: ${C.amber}; color: ${C.amber}; }
    .su-nav-icon { font-size: 1.2rem; }

    /* Content Area */
    .su-content { flex: 1; background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 20px; padding: 2.5rem; overflow-y: auto; position: relative; }
    
    .su-card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-top: 2rem; }
    .su-card { padding: 1.5rem; border-radius: 16px; background: rgba(255,255,255,0.02); border: 1px solid ${C.border}; transition: transform 0.2s; }
    .su-card:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.1); }
    .su-card-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem; color: ${C.gold}; }
    
    /* AI Chat */
    .su-chat-container { display: flex; flex-direction: column; height: 500px; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid ${C.border}; }
    .su-chat-messages { flex: 1; padding: 1.5rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; }
    .su-message { max-width: 80%; padding: 1rem; border-radius: 12px; font-size: 0.95rem; line-height: 1.5; }
    .su-message.bot { align-self: flex-start; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2); }
    .su-message.user { align-self: flex-end; background: ${C.card}; border: 1px solid ${C.border}; }
    .su-chat-input-area { padding: 1rem; border-top: 1px solid ${C.border}; display: flex; gap: 0.75rem; }
    .su-chat-input { flex: 1; padding: 0.8rem 1.2rem; border-radius: 24px; background: ${C.surface}; border: 1px solid ${C.border}; color: ${C.text}; outline: none; }
    .su-chat-btn { padding: 0 1.5rem; border-radius: 24px; background: ${C.amber}; color: #000; font-weight: 700; border: none; cursor: pointer; }

    /* Weather */
    .su-weather-hero { display: flex; align-items: center; gap: 2rem; padding: 2rem; background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(147,197,253,0.05)); border-radius: 16px; border: 1px solid rgba(59,130,246,0.2); margin-bottom: 2rem; }
    .su-weather-temp { font-size: 4rem; font-weight: 800; line-height: 1; }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="su-root">
        <header className="su-topbar">
          <Link to="/dashboard" className="su-brand">
            <VoHLogo size={36} />
            <div>
              <div className="su-title">Smart Utilities</div>
              <div className="su-subtitle">AI assistance & live heritage data</div>
            </div>
          </Link>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link to="/explore/ai-trip-planner" style={{ padding: '0.5rem 1rem', background: 'rgba(245,158,11,0.1)', color: C.amber, borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
              🧠 AI Trip Planner
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <div className="su-layout">
          <aside className="su-sidebar">
            <button className={`su-nav-btn ${activeTab === 'weather' ? 'active' : ''}`} onClick={() => setActiveTab('weather')}>
              <span className="su-nav-icon">⛅</span> Real-Time Weather
            </button>
            <button className={`su-nav-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
              <span className="su-nav-icon">🤖</span> AI Heritage Assistant
            </button>
            <button className={`su-nav-btn ${activeTab === 'nav' ? 'active' : ''}`} onClick={() => setActiveTab('nav')}>
              <span className="su-nav-icon">🗺️</span> Offline Navigation
            </button>
            <button className={`su-nav-btn ${activeTab === 'news' ? 'active' : ''}`} onClick={() => setActiveTab('news')}>
              <span className="su-nav-icon">📰</span> Dynamic Place News
            </button>
          </aside>

          <main className="su-content">
            {activeTab === 'weather' && (
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Current Conditions</h2>
                <p style={{ color: C.muted, marginBottom: '2rem' }}>Live weather data for major heritage sites to help you plan your visit.</p>
                
                <div className="su-weather-hero">
                  <div style={{ fontSize: '5rem' }}>⛅</div>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600, color: C.muted }}>Hampi, Karnataka</div>
                    <div className="su-weather-temp">32°C</div>
                    <div style={{ marginTop: '0.5rem' }}>Partly cloudy • High UV Index • Sunset at 6:42 PM</div>
                  </div>
                </div>
                
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '1rem' }}>Other Monitored Sites</h3>
                <div className="su-card-grid">
                  <div className="su-card">
                    <div className="su-card-title">Ajanta Caves</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0' }}>29°C</div>
                    <div style={{ color: C.muted, fontSize: '0.9rem' }}>Sunny • Ideal for visiting</div>
                  </div>
                  <div className="su-card">
                    <div className="su-card-title">Taj Mahal</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0' }}>35°C</div>
                    <div style={{ color: C.muted, fontSize: '0.9rem' }}>Hot • Bring water</div>
                  </div>
                  <div className="su-card">
                    <div className="su-card-title">Konark Temple</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0' }}>30°C</div>
                    <div style={{ color: C.muted, fontSize: '0.9rem' }}>High humidity • Coastal breeze</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Multilingual AI Assistant</h2>
                <p style={{ color: C.muted, marginBottom: '2rem' }}>Ask anything about Indian history, architecture, or translations.</p>
                
                <div className="su-chat-container">
                  <div className="su-chat-messages">
                    <div className="su-message bot">
                      <strong>🏛️ Heritage AI:</strong> Namaste! I am your personal Voices of Heritage guide. I can translate ancient inscriptions, provide architectural history, or help you find facilities nearby. How can I assist you today?
                    </div>
                    <div className="su-message user">
                      What is the significance of the stone chariot in Hampi?
                    </div>
                    <div className="su-message bot">
                      <strong>🏛️ Heritage AI:</strong> The Stone Chariot in Hampi is actually a shrine dedicated to Garuda, the eagle mount of Lord Vishnu. Built during the reign of King Krishnadevaraya of the Vijayanagara Empire (16th century), it represents the rich architectural brilliance of the Dravidian style. It was inspired by the Sun Temple at Konark.
                    </div>
                  </div>
                  <div className="su-chat-input-area">
                    <input type="text" className="su-chat-input" placeholder="Type your question..." />
                    <button className="su-chat-btn">Send</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'nav' && (
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Offline Navigation & Data</h2>
                <p style={{ color: C.muted, marginBottom: '2rem' }}>Download high-resolution maps and site data for areas with low connectivity.</p>
                
                <div className="su-card-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="su-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="su-card-title" style={{ margin: 0 }}>Hampi Ruins Pack</div>
                      <div style={{ fontSize: '0.85rem', color: C.muted, marginTop: '0.25rem' }}>Includes 3D models, audio guides, and map. (145 MB)</div>
                    </div>
                    <button style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Download</button>
                  </div>
                  <div className="su-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="su-card-title" style={{ margin: 0 }}>Ellora Caves Pack</div>
                      <div style={{ fontSize: '0.85rem', color: C.muted, marginTop: '0.25rem' }}>Includes 3D models, audio guides, and map. (89 MB)</div>
                    </div>
                    <button style={{ padding: '0.5rem 1rem', background: C.amber, color: '#000', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Downloaded ✓</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'news' && (
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Dynamic Place News</h2>
                <p style={{ color: C.muted, marginBottom: '2rem' }}>Live updates, restoration news, and events from ASI and local authorities.</p>
                
                <div className="su-card-grid" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="su-card">
                    <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>ASI Update • 2 Hours Ago</div>
                    <div className="su-card-title">Restoration of Virupaksha Temple Gopuram Commences</div>
                    <p style={{ color: C.muted, fontSize: '0.9rem', lineHeight: 1.5 }}>The Archaeological Survey of India has begun phase 2 of the structural reinforcement of the main Gopuram. Scaffolding may partially obstruct views for the next 3 weeks.</p>
                  </div>
                  <div className="su-card">
                    <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Alert • 5 Hours Ago</div>
                    <div className="su-card-title">Heavy Rain Warning near Ajanta Caves</div>
                    <p style={{ color: C.muted, fontSize: '0.9rem', lineHeight: 1.5 }}>Due to expected heavy rainfall, access to caves 15-20 may be temporarily restricted for safety. Please check with local guides upon arrival.</p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
