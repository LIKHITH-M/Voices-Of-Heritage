import { useState, FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import ThemeToggle from '@/components/ThemeToggle';
import VoHLogo from '@/components/VoHLogo';

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3000';

const ROLES = [
  { value: 'user',        label: '🧳 Traveller',     desc: 'Explore & book experiences'  },
  { value: 'researcher',  label: '📚 Researcher',     desc: 'Archives & research tools'   },
  { value: 'guide',       label: '🗺️ Heritage Guide', desc: 'Lead tours & bookings'       },
  { value: 'institution', label: '🎓 Institution',    desc: 'School programs & access'    },
];

// Pre-seeded so positions are stable between renders
const PARTICLES = [
  { id: 0,  left: 4,  delay: 0.0, dur: 9,  size: 3 },
  { id: 1,  left: 9,  delay: 1.2, dur: 7,  size: 2 },
  { id: 2,  left: 15, delay: 3.5, dur: 11, size: 4 },
  { id: 3,  left: 22, delay: 0.7, dur: 8,  size: 2 },
  { id: 4,  left: 28, delay: 5.1, dur: 10, size: 3 },
  { id: 5,  left: 35, delay: 2.3, dur: 7,  size: 2 },
  { id: 6,  left: 41, delay: 4.0, dur: 9,  size: 4 },
  { id: 7,  left: 48, delay: 0.9, dur: 12, size: 2 },
  { id: 8,  left: 54, delay: 6.2, dur: 8,  size: 3 },
  { id: 9,  left: 60, delay: 1.8, dur: 7,  size: 2 },
  { id: 10, left: 66, delay: 3.0, dur: 10, size: 4 },
  { id: 11, left: 72, delay: 7.4, dur: 9,  size: 2 },
  { id: 12, left: 78, delay: 2.6, dur: 8,  size: 3 },
  { id: 13, left: 84, delay: 5.8, dur: 11, size: 2 },
  { id: 14, left: 90, delay: 1.1, dur: 7,  size: 4 },
  { id: 15, left: 18, delay: 8.0, dur: 9,  size: 2 },
  { id: 16, left: 50, delay: 4.5, dur: 13, size: 3 },
  { id: 17, left: 75, delay: 0.3, dur: 8,  size: 2 },
];

// ─── SVG Components ────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0 1 12 4.9c1.76 0 3.32.65 4.55 1.7l3.4-3.4A12 12 0 0 0 12 0C7.37 0 3.36 2.7 1.44 6.64l3.83 3.12Z"/>
      <path fill="#FBBC05" d="M16.04 18.01A7.06 7.06 0 0 1 12 19.1c-2.9 0-5.4-1.74-6.63-4.27l-3.84 2.96A12 12 0 0 0 12 24c3.23 0 6.18-1.19 8.44-3.12l-4.4-2.87Z"/>
      <path fill="#4285F4" d="M23.76 12.27c0-.84-.08-1.67-.21-2.47H12v4.67h6.61a5.65 5.65 0 0 1-2.44 3.7l4.4 2.87c2.57-2.37 4.19-5.9 4.19-10.77Z"/>
      <path fill="#34A853" d="M5.37 14.83A7.17 7.17 0 0 1 4.9 12c0-.98.17-1.92.47-2.79L1.54 6.09A11.98 11.98 0 0 0 0 12c0 1.99.48 3.87 1.32 5.53l4.05-2.7Z"/>
    </svg>
  );
}

function MandalaRing() {
  const innerPetals = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45) * Math.PI / 180;
    return { cx: 100 + Math.cos(a) * 28, cy: 100 + Math.sin(a) * 28, rot: i * 45 + 90 };
  });
  const outerPetals = Array.from({ length: 16 }, (_, i) => {
    const a = (i * 22.5) * Math.PI / 180;
    return { cx: 100 + Math.cos(a) * 62, cy: 100 + Math.sin(a) * 62, rot: i * 22.5 + 90 };
  });
  const ticks = Array.from({ length: 24 }, (_, i) => {
    const a = (i * 15) * Math.PI / 180;
    return {
      x1: 100 + Math.cos(a) * 80, y1: 100 + Math.sin(a) * 80,
      x2: 100 + Math.cos(a) * 90, y2: 100 + Math.sin(a) * 90,
    };
  });
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="93" stroke="rgba(245,158,11,0.05)" strokeWidth="1"/>
      <circle cx="100" cy="100" r="82" stroke="rgba(245,158,11,0.08)" strokeWidth="0.5"/>
      <circle cx="100" cy="100" r="72" stroke="rgba(245,158,11,0.1)" strokeWidth="1"/>
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke="rgba(245,158,11,0.18)" strokeWidth="0.8"/>
      ))}
      {outerPetals.map((p, i) => (
        <ellipse key={i} cx={p.cx} cy={p.cy} rx="7" ry="3.5"
          transform={`rotate(${p.rot} ${p.cx} ${p.cy})`}
          fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth="0.5"/>
      ))}
      <circle cx="100" cy="100" r="46" stroke="rgba(245,158,11,0.15)" strokeWidth="1"/>
      {innerPetals.map((p, i) => (
        <ellipse key={i} cx={p.cx} cy={p.cy} rx="14" ry="7"
          transform={`rotate(${p.rot} ${p.cx} ${p.cy})`}
          fill="rgba(245,158,11,0.04)" stroke="rgba(245,158,11,0.28)" strokeWidth="0.8"/>
      ))}
      <circle cx="100" cy="100" r="14" stroke="rgba(245,158,11,0.22)" strokeWidth="0.8"
        fill="rgba(245,158,11,0.03)"/>
      <circle cx="100" cy="100" r="5"   fill="rgba(245,158,11,0.55)"/>
      <circle cx="100" cy="100" r="2.5" fill="rgba(245,158,11,0.92)"/>
    </svg>
  );
}

function TempleScene() {
  const tierLines = [
    { y: 140, x1: 75,  x2: 245 },
    { y: 116, x1: 83,  x2: 237 },
    { y: 93,  x1: 92,  x2: 228 },
    { y: 71,  x1: 102, x2: 218 },
    { y: 51,  x1: 112, x2: 208 },
    { y: 33,  x1: 122, x2: 198 },
    { y: 18,  x1: 133, x2: 187 },
  ];
  const ornamentDots = [10, 23, 40, 59, 80, 103, 127, 150];
  return (
    <svg viewBox="0 0 320 192" fill="none" xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMax meet">
      {/* Ground glow */}
      <ellipse cx="160" cy="190" rx="150" ry="8" fill="rgba(245,158,11,0.07)"/>
      {/* Base steps */}
      <rect x="30"  y="178" width="260" height="14" rx="1" fill="rgba(14,6,28,0.95)"/>
      <rect x="48"  y="163" width="224" height="15" rx="1" fill="rgba(16,7,32,0.95)"/>
      {/* Tiered tower — each row slightly narrower */}
      <polygon points="68,163 75,140 245,140 252,163" fill="rgba(24,10,46,0.97)"/>
      <polygon points="75,140 83,116 237,116 245,140" fill="rgba(22,9,42,0.97)"/>
      <polygon points="83,116 92,93 228,93 237,116"   fill="rgba(20,8,38,0.97)"/>
      <polygon points="92,93 102,71 218,71 228,93"    fill="rgba(18,7,34,0.97)"/>
      <polygon points="102,71 112,51 208,51 218,71"   fill="rgba(16,6,30,0.97)"/>
      <polygon points="112,51 122,33 198,33 208,51"   fill="rgba(14,5,26,0.97)"/>
      <polygon points="122,33 133,18 187,18 198,33"   fill="rgba(12,4,22,0.97)"/>
      <polygon points="133,18 143,6 177,6 187,18"     fill="rgba(10,3,18,0.97)"/>
      {/* Spire */}
      <polygon points="143,6 160,0 177,6" fill="rgba(245,158,11,0.6)"/>
      <circle cx="160" cy="1" r="3.5" fill="rgba(245,158,11,0.97)"/>
      {/* Tier separator lines */}
      {tierLines.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y} x2={t.x2} y2={t.y}
          stroke="rgba(245,158,11,0.2)" strokeWidth="0.8"/>
      ))}
      {/* Center ornament dots */}
      {ornamentDots.map((y, i) => (
        <circle key={i} cx="160" cy={y} r={Math.max(1, 2.2 - i * 0.18)}
          fill={`rgba(245,158,11,${Math.max(0.1, 0.62 - i * 0.065)})`}/>
      ))}
      {/* Doorway arch */}
      <path d="M147 163 L147 146 Q160 135 173 146 L173 163"
        fill="rgba(0,0,0,0.65)" stroke="rgba(245,158,11,0.22)" strokeWidth="0.5"/>
      {/* Flag poles */}
      <line x1="48"  y1="163" x2="48"  y2="141" stroke="rgba(245,158,11,0.38)" strokeWidth="1.5"/>
      <polygon points="48,141 58,145 48,149" fill="rgba(245,158,11,0.5)"/>
      <line x1="272" y1="163" x2="272" y2="141" stroke="rgba(245,158,11,0.38)" strokeWidth="1.5"/>
      <polygon points="272,141 262,145 272,149" fill="rgba(245,158,11,0.5)"/>
      {/* Small side shrines */}
      <rect x="14" y="168" width="28" height="10" rx="1" fill="rgba(16,7,30,0.8)"/>
      <polygon points="14,168 28,152 42,168" fill="rgba(14,5,24,0.8)"/>
      <circle cx="28" cy="152" r="2" fill="rgba(245,158,11,0.5)"/>
      <rect x="278" y="168" width="28" height="10" rx="1" fill="rgba(16,7,30,0.8)"/>
      <polygon points="278,168 292,152 306,168" fill="rgba(14,5,24,0.8)"/>
      <circle cx="292" cy="152" r="2" fill="rgba(245,158,11,0.5)"/>
    </svg>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AuthPage() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { login, loginWithGoogle, loginAsDemo } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(
    location.pathname === '/auth/register' ? 'register' : 'login'
  );

  // Login state
  const [loginForm,    setLoginForm]    = useState({ email: '', password: '' });
  const [loginError,   setLoginError]   = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Register state
  const [regForm,    setRegForm]    = useState({ name: '', email: '', password: '', role: 'user' });
  const [regError,   setRegError]   = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setLoginError('');
    setRegError('');
    navigate(next === 'login' ? '/auth/login' : '/auth/register', { replace: true });
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      setLoginError(
        code === 'auth/invalid-credential' ? 'Invalid email or password.' :
        code === 'auth/user-not-found'     ? 'No account found with this email.' :
        code === 'auth/wrong-password'     ? 'Incorrect password.' :
        code === 'auth/too-many-requests'  ? 'Too many attempts. Try again later.' :
        'Login failed. Please try again.'
      );
    } finally { setLoginLoading(false); }
  };

  const handleGoogle = async () => {
    setLoginError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      if (code !== 'auth/popup-closed-by-user') {
        setLoginError('Google sign-in failed. Please try again.');
      }
    } finally { setGoogleLoading(false); }
  };

  const handleDemoLogin = () => {
    loginAsDemo('researcher');
    navigate('/dashboard');
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, regForm.email, regForm.password);
      await updateProfile(cred.user, { displayName: regForm.name });
      await sendEmailVerification(cred.user, { url: `${FRONTEND_URL}/auth/login?verified=true` });
      try {
        await apiClient.post('/api/auth/sync', { name: regForm.name, role: regForm.role });
      } catch { /* best-effort */ }
      setRegSuccess('Account created! Check your email to verify before signing in.');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      setRegError(
        code === 'auth/email-already-in-use' ? 'An account with this email already exists.' :
        code === 'auth/weak-password'         ? 'Password must be at least 6 characters.'   :
        code === 'auth/invalid-email'         ? 'Invalid email address.'                    :
        'Registration failed. Please try again.'
      );
    } finally { setRegLoading(false); }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="auth-page">

      {/* ══════════════ Brand Panel (left) ══════════════ */}
      <aside className="auth-brand" aria-label="Heritage showcase">

        {/* Rotating mandala (background decoration) */}
        <div className="auth-mandala-wrap" aria-hidden="true">
          <MandalaRing />
        </div>

        {/* Floating golden particles */}
        {PARTICLES.map(p => (
          <div key={p.id} className="auth-particle" aria-hidden="true"
            style={{
              left:              `${p.left}%`,
              width:             `${p.size}px`,
              height:            `${p.size}px`,
              animationDelay:    `${p.delay}s`,
              animationDuration: `${p.dur}s`,
            }}
          />
        ))}

        {/* Brand text + stats */}
        <div className="auth-brand-content">
          <div className="auth-brand-logo-wrap" style={{ background: 'none', border: 'none', width: 'auto', height: 'auto', marginBottom: '1.25rem', display: 'flex', justifyContent: 'center' }}>
            <VoHLogo size={64} />
          </div>
          <h1 className="auth-brand-title">Voices of Heritage</h1>
          <p className="auth-brand-tagline">
            Preserving the soul of civilizations,<br />one story at a time.
          </p>
          <div className="auth-brand-stats">
            <div><span>500+</span><label>Sites</label></div>
            <div><span>12k+</span><label>Stories</label></div>
            <div><span>80+</span><label>Cultures</label></div>
          </div>
        </div>

        {/* Mode-switch CTA (desktop — positioned above temple) */}
        <div className="auth-brand-cta">
          {mode === 'login' ? (
            <>
              <p>New to the journey?</p>
              <button onClick={() => switchMode('register')}>Create Account →</button>
            </>
          ) : (
            <>
              <p>Already a guardian of heritage?</p>
              <button onClick={() => switchMode('login')}>← Sign In</button>
            </>
          )}
        </div>

        {/* Temple silhouette (pinned to bottom) */}
        <div className="auth-temple-wrap" aria-hidden="true">
          <TempleScene />
        </div>
      </aside>

      {/* ══════════════ Form Panel (right) ══════════════ */}
      <main className="auth-forms-panel">

        {/* Back to landing */}
        <div style={{ padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <button onClick={() => navigate('/')} className="text-sm text-voh-muted hover:text-voh-accent" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            ← Back to home
          </button>
          <ThemeToggle />
        </div>

        {/* Mobile toggle tabs */}
        <div className="auth-mobile-tabs" role="tablist">
          <button role="tab" aria-selected={mode === 'login'}
            className={mode === 'login' ? 'active' : ''}
            onClick={() => switchMode('login')}>Sign In</button>
          <button role="tab" aria-selected={mode === 'register'}
            className={mode === 'register' ? 'active' : ''}
            onClick={() => switchMode('register')}>Sign Up</button>
        </div>

        {/* Sliding viewport */}
        <div className="auth-slider-viewport">
          <div className="auth-slider-track"
            style={{ transform: mode === 'register' ? 'translateX(-50%)' : 'translateX(0)' }}>

            {/* ── Login pane ─────────────────────────────── */}
            <div className="auth-form-pane" aria-hidden={mode !== 'login'}>
              <div className="auth-form-card">
                <h2 className="auth-form-heading">Welcome back</h2>
                <p className="auth-form-subheading">Sign in to continue your heritage journey</p>

                {loginError && (
                  <div className="alert-error mb-5"><span>⚠️</span> {loginError}</div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="voh-label" htmlFor="login-email">Email address</label>
                    <input id="login-email" type="email" className="voh-input"
                      placeholder="you@example.com" autoComplete="email" required
                      value={loginForm.email}
                      onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}/>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="voh-label" style={{ margin: 0 }} htmlFor="login-pwd">
                        Password
                      </label>
                      <Link to="/auth/forgot-password"
                        className="text-xs hover:underline" style={{ color: '#f59e0b' }}>
                        Forgot?
                      </Link>
                    </div>
                    <input id="login-pwd" type="password" className="voh-input"
                      placeholder="Your password" autoComplete="current-password" required
                      value={loginForm.password}
                      onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}/>
                  </div>
                  <button type="submit" className="btn-primary"
                    disabled={loginLoading || googleLoading}>
                    {loginLoading
                      ? <><span className="animate-spin">⏳</span> Signing in...</>
                      : 'Sign in'}
                  </button>
                </form>

                <div className="divider-text">or continue with</div>

                <button className="btn-ghost" onClick={handleGoogle}
                  disabled={loginLoading || googleLoading}>
                  {googleLoading
                    ? <><span className="animate-spin">⏳</span> Opening Google...</>
                    : <><GoogleIcon /> Continue with Google</>}
                </button>

                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    className="w-full py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-sm"
                    style={{
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.35))',
                      border: '1px solid rgba(245, 158, 11, 0.5)',
                      color: '#fbbf24',
                      cursor: 'pointer'
                    }}
                  >
                    <span>⚡</span> Instant Demo Login (Researcher / Explorer Mode)
                  </button>
                  <p className="text-center text-xs text-voh-muted mt-2">
                    Bypasses Firebase for local testing & access to all protected features.
                  </p>
                </div>

                <p className="text-center text-sm mt-5" style={{ color: '#94a3b8' }}>
                  No account?{' '}
                  <button onClick={() => switchMode('register')} className="auth-inline-link">
                    Sign up free →
                  </button>
                </p>
              </div>
            </div>

            {/* ── Register pane ──────────────────────────── */}
            <div className="auth-form-pane" aria-hidden={mode !== 'register'}>
              <div className="auth-form-card">
                <h2 className="auth-form-heading">Join the Heritage</h2>
                <p className="auth-form-subheading">Create your account and start exploring</p>

                {regError   && <div className="alert-error mb-4"><span>⚠️</span> {regError}</div>}
                {regSuccess && <div className="alert-success mb-4"><span>✅</span> {regSuccess}</div>}

                {!regSuccess ? (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label className="voh-label" htmlFor="reg-name">Full name</label>
                      <input id="reg-name" type="text" className="voh-input"
                        placeholder="Arjun Mehta" required minLength={2}
                        value={regForm.name}
                        onChange={e => setRegForm({ ...regForm, name: e.target.value })}/>
                    </div>
                    <div>
                      <label className="voh-label" htmlFor="reg-email">Email address</label>
                      <input id="reg-email" type="email" className="voh-input"
                        placeholder="you@example.com" required
                        value={regForm.email}
                        onChange={e => setRegForm({ ...regForm, email: e.target.value })}/>
                    </div>
                    <div>
                      <label className="voh-label" htmlFor="reg-pwd">
                        Password{' '}
                        <span style={{ color: '#94a3b8', fontWeight: 400 }}>(min. 6 chars)</span>
                      </label>
                      <input id="reg-pwd" type="password" className="voh-input"
                        placeholder="Create a strong password" required minLength={6}
                        value={regForm.password}
                        onChange={e => setRegForm({ ...regForm, password: e.target.value })}/>
                    </div>
                    <div>
                      <label className="voh-label">I am a...</label>
                      <div className="grid grid-cols-2 gap-2">
                        {ROLES.map(r => (
                          <button key={r.value} type="button"
                            onClick={() => setRegForm({ ...regForm, role: r.value })}
                            className="auth-role-btn"
                            style={{
                              background: regForm.role === r.value
                                ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${regForm.role === r.value
                                ? 'rgba(245,158,11,0.45)' : 'rgba(255,255,255,0.08)'}`,
                            }}>
                            <div className="auth-role-label">{r.label}</div>
                            <div className="auth-role-desc">{r.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <button type="submit" className="btn-primary" disabled={regLoading}>
                      {regLoading
                        ? <><span className="animate-spin">⏳</span> Creating account...</>
                        : 'Create account'}
                    </button>
                  </form>
                ) : (
                  <button className="btn-primary mt-2" onClick={() => switchMode('login')}>
                    Go to Login →
                  </button>
                )}

                <p className="text-center text-sm mt-5" style={{ color: '#94a3b8' }}>
                  Already have an account?{' '}
                  <button onClick={() => switchMode('login')} className="auth-inline-link">
                    Sign in
                  </button>
                </p>
              </div>
            </div>

          </div>{/* /auth-slider-track */}
        </div>{/* /auth-slider-viewport */}
      </main>
    </div>
  );
}
