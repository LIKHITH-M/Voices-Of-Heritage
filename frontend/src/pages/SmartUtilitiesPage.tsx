import { useState, useEffect } from 'react';
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

const CITIES: Record<string, { lat: number; lon: number }> = {
  'Bangalore': { lat: 12.97, lon: 77.59 },
  'Delhi':     { lat: 28.61, lon: 77.21 },
  'Jaipur':    { lat: 26.92, lon: 75.82 },
  'Mumbai':    { lat: 19.08, lon: 72.88 },
  'Chennai':   { lat: 13.08, lon: 80.27 },
  'Kolkata':   { lat: 22.57, lon: 88.36 },
  'Varanasi':  { lat: 25.32, lon: 83.00 },
  'Agra':      { lat: 27.18, lon: 78.00 },
  'Mysore':    { lat: 12.30, lon: 76.65 },
  'Hampi':     { lat: 15.33, lon: 76.46 },
};

function getWeatherLabel(code: number): string {
  if (code === 0) return 'Clear Sky ☀️';
  if (code <= 3) return 'Partly Cloudy ⛅';
  if (code <= 48) return 'Foggy 🌫️';
  if (code <= 67) return 'Rainy 🌧️';
  if (code <= 77) return 'Snowy ❄️';
  if (code <= 82) return 'Showers 🌦️';
  if (code === 95) return 'Thunderstorm ⛈️';
  return 'Unknown';
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SmartUtilitiesPage() {
  const [activeTab, setActiveTab] = useState('weather');

  // --- Weather state ---
  const [weather, setWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');
  const [selectedCity, setSelectedCity] = useState('Bangalore');

  const fetchWeather = async (city: string) => {
    setWeatherLoading(true);
    setWeatherError('');
    try {
      const { lat, lon } = CITIES[city];
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FKolkata&forecast_days=3`;
      const res = await fetch(url);
      const data = await res.json();
      setWeather(data);
    } catch {
      setWeatherError('Failed to fetch weather. Please try again.');
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => { fetchWeather(selectedCity); }, [selectedCity]);

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
    .su-sidebar { width: 260px; display: flex; flex-direction: column; gap: 0.5rem; flex-shrink: 0; }
    .su-nav-btn { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem; border-radius: 12px; background: transparent; border: 1px solid transparent; cursor: pointer; color: ${C.text}; font-weight: 600; font-size: 0.95rem; transition: all 0.2s; text-align: left; width: 100%; }
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
    .su-weather-hero { display: flex; align-items: center; gap: 2rem; padding: 2rem; background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(147,197,253,0.05)); border-radius: 16px; border: 1px solid rgba(59,130,246,0.2); margin-bottom: 2rem; flex-wrap: wrap; }
    .su-weather-temp { font-size: 4rem; font-weight: 800; line-height: 1; }
    .su-city-select { background: rgba(0,0,0,0.3); border: 1px solid ${C.border}; color: ${C.text}; padding: 0.6rem 1rem; border-radius: 10px; font-size: 0.95rem; outline: none; cursor: pointer; margin-bottom: 1.5rem; }
    .su-city-select:focus { border-color: ${C.amber}; }
    .su-weather-stat { background: rgba(0,0,0,0.2); border: 1px solid ${C.border}; border-radius: 12px; padding: 1rem 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.3rem; }
    .su-weather-stat-val { font-size: 1.5rem; font-weight: 800; color: ${C.amber}; }
    .su-weather-stat-lbl { font-size: 0.75rem; color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.05em; }
    .su-forecast-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 1.5rem; }
    .su-forecast-card { background: rgba(0,0,0,0.2); border: 1px solid ${C.border}; border-radius: 12px; padding: 1rem; text-align: center; }
    .su-forecast-day { font-size: 0.85rem; color: ${C.muted}; margin-bottom: 0.5rem; font-weight: 600; }
    .su-forecast-temps { font-size: 1.1rem; font-weight: 700; }
    .su-spinner { display: inline-block; width: 40px; height: 40px; border: 3px solid ${C.border}; border-top-color: ${C.amber}; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    @media (max-width: 768px) {
      .su-layout { flex-direction: column; padding: 1rem; }
      .su-sidebar { width: 100%; flex-direction: row; overflow-x: auto; }
      .su-nav-btn { white-space: nowrap; }
      .su-forecast-grid { grid-template-columns: repeat(3, 1fr); }
    }
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
              <div className="su-subtitle">AI assistance &amp; live heritage data</div>
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
                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Real-Time Weather</h2>
                <p style={{ color: C.muted, marginBottom: '1.5rem' }}>Live weather for major Indian heritage cities — plan your visit with up-to-date conditions.</p>

                {/* City Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <label style={{ color: C.muted, fontSize: '0.9rem', fontWeight: 600 }}>Select City:</label>
                  <select
                    className="su-city-select"
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    style={{ marginBottom: 0 }}
                  >
                    {Object.keys(CITIES).map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => fetchWeather(selectedCity)}
                    style={{ padding: '0.6rem 1rem', background: 'rgba(245,158,11,0.1)', color: C.amber, border: `1px solid ${C.amber}`, borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                  >
                    🔄 Refresh
                  </button>
                </div>

                {weatherLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', gap: '1rem' }}>
                    <div className="su-spinner" />
                    <p style={{ color: C.muted }}>Fetching live weather…</p>
                  </div>
                )}

                {weatherError && !weatherLoading && (
                  <div style={{ padding: '1.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#ef4444' }}>
                    ⚠️ {weatherError}
                  </div>
                )}

                {weather && !weatherLoading && !weatherError && (() => {
                  const cur = weather.current;
                  const daily = weather.daily;
                  const conditionLabel = getWeatherLabel(cur.weather_code);

                  return (
                    <>
                      {/* Hero Card */}
                      <div className="su-weather-hero">
                        <div style={{ fontSize: '5rem' }}>
                          {cur.weather_code === 0 ? '☀️' : cur.weather_code <= 3 ? '⛅' : cur.weather_code <= 48 ? '🌫️' : cur.weather_code <= 67 ? '🌧️' : cur.weather_code <= 77 ? '❄️' : cur.weather_code <= 82 ? '🌦️' : '⛈️'}
                        </div>
                        <div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: C.muted }}>{selectedCity}, India</div>
                          <div className="su-weather-temp">{cur.temperature_2m}°C</div>
                          <div style={{ marginTop: '0.5rem', fontSize: '1rem' }}>{conditionLabel}</div>
                          <div style={{ marginTop: '0.25rem', color: C.muted, fontSize: '0.9rem' }}>Feels like {cur.apparent_temperature}°C</div>
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="su-weather-stat">
                          <div className="su-weather-stat-val">{cur.relative_humidity_2m}%</div>
                          <div className="su-weather-stat-lbl">💧 Humidity</div>
                        </div>
                        <div className="su-weather-stat">
                          <div className="su-weather-stat-val">{cur.wind_speed_10m} km/h</div>
                          <div className="su-weather-stat-lbl">🌬️ Wind Speed</div>
                        </div>
                        <div className="su-weather-stat">
                          <div className="su-weather-stat-val">{cur.apparent_temperature}°C</div>
                          <div className="su-weather-stat-lbl">🌡️ Feels Like</div>
                        </div>
                        <div className="su-weather-stat">
                          <div className="su-weather-stat-val" style={{ fontSize: '1rem' }}>{conditionLabel.split(' ')[0]}</div>
                          <div className="su-weather-stat-lbl">☁️ Condition</div>
                        </div>
                      </div>

                      {/* 3-Day Forecast */}
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', color: C.gold }}>3-Day Forecast</h3>
                      <div className="su-forecast-grid">
                        {daily.time.slice(0, 3).map((dateStr: string, i: number) => {
                          const d = new Date(dateStr);
                          const dayName = DAY_NAMES[d.getDay()];
                          return (
                            <div key={dateStr} className="su-forecast-card">
                              <div className="su-forecast-day">{i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayName}</div>
                              <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>
                                {i === 0 ? (cur.weather_code === 0 ? '☀️' : cur.weather_code <= 3 ? '⛅' : '🌧️') : '⛅'}
                              </div>
                              <div className="su-forecast-temps">
                                <span style={{ color: C.amber }}>{daily.temperature_2m_max[i]}°</span>
                                <span style={{ color: C.muted, fontSize: '0.95rem' }}> / {daily.temperature_2m_min[i]}°</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: '0.3rem' }}>Max / Min</div>
                            </div>
                          );
                        })}
                      </div>

                      <p style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: C.muted }}>
                        Data from <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" style={{ color: C.amber }}>Open-Meteo</a> · Updated just now
                      </p>
                    </>
                  );
                })()}
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
                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Offline Navigation &amp; Data</h2>
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
