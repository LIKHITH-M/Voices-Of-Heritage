import { useState, useEffect, FormEvent, Suspense, lazy } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { getSavedTrips, type SavedTrip } from '@/pages/TripPlannerPage';

const DEPKGGraph3D = lazy(() => import('@/components/DEPKGGraph3D'));
import PreferencesDashboard from '@/components/research/PreferencesDashboard';

const HERITAGE_INTERESTS = [
  'Temples & Shrines', 'Murals & Paintings', 'Manuscripts', 'Ancient Ruins',
  'Colonial Architecture', 'Folk Art', 'Textiles & Crafts', 'Music & Dance',
  'Festivals & Rituals', 'Cave Art', 'Forts & Palaces', 'Sacred Groves',
  'Culinary Heritage', 'Tribal Culture', 'Maritime Heritage',
];

const ROLE_LABELS: Record<string, string> = {
  user:        '🧳 Traveller',
  researcher:  '📚 Researcher',
  guide:       '🗺️ Heritage Guide',
  institution: '🎓 Institution',
  admin:       '⚙️ Admin',
};

export default function ProfilePage() {
  const { user, loading, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', heritage_interests: [] as string[], notification_email: true, notification_push: true });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [tripsExpanded, setTripsExpanded] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate('/auth/login');
    if (user) setForm({ name: user.name, heritage_interests: user.heritage_interests || [], notification_email: true, notification_push: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    // 1. Initial load from local storage
    const local = getSavedTrips();
    setSavedTrips(local);

    // 2. Fetch from backend research-service
    const userId = user?.id || user?.email;
    if (userId) {
      const researchUrl = import.meta.env.VITE_RESEARCH_SERVICE_URL || 'http://localhost:5003/api';
      fetch(`${researchUrl}/trips/${userId}`)
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
            const mapped: SavedTrip[] = json.data.map((t: any) => ({
              id: t.tripId || t._id,
              destination: t.destination,
              startDate: t.startDate ? String(t.startDate).split('T')[0] : '',
              endDate: t.endDate ? String(t.endDate).split('T')[0] : '',
              budget: t.budget || 'mid',
              travelers: t.travelers || 2,
              savedAt: t.createdAt || new Date().toISOString(),
              trip: {
                destination: t.destination,
                startDate: t.startDate || '',
                endDate: t.endDate || '',
                totalDays: t.totalDays || 3,
                travelers: t.travelers || 2,
                budget: t.budget || 'mid',
                currency: t.currency || 'INR',
                travelStyle: t.travelStyle || 'couple',
                pace: t.pace || 'balanced',
                interests: t.interests || [],
                dietary: t.dietary || [],
                days: t.itinerary || [],
                hotels: [],
                transport: [],
                packingList: [],
                emergencyContacts: [],
                weatherAlerts: [],
              },
            }));
            // Merge unique trips
            setSavedTrips(prev => {
              const ids = new Set(prev.map(p => p.id));
              const newItems = mapped.filter(m => !ids.has(m.id));
              return [...prev, ...newItems];
            });
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const toggleInterest = (i: string) =>
    setForm(prev => ({ ...prev, heritage_interests: prev.heritage_interests.includes(i) ? prev.heritage_interests.filter(x => x !== i) : [...prev.heritage_interests, i] }));

  const handleSave = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true); setSaveMsg(''); setSaveError('');
    try { await apiClient.put('/api/users/profile', form); await refreshUser(); setSaveMsg('Profile saved successfully!'); }
    catch { setSaveError('Failed to save. Please try again.'); }
    finally { setSaving(false); setTimeout(() => { setSaveMsg(''); setSaveError(''); }, 3000); }
  };

  const deleteTrip = (id: string) => {
    const updated = savedTrips.filter(t => t.id !== id);
    localStorage.setItem('voh_saved_trips', JSON.stringify(updated));
    setSavedTrips(updated);
  };

  if (loading) return <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505' }}><div style={{ fontSize: '2.5rem', animation: 'pulse 1.5s infinite' }}>🏛️</div></main>;

  const initials = (user?.name?.slice(0, 2) || 'VH').toUpperCase();

  /* ── CSS ── */
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600;700;800&display=swap');
    .prf{min-height:100vh;background:#050505;color:#EDEDED;font-family:'Inter',system-ui,sans-serif;padding:0 0 3rem;}
    .prf-top{position:sticky;top:0;z-index:50;height:56px;background:#0A0A0B;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between;padding:0 1.5rem;gap:1rem;}
    .prf-brand{font-family:'Cinzel',serif;font-weight:700;font-size:.9rem;color:#B4773B;cursor:pointer;}
    .prf-top-btn{padding:.3rem .85rem;border-radius:8px;border:1px solid rgba(255,255,255,0.07);background:none;color:#7A7A7A;font-size:.76rem;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;}
    .prf-top-btn:hover{color:#EDEDED;border-color:#B4773B;}
    .prf-top-btn.red:hover{color:#f87171;border-color:#f87171;}
    .prf-body{max-width:800px;margin:0 auto;padding:2rem 1.5rem;display:flex;flex-direction:column;gap:1.5rem;}
    /* avatar card */
    .prf-avatar-card{background:#0F0F11;border:1px solid rgba(255,255,255,0.05);border-radius:16px;padding:1.8rem;display:flex;align-items:center;gap:1.2rem;}
    .prf-avatar{width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#B4773B,#D99C53);display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:700;color:#fff;flex-shrink:0;}
    .prf-name{font-family:'Cinzel',serif;font-size:1.1rem;font-weight:700;color:#EDEDED;margin:0 0 .2rem;}
    .prf-email{font-size:.82rem;color:#7A7A7A;margin:0 0 .5rem;}
    .prf-role-badge{display:inline-flex;align-items:center;padding:.2rem .65rem;border-radius:20px;background:rgba(217,156,83,0.1);border:1px solid rgba(217,156,83,0.2);color:#D99C53;font-size:.7rem;font-weight:700;}
    /* section card */
    .prf-card{background:#0F0F11;border:1px solid rgba(255,255,255,0.05);border-radius:16px;padding:1.5rem;}
    .prf-card-title{font-family:'Cinzel',serif;font-size:1rem;font-weight:700;color:#EDEDED;margin:0 0 1.2rem;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:.75rem;}
    /* form */
    .prf-lbl{display:block;font-size:.73rem;font-weight:600;color:#D99C53;margin-bottom:.38rem;letter-spacing:.02em;}
    .prf-input{padding:.62rem .88rem;border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:#131316;color:#EDEDED;font-size:.86rem;font-family:'Inter',sans-serif;outline:none;width:100%;box-sizing:border-box;transition:border .15s;}
    .prf-input:focus{border-color:#B4773B;}
    /* interest chips */
    .prf-interest{display:flex;flex-wrap:wrap;gap:.45rem;}
    .prf-chip{padding:.35rem .72rem;border-radius:20px;border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.03);color:#7A7A7A;font-size:.74rem;cursor:pointer;transition:all .14s;font-family:'Inter',sans-serif;}
    .prf-chip.on{background:rgba(180,119,59,.12);border-color:#B4773B;color:#B4773B;font-weight:600;}
    /* notifications */
    .prf-notif{display:flex;align-items:center;justify-content:space-between;padding:.65rem 0;border-bottom:1px solid rgba(255,255,255,0.05);}
    .prf-notif:last-child{border-bottom:none;}
    .prf-notif-lbl{font-size:.84rem;color:#EDEDED;}
    .prf-notif-sub{font-size:.68rem;color:#7A7A7A;}
    .prf-toggle{width:40px;height:21px;border-radius:11px;border:none;cursor:pointer;position:relative;transition:all .2s;background:#2A2A2A;flex-shrink:0;}
    .prf-toggle.on{background:linear-gradient(135deg,#B4773B,#D99C53);}
    .prf-toggle::after{content:'';position:absolute;top:2px;left:2px;width:17px;height:17px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.3);}
    .prf-toggle.on::after{transform:translateX(19px);}
    /* submit */
    .prf-submit{padding:.65rem 1.6rem;border-radius:10px;background:linear-gradient(135deg,#B4773B,#D99C53);color:#fff;border:none;font-size:.84rem;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;transition:all .14s;}
    .prf-submit:hover{filter:brightness(1.1);}
    .prf-submit:disabled{opacity:.5;cursor:not-allowed;}
    /* alert */
    .prf-alert-ok{display:flex;align-items:center;gap:.5rem;padding:.6rem .85rem;border-radius:8px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);color:#4ADE80;font-size:.8rem;margin-bottom:.9rem;}
    .prf-alert-err{display:flex;align-items:center;gap:.5rem;padding:.6rem .85rem;border-radius:8px;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.2);color:#F87171;font-size:.8rem;margin-bottom:.9rem;}
    /* saved trips */
    .prf-trips-header{display:flex;align-items:center;justify-content:space-between;cursor:pointer;margin-bottom:1rem;}
    .prf-trip-card{background:#131316;border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:1rem 1.1rem;display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-bottom:.7rem;transition:all .14s;}
    .prf-trip-card:hover{border-color:rgba(180,119,59,.22);}
    .prf-trip-dest{font-family:'Cinzel',serif;font-size:.9rem;font-weight:700;color:#EDEDED;}
    .prf-trip-meta{font-size:.72rem;color:#7A7A7A;margin-top:3px;}
    .prf-trip-cost{font-size:1rem;font-weight:800;color:#D99C53;flex-shrink:0;}
    .prf-trip-actions{display:flex;gap:.45rem;flex-shrink:0;}
    .prf-trip-btn{padding:.28rem .7rem;border-radius:7px;border:1px solid rgba(255,255,255,0.07);background:none;color:#7A7A7A;font-size:.7rem;cursor:pointer;font-family:'Inter',sans-serif;transition:all .14s;}
    .prf-trip-btn:hover{color:#EDEDED;border-color:#B4773B;}
    .prf-trip-btn.del:hover{color:#F87171;border-color:#F87171;}
    .prf-empty{text-align:center;padding:2rem;color:#7A7A7A;font-size:.84rem;}
    /* badge strip */
    .prf-hl{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.4rem;}
    .prf-hl-tag{padding:.18rem .55rem;border-radius:20px;background:rgba(180,119,59,.1);border:1px solid rgba(180,119,59,.18);font-size:.62rem;color:#D99C53;font-weight:600;}
    /* Responsive media queries */
    @media(max-width:768px){
      .prf-body{padding:1.2rem 1rem;gap:1.2rem;}
      .prf-card{padding:1.2rem 1.1rem;border-radius:14px;}
    }
    @media(max-width:580px){
      .prf{padding-bottom:5rem;}
      .prf-top{padding:0 .75rem;height:52px;}
      .prf-brand{font-size:.82rem;}
      .prf-top-btn{padding:.26rem .6rem;font-size:.68rem;}
      .prf-body{padding:.8rem .65rem;gap:.9rem;}
      .prf-avatar-card{flex-direction:column;text-align:center;padding:1.2rem 1rem;gap:.9rem;}
      .prf-avatar{width:56px;height:56px;font-size:1.2rem;border-radius:14px;}
      .prf-name{font-size:1rem;}
      .prf-card{padding:.9rem .8rem;border-radius:13px;}
      .prf-card-title{font-size:.9rem;margin-bottom:.9rem;}
      .prf-trip-card{flex-direction:column;align-items:stretch;gap:.75rem;padding:.85rem .9rem;}
      .prf-trip-cost{font-size:.95rem;}
      .prf-trip-actions{width:100%;display:flex;justify-content:flex-end;}
      .prf-trip-btn{padding:.32rem .8rem;font-size:.72rem;}
      .prf-chip{padding:.3rem .65rem;font-size:.7rem;}
      .prf-submit{width:100%;padding:.75rem;font-size:.86rem;}
    }
  `;

  return (
    <div className="prf">
      <style>{css}</style>

      {/* Topbar */}
      <div className="prf-top">
        <div className="prf-brand" onClick={() => navigate('/dashboard')}>Voices of Heritage</div>
        <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
          <button className="prf-top-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
          <button className="prf-top-btn red" onClick={async () => { await logout(); navigate('/'); }}>Sign Out</button>
        </div>
      </div>

      <div className="prf-body">

        {/* Avatar card */}
        <div className="prf-avatar-card">
          <div className="prf-avatar">{initials}</div>
          <div>
            <div className="prf-name">{user?.name}</div>
            <div className="prf-email">{user?.email}</div>
            <span className="prf-role-badge">{ROLE_LABELS[user?.role || 'user']}</span>
          </div>
        </div>

        {/* ── Saved Trips ── */}
        <div className="prf-card">
          <div
            className="prf-trips-header"
            onClick={() => setTripsExpanded(!tripsExpanded)}
          >
            <div className="prf-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
              ✈️ My Saved Trips
              <span style={{ marginLeft: '.6rem', background: 'rgba(217,156,83,.1)', border: '1px solid rgba(217,156,83,.2)', color: '#D99C53', fontSize: '.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>
                {savedTrips.length}
              </span>
            </div>
            <span style={{ color: '#7A7A7A', fontSize: '.8rem' }}>{tripsExpanded ? '▲' : '▼'}</span>
          </div>

          {tripsExpanded && (
            <>
              {savedTrips.length === 0 ? (
                <div className="prf-empty">
                  <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>✈️</div>
                  No saved trips yet.<br />
                  <Link to="/trip-planner" style={{ color: '#D99C53', fontWeight: 600, textDecoration: 'none', fontSize: '.82rem' }}>Plan your first trip →</Link>
                </div>
              ) : (
                savedTrips.map(t => (
                  <div key={t.id} className="prf-trip-card">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="prf-trip-dest">{t.destination}</div>
                      <div className="prf-trip-meta">
                        {t.totalDays} days · {t.travelers} traveler{t.travelers > 1 ? 's' : ''} · {t.budget} budget · Saved {new Date(t.savedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="prf-hl">
                        {t.highlights.slice(0, 3).map((h, i) => <span key={i} className="prf-hl-tag">{h}</span>)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.4rem', flexShrink: 0 }}>
                      <div className="prf-trip-cost">{t.currency}{t.totalCost.toLocaleString()}</div>
                      <div className="prf-trip-actions">
                        <Link to="/trip-planner" className="prf-trip-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>View</Link>
                        {/* Phase 5: Post-trip reflection link */}
                        <Link to={`/reflection/${t.id}`} className="prf-trip-btn" style={{ textDecoration: 'none', display: 'inline-block', background: 'rgba(37,99,235,0.1)', borderColor: 'rgba(37,99,235,0.3)', color: '#2563EB' }} title="Reflect on this trip to improve future recommendations">📖 Reflect</Link>
                        <button className="prf-trip-btn del" onClick={() => deleteTrip(t.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* ── Real PTKG Preferences Dashboard (Research Layer) ── */}
        <div style={{ marginBottom: '1.5rem' }}>
          <PreferencesDashboard />
        </div>

        {/* ── DEPKG 3D Heritage Knowledge Graph ── */}
        <div className="prf-card" style={{ background: '#050508', border: '1px solid rgba(217,156,83,0.15)', borderRadius: '16px', padding: '1.4rem 1.5rem' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.1rem', paddingBottom:'.7rem', borderBottom:'1px solid rgba(217,156,83,0.1)' }}>
            <div>
              <div style={{ fontFamily:'Cinzel,serif', fontWeight:700, fontSize:'.95rem', color:'#EDEDED', marginBottom:'.15rem' }}>🧠 Heritage Knowledge Graph</div>
              <div style={{ fontSize:'.65rem', color:'#6B7280' }}>DEPKG — your personalised preference model visualised in 3D</div>
            </div>
            <span style={{ fontSize:'.58rem', padding:'3px 9px', borderRadius:'20px', background:'rgba(217,156,83,0.1)', border:'1px solid rgba(217,156,83,0.25)', color:'#D99C53', fontWeight:700, whiteSpace:'nowrap' }}>LIVE MODEL</span>
          </div>
          <Suspense fallback={
            <div style={{ height:'460px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'.6rem', color:'#D99C53' }}>
              <div style={{ fontSize:'2rem', animation:'spin 1.8s linear infinite' }}>🧠</div>
              <div style={{ fontSize:'.72rem' }}>Loading 3D graph…</div>
              <style>{`.prf .spin{animation:spin 1.8s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
            </div>
          }>
            <DEPKGGraph3D />
          </Suspense>
        </div>

        {/* ── Personal Details ── */}
        <form onSubmit={handleSave}>
          <div className="prf-card">
            <div className="prf-card-title">Personal Details</div>

            {saveMsg && <div className="prf-alert-ok">✅ {saveMsg}</div>}
            {saveError && <div className="prf-alert-err">⚠️ {saveError}</div>}

            <div style={{ marginBottom: '1.2rem' }}>
              <label className="prf-lbl" htmlFor="prf-name">Display name</label>
              <input id="prf-name" className="prf-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <label className="prf-lbl">Heritage Interests</label>
              <p style={{ fontSize: '.72rem', color: '#7A7A7A', margin: '0 0 .6rem' }}>Select topics you're passionate about</p>
              <div className="prf-interest">
                {HERITAGE_INTERESTS.map(i => (
                  <button key={i} type="button" className={`prf-chip ${form.heritage_interests.includes(i) ? 'on' : ''}`} onClick={() => toggleInterest(i)}>{i}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="prf-lbl">Notifications</label>
              {[
                { k: 'notification_email', l: '📧 Email updates',        s: 'Heritage news, booking confirmations'  },
                { k: 'notification_push',  l: '🔔 Push notifications',   s: 'Real-time alerts and reminders'        },
              ].map(o => (
                <div key={o.k} className="prf-notif">
                  <div><div className="prf-notif-lbl">{o.l}</div><div className="prf-notif-sub">{o.s}</div></div>
                  <button type="button" className={`prf-toggle ${(form as any)[o.k] ? 'on' : ''}`}
                    onClick={() => setForm(f => ({ ...f, [o.k]: !(f as any)[o.k] }))} />
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="prf-submit" disabled={saving}>
            {saving ? '⏳ Saving…' : '💾 Save Changes'}
          </button>
        </form>

      </div>
    </div>
  );
}
