import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
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
  Hampi:      { lat: 15.335, lon: 76.46 },
  Bangalore:  { lat: 12.9716, lon: 77.5946 },
  Mysore:     { lat: 12.2958, lon: 76.6394 },
  Delhi:      { lat: 28.6139, lon: 77.209 },
  Agra:       { lat: 27.1767, lon: 78.0081 },
  Jaipur:     { lat: 26.9124, lon: 75.7873 },
  Varanasi:   { lat: 25.3176, lon: 82.9739 },
  Mumbai:     { lat: 19.076, lon: 72.8777 },
  Aurangabad: { lat: 19.8762, lon: 75.3433 },
  Chennai:    { lat: 13.0827, lon: 80.2707 },
  Madurai:    { lat: 9.9252, lon: 78.1198 },
  Konark:     { lat: 19.8876, lon: 86.0945 },
  Kolkata:    { lat: 22.5726, lon: 88.3639 },
  Khajuraho:  { lat: 24.8318, lon: 79.9199 },
};

const FALLBACK_NARRATIONS = [
  {
    id: 'nar_hampi',
    site: 'Hampi — Vittala Temple & Stone Chariot',
    region: 'Karnataka',
    duration: '2 min',
    lang: 'en-IN',
    emoji: '🏛️',
    script:
      'Welcome to the Vittala Temple complex of Hampi, the crowning jewel of the Vijayanagara Empire. Built in the sixteenth century under Emperor Krishnadevaraya, this courtyard houses the iconic Stone Chariot dedicated to Garuda. Behind it stands the Maha Mandapa with fifty-six musical granite pillars.',
  },
  {
    id: 'nar_taj',
    site: 'Taj Mahal — Ivory-White Marble Mausoleum',
    region: 'Uttar Pradesh',
    duration: '2 min',
    lang: 'en-IN',
    emoji: '🕌',
    script:
      'Commissioned in 1632 by Mughal Emperor Shah Jahan in memory of Mumtaz Mahal, the Taj Mahal stands on the southern bank of the Yamuna River in Agra. Its four minarets lean subtly outward to protect the central dome during earthquakes.',
  },
];

const FALLBACK_HELPLINES = [
  { id: 'hl_1', name: 'National Single Emergency Number', number: '112', category: 'Emergency', state: 'National', availability: '24×7 Multilingual', description: 'Police, Fire, Medical & Disaster unified emergency response across India.' },
  { id: 'hl_2', name: 'Incredible India Tourist Helpline', number: '1800-11-1363', shortCode: '1363', category: 'Tourist', state: 'National', availability: '24×7 (12 Languages)', description: 'Ministry of Tourism toll-free helpline for domestic and international travellers.' },
  { id: 'hl_3', name: 'Medical Ambulance Emergency', number: '108', category: 'Medical', state: 'National', availability: '24×7', description: 'Free emergency ambulance and trauma response.' },
  { id: 'hl_4', name: 'Police Control Room', number: '100', category: 'Police', state: 'National', availability: '24×7', description: 'Direct emergency police assistance.' },
  { id: 'hl_5', name: 'Women Safety Helpline', number: '1091', category: 'Women Safety', state: 'National', availability: '24×7', description: 'Dedicated women safety and distress assistance.' },
  { id: 'hl_6', name: 'ASI Monument Helpline', number: '011-23075340', category: 'Heritage', state: 'National', availability: 'Mon–Fri, 9:30 AM – 6 PM', description: 'Archaeological Survey of India monument information & conservation desk.' },
];

function getWeatherMeta(code: number): { label: string; icon: string } {
  if (code === 0) return { label: 'Clear Sky', icon: '☀️' };
  if (code <= 3) return { label: 'Partly Cloudy', icon: '⛅' };
  if (code <= 48) return { label: 'Foggy', icon: '🌫️' };
  if (code <= 67) return { label: 'Rainy', icon: '🌧️' };
  if (code <= 77) return { label: 'Snowy', icon: '❄️' };
  if (code <= 82) return { label: 'Showers', icon: '🌦️' };
  if (code >= 95) return { label: 'Thunderstorm', icon: '⛈️' };
  return { label: 'Fair', icon: '🌤️' };
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type TabType = 'weather' | 'audio' | 'helplines' | 'chatbot';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
}

export default function SmartUtilitiesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('weather');

  // --- Weather state ---
  const [weather, setWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');
  const [selectedCity, setSelectedCity] = useState('Hampi');
  const [weatherSource, setWeatherSource] = useState('');

  // --- Audio Narration state (window.speechSynthesis) ---
  const [narrations, setNarrations] = useState<any[]>(FALLBACK_NARRATIONS);
  const [selectedNarrationId, setSelectedNarrationId] = useState('nar_hampi');
  const [customScript, setCustomScript] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechStatus, setSpeechStatus] = useState<'idle' | 'speaking' | 'paused'>('idle');
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // --- Emergency Helplines state ---
  const [helplines, setHelplines] = useState<any[]>(FALLBACK_HELPLINES);
  const [helplineState, setHelplineState] = useState('All');
  const [helplineCategory, setHelplineCategory] = useState('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // --- Chatbot state ---
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Namaste! I am Heritage AI, your personal Voices of Heritage guide. Ask me about Indian monuments, ASI timings, architecture, local phrases, food trails, wellness circuits, or emergency numbers.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  /* ── Weather fetcher: backend /api/utilities/weather -> Open-Meteo direct fallback ── */
  const fetchWeather = async (city: string, coords?: { lat: number; lon: number }) => {
    setWeatherLoading(true);
    setWeatherError('');
    try {
      const query = coords
        ? `/api/utilities/weather?lat=${coords.lat}&lon=${coords.lon}`
        : `/api/utilities/weather?city=${encodeURIComponent(city)}`;
      const { data } = await axios.get(query, { timeout: 9000 });
      if (data && data.current) {
        setWeather(data);
        setWeatherSource(data.source || 'backend-open-meteo');
        setWeatherLoading(false);
        return;
      }
      throw new Error('Empty weather response');
    } catch {
      // Fallback: call Open-Meteo directly from browser
      try {
        const { lat, lon } = coords || CITIES[city] || CITIES.Hampi;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset,uv_index_max&timezone=Asia%2FKolkata&forecast_days=5`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Open-Meteo unavailable');
        const raw = await res.json();
        setWeather({
          city: coords ? 'Current Location' : city,
          current: raw.current,
          daily: raw.daily,
          condition: getWeatherMeta(raw.current?.weather_code ?? 0),
          fetchedAt: new Date().toISOString(),
        });
        setWeatherSource('open-meteo-direct');
      } catch {
        setWeatherError('Failed to fetch live weather. Please check your internet connection and retry.');
      }
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(selectedCity);
  }, [selectedCity]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setWeatherError('Geolocation is not supported by your browser.');
      return;
    }
    setWeatherLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather('Current Location', { lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {
        setWeatherError('Location permission denied. Please choose a city from the dropdown.');
        setWeatherLoading(false);
      }
    );
  };

  /* ── Load Narrations & Helplines from backend utility API ── */
  useEffect(() => {
    axios.get('/api/utilities/narrations')
      .then(({ data }) => { if (Array.isArray(data) && data.length > 0) setNarrations(data); })
      .catch(() => {});

    axios.get('/api/utilities/helplines')
      .then(({ data }) => { if (Array.isArray(data) && data.length > 0) setHelplines(data); })
      .catch(() => {});
  }, []);

  /* ── Load browser speechSynthesis voices ── */
  useEffect(() => {
    if (!speechSupported) return;
    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices();
      setVoices(list);
      if (list.length > 0 && !selectedVoiceURI) {
        const preferred = list.find(v => v.lang.includes('en-IN')) || list.find(v => v.lang.startsWith('en')) || list[0];
        if (preferred) setSelectedVoiceURI(preferred.voiceURI);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [speechSupported]);

  const activeNarration = narrations.find(n => n.id === selectedNarrationId) || narrations[0];

  const speakText = (text: string, langHint?: string) => {
    if (!speechSupported || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = speechRate;
    if (langHint) utter.lang = langHint;
    const chosenVoice =
      (langHint && langHint.startsWith('hi') ? voices.find(v => v.lang.startsWith('hi')) : null) ||
      voices.find(v => v.voiceURI === selectedVoiceURI);
    if (chosenVoice) utter.voice = chosenVoice;
    utter.onstart = () => setSpeechStatus('speaking');
    utter.onpause = () => setSpeechStatus('paused');
    utter.onresume = () => setSpeechStatus('speaking');
    utter.onend = () => setSpeechStatus('idle');
    utter.onerror = () => setSpeechStatus('idle');
    window.speechSynthesis.speak(utter);
  };

  const handlePauseResume = () => {
    if (!speechSupported) return;
    if (speechStatus === 'speaking') {
      window.speechSynthesis.pause();
      setSpeechStatus('paused');
    } else if (speechStatus === 'paused') {
      window.speechSynthesis.resume();
      setSpeechStatus('speaking');
    }
  };

  const handleStopSpeech = () => {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    setSpeechStatus('idle');
  };

  /* ── Chatbot submit handler ── */
  const sendChatMessage = async (textOverride?: string) => {
    const text = (textOverride ?? chatInput).trim();
    if (!text || chatLoading) return;
    const userMsg: ChatMessage = { id: `u_${Date.now()}`, sender: 'user', text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setChatInput('');
    setChatLoading(true);
    try {
      const { data } = await axios.post('/api/utilities/chat', {
        message: text,
        history: nextHistory.slice(-6),
      });
      setMessages(prev => [
        ...prev,
        { id: `b_${Date.now()}`, sender: 'bot', text: data.reply || 'I could not formulate a response. Please try again.' },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { id: `b_${Date.now()}`, sender: 'bot', text: 'Backend utility service is currently offline. For immediate tourist assistance in India, dial 1800-11-1363 (24×7).' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const helplineStates = ['All', ...Array.from(new Set(helplines.map(h => h.state)))];
  const helplineCategories = ['All', ...Array.from(new Set(helplines.map(h => h.category)))];
  const filteredHelplines = helplines.filter(h =>
    (helplineState === 'All' || h.state === helplineState || h.state === 'National') &&
    (helplineCategory === 'All' || h.category === helplineCategory)
  );

  const css = `
    .su-root { display: flex; flex-direction: column; min-height: 100vh; background: ${C.bg}; color: ${C.text}; font-family: 'Inter', sans-serif; }
    .su-topbar { padding: 1.25rem 2rem; border-bottom: 1px solid ${C.border}; background: ${C.surface}; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 50; }
    .su-brand { display: flex; align-items: center; gap: 1rem; text-decoration: none; }
    .su-title { font-size: 1.4rem; font-weight: 800; color: ${C.text}; }
    .su-subtitle { font-size: 0.85rem; color: ${C.muted}; }

    .su-layout { display: flex; flex: 1; overflow: hidden; max-width: 1400px; margin: 0 auto; width: 100%; padding: 2rem; gap: 2rem; }
    .su-sidebar { width: 260px; display: flex; flex-direction: column; gap: 0.5rem; flex-shrink: 0; }
    .su-nav-btn { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem; border-radius: 12px; background: transparent; border: 1px solid transparent; cursor: pointer; color: ${C.text}; font-weight: 600; font-size: 0.95rem; transition: all 0.2s; text-align: left; width: 100%; }
    .su-nav-btn:hover { background: rgba(245,158,11,0.05); }
    .su-nav-btn.active { background: rgba(245,158,11,0.1); border-color: ${C.amber}; color: ${C.amber}; }
    .su-nav-icon { font-size: 1.2rem; }

    .su-content { flex: 1; background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 20px; padding: 2.25rem; overflow-y: auto; position: relative; }
    .su-card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 1.25rem; margin-top: 1.25rem; }
    .su-card { padding: 1.35rem; border-radius: 16px; background: rgba(255,255,255,0.02); border: 1px solid ${C.border}; transition: transform 0.2s, border-color 0.2s; }
    .su-card:hover { transform: translateY(-2px); border-color: rgba(245,158,11,0.35); }
    .su-card-title { font-size: 1.05rem; font-weight: 700; margin-bottom: 0.5rem; color: ${C.gold}; }

    /* Weather */
    .su-weather-hero { display: flex; align-items: center; gap: 2rem; padding: 2rem; background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(245,158,11,0.06)); border-radius: 16px; border: 1px solid rgba(59,130,246,0.2); margin-bottom: 1.5rem; flex-wrap: wrap; }
    .su-weather-temp { font-size: 3.75rem; font-weight: 800; line-height: 1; }
    .su-select { background: rgba(0,0,0,0.25); border: 1px solid ${C.border}; color: ${C.text}; padding: 0.6rem 1rem; border-radius: 10px; font-size: 0.9rem; outline: none; cursor: pointer; }
    .su-select:focus { border-color: ${C.amber}; }
    .su-weather-stat { background: rgba(0,0,0,0.18); border: 1px solid ${C.border}; border-radius: 12px; padding: 1rem 1.25rem; display: flex; flex-direction: column; align-items: center; gap: 0.3rem; }
    .su-weather-stat-val { font-size: 1.35rem; font-weight: 800; color: ${C.amber}; }
    .su-weather-stat-lbl { font-size: 0.72rem; color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.05em; }
    .su-forecast-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.9rem; margin-top: 1rem; }
    .su-forecast-card { background: rgba(0,0,0,0.18); border: 1px solid ${C.border}; border-radius: 12px; padding: 1rem; text-align: center; }
    .su-spinner { display: inline-block; width: 38px; height: 38px; border: 3px solid ${C.border}; border-top-color: ${C.amber}; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Audio */
    .su-btn-primary { padding: 0.65rem 1.25rem; border-radius: 10px; background: ${C.amber}; color: #000; font-weight: 700; border: none; cursor: pointer; font-size: 0.88rem; }
    .su-btn-primary:hover { filter: brightness(1.08); }
    .su-btn-ghost { padding: 0.6rem 1.1rem; border-radius: 10px; background: transparent; border: 1px solid ${C.border}; color: ${C.text}; font-weight: 600; cursor: pointer; font-size: 0.86rem; }
    .su-btn-ghost:hover { border-color: ${C.amber}; color: ${C.amber}; }

    /* Chat */
    .su-chat-container { display: flex; flex-direction: column; height: 500px; background: rgba(0,0,0,0.18); border-radius: 14px; border: 1px solid ${C.border}; }
    .su-chat-messages { flex: 1; padding: 1.25rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.9rem; }
    .su-message { max-width: 82%; padding: 0.9rem 1.1rem; border-radius: 12px; font-size: 0.92rem; line-height: 1.55; white-space: pre-line; }
    .su-message.bot { align-self: flex-start; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.25); }
    .su-message.user { align-self: flex-end; background: ${C.card}; border: 1px solid ${C.border}; }
    .su-chat-input-area { padding: 0.9rem; border-top: 1px solid ${C.border}; display: flex; gap: 0.65rem; }
    .su-chat-input { flex: 1; padding: 0.75rem 1.1rem; border-radius: 24px; background: ${C.surface}; border: 1px solid ${C.border}; color: ${C.text}; outline: none; font-size: 0.92rem; }
    .su-chat-input:focus { border-color: ${C.amber}; }
    .su-chat-btn { padding: 0 1.4rem; border-radius: 24px; background: ${C.amber}; color: #000; font-weight: 700; border: none; cursor: pointer; }
    .su-chip { padding: 0.35rem 0.85rem; border-radius: 20px; border: 1px solid ${C.border}; background: transparent; color: ${C.muted}; font-size: 0.8rem; cursor: pointer; font-weight: 600; }
    .su-chip.active, .su-chip:hover { border-color: ${C.amber}; color: ${C.amber}; background: rgba(245,158,11,0.08); }

    @media (max-width: 768px) {
      .su-layout { flex-direction: column; padding: 1rem; }
      .su-sidebar { width: 100%; flex-direction: row; overflow-x: auto; }
      .su-nav-btn { white-space: nowrap; }
      .su-content { padding: 1.25rem; }
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
              <div className="su-subtitle">Live weather, audio guides, helplines &amp; AI heritage assistant</div>
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
              <span className="su-nav-icon">⛅</span> Weather
            </button>
            <button className={`su-nav-btn ${activeTab === 'audio' ? 'active' : ''}`} onClick={() => setActiveTab('audio')}>
              <span className="su-nav-icon">🎧</span> Audio Narration
            </button>
            <button className={`su-nav-btn ${activeTab === 'helplines' ? 'active' : ''}`} onClick={() => setActiveTab('helplines')}>
              <span className="su-nav-icon">🚨</span> Emergency Helplines
            </button>
            <button className={`su-nav-btn ${activeTab === 'chatbot' ? 'active' : ''}`} onClick={() => setActiveTab('chatbot')}>
              <span className="su-nav-icon">🤖</span> Chatbot
            </button>
          </aside>

          <main className="su-content">
            {/* ── TAB 1: LIVE WEATHER ── */}
            {activeTab === 'weather' && (
              <div>
                <h2 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.4rem' }}>Live Heritage Weather</h2>
                <p style={{ color: C.muted, marginBottom: '1.25rem' }}>Real-time Open-Meteo forecasts &amp; monument visiting advisories across India.</p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <label style={{ color: C.muted, fontSize: '0.88rem', fontWeight: 600 }}>Heritage City:</label>
                  <select className="su-select" value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
                    {Object.keys(CITIES).map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  <button className="su-btn-ghost" onClick={() => fetchWeather(selectedCity)}>🔄 Refresh</button>
                  <button className="su-btn-ghost" onClick={handleUseMyLocation}>📍 Use My Location</button>
                </div>

                {weatherLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3.5rem', gap: '1rem' }}>
                    <div className="su-spinner" />
                    <p style={{ color: C.muted }}>Fetching live weather data…</p>
                  </div>
                )}

                {weatherError && !weatherLoading && (
                  <div style={{ padding: '1.25rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#ef4444' }}>
                    ⚠️ {weatherError}
                  </div>
                )}

                {weather && !weatherLoading && !weatherError && (() => {
                  const cur = weather.current || {};
                  const daily = weather.daily || {};
                  const cond = weather.condition || getWeatherMeta(cur.weather_code ?? 0);
                  return (
                    <>
                      <div className="su-weather-hero">
                        <div style={{ fontSize: '4.5rem' }}>{cond.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: C.muted }}>
                            {weather.city || selectedCity}{weather.state ? `, ${weather.state}` : ', India'}
                          </div>
                          <div className="su-weather-temp">{Math.round(cur.temperature_2m)}°C</div>
                          <div style={{ marginTop: '0.35rem', fontSize: '1rem', fontWeight: 600 }}>{cond.label} {cond.icon}</div>
                          <div style={{ marginTop: '0.2rem', color: C.muted, fontSize: '0.88rem' }}>
                            Feels like {Math.round(cur.apparent_temperature)}°C
                          </div>
                        </div>
                      </div>

                      {weather.advisory && (
                        <div style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
                          <strong style={{ color: C.amber }}>🏛️ Monument Visiting Advisory:</strong> {weather.advisory}
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.9rem', marginBottom: '1.75rem' }}>
                        <div className="su-weather-stat">
                          <div className="su-weather-stat-val">{cur.relative_humidity_2m}%</div>
                          <div className="su-weather-stat-lbl">💧 Humidity</div>
                        </div>
                        <div className="su-weather-stat">
                          <div className="su-weather-stat-val">{cur.wind_speed_10m} km/h</div>
                          <div className="su-weather-stat-lbl">🌬️ Wind Speed</div>
                        </div>
                        <div className="su-weather-stat">
                          <div className="su-weather-stat-val">{daily.uv_index_max?.[0] ?? '—'}</div>
                          <div className="su-weather-stat-lbl">☀️ Max UV Index</div>
                        </div>
                        <div className="su-weather-stat">
                          <div className="su-weather-stat-val" style={{ fontSize: '1rem' }}>
                            {daily.sunrise?.[0] ? daily.sunrise[0].slice(11, 16) : '06:00'} / {daily.sunset?.[0] ? daily.sunset[0].slice(11, 16) : '18:15'}
                          </div>
                          <div className="su-weather-stat-lbl">🌅 Sunrise / Sunset</div>
                        </div>
                      </div>

                      {daily.time && (
                        <>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: C.gold }}>5-Day Heritage Forecast</h3>
                          <div className="su-forecast-grid">
                            {daily.time.slice(0, 5).map((dateStr: string, i: number) => {
                              const d = new Date(dateStr);
                              const dayMeta = getWeatherMeta(daily.weather_code?.[i] ?? cur.weather_code ?? 0);
                              return (
                                <div key={dateStr} className="su-forecast-card">
                                  <div style={{ fontSize: '0.82rem', color: C.muted, fontWeight: 700, marginBottom: '0.35rem' }}>
                                    {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAY_NAMES[d.getDay()]}
                                  </div>
                                  <div style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>{dayMeta.icon}</div>
                                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                                    <span style={{ color: C.amber }}>{Math.round(daily.temperature_2m_max[i])}°</span>
                                    <span style={{ color: C.muted }}> / {Math.round(daily.temperature_2m_min[i])}°</span>
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: '0.25rem' }}>{dayMeta.label}</div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}

                      <p style={{ marginTop: '1.25rem', fontSize: '0.78rem', color: C.muted }}>
                        Live source: <strong>{weatherSource || 'Open-Meteo'}</strong> · Updated {weather.fetchedAt ? new Date(weather.fetchedAt).toLocaleTimeString() : 'just now'}
                      </p>
                    </>
                  );
                })()}
              </div>
            )}

            {/* ── TAB 2: AUDIO NARRATION (window.speechSynthesis) ── */}
            {activeTab === 'audio' && (
              <div>
                <h2 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.4rem' }}>Heritage Audio Narration</h2>
                <p style={{ color: C.muted, marginBottom: '1.5rem' }}>
                  Listen to narrated monument stories using your browser’s built-in <code>window.speechSynthesis</code> engine.
                </p>

                {!speechSupported && (
                  <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', marginBottom: '1rem' }}>
                    ⚠️ Speech synthesis is not supported in this browser.
                  </div>
                )}

                {/* Controls Bar */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', padding: '1.1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, marginBottom: '1.5rem' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: C.muted, marginBottom: '4px', textTransform: 'uppercase' }}>Narrator Voice</label>
                    <select className="su-select" style={{ width: '100%' }} value={selectedVoiceURI} onChange={e => setSelectedVoiceURI(e.target.value)}>
                      {voices.length === 0 && <option value="">Default System Voice</option>}
                      {voices.map(v => (
                        <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ minWidth: '160px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: C.muted, marginBottom: '4px', textTransform: 'uppercase' }}>Speed: {speechRate.toFixed(2)}x</label>
                    <input type="range" min="0.7" max="1.5" step="0.05" value={speechRate} onChange={e => setSpeechRate(parseFloat(e.target.value))} style={{ width: '100%', accentColor: C.amber }} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '14px' }}>
                    <button className="su-btn-primary" disabled={!speechSupported} onClick={() => speakText(customScript.trim() || activeNarration?.script || '', activeNarration?.lang)}>
                      ▶ {speechStatus === 'speaking' ? 'Restart' : 'Play Guide'}
                    </button>
                    {speechStatus !== 'idle' && (
                      <>
                        <button className="su-btn-ghost" onClick={handlePauseResume}>
                          {speechStatus === 'paused' ? '▶ Resume' : '⏸ Pause'}
                        </button>
                        <button className="su-btn-ghost" onClick={handleStopSpeech}>⏹ Stop</button>
                      </>
                    )}
                  </div>
                </div>

                {/* Curated Monument Scripts */}
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: C.gold, marginBottom: '0.75rem' }}>Select a Monument Audio Guide</h3>
                <div className="su-card-grid" style={{ marginTop: 0, marginBottom: '1.5rem' }}>
                  {narrations.map(item => {
                    const isSelected = item.id === activeNarration?.id;
                    return (
                      <div
                        key={item.id}
                        className="su-card"
                        onClick={() => { setSelectedNarrationId(item.id); setCustomScript(''); }}
                        style={{ cursor: 'pointer', borderColor: isSelected ? C.amber : C.border, background: isSelected ? 'rgba(245,158,11,0.06)' : undefined }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '1.5rem' }}>{item.emoji || '🏛️'}</span>
                          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(245,158,11,0.12)', color: C.amber, fontWeight: 700 }}>
                            {item.region} · {item.duration}
                          </span>
                        </div>
                        <div className="su-card-title">{item.site}</div>
                        <p style={{ fontSize: '0.84rem', color: C.muted, lineHeight: 1.55, marginBottom: '0.9rem' }}>
                          {item.script.slice(0, 145)}…
                        </p>
                        <button
                          type="button"
                          className="su-btn-primary"
                          style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
                          onClick={(e) => { e.stopPropagation(); setSelectedNarrationId(item.id); setCustomScript(''); speakText(item.script, item.lang); }}
                        >
                          🔊 Listen Now
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Full Script Preview / Custom Text Narration */}
                <div className="su-card">
                  <div className="su-card-title">📝 Active Narration Transcript (or Paste Custom Inscription / Text)</div>
                  <textarea
                    rows={4}
                    value={customScript || activeNarration?.script || ''}
                    onChange={e => setCustomScript(e.target.value)}
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: `1px solid ${C.border}`, color: C.text, fontSize: '0.9rem', lineHeight: 1.6, fontFamily: 'inherit', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: C.muted }}>
                      Status: <strong style={{ color: speechStatus === 'speaking' ? '#22c55e' : C.amber, textTransform: 'uppercase' }}>{speechStatus}</strong>
                    </span>
                    <button className="su-btn-primary" onClick={() => speakText(customScript || activeNarration?.script || '', activeNarration?.lang)}>
                      🎧 Narrate Text
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: EMERGENCY HELPLINES ── */}
            {activeTab === 'helplines' && (
              <div>
                <h2 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.4rem' }}>Emergency &amp; Tourist Helplines</h2>
                <p style={{ color: C.muted, marginBottom: '1.25rem' }}>Verified 24×7 Indian emergency, medical, ASI heritage, and state tourism helplines.</p>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
                  <select className="su-select" value={helplineState} onChange={e => setHelplineState(e.target.value)}>
                    {helplineStates.map(st => <option key={st} value={st}>{st === 'All' ? 'All States & National' : st}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {helplineCategories.map(cat => (
                      <button key={cat} className={`su-chip ${helplineCategory === cat ? 'active' : ''}`} onClick={() => setHelplineCategory(cat)}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="su-card-grid">
                  {filteredHelplines.map(h => (
                    <div key={h.id} className="su-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', padding: '3px 9px', borderRadius: '12px', background: h.category === 'Emergency' || h.category === 'Medical' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.12)', color: h.category === 'Emergency' || h.category === 'Medical' ? '#f87171' : C.amber }}>
                            {h.category}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: C.muted }}>📍 {h.state}</span>
                        </div>
                        <div className="su-card-title" style={{ color: C.text }}>{h.name}</div>
                        <div style={{ fontSize: '1.55rem', fontWeight: 900, fontFamily: 'monospace', color: C.amber, margin: '0.35rem 0' }}>
                          {h.number}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 600, marginBottom: '0.5rem' }}>🕒 {h.availability}</div>
                        <p style={{ fontSize: '0.84rem', color: C.muted, lineHeight: 1.5, marginBottom: '1rem' }}>{h.description}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <a
                          href={`tel:${h.number.replace(/[^0-9+]/g, '')}`}
                          className="su-btn-primary"
                          style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
                        >
                          📞 Call Now
                        </a>
                        <button
                          type="button"
                          className="su-btn-ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(h.number);
                            setCopiedId(h.id);
                            setTimeout(() => setCopiedId(null), 1800);
                          }}
                        >
                          {copiedId === h.id ? '✓ Copied' : '📋 Copy'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB 4: CHATBOT ── */}
            {activeTab === 'chatbot' && (
              <div>
                <h2 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.4rem' }}>Heritage AI Chatbot</h2>
                <p style={{ color: C.muted, marginBottom: '1rem' }}>Ask anything about Indian monuments, ASI timings, translations, cuisines, or travel tips.</p>

                {/* Quick prompts */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {[
                    'Tell me about Hampi Stone Chariot',
                    'Taj Mahal timings and tickets',
                    'Ajanta & Ellora closed days',
                    'Translate Namaste to Kannada & Tamil',
                    'Emergency tourist numbers',
                  ].map(q => (
                    <button key={q} className="su-chip" onClick={() => sendChatMessage(q)}>{q}</button>
                  ))}
                </div>

                <div className="su-chat-container">
                  <div className="su-chat-messages">
                    {messages.map(m => (
                      <div key={m.id} className={`su-message ${m.sender}`}>
                        {m.sender === 'bot' && <strong style={{ color: C.amber }}>🏛️ Heritage AI: </strong>}
                        {m.text}
                        {m.sender === 'bot' && speechSupported && (
                          <div style={{ marginTop: '0.45rem' }}>
                            <button
                              type="button"
                              onClick={() => speakText(m.text)}
                              style={{ background: 'none', border: 'none', color: C.amber, fontSize: '0.75rem', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                            >
                              🔊 Read Aloud
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="su-message bot" style={{ color: C.muted }}>
                        🏛️ Heritage AI is thinking…
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <form
                    className="su-chat-input-area"
                    onSubmit={e => { e.preventDefault(); sendChatMessage(); }}
                  >
                    <input
                      type="text"
                      className="su-chat-input"
                      placeholder="Ask about monuments, history, timings, or translations..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                    />
                    <button type="submit" className="su-chat-btn" disabled={chatLoading || !chatInput.trim()}>
                      Send
                    </button>
                  </form>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
