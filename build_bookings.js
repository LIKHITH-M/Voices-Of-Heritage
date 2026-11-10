const fs = require('fs');

const targetPath = '/Users/likhithmr/Desktop/Voices-of-Heritage-main/frontend/src/pages/ActivityTicketingPage.tsx';
const content = fs.readFileSync(targetPath, 'utf8');

// Find where ParticleCanvas starts (since we want to keep imports and constants at the top)
const particleCanvasIndex = content.indexOf('function ParticleCanvas()');
if (particleCanvasIndex === -1) {
  console.error("Could not find ParticleCanvas in ActivityTicketingPage.tsx");
  process.exit(1);
}

// Keep everything above ParticleCanvas
const headerAndData = content.substring(0, particleCanvasIndex);

const newCode = `
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
  green:   '#22c55e',
  red:     '#ef4444',
  blue:    '#3b82f6',
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
  green:   '#16a34a',
  red:     '#dc2626',
  blue:    '#2563eb',
};

// ─── Particle Canvas ────────────────────────────────────────────────────────
function ParticleCanvas({ theme }: { theme: 'dark' | 'light' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Particles
    const PARTICLE_COUNT = 50;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      alpha: Math.random() * 0.4 + 0.1,
      hue: theme === 'dark' ? 38 : 25, // warmer hues
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = theme === 'dark' 
          ? \`hsla(\${p.hue}, 90%, 65%, \${p.alpha})\`
          : \`hsla(\${p.hue}, 60%, 45%, \${p.alpha * 0.6})\`;
        ctx.fill();
      }
      // Connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = theme === 'dark'
              ? \`rgba(217, 156, 83, \${0.05 * (1 - d / 120)})\`
              : \`rgba(161, 91, 23, \${0.08 * (1 - d / 120)})\`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [theme]);

  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      pointerEvents: 'none', opacity: 0.7,
    }} />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ActivityTicketingPage() {
  const navigate = useNavigate();
  const [theme,         setTheme]         = useState<'dark' | 'light'>('dark');
  const [step,          setStep]          = useState<BookingStep>('search');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [suggestions,   setSuggestions]   = useState<string[]>([]);
  const [selectedSite,  setSelectedSite]  = useState<string>('');
  const [catFilter,     setCatFilter]     = useState<'all' | ActivityCategory>('all');
  const [selectedAct,   setSelectedAct]   = useState<Activity | null>(null);
  const [booking,       setBooking]       = useState<Booking | null>(null);
  const [generating,    setGenerating]    = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const [form, setForm] = useState<BookingForm>({
    name: '', email: '', phone: '', nationality: 'indian',
    idType: 'aadhaar', idNumber: '', visitDate: '', visitTime: '',
    adults: 1, children: 0, seniors: 0, specialRequirements: '',
  });

  const C = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

  /* Search autocomplete */
  const handleSearch = (val: string) => {
    setSearchQuery(val);
    if (val.length >= 1) {
      setSuggestions(SITES.filter(s => s.toLowerCase().includes(val.toLowerCase())));
    } else {
      setSuggestions([]);
    }
  };

  const selectSite = (site: string) => {
    setSelectedSite(site);
    setSearchQuery(site);
    setSuggestions([]);
    setCatFilter('all');
    setStep('list');
  };

  const siteActivities = ACTIVITIES.filter(a =>
    a.site === selectedSite &&
    (catFilter === 'all' || a.category === catFilter)
  );

  /* ── Generate QR ── */
  const handleBook = useCallback(async () => {
    if (!selectedAct) return;
    setGenerating(true);

    const total = calcTotal(selectedAct, form);

    try {
      const API_BASE_URL = import.meta.env.VITE_AI_PLANNER_API_URL 
        ? import.meta.env.VITE_AI_PLANNER_API_URL
        : 'http://localhost:5002/api';

      const response = await fetch(\`\${API_BASE_URL}/tickets/book\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity: selectedAct,
          form,
          totalINR: total
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to book ticket');
      }

      const bookingId = data.ticket.ticketId;
      const createdAt = data.ticket.createdAt || new Date().toISOString();

      const qrPayload = JSON.stringify({ ticketId: bookingId });

      const qrImageUrl = await QRCode.toDataURL(qrPayload, {
        width: 280,
        margin: 2,
        color: { dark: '#050505', light: '#fffbe6' },
        errorCorrectionLevel: 'H',
      });

      setBooking({ id: bookingId, activity: selectedAct, form, totalINR: total, createdAt, qrData: qrPayload, qrImageUrl });
      setGenerating(false);
      setStep('qr');
    } catch (err) {
      console.error('Error booking:', err);
      alert('Failed to book. Ensure backend is running.');
      setGenerating(false);
    }
  }, [selectedAct, form]);

  const downloadQR = () => {
    if (!booking) return;
    const link = document.createElement('a');
    link.download = \`VoH-Ticket-\${booking.id}.png\`;
    link.href = booking.qrImageUrl;
    link.click();
  };

  const formValid = form.name && form.email && form.visitDate && form.adults >= 1 && form.idNumber;

  /* ─────────────────────────────────────────────────────────────────
     CSS
  ───────────────────────────────────────────────────────────────── */
  const css = \`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

    @keyframes at-fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
    @keyframes at-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    @keyframes at-spin    { to{transform:rotate(360deg)} }

    * { box-sizing:border-box; }

    .at-page {
      min-height:100vh; background: \${theme === 'dark' ? 'radial-gradient(circle at 50% -20%, #151515, #050505)' : 'radial-gradient(circle at 80% 20%, rgba(247,243,233,0.4) 0%, rgba(253,251,247,0.8) 100%), ' + C.bg}; 
      color:\${C.text};
      font-family:'Plus Jakarta Sans',system-ui,sans-serif; position:relative; overflow-x:hidden;
      display:flex; flex-direction:column;
    }

    /* Topbar logo and name styling */
    .at-topbar {
      height:60px; background:\${C.surface}; border-bottom:1px solid \${C.border};
      display:flex; align-items:center; justify-content:space-between; padding:0 2rem;
      position:sticky; top:0; z-index:100; flex-shrink:0;
      box-shadow: 0 4px 24px rgba(0,0,0,\${theme === 'dark' ? '0.3' : '0.02'});
    }
    .at-topbar-brand { display:flex;align-items:center;gap:.7rem;cursor:pointer; }
    .at-topbar-logo  { width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,\${C.amber},\${C.gold});display:flex;align-items:center;justify-content:center;font-size:1.2rem; }
    .at-topbar-title { font-family:'Cinzel',serif; font-weight:700;font-size:1rem;color:\${C.text};letter-spacing: 0.05em; text-transform:uppercase; }
    .at-topbar-sub   { font-size:.65rem;color:\${C.muted}; margin-top:2px; font-weight: 500; }
    
    .at-icon-btn {
      width:38px; height:38px; border-radius:50%; background:\${C.surface}; border:1px solid \${C.border};
      display:flex; align-items:center; justify-content:center; cursor:pointer; color:\${C.text};
      font-size: 1rem; transition: all 0.2s;
    }
    .at-icon-btn:hover { border-color:\${C.gold}; color:\${C.gold}; }

    .at-back-btn { 
      padding:.5rem 1.2rem; border-radius:8px; border:1px solid rgba(217, 156, 83, 0.4);
      background:none; color:\${C.gold}; font-weight:600; font-size:.8rem; cursor:pointer; transition:all .2s ease;
    }
    .at-back-btn:hover { background:rgba(217, 156, 83, 0.1); border-color:\${C.gold}; }

    /* Hero section */
    .at-hero {
      position:relative; overflow:hidden;
      padding:4rem 2rem 3.5rem; text-align:center; flex-shrink:0;
      background:linear-gradient(180deg, rgba(217,156,83,.05) 0%, transparent 100%);
      border-bottom: 1px solid \${C.border};
    }
    .at-hero-tag { display:inline-flex;align-items:center;gap:.4rem;font-size:.65rem;font-weight:700;color:\${C.gold};background:rgba(217,156,83,.1);border:1px solid rgba(217,156,83,.2);border-radius:20px;padding:4px 12px;margin-bottom:.9rem;text-transform:uppercase;letter-spacing:.08em; }
    .at-hero-title { font-family:'Cinzel',serif; font-size:2.2rem;font-weight:700;margin:0 0 .6rem;line-height:1.2; color:\${C.text}; letter-spacing: 0.02em; }
    .at-hero-sub { color:\${C.muted};font-size:.9rem;max-width:560px;margin:0 auto 1.8rem;line-height:1.6; }

    /* Search components */
    .at-search-wrap { position:relative;max-width:540px;margin:0 auto;animation:at-fadeUp .4s ease; z-index: 10; }
    .at-search-input {
      width:100%;padding:.85rem 1.2rem .85rem 3.2rem;border-radius:14px;font-size:.95rem;
      background:\${C.surface};border:1.5px solid \${C.border};color:\${C.text};
      outline:none;font-family:inherit;transition:border-color .2s,box-shadow .2s;
    }
    .at-search-input:focus { border-color:\${C.gold};box-shadow:0 0 0 4px rgba(217,156,83,.1); }
    .at-search-icon { position:absolute;left:1.2rem;top:50%;transform:translateY(-50%);font-size:1.1rem;pointer-events:none; }
    .at-suggestions {
      position:absolute;top:calc(100% + 6px);left:0;right:0;
      background:\${C.surface};border:1px solid \${C.border};border-radius:12px;
      overflow:hidden;z-index:50;box-shadow:0 12px 40px rgba(0,0,0,.3);
    }
    .at-suggestion-item { padding:.75rem 1.25rem;cursor:pointer;font-size:.85rem;display:flex;align-items:center;gap:.6rem;color:\${C.text};transition:background .12s; }
    .at-suggestion-item:hover { background:rgba(217,156,83,.08); }

    .at-sites-row { display:flex;flex-wrap:wrap;justify-content:center;gap:.5rem;margin-top:1.25rem; }
    .at-site-pill { padding:.35rem .9rem;border-radius:8px;border:1px solid \${C.border};background:\${C.surface};color:\${C.muted};font-size:.78rem;font-weight:600;cursor:pointer;transition:all .15s; }
    .at-site-pill:hover { border-color:\Professional-grade gold color token\${C.gold};color:\${C.gold};background:rgba(217,156,83,.06); }

    /* Results */
    .at-content { max-width:980px;width:100%;margin:0 auto;padding:2rem;animation:at-fadeUp .35s ease; }
    .at-filter-strip { display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:.5rem; }
    .at-chips { display:flex;gap:.5rem; }
    .at-chip { padding:.35rem 1rem;border-radius:20px;font-size:.75rem;font-weight:600;cursor:pointer;border:1px solid \${C.border};background:\${C.surface};color:\${C.muted};transition:all .15s; }
    .at-chip:hover { border-color:\${C.gold};color:\${C.gold}; }
    .at-chip.active { background:rgba(217,156,83,.1);border-color:\${C.gold};color:\${C.gold}; }
    .at-result-count { font-size:.78rem;color:\${C.muted}; }

    /* Activity Card */
    .at-card {
      border-radius:16px;border:1px solid \${C.border};background:\${C.surface};
      transition:all .25s cubic-bezier(0.25, 0.8, 0.25, 1);cursor:pointer;overflow:hidden;
      display:flex;flex-direction:column;
      box-shadow:0 4px 12px rgba(0,0,0,0.02);
    }
    .at-card:hover { border-color:\${C.gold};transform:translateY(-3px);box-shadow:0 12px 30px rgba(0,0,0,\${theme==='dark'?'0.4':'0.06'}); }
    .at-card-header { padding:1.4rem; }
    .at-card-type { font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px; }
    .at-card-name { font-family:'Cinzel',serif; font-size:.95rem;font-weight:700;color:\${C.text};margin:0 0 4px;line-height:1.3; }
    .at-card-site { font-size:.75rem;color:\${C.muted}; }
    .at-card-desc { font-size:.78rem;color:\${theme==='dark'?'#999':'#666'};margin:.6rem 0;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden; }
    .at-card-footer { margin-top:auto;padding:1rem 1.4rem;border-top:1px solid \${C.border};display:flex;align-items:center;justify-content:space-between;gap:.5rem; }
    .at-price-indian { font-size:.85rem;color:\${C.gold};font-weight:700; }
    .at-price-nri    { font-size:.7rem;color:\${C.muted}; margin-top:2px; }
    .at-slots-pill { font-size:.65rem;font-weight:700;padding:3px 8px;border-radius:4px; }
    .at-book-btn { padding:.5rem 1rem;border-radius:8px;background:linear-gradient(135deg,\${C.amber},\${C.gold});color:#fff;font-weight:700;font-size:.78rem;border:none;cursor:pointer;flex-shrink:0;transition:opacity .15s; }
    .at-book-btn:hover { opacity:.9; }
    .at-tag { display:inline-flex;font-size:.65rem;font-weight:600;padding:2px 8px;border-radius:4px;background:\${theme==='dark'?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.04)'};color:\${C.muted};margin:2px;border: 1px solid \${C.border}; }

    /* Modal dialog */
    .at-overlay { position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1.5rem; }
    .at-modal { width:100%;max-width:680px;background:\${C.surface};border-radius:16px;border:1px solid \${C.border};overflow:hidden;max-height:92vh;display:flex;flex-direction:column;box-shadow: 0 20px 50px rgba(0,0,0,0.4); }
    .at-modal-head { padding:1.2rem 1.5rem;border-bottom:1px solid \${C.border};display:flex;justify-content:space-between;align-items:flex-start;flex-shrink:0; }
    .at-modal-body { flex:1;overflow-y:auto;padding:1.5rem; }
    .at-modal-body::-webkit-scrollbar { width:5px; }
    .at-modal-body::-webkit-scrollbar-thumb { background:rgba(217,156,83,0.25);border-radius:3px; }
    .at-modal-foot { padding:1rem 1.5rem;border-top:1px solid \${C.border};display:flex;gap:.75rem;justify-content:flex-end;flex-shrink:0; }

    /* Form items */
    .at-form-grid { display:grid;grid-template-columns:1fr 1fr;gap:1rem; }
    .at-form-grid-3 { display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem; }
    .at-label { font-size:.75rem;font-weight:600;color:\${C.muted};margin-bottom:6px;display:block; }
    .at-input {
      width:100%;padding:.65rem .9rem;border-radius:8px;background:\${C.bg};
      border:1px solid \${C.border};color:\${C.text};font-size:.85rem;outline:none;font-family:inherit;
      transition:border-color .15s;
    }
    .at-input:focus { border-color:\${C.gold};box-shadow:0 0 0 3px rgba(217,156,83,.06); }
    .at-input::placeholder { color:\${C.muted}; opacity: 0.6; }
    .at-select { appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23\${theme==='dark'?'94a3b8':'786a5e'}'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .8rem center;padding-right:2rem; }

    .at-nat-toggle { display:flex;gap:.5rem;margin-bottom:1rem; }
    .at-nat-btn { flex:1;padding:.65rem;border-radius:8px;border:1.5px solid \${C.border};background:none;color:\${C.muted};font-size:.8rem;font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:.4rem; }
    .at-nat-btn.active { border-color:\${C.gold};background:rgba(217,156,83,.1);color:\${C.gold}; }
    .at-nat-btn:hover:not(.active) { border-color:rgba(217,156,83,.25);color:\${C.text}; }

    .at-price-box { border-radius:12px;padding:1.2rem;background:\${theme==='dark'?'rgba(255,255,255,0.01)':'rgba(0,0,0,0.02)'};border:1px solid \${C.border};margin-top:.85rem; }
    .at-price-row { display:flex;justify-content:space-between;align-items:center;font-size:.8rem;color:\${C.muted};margin-bottom:6px; }
    .at-price-total { display:flex;justify-content:space-between;align-items:center;font-size:1.05rem;color:\${C.gold};font-weight:800;border-top:1px solid \${C.border};margin-top:.6rem;padding-top:.6rem; }
    .at-nri-note { font-size:.7rem;color:\${C.gold};font-weight:600;margin-top:6px; }
    .at-free-note { font-size:.85rem;color:\${C.green};font-weight:700; }

    /* QR output styling */
    .at-qr-screen { max-width:520px;margin:2rem auto;text-align:center;animation:at-fadeUp .4s ease; }
    .at-qr-card { border-radius:16px;border:1px solid \${C.border};background:\${C.surface};padding:2rem;position:relative;overflow:hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.15); }
    .at-qr-img { border-radius:12px;box-shadow:0 8px 32px rgba(217,156,83,.1); }
    .at-qr-details { text-align:left;margin-top:1.25rem;background:\${C.bg};border-radius:12px;border:1px solid \${C.border};overflow:hidden; }
    .at-qr-detail-row { display:flex;justify-content:space-between;padding:.7rem 1.1rem;font-size:.8rem;border-bottom:1px solid \${C.border}; }
    .at-qr-detail-row:last-child { border-bottom:none; }
    .at-qr-key { color:\${C.muted}; }
    .at-qr-val { color:\${C.text};font-weight:600;text-align:right;max-width:55%; }
    .at-qr-actions { display:flex;gap:.75rem;margin-top:1.25rem; }
    .at-dl-btn { flex:1;padding:.7rem;border-radius:8px;background:linear-gradient(135deg,\${C.amber},\${C.gold});color:#fff;font-weight:800;font-size:.85rem;border:none;cursor:pointer;transition:opacity .15s;display:flex;align-items:center;justify-content:center;gap:.5rem; }
    .at-dl-btn:hover { opacity:.9; }
    
    .at-scan-info { margin-top:1.2rem;padding:1rem;border-radius:12px;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.15);text-align:left; }
    .at-scan-info-title { font-size:.8rem;font-weight:700;color:\${C.green};margin-bottom:4px; }
    .at-scan-info-text  { font-size:.75rem;color:\${C.muted};line-height:1.45; }

    .at-btn-primary { padding:.65rem 1.6rem;border-radius:8px;background:linear-gradient(135deg,\Professional-grade gold color token\${C.amber},\${C.gold});color:#fff;font-weight:800;font-size:.85rem;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:.45rem;transition:opacity .15s; }
    .at-btn-primary:hover:not(:disabled) { opacity:.9; }
    .at-btn-primary:disabled { opacity:.4;cursor:not-allowed; }
    
    .at-btn-ghost { padding:.65rem 1.4rem;border-radius:8px;border:1px solid \${C.border};background:none;color:\${C.muted};font-size:.85rem;font-weight:600;cursor:pointer;transition:all .15s; }
    .at-btn-ghost:hover { border-color:\${C.gold};color:\${C.gold}; }
    .at-close-btn { width:32px;height:32px;border-radius:8px;background:\${C.bg};border:1px solid \${C.border};color:\${C.text};cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;flex-shrink:0; transition: all .15s; }
    .at-close-btn:hover { border-color:\${C.gold};color:\Professional-grade gold color token\${C.gold}; }

    .at-section-label { font-family:'Cinzel',serif; font-size:.75rem;font-weight:700;color:\${C.gold};text-transform:uppercase;letter-spacing:.08em;margin:1.2rem 0 .5rem; }
    .at-divider { border:none;border-top:1px solid \${C.border};margin:.75rem 0; }

    .at-highlight { background:rgba(217,156,83,.06);border:1px solid rgba(217,156,83,.15);border-radius:10px;padding:1rem;font-size:.8rem;color:\${C.muted};line-height:1.55; }
    .at-highlight-list { margin:.4rem 0 0;padding-left:1.2rem;list-style:disc; }
    .at-highlight-list li { margin-bottom:3px; }
    .at-includes-list { list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:5px; }
    .at-includes-list li::before { content:'✓ ';font-weight:bold;color:\${C.gold};margin-right:4px; }
    .at-includes-list li { font-size:.78rem;color:\${C.muted}; }

    @media (max-width:640px) {
      .at-hero-title { font-size:1.5rem; }
      .at-form-grid, .at-form-grid-3 { grid-template-columns:1fr; }
      .at-modal { max-width:100%; margin:0; border-radius:16px 16px 0 0; max-height:98vh; position:fixed;bottom:0; }
      .at-overlay { align-items:flex-end;padding:0; }
    }
  \`;

  /* ─── Booking Form Modal ─────────────────────────────────────────────── */
  const renderBookingModal = () => {
    if (!selectedAct) return null;
    const total = calcTotal(selectedAct, form);
    const price = form.nationality === 'indian' ? selectedAct.pricing.indian : selectedAct.pricing.nri;

    return (
      <div className="at-overlay" onClick={() => setStep('list')}>
        <div className="at-modal" onClick={e => e.stopPropagation()}>
          <div className="at-modal-head">
            <div>
              <div style={{ fontSize: '.65rem', fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {selectedAct.category === 'entry-ticket' ? '🎟️ Entry Ticket' : '🎒 Activity Booking'}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: C.text, maxWidth: '420px', lineHeight: 1.3, marginTop: '2px' }}>{selectedAct.name}</div>
              <div style={{ fontSize: '.75rem', color: C.muted, marginTop: '2px' }}>📍 {selectedAct.site}, {selectedAct.state} · {selectedAct.duration}</div>
            </div>
            <button className="at-close-btn" onClick={() => setStep('list')}>✕</button>
          </div>

          <div className="at-modal-body">
            {/* Nationality selector */}
            <div style={{ marginBottom: '1.1rem' }}>
              <label className="at-label">Visitor Nationality *</label>
              <div className="at-nat-toggle">
                <button className={\`at-nat-btn \${form.nationality === 'indian' ? 'active' : ''}\`}
                  onClick={() => setForm({ ...form, nationality: 'indian', idType: 'aadhaar' })}>
                  🇮🇳 Indian Citizen
                </button>
                <button className={\`at-nat-btn \${form.nationality === 'nri' ? 'active' : ''}\`}
                  onClick={() => setForm({ ...form, nationality: 'nri', idType: 'passport' })}>
                  🌍 NRI / Foreign National
                </button>
              </div>
              {form.nationality === 'nri' && (
                <div style={{ fontSize: '.72rem', color: C.gold, background: 'rgba(217,156,83,.05)', padding: '8px 12px', borderRadius: '8px', border: \`1px solid \${C.border}\` }}>
                  🌍 NRI / Foreign pricing applies — Governed by ASI Monument Regulations
                </div>
              )}
            </div>

            {/* Personal details */}
            <div className="at-section-label">Visitor Details</div>
            <div className="at-form-grid" style={{ marginBottom: '.85rem' }}>
              <div>
                <label className="at-label">Full Name *</label>
                <input className="at-input" type="text" placeholder="As on ID document" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="at-label">Email Address *</label>
                <input className="at-input" type="email" placeholder="Ticket will be sent here" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="at-label">Phone Number</label>
                <input className="at-input" type="tel" placeholder="+91 XXXXX XXXXX" value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="at-label">
                  {form.nationality === 'indian' ? 'ID Type *' : 'Document Type *'}
                </label>
                <select className="at-input at-select" value={form.idType}
                  onChange={e => setForm({ ...form, idType: e.target.value })}>
                  {form.nationality === 'indian'
                    ? (<><option value="aadhaar">Aadhaar Card</option><option value="pan">PAN Card</option><option value="voter">Voter ID</option><option value="passport">Passport</option><option value="driving">Driving License</option></>)
                    : (<><option value="passport">Passport</option><option value="oci">OCI Card</option><option value="visa">Visa + Passport</option></>)
                  }
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="at-label">Document Number *</label>
                <input className="at-input" type="text"
                  placeholder={form.nationality === 'indian' ? 'Last 4 digits accepted for entry' : 'Passport number'}
                  value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })} />
              </div>
            </div>

            {/* Visit details */}
            <div className="at-section-label">Visit Schedule</div>
            <div className="at-form-grid" style={{ marginBottom: '.85rem' }}>
              <div>
                <label className="at-label">Visit Date *</label>
                <input className="at-input" type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={form.visitDate} onChange={e => setForm({ ...form, visitDate: e.target.value })} />
              </div>
              <div>
                <label className="at-label">Preferred Time</label>
                <select className="at-input at-select" value={form.visitTime}
                  onChange={e => setForm({ ...form, visitTime: e.target.value })}>
                  <option value="">Site default schedule</option>
                  <option value="06:00 AM">6:00 AM (Sunrise slot)</option>
                  <option value="08:30 AM">8:30 AM (Morning)</option>
                  <option value="10:00 AM">10:00 AM (Mid-morning)</option>
                  <option value="12:00 PM">12:00 PM (Midday)</option>
                  <option value="03:00 PM">3:00 PM (Afternoon)</option>
                  <option value="05:00 PM">5:00 PM (Golden hour)</option>
                </select>
              </div>
            </div>

            {/* Visitor count */}
            <div className="at-section-label">Number of Visitors</div>
            <div className="at-form-grid-3" style={{ marginBottom: '.85rem' }}>
              {(['adults', 'children', 'seniors'] as const).map(type => (
                <div key={type}>
                  <label className="at-label">
                    {type === 'adults' ? '👤 Adults' : type === 'children' ? '👶 Children (under 15)' : '👴 Seniors (60+)'}
                    {type === 'adults' ? ' *' : ''}
                    {type !== 'adults' && form.nationality === 'indian' && (
                      <span style={{ color: C.green, fontSize: '.6rem', marginLeft: '4px' }}>
                        {type === 'children' ? '50% off' : '25% off'}
                      </span>
                    )}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <button style={{ width: 34, height: 34, border: \`1px solid \${C.border}\`, borderRadius: '8px', background: C.bg, color: C.text, fontSize: '1.1rem', cursor: 'pointer' }}
                      onClick={() => setForm({ ...form, [type]: Math.max(type === 'adults' ? 1 : 0, form[type] - 1) })}>−</button>
                    <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: '.9rem' }}>{form[type]}</span>
                    <button style={{ width: 34, height: 34, border: \`1px solid \${C.border}\`, borderRadius: '8px', background: C.bg, color: C.text, fontSize: '1.1rem', cursor: 'pointer' }}
                      onClick={() => setForm({ ...form, [type]: form[type] + 1 })}>+</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Special requirements */}
            <div>
              <label className="at-label">Special Requirements / Accessibility Needs</label>
              <textarea className="at-input" rows={2} placeholder="Wheelchair access, dietary needs, etc." style={{ resize: 'none' }}
                value={form.specialRequirements} onChange={e => setForm({ ...form, specialRequirements: e.target.value })} />
            </div>

            {/* Price summary */}
            <div className="at-price-box" style={{ marginTop: '.85rem' }}>
              <div style={{ fontWeight: 700, fontSize: '.82rem', color: C.gold, marginBottom: '.5rem' }}>💰 Price Breakdown</div>
              <div className="at-price-row">
                <span>{form.adults} Adult{form.adults > 1 ? 's' : ''}</span>
                <span>{price === 0 ? 'Free' : \`₹\${price} × \${form.adults} = ₹\${price * form.adults}\`}</span>
              </div>
              {form.children > 0 && (
                <div className="at-price-row">
                  <span>{form.children} Child{form.children > 1 ? 'ren' : ''}</span>
                  <span>{price === 0 ? 'Free' : \`₹\${Math.round(price * (form.nationality === 'indian' ? 0.5 : 1))} × \${form.children} = ₹\${Math.round(price * (form.nationality === 'indian' ? 0.5 : 1)) * form.children}\`}</span>
                </div>
              )}
              {form.seniors > 0 && (
                <div className="at-price-row">
                  <span>{form.seniors} Senior{form.seniors > 1 ? 's' : ''}</span>
                  <span>{price === 0 ? 'Free' : \`₹\${Math.round(price * (form.nationality === 'indian' ? 0.75 : 1))} × \${form.seniors} = ₹\${Math.round(price * (form.nationality === 'indian' ? 0.75 : 1)) * form.seniors}\`}</span>
                </div>
              )}
              <div className="at-price-total">
                <span>Total Amount</span>
                <span>{total === 0 ? <span className="at-free-note">FREE ENTRY 🎉</span> : formatCurrency(total, form.nationality)}</span>
              </div>
              {form.nationality === 'nri' && (
                <div className="at-nri-note">🌍 NRI pricing as per ASI Monument Regulations. Payment is accepted in INR at the gate or via UPI/card online.</div>
              )}
            </div>

            {/* Meeting point */}
            <div className="at-highlight" style={{ marginTop: '.85rem' }}>
              <strong>📍 Meeting Point:</strong> {selectedAct.meetingPoint}<br />
              <strong>⏰ Schedule:</strong> {selectedAct.schedule}
            </div>

            {/* Includes */}
            <div className="at-section-label" style={{ marginTop: '.85rem' }}>Included in Ticket</div>
            <ul className="at-includes-list">
              {selectedAct.includes.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>

          <div className="at-modal-foot">
            <button className="at-btn-ghost" onClick={() => setStep('list')}>Cancel</button>
            <button className="at-btn-primary" disabled={!formValid || generating} onClick={handleBook}>
              {generating
                ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'at-spin 1s linear infinite' }} /> Generating…</>
                : '🎟️ Generate QR Ticket'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ─── QR Confirmation Screen ─────────────────────────────────────────── */
  const renderQRScreen = () => {
    if (!booking) return null;
    return (
      <div className="at-qr-screen">
        <div style={{ fontSize: '.65rem', fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '6px' }}>
          ✅ Booking Confirmed
        </div>
        <h2 style={{ fontFamily: 'Cinzel', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 1.25rem', lineHeight: 1.2 }}>Your Heritage Ticket is Ready!</h2>

        <div className="at-qr-card">
          <img src={booking.qrImageUrl} alt="Booking QR Code" width={220} height={220} className="at-qr-img"
            style={{ display: 'block', margin: '0 auto 1.2rem', borderRadius: '12px' }} />

          <div style={{ fontFamily: 'Cinzel', fontWeight: 700, fontSize: '1rem', color: C.text, marginBottom: '4px' }}>{booking.activity.name}</div>
          <div style={{ fontSize: '.75rem', color: C.muted, marginBottom: '1.2rem' }}>
            📍 {booking.activity.site}, {booking.activity.state} · 🆔 {booking.id}
          </div>

          {/* Details */}
          <div className="at-qr-details">
            {[
              ['Date', booking.form.visitDate],
              ['Visitors', \`\${booking.form.adults} Adult\${booking.form.adults > 1 ? 's' : ''} \${booking.form.children > 0 ? \`+ \${booking.form.children} Child\` : ''} \${booking.form.seniors > 0 ? \`+ \${booking.form.seniors} Senior\` : ''}\`],
              ['Nationality', booking.form.nationality === 'indian' ? '🇮🇳 Indian Citizen' : '🌍 NRI / Foreign'],
              ['Total Paid', booking.totalINR === 0 ? '🎉 Free Entry' : \`₹\${booking.totalINR.toLocaleString('en-IN')}\`],
              ['Meeting Point', booking.activity.meetingPoint.split(',')[0]],
            ].map(([k, v]) => (
              <div key={k} className="at-qr-detail-row">
                <span className="at-qr-key">{k}</span>
                <span className="at-qr-val">{v}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="at-qr-actions">
            <button className="at-dl-btn" onClick={downloadQR}>
              📥 Download QR Ticket
            </button>
            <button style={{ padding: '.7rem .9rem', borderRadius: '8px', background: C.bg, border: \`1px solid \${C.border}\`, color: C.muted, fontSize: '.82rem', cursor: 'pointer', transition: 'all .15s' }}
              onClick={() => { navigator.clipboard.writeText(booking.id); }}>
              📋 Copy ID
            </button>
          </div>

          {/* Where to scan */}
          <div className="at-scan-info">
            <div className="at-scan-info-title">📡 Where to Scan This QR Code</div>
            <div className="at-scan-info-text">
              Present this QR at: <strong>{booking.activity.scanPoint}</strong><br /><br />
              The site entry officer will scan using the <strong>Voices of Heritage Verifier App</strong> or any standard QR reader. The code contains your full booking details and a verification link. No printout needed — works on phone screen.<br /><br />
              🔗 Manual verify: <a href={\`\${window.location.origin}/verify/\${booking.id}\`} target="_blank" rel="noopener noreferrer" style={{ color: C.gold, textDecoration: 'underline' }}>{window.location.origin}/verify/{booking.id}</a>
            </div>
          </div>
        </div>

        <button className="at-btn-ghost" style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center' }}
          onClick={() => { setStep('list'); setBooking(null); setForm({ name: '', email: '', phone: '', nationality: 'indian', idType: 'aadhaar', idNumber: '', visitDate: '', visitTime: '', adults: 1, children: 0, seniors: 0, specialRequirements: '' }); }}>
          ← Book Another Activity
        </button>
      </div>
    );
  };

  /* ─── Activity list grid ─────────────────────────────────────────────── */
  const renderActivityGrid = () => (
    <>
      <div className="at-filter-strip">
        <div className="at-chips">
          {(['all', 'entry-ticket', 'activity'] as const).map(f => (
            <button key={f} className={\`at-chip \${catFilter === f ? 'active' : ''}\`} onClick={() => setCatFilter(f)}>
              {f === 'all' ? 'All' : f === 'entry-ticket' ? '🎟️ Entry Tickets' : '🎒 Activities'}
            </button>
          ))}
        </div>
        <span className="at-result-count">{siteActivities.length} result{siteActivities.length !== 1 ? 's' : ''} in <strong>{selectedSite}</strong></span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.2rem' }}>
        {siteActivities.map(act => {
          const slotsColor = act.slots > 20 ? C.green : act.slots > 5 ? C.gold : C.red;
          return (
            <div key={act.id} className="at-card" onClick={() => { setSelectedAct(act); setStep('form'); }}>
              <div className="at-card-header">
                <div className="at-card-type" style={{ color: act.category === 'entry-ticket' ? C.blue : C.gold }}>
                  {act.emoji} {act.type}
                </div>
                <div className="at-card-name">{act.name}</div>
                <div className="at-card-site">📍 {act.site}, {act.state}</div>
                <p className="at-card-desc">{act.description}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {act.tags.map(t => <span key={t} className="at-tag">{t}</span>)}
                  {act.difficulty && <span className="at-tag" style={{ color: C.gold }}>{act.difficulty}</span>}
                </div>
              </div>
              <div className="at-card-footer">
                <div>
                  <div className="at-price-indian">
                    🇮🇳 {act.pricing.indian === 0 ? 'Free' : \`₹\${act.pricing.indian}\`}
                    <span style={{ color: C.muted, fontSize: '.7rem', fontWeight: 400, marginLeft: '4px' }}>/ adult</span>
                  </div>
                  <div className="at-price-nri">
                    🌍 NRI: {act.pricing.nri === 0 ? 'Free' : \`₹\${act.pricing.nri}\`}
                  </div>
                  <div style={{ marginTop: '5px' }}>
                    <span className="at-slots-pill" style={{ background: \`\${slotsColor}15\`, color: slotsColor, border: \`1px solid \${slotsColor}33\` }}>
                      {act.slots} slots left
                    </span>
                  </div>
                </div>
                <button className="at-book-btn" onClick={(e) => { e.stopPropagation(); setSelectedAct(act); setStep('form'); }}>
                  Book Now →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  /* ─── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="at-page">
      <style>{css}</style>

      {/* Topbar */}
      <div className="at-topbar">
        <div className="at-topbar-brand" onClick={() => navigate('/dashboard')}>
          <div className="at-topbar-logo">🏛️</div>
          <div>
            <div className="at-topbar-title">Voices of Heritage</div>
            <div className="at-topbar-sub">Activity &amp; Ticketing</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="at-icon-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Toggle Theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="at-back-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        </div>
      </div>

      {/* Hero + search */}
      <div className="at-hero">
        <ParticleCanvas theme={theme} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="at-hero-tag">🎟️ Heritage Tickets &amp; Activity Booking</div>
          <h1 className="at-hero-title">Discover &amp; Book Heritage Experiences</h1>
          <p className="at-hero-sub">
            Search any heritage site to find official entry tickets, guided treks, sunrise viewings, and cultural activities — with Indian &amp; NRI pricing, instant QR ticket generation.
          </p>

          {/* Search */}
          <div className="at-search-wrap">
            <span className="at-search-icon">🔍</span>
            <input className="at-search-input" type="text" placeholder="Search a heritage site (e.g. Hampi, Ajanta, Konark…)"
              value={searchQuery} onChange={e => handleSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && suggestions.length > 0) selectSite(suggestions[0]); }} />
            {suggestions.length > 0 && (
              <div className="at-suggestions">
                {suggestions.map(s => (
                  <div key={s} className="at-suggestion-item" onClick={() => selectSite(s)}>
                    🏛️ {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick site pills */}
          <div className="at-sites-row">
            {SITES.map(s => (
              <button key={s} className="at-site-pill" onClick={() => selectSite(s)}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1 }}>
        {step === 'list' && (
          <div className="at-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1.2rem' }}>
              <button style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '.8rem' }}
                onClick={() => { setStep('search'); setSelectedSite(''); setSearchQuery(''); }}>
                ← Change site
              </button>
              <div style={{ fontSize: '.65rem', padding: '3px 10px', borderRadius: '4px', background: 'rgba(217,156,83,.08)', color: C.gold, border: '1px solid rgba(217,156,83,.15)', fontWeight: 700 }}>
                {selectedSite}
              </div>
            </div>
            {renderActivityGrid()}
          </div>
        )}

        {step === 'qr' && (
          <div className="at-content">
            {renderQRScreen()}
          </div>
        )}
      </div>

      {/* Booking modal overlaid on top */}
      {step === 'form' && renderBookingModal()}
    </div>
  );
}
`;

const updatedContent = headerAndData + newCode;
fs.writeFileSync(targetPath, updatedContent, 'utf8');
console.log("Successfully rebuilt ActivityTicketingPage.tsx");
