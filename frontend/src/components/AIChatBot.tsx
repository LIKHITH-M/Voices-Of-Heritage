import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

function HeritageGuideIcon({ size = 28, color = '#D99C53' }: { size?: number; color?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      {/* Plinth / Temple Base Platform */}
      <rect x="4" y="25" width="24" height="2.5" rx="0.8" fill={color} />
      <rect x="6" y="22" width="20" height="3" rx="0.6" fill={color} />
      
      {/* Arched Sanctum Portal / Garbhagriha Doorway */}
      <path d="M13.5 25V21.5C13.5 20 18.5 20 18.5 21.5V25H13.5Z" fill="#FDE68A" />
      
      {/* Middle Tier / Vimana with carved pillars */}
      <rect x="8.5" y="17.5" width="15" height="3.5" rx="0.6" fill={color} />
      <rect x="10.2" y="18.6" width="1.5" height="1.8" rx="0.4" fill="#FDE68A" opacity="0.95" />
      <rect x="15.25" y="18.6" width="1.5" height="1.8" rx="0.4" fill="#FDE68A" opacity="0.95" />
      <rect x="20.3" y="18.6" width="1.5" height="1.8" rx="0.4" fill="#FDE68A" opacity="0.95" />
      
      {/* Upper Tier */}
      <rect x="11" y="13.5" width="10" height="3" rx="0.5" fill={color} />
      
      {/* Rising Shikhara / Temple Spire */}
      <path d="M12.5 13.5L16 6.5L19.5 13.5H12.5Z" fill={color} />
      
      {/* Kalasha Finial & Crown Jewel */}
      <circle cx="16" cy="5.2" r="1.4" fill={color} />
      <circle cx="16" cy="3" r="0.75" fill={color} />
      
      {/* Heritage AI Sparkle / Living Wisdom Aura */}
      <path 
        d="M24.5 4C24.5 6.2 25.4 7.1 27.6 7.1C25.4 7.1 24.5 8 24.5 10.2C24.5 8 23.6 7.1 21.4 7.1C23.6 7.1 24.5 6.2 24.5 4Z" 
        fill={color} 
      />
    </svg>
  );
}

export default function AIChatBot() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isStaffMode, setIsStaffMode] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai' | 'system', text: string}[]>([
    { role: 'ai', text: 'Namaste! I am your AI Heritage Guide. How can I help you explore history today?' }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';
  const C = {
    bg: isDark ? '#0A0A0B' : '#F9F7F2',
    surface: isDark ? '#141416' : '#FFFFFF',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(180,130,80,0.18)',
    text: isDark ? '#EDEDED' : '#2E251E',
    muted: isDark ? '#7A7A7A' : '#786A5E',
    amber: '#D97706',
    gold: '#B4773B',
    amberBright: '#F59E0B',
    amberDark: '#92400E',
  };

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const parseBookingIntent = (rawText: string, currentUser?: any) => {
    const q = rawText.toLowerCase();

    // Typo-tolerant action triggers (catches "bok", "tikcet", "ticekt", "entri", etc.)
    const bookingWords = [
      'book', 'bok', 'bko', 'boook', 'boking', 'booking',
      'ticket', 'tikcet', 'ticekt', 'tkt', 'tkts', 'tickt', 'tikits', 'tickets',
      'entry', 'entri', 'pass', 'passes', 'slot', 'slots',
      'reserve', 'reserv', 'resrv', 'reservation',
      'buy', 'order', 'visit', 'vsit', 'explore'
    ];

    // Email
    const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

    // Aadhaar / ID number (catches typos like "adhar", "adhra", "adha", "id is", "adhar no")
    const idMatch = rawText.match(/(?:adhar|aadhaar|aadhar|adhra|adha|adhr|id|card|document)\s*(?:no|number|num|nmbr)?\s*(?:is|:)?\s*([A-Za-z0-9]+)/i);

    const isBooking = bookingWords.some(w => q.includes(w)) || 
                      q.includes('temple') || q.includes('complex') || q.includes('caves') ||
                      q.includes('vittala') || q.includes('vitala') || q.includes('virupaksha') ||
                      emailMatch !== null || idMatch !== null;

    if (!isBooking) return null;

    const result: any = {};

    if (emailMatch) result.email = emailMatch[0];
    else if (currentUser?.email) result.email = currentUser.email;

    if (idMatch) {
      result.idNumber = idMatch[1];
      result.idType = 'aadhaar';
    }

    // Adults / Members count (catches typos like "membr", "pepl", "adlt", "prsn")
    const memberMatch = rawText.match(/(?:for\s+)?(\d+)\s*(?:member|members|membr|membar|person|people|pepl|prsn|adult|adults|adlt|ticket|tickets|tikcet|tkt|guest|guests)?/i);
    if (memberMatch && memberMatch[1]) {
      result.adults = parseInt(memberMatch[1], 10);
    } else {
      result.adults = 1;
    }

    // Date parsing: e.g. 31st oct, 31 okt, 31/10/2026, etc.
    const dateMatch = rawText.match(/(?:on\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|okt|nov|dec)[a-z]*/i);
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const months: Record<string, string> = { 
        jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06', 
        jul:'07', aug:'08', sep:'09', sept:'09', oct:'10', okt:'10', nov:'11', dec:'12' 
      };
      const month = months[dateMatch[2].toLowerCase().slice(0, 3)] || '10';
      result.date = `2026-${month}-${day}`;
      result.displayDate = `${dateMatch[1]} ${dateMatch[2]}`;
    } else {
      const isoMatch = rawText.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        result.date = isoMatch[0];
        result.displayDate = isoMatch[0];
      }
    }

    // Site & Activity dynamic detection with typo tolerance
    const knownSites = [
      { name: 'Hampi', keywords: ['hampi', 'hamppi', 'hapi', 'hmp', 'hampy', 'vittala', 'vitala', 'vitthal', 'vittal', 'virupaksha'] },
      { name: 'Ajanta', keywords: ['ajanta', 'ajnta', 'ajantha', 'ajanta caves', 'caves'] },
      { name: 'Konark', keywords: ['konark', 'konrk', 'kanark', 'sun temple', 'suntemple'] },
      { name: 'Belur', keywords: ['belur', 'beloor', 'chennakeshava', 'chennakesava'] },
      { name: 'Mahabalipuram', keywords: ['mahabalipuram', 'mamallapuram', 'shore temple', 'mahabs'] },
      { name: 'Thanjavur', keywords: ['thanjavur', 'tanjore', 'thanjavoor', 'brihadisvara', 'brihadeeswara', 'big temple'] },
    ];

    for (const siteItem of knownSites) {
      if (siteItem.keywords.some(k => q.includes(k))) {
        result.site = siteItem.name;
        break;
      }
    }

    // Specific Activity detection
    if (q.includes('vittala') || q.includes('vitala') || q.includes('chariot')) {
      result.site = 'Hampi';
      result.actId = 'h-entry-1';
      result.actName = 'Vittala Temple Complex — Entry Ticket';
    } else if (q.includes('virupaksha')) {
      result.site = 'Hampi';
      result.actId = 'h-entry-2';
      result.actName = 'Virupaksha Temple — Puja Participation';
    } else if (q.includes('matanga') || q.includes('hampi trek')) {
      result.site = 'Hampi';
      result.actId = 'h-trek-1';
      result.actName = 'Hampi Heritage Trek — Matanga Hill & Ruins';
    } else if (q.includes('sun temple') || q.includes('konark')) {
      result.site = 'Konark';
      result.actId = 'k-entry-1';
      result.actName = 'Sun Temple Konark — Entry Ticket';
    } else if (q.includes('ajanta')) {
      result.site = 'Ajanta';
      result.actId = 'aj-entry-1';
      result.actName = 'Ajanta Caves — UNESCO Entry Ticket';
    } else if (q.includes('belur') || q.includes('chennakeshava')) {
      result.site = 'Belur';
      result.actId = 'b-entry-1';
      result.actName = 'Chennakeshava Temple — Entry & Audio Guide';
    } else if (q.includes('shore temple') || q.includes('mahabalipuram') || q.includes('mamallapuram')) {
      result.site = 'Mahabalipuram';
      result.actId = 'm-entry-1';
      result.actName = 'Shore Temple & Pancha Rathas — Entry Ticket';
    } else if (q.includes('thanjavur') || q.includes('brihadisvara') || q.includes('big temple')) {
      result.site = 'Thanjavur';
      result.actId = 't-entry-1';
      result.actName = 'Brihadisvara Temple Complex — Entry Ticket';
    } else if (!result.site) {
      result.site = 'Hampi';
      result.actId = 'h-entry-1';
      result.actName = 'Vittala Temple Complex — Entry Ticket';
    }

    // Name extraction
    if (currentUser?.name) {
      result.name = currentUser.name;
    } else if (result.email) {
      const userPart = result.email.split('@')[0];
      result.name = userPart.replace(/[0-9_.]/g, '').replace(/^[a-z]/, (c: string) => c.toUpperCase()) || 'Visitor';
    }

    return result;
  };

  const generateMockResponse = (q: string, staffMode: boolean): { text: string, navigateTo?: string } => {
    const query = q.toLowerCase();
    
    // Exact user test cases
    if (query.includes('blr to hampi') || (query.includes('go for hampi') && query.includes('blr'))) {
      return { text: "To know more details about Hampi please visit Explore option, and if you want to have route optimization and knowledge of itineraries please go for AI Trip Planner (AI Maps)." };
    }
    
    if (query.includes('take me to') && query.includes('gokarn')) {
      return {
        text: "Taking you directly to the Explore page for info about Gokarna...",
        navigateTo: '/explore'
      };
    }

    if (query.includes('my ticket') || query.includes('where is my ticket') || query.includes('saved') || query.includes('database')) {
      if (staffMode) {
        return {
          text: "Accessing your personal records! Redirecting you to your Dashboard where you can view your saved places and purchased tickets.",
          navigateTo: '/dashboard'
        };
      } else {
        return { text: "To check your personal database for saved items or purchased tickets, please switch to the '👨‍💼 AI Staff' mode. I will fetch those records for you instantly!" };
      }
    }

    // ── AI Staff Intelligent Booking & Entity Extraction ──
    const bookingDetails = parseBookingIntent(q, user);
    if (bookingDetails) {
      try {
        sessionStorage.setItem('voh_ai_booking', JSON.stringify(bookingDetails));
      } catch (e) {}

      const params = new URLSearchParams();
      if (bookingDetails.site) params.set('site', bookingDetails.site);
      if (bookingDetails.actId) params.set('act', bookingDetails.actId);
      if (bookingDetails.actName) params.set('name', bookingDetails.actName);
      if (bookingDetails.email) params.set('email', bookingDetails.email);
      if (bookingDetails.idNumber) params.set('idNumber', bookingDetails.idNumber);
      if (bookingDetails.date) params.set('date', bookingDetails.date);
      if (bookingDetails.adults) params.set('adults', String(bookingDetails.adults));
      if (bookingDetails.name) params.set('userName', bookingDetails.name);
      params.set('auto', 'true');

      const navUrl = `/bookings?${params.toString()}`;

      const summaryParts: string[] = [];
      if (bookingDetails.actName) summaryParts.push(`🏛️ ${bookingDetails.actName}`);
      else if (bookingDetails.site) summaryParts.push(`📍 ${bookingDetails.site}`);
      if (bookingDetails.adults) summaryParts.push(`👤 ${bookingDetails.adults} visitor(s)`);
      if (bookingDetails.displayDate || bookingDetails.date) summaryParts.push(`📅 ${bookingDetails.displayDate || bookingDetails.date}`);
      if (bookingDetails.email) summaryParts.push(`✉️ ${bookingDetails.email}`);
      if (bookingDetails.idNumber) summaryParts.push(`🪪 Aadhaar: ${bookingDetails.idNumber}`);

      const summaryStr = summaryParts.length > 0 ? ` for ${summaryParts.join(', ')}` : '';

      return {
        text: `I have prepared your booking${summaryStr}! All your details have been filled into the official ticketing form. Redirecting you right now to review & confirm...`,
        navigateTo: navUrl
      };
    }

    const isBookingQuery = query.includes('ticket') || query.includes('book') || query.includes('order') || query.includes('entry');
    const isCostQuery = query.includes('how many') || query.includes('money') || query.includes('time') || query.includes('cost') || query.includes('price') || query.includes('rupee') || query.includes('hour') || query.includes('visit') || query.includes('people');

    if (isBookingQuery || isCostQuery) {
      if (staffMode) {
         return {
            text: "I am handling your request! Redirecting you to Activity & Ticketing to complete your booking instantly...",
            navigateTo: '/bookings'
         };
      } else {
         return { text: "For specific details regarding bookings, tickets, costs, timings, or group sizes, please click the '👨‍💼 AI Staff' button at the top right of this chat. Our dedicated AI Staff will directly handle all your specific inquiries and transactions!" };
      }
    }
    
    // General exploration keywords
    if (query.includes('hampi') || query.includes('hapi')) { // Catcher for 'hapi' typo
      return { text: "Hampi is a UNESCO World Heritage Site located in Karnataka, India. It was the capital of the Vijayanagara Empire. You can explore the Virupaksha Temple, the Stone Chariot, and much more on our interactive map!" };
    }
    if (query.includes('route') || query.includes('plan') || query.includes('planner') || query.includes('map')) {
      if (!user) {
        return { text: "AI Maps and live Route Companion are exclusive to registered travellers. Please sign in or create an account to access interactive maps and route planning!", navigateTo: '/auth/login' };
      }
      return { text: "You can use our 'AI Trip Planner' to automatically generate a custom itinerary, or open the 'Route Companion' compass at the bottom of your screen for live directions!" };
    }
    if (query.includes('stay') || query.includes('hotel') || query.includes('sleep') || query.includes('food') || query.includes('eat')) {
      return { text: "Our 'Smart Stay' and 'Culinary Heritage' sections highlight authentic accommodations and local food near major historical sites. You can also see nearby stays by selecting a site on the map!" };
    }
    if (query.includes('heritage') || query.includes('history') || query.includes('temple') || query.includes('unesco') || query.includes('fort') || query.includes('explore')) {
      return { text: "We have an extensive database of Indian heritage sites! Try searching for places like 'Qutub Minar', 'Gokarna', or 'Hampi' in the main explore page to see 360 views and historical insights." };
    }

    return { text: "I am specialized in Voices of Heritage and historical sites. I can answer questions related to ticketing, travel planning, routing, and heritage exploration. Please ask me about these topics!" };
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const queueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);

  const processNextInQueue = () => {
    if (queueRef.current.length === 0) {
      isProcessingRef.current = false;
      setIsProcessing(false);
      return;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);
    const nextMsg = queueRef.current.shift()!;

    setTimeout(() => {
      const aiResponse = generateMockResponse(nextMsg, isStaffMode);
      setMessages(p => [...p, { role: 'ai', text: aiResponse.text }]);

      if (aiResponse.navigateTo && queueRef.current.length === 0) {
        setTimeout(() => {
          setIsOpen(false);
          navigate(aiResponse.navigateTo!);
        }, 1400);
      }

      // Process next queued message after a short reading delay
      setTimeout(() => {
        processNextInQueue();
      }, 500);
    }, 700);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(p => [...p, { role: 'user', text: userMsg }]);

    queueRef.current.push(userMsg);

    if (!isProcessingRef.current) {
      processNextInQueue();
    }
  };

  const toggleListen = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    if (isListening) return; // Prevent multiple starts

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  return (
    <>
      <style>{`
        .aichat-fab {
          position: fixed;
          bottom: 24px;
          right: ${user ? '88px' : '24px'};
          z-index: 9999;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1C1B24 0%, #121118 100%);
          border: 1.5px solid rgba(217, 156, 83, 0.5);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #D99C53;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.65), 0 0 12px rgba(217, 156, 83, 0.25);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .aichat-fab:hover { 
          transform: scale(1.08) translateY(-2px); 
          border-color: rgba(217, 156, 83, 0.9);
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.8), 0 0 18px rgba(217, 156, 83, 0.45); 
        }
        .aichat-fab:active {
          transform: scale(0.96);
        }
        .aichat-panel {
          position: fixed;
          bottom: 92px;
          right: ${user ? '88px' : '24px'};
          z-index: 9998;
          width: 380px;
          height: 550px;
          border-radius: 20px;
          background: ${C.bg};
          border: 1px solid ${C.border};
          box-shadow: 0 12px 48px rgba(0,0,0,${isDark ? '0.6' : '0.15'}), 0 0 24px rgba(217, 119, 6, 0.12);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: chatSlide 0.25s ease;
          font-family: 'Inter', sans-serif;
        }
        @keyframes chatSlide {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media(max-width: 768px) {
          .aichat-fab {
            right: ${user ? '72px' : '16px'};
            bottom: 86px;
            width: 48px;
            height: 48px;
          }
          .aichat-panel {
            width: calc(100vw - 32px);
            right: 16px;
            bottom: 144px;
            height: 60vh;
          }
        }
      `}</style>

      <button 
        className="aichat-fab" 
        onClick={() => setIsOpen(!isOpen)} 
        title="Voices of Heritage — AI Guide"
        aria-label="Voices of Heritage AI Guide"
      >
        {isOpen ? (
          <span style={{ fontSize: '1.3rem', fontWeight: 700, lineHeight: 1, color: '#D99C53' }}>✕</span>
        ) : (
          <HeritageGuideIcon size={26} color="#D99C53" />
        )}
      </button>

      {isOpen && (
        <div className="aichat-panel">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #1C1B24 0%, #121118 100%)', border: '1.5px solid rgba(217, 156, 83, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isStaffMode ? (
                  <span style={{ fontSize: '1.1rem' }}>👨‍💼</span>
                ) : (
                  <HeritageGuideIcon size={20} color="#D99C53" />
                )}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: C.text }}>
                  {isStaffMode ? 'AI Staff (Seller)' : 'AI Heritage Guide'}
                </div>
                <div style={{ fontSize: '0.7rem', color: C.amber, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                  Online · Voices of Heritage
                </div>
              </div>
            </div>
            {!isStaffMode && (
              <button 
                onClick={() => {
                  setIsStaffMode(true);
                  setMessages(p => [...p, { role: 'system', text: 'Switched to AI Staff mode. I am now your end-to-end assistant. I can directly book tickets and plan routes for you!' }]);
                }}
                style={{ background: 'rgba(217,119,6,0.12)', border: `1px solid rgba(217,119,6,0.35)`, color: C.amber, padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                👨‍💼 AI Staff
              </button>
            )}
            {isStaffMode && (
              <button 
                onClick={() => {
                  setIsStaffMode(false);
                  setMessages(p => [...p, { role: 'system', text: 'Switched back to Heritage Guide mode.' }]);
                }}
                style={{ background: 'rgba(217,119,6,0.12)', border: `1px solid rgba(217,119,6,0.35)`, color: C.amber, padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                🏛️ Guide Mode
              </button>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((m, i) => {
              if (m.role === 'system') {
                return (
                  <div key={i} style={{ textAlign: 'center', fontSize: '0.75rem', color: C.muted, margin: '8px 0', fontStyle: 'italic' }}>
                    {m.text}
                  </div>
                );
              }
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ 
                    maxWidth: '85%', 
                    padding: '10px 14px', 
                    borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: m.role === 'user' ? 'linear-gradient(135deg, #D97706, #B45309)' : C.surface,
                    color: m.role === 'user' ? '#FFFFFF' : C.text,
                    border: m.role === 'user' ? 'none' : `1px solid ${C.border}`,
                    fontSize: '0.85rem',
                    lineHeight: '1.4',
                    boxShadow: m.role === 'user' ? '0 2px 10px rgba(217, 119, 6, 0.25)' : 'none'
                  }}>
                    {m.text}
                  </div>
                </div>
              );
            })}
            {isProcessing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', width: 'fit-content', fontSize: '0.78rem', color: C.muted }}>
                <span>✨</span>
                <span>{isStaffMode ? 'AI Staff is processing request...' : 'AI Heritage Guide is consulting archives...'}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ padding: '1rem', borderTop: `1px solid ${C.border}`, background: C.surface }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: C.bg, padding: '6px 12px', borderRadius: '24px', border: `1px solid ${C.border}` }}>
              <button 
                onClick={toggleListen} 
                style={{ background: 'none', border: 'none', color: isListening ? C.amber : C.muted, fontSize: '1.1rem', cursor: 'pointer', padding: '4px', animation: isListening ? 'pulse 1s infinite' : 'none' }}
                title="Speak to AI"
              >
                🎙️
              </button>
              <input 
                type="text" 
                value={input} 
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask about heritage sites, history, routes..." 
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.text, fontSize: '0.85rem' }}
              />
              <button 
                onClick={handleSend} 
                style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#1A0F02', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '2px', fontWeight: 700, boxShadow: '0 2px 8px rgba(217,119,6,0.35)' }}
                title="Send"
              >
                ➤
              </button>
            </div>
            {isListening && <div style={{ fontSize: '0.65rem', color: C.amber, textAlign: 'center', marginTop: '6px' }}>Listening... Speak now</div>}
          </div>
        </div>
      )}
    </>
  );
}
