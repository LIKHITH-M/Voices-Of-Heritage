import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import VoHLogo from '@/components/VoHLogo';
import axios from 'axios';

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

const STEPS = ['Personal & Profile', 'Heritage Expertise', 'Languages & Services', 'Availability & Pricing', 'Qualifications'];

const SPECIALIZATIONS = [
  'Temple Architecture', 'Mughal & Indo-Islamic Heritage', 'Ancient Epigraphy', 'Living Crafts & Handlooms',
  'Museum Curation', 'Culinary Heritage Walks', 'Sacred & Spiritual Circuits', 'Wildlife & Eco-Heritage',
  'Photography Expeditions', 'School & Academic Tours', 'Accessible / Senior Tourism', 'Performing Arts',
];

const HERITAGE_SITES = [
  'Hampi', 'Taj Mahal', 'Qutub Minar', 'Red Fort', 'Mysore Palace', 'Ajanta & Ellora', 'Khajuraho',
  'Konark Sun Temple', 'Mahabalipuram', 'Fatehpur Sikri', 'Sanchi Stupa', 'Sundarbans',
  'Golconda Fort', 'Charminar', 'Meenakshi Temple', 'Brihadeeswarar Temple', 'Rani Ki Vav',
  'Lotus Temple', "Humayun's Tomb", 'Victoria Memorial',
];

const KNOWLEDGE_AREAS = [
  'Architecture', 'History', 'Art & Culture', 'Religion & Spirituality', 'Archaeology',
  'Nature & Wildlife', 'Cuisine & Food Heritage', 'Music & Dance', 'Photography',
  'Mythology', 'Colonial History', 'Trade History',
];

const TOUR_TYPES = [
  'Walking Tour', 'Heritage Walk', 'Cycling Tour', 'Night Tour', 'Photography Tour', 'Culinary Tour',
  'Spiritual Tour', 'Adventure Trek', 'Boat Tour', 'Village Tour', 'Architecture Tour', 'Customized Private Tour',
];

const LANGUAGES = [
  'English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Marathi', 'Gujarati',
  'Punjabi', 'Urdu', 'Odia', 'French', 'German', 'Japanese', 'Chinese', 'Spanish', 'Italian', 'Russian', 'Arabic',
];

const SERVICES = [
  'Audio Guide', 'Photography', 'Transport Included', 'Meals Included', 'Accommodation Arranged',
  'Custom Itinerary', 'Group Discounts', 'Kids Activities', 'Senior-Friendly', 'Scholarly Lectures',
  'Night Tours', 'Academic Study Tours',
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = ['Early Morning (5–8 AM)', 'Morning (8 AM–12 PM)', 'Afternoon (12–4 PM)', 'Evening (4–8 PM)', 'Full Day', 'Flexible'];
const DURATION_OPTS = ['1–2 Hours', 'Half Day (3–4 hrs)', 'Full Day (6–8 hrs)', 'Multi-day', 'Custom'];
const GUIDE_TYPES = ['Individual Guide', 'Cultural Institution', 'Freelance Guide', 'Academic Researcher', 'Retired Archaeologist', 'ASI-Certified Guide'];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

type ToggleSetProps = { items: string[]; selected: string[]; onToggle: (v: string) => void; color?: string };
function ToggleSet({ items, selected, onToggle, color = C.amber }: ToggleSetProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {items.map(item => {
        const isSelected = selected.includes(item);
        return (
          <button
            key={item}
            type="button"
            onClick={() => onToggle(item)}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '20px',
              border: `1px solid ${isSelected ? color : C.border}`,
              background: isSelected ? color : 'transparent',
              color: isSelected ? '#000' : C.muted,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: isSelected ? 700 : 400,
            }}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}

type CheckGroupProps = { items: string[]; selected: string[]; onToggle: (v: string) => void };
function CheckGroup({ items, selected, onToggle }: CheckGroupProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '0.5rem' }}>
      {items.map(item => (
        <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem', color: C.muted }}>
          <input type="checkbox" checked={selected.includes(item)} onChange={() => onToggle(item)} style={{ accentColor: C.amber }} />
          {item}
        </label>
      ))}
    </div>
  );
}

export default function PartnershipsPage() {
  const [activeTab, setActiveTab] = useState<'apply' | 'status' | 'directory' | 'integrations'>('apply');
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<any>(null);
  const [submitError, setSubmitError] = useState('');

  // Status Checker state
  const [statusEmail, setStatusEmail] = useState('');
  const [statusResult, setStatusResult] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Guide Directory / Matching & Application Review state
  const [applications, setApplications] = useState<any[]>([]);
  const [dirLoading, setDirLoading] = useState(false);
  const [matchSite, setMatchSite] = useState('');
  const [matchLang, setMatchLang] = useState('');
  const [matchDay, setMatchDay] = useState('');
  const [matchGroup, setMatchGroup] = useState('');
  const [matchMaxRate, setMatchMaxRate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [form, setForm] = useState({
    // Personal Information
    fullName: '', email: '', phone: '', location: '', profilePhotoUrl: '',
    // Professional Information
    guideType: 'Individual Guide', yearsExperience: '', previousExperience: '',
    specializations: [] as string[], description: '',
    // Heritage Expertise
    heritageSites: [] as string[], knowledgeAreas: [] as string[], historicalSubjects: '', tourTypes: [] as string[],
    // Languages & Services
    languages: [] as string[], services: [] as string[],
    accessibilityServices: [] as string[], maxGroupSize: '10',
    // Availability
    availableDays: [] as string[], timeSlots: [] as string[], tourDuration: [] as string[],
    // Pricing
    hourlyRate: '', tourRate: '', groupRate: '', additionalCharges: '',
    // Qualifications & Verification
    certifications: '', documents: '', documentFiles: [] as string[], agreeTerms: false,
  });

  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const toggle = (key: string, val: string) => {
    const arr = (form as any)[key] as string[];
    setF(key, arr.includes(val) ? arr.filter((x: string) => x !== val) : [...arr, val]);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setSubmitError('Profile photo should be under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setF('profilePhotoUrl', reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).map(f => f.name);
    if (files.length > 0) {
      setForm(prev => ({
        ...prev,
        documentFiles: Array.from(new Set([...prev.documentFiles, ...files])),
      }));
    }
  };

  const stepValid = () => {
    if (step === 0) return Boolean(form.fullName.trim() && form.email.trim() && form.phone.trim() && form.location.trim());
    if (step === 1) return form.heritageSites.length > 0 && form.tourTypes.length > 0;
    if (step === 2) return form.languages.length > 0;
    if (step === 3) return form.availableDays.length > 0;
    if (step === 4) return form.agreeTerms;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      const combinedDocs = [
        ...form.documents.split(/[,\n]+/).map(s => s.trim()).filter(Boolean),
        ...form.documentFiles,
      ];
      const payload = {
        ...form,
        documents: combinedDocs,
      };
      const { data } = await axios.post('/api/guides/apply', payload);
      setSubmitted(data);
    } catch (err: any) {
      setSubmitError(err?.response?.data?.error || 'Failed to submit application. Please ensure the backend server is running.');
    } finally {
      setSubmitting(false);
    }
  };

  const checkStatus = async () => {
    if (!statusEmail.trim()) return;
    setStatusLoading(true);
    setStatusError('');
    setStatusResult(null);
    try {
      const { data } = await axios.get(`/api/guides/by-email/${encodeURIComponent(statusEmail.trim())}`);
      setStatusResult(data);
    } catch (err: any) {
      setStatusError(err?.response?.data?.error || 'No application found for this email.');
    } finally {
      setStatusLoading(false);
    }
  };

  const loadDirectory = async () => {
    setDirLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('includeAllStatuses', 'true');
      if (matchSite) params.set('site', matchSite);
      if (matchLang) params.set('language', matchLang);
      if (matchDay) params.set('day', matchDay);
      if (matchGroup) params.set('groupSize', matchGroup);
      if (matchMaxRate) params.set('maxTourRate', matchMaxRate);
      const { data } = await axios.get(`/api/guides/match?${params.toString()}`);
      const list = Array.isArray(data?.guides) ? data.guides : Array.isArray(data) ? data : [];
      setApplications(list);
    } catch {
      setApplications([]);
    } finally {
      setDirLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'directory') {
      loadDirectory();
    }
  }, [activeTab]);

  const handleUpdateApplicationStatus = async (id: string, newStatus: string) => {
    try {
      const { data } = await axios.patch(`/api/guides/application/${id}/status`, {
        applicationStatus: newStatus,
        verificationStatus: newStatus,
      });
      if (data?.application) {
        setApplications(prev => prev.map(a => (a._id === id ? data.application : a)));
      }
    } catch {
      // ignore
    }
  };

  const displayedApps = applications.filter(a => statusFilter === 'all' || a.applicationStatus === statusFilter);

  const css = `
    .p2-root { display:flex; flex-direction:column; min-height:100vh; background:${C.bg}; color:${C.text}; font-family:'Inter',sans-serif; }
    .p2-topbar { padding:1.25rem 2rem; border-bottom:1px solid ${C.border}; background:${C.surface}; display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; z-index:50; }
    .p2-brand { display:flex; align-items:center; gap:1rem; text-decoration:none; }
    .p2-title { font-size:1.4rem; font-weight:800; color:${C.text}; }
    .p2-subtitle { font-size:0.85rem; color:${C.muted}; }

    .p2-tabs { display:flex; border-bottom:1px solid ${C.border}; background:${C.surface}; overflow-x:auto; }
    .p2-tab { flex:1; min-width:140px; padding:1rem; font-weight:700; font-size:0.88rem; border:none; background:none; color:${C.muted}; cursor:pointer; border-bottom:3px solid transparent; transition:all 0.2s; white-space:nowrap; }
    .p2-tab.active { color:${C.amber}; border-bottom-color:${C.amber}; }

    .p2-content { padding:2rem; max-width:960px; margin:0 auto; width:100%; }

    .p2-steps { display:flex; gap:0; margin-bottom:2rem; border-radius:12px; overflow:hidden; border:1px solid ${C.border}; }
    .p2-step-pill { flex:1; padding:0.65rem 0.5rem; text-align:center; font-size:0.72rem; font-weight:700; transition:all 0.2s; border:none; cursor:default; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .p2-step-pill.done { background:rgba(245,158,11,0.15); color:${C.amber}; }
    .p2-step-pill.active { background:${C.amber}; color:#000; }
    .p2-step-pill.pending { background:transparent; color:${C.muted}; }

    .p2-card { background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; padding:2rem; }
    .p2-step-title { font-size:1.4rem; font-weight:800; margin-bottom:0.4rem; }
    .p2-step-sub { font-size:0.9rem; color:${C.muted}; margin-bottom:1.5rem; }
    .p2-field { margin-bottom:1.25rem; }
    .p2-label { display:block; font-size:0.78rem; font-weight:700; color:${C.muted}; margin-bottom:0.4rem; text-transform:uppercase; letter-spacing:0.04em; }
    .p2-input { width:100%; padding:0.72rem 1rem; border-radius:10px; border:1px solid ${C.border}; background:rgba(255,255,255,0.03); color:${C.text}; font-size:0.9rem; outline:none; transition:border-color 0.2s; font-family:inherit; }
    .p2-input:focus { border-color:${C.amber}; }
    .p2-select { width:100%; padding:0.72rem 1rem; border-radius:10px; border:1px solid ${C.border}; background:${C.surface}; color:${C.text}; font-size:0.9rem; outline:none; cursor:pointer; font-family:inherit; }
    .p2-textarea { width:100%; padding:0.72rem 1rem; border-radius:10px; border:1px solid ${C.border}; background:rgba(255,255,255,0.03); color:${C.text}; font-size:0.9rem; outline:none; min-height:95px; resize:vertical; font-family:inherit; }
    .p2-textarea:focus { border-color:${C.amber}; }

    .p2-nav { display:flex; justify-content:space-between; margin-top:1.5rem; }
    .p2-btn { padding:0.75rem 1.5rem; border-radius:10px; font-weight:700; font-size:0.9rem; cursor:pointer; transition:all 0.2s; border:none; }
    .p2-btn-primary { background:${C.amber}; color:#000; }
    .p2-btn-primary:hover { filter:brightness(1.08); }
    .p2-btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
    .p2-btn-ghost { background:transparent; border:1px solid ${C.border}; color:${C.muted}; }
    .p2-btn-ghost:hover { border-color:${C.amber}; color:${C.amber}; }

    .p2-success { text-align:center; padding:3rem 2rem; }
    .p2-success-icon { font-size:4rem; margin-bottom:1rem; }

    .p2-status-card { background:${C.surface}; border:1px solid ${C.border}; border-radius:14px; padding:1.5rem; margin-top:1.25rem; }
    .p2-status-badge { display:inline-block; padding:0.28rem 0.85rem; border-radius:20px; font-weight:700; font-size:0.76rem; text-transform:uppercase; }
    .p2-status-pending { background:rgba(245,158,11,0.12); color:${C.amber}; border:1px solid rgba(245,158,11,0.3); }
    .p2-status-approved { background:rgba(34,197,94,0.12); color:#22c55e; border:1px solid rgba(34,197,94,0.3); }
    .p2-status-rejected { background:rgba(239,68,68,0.12); color:#ef4444; border:1px solid rgba(239,68,68,0.3); }
    .p2-status-review { background:rgba(99,102,241,0.12); color:#818cf8; border:1px solid rgba(99,102,241,0.3); }
  `;

  const getStatusClass = (status: string) => {
    if (status === 'approved') return 'p2-status-badge p2-status-approved';
    if (status === 'rejected') return 'p2-status-badge p2-status-rejected';
    if (status === 'under_review') return 'p2-status-badge p2-status-review';
    return 'p2-status-badge p2-status-pending';
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <div className="p2-step-title">Personal &amp; Professional Information</div>
            <div className="p2-step-sub">Tell us who you are, upload a profile photo, and share your guiding background.</div>

            {/* Profile Photo Upload + URL */}
            <div className="p2-field" style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
              <div style={{ width: 76, height: 76, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${C.amber}`, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>
                {form.profilePhotoUrl ? (
                  <img src={form.profilePhotoUrl} alt="Profile preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  '👤'
                )}
              </div>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <label className="p2-label">Profile Photo (Upload or Image URL)</label>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ fontSize: '0.8rem', color: C.muted }} />
                </div>
                <input
                  className="p2-input"
                  value={form.profilePhotoUrl.startsWith('data:') ? '' : form.profilePhotoUrl}
                  onChange={e => setF('profilePhotoUrl', e.target.value)}
                  placeholder="Or paste profile photo URL (https://...)"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="p2-field"><label className="p2-label">Full Name / Institution Name *</label><input required className="p2-input" value={form.fullName} onChange={e => setF('fullName', e.target.value)} placeholder="Your full legal name" /></div>
              <div className="p2-field"><label className="p2-label">Email Address *</label><input required type="email" className="p2-input" value={form.email} onChange={e => setF('email', e.target.value)} placeholder="your@email.com" /></div>
              <div className="p2-field"><label className="p2-label">Phone Number *</label><input required type="tel" className="p2-input" value={form.phone} onChange={e => setF('phone', e.target.value)} placeholder="+91 98765 43210" /></div>
              <div className="p2-field"><label className="p2-label">City / Location *</label><input required className="p2-input" value={form.location} onChange={e => setF('location', e.target.value)} placeholder="e.g. Hampi, Karnataka" /></div>
              <div className="p2-field">
                <label className="p2-label">Guide / Service Type</label>
                <select className="p2-select" value={form.guideType} onChange={e => setF('guideType', e.target.value)}>
                  {GUIDE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="p2-field"><label className="p2-label">Years of Experience</label><input type="number" min="0" max="60" className="p2-input" value={form.yearsExperience} onChange={e => setF('yearsExperience', e.target.value)} placeholder="e.g. 8" /></div>
            </div>

            <div className="p2-field">
              <label className="p2-label">Areas of Specialization</label>
              <ToggleSet items={SPECIALIZATIONS} selected={form.specializations} onToggle={v => toggle('specializations', v)} />
            </div>

            <div className="p2-field"><label className="p2-label">Previous Guiding / Work Experience</label><textarea className="p2-textarea" value={form.previousExperience} onChange={e => setF('previousExperience', e.target.value)} placeholder="Describe previous guiding roles, museums/institutions worked with, notable tours..." /></div>
            <div className="p2-field"><label className="p2-label">Description / About the Guide or Institution</label><textarea className="p2-textarea" value={form.description} onChange={e => setF('description', e.target.value)} placeholder="What makes you unique as a guide or cultural institution? Share your storytelling approach..." /></div>
          </>
        );
      case 1:
        return (
          <>
            <div className="p2-step-title">Heritage Expertise</div>
            <div className="p2-step-sub">Select the heritage sites, knowledge areas, and tour experiences you offer.</div>
            <div className="p2-field"><label className="p2-label">Heritage Sites &amp; Destinations Available *</label><ToggleSet items={HERITAGE_SITES} selected={form.heritageSites} onToggle={v => toggle('heritageSites', v)} /></div>
            <div className="p2-field"><label className="p2-label">Areas of Heritage Knowledge</label><ToggleSet items={KNOWLEDGE_AREAS} selected={form.knowledgeAreas} onToggle={v => toggle('knowledgeAreas', v)} /></div>
            <div className="p2-field"><label className="p2-label">Historical / Cultural Subjects (comma-separated)</label><textarea className="p2-textarea" style={{ minHeight: '80px' }} value={form.historicalSubjects} onChange={e => setF('historicalSubjects', e.target.value)} placeholder="e.g. Vijayanagara Empire, Mughal court arts, Dravidian temple architecture, Buddhist manuscripts..." /></div>
            <div className="p2-field"><label className="p2-label">Types of Experiences / Tours Offered *</label><ToggleSet items={TOUR_TYPES} selected={form.tourTypes} onToggle={v => toggle('tourTypes', v)} /></div>
          </>
        );
      case 2:
        return (
          <>
            <div className="p2-step-title">Languages &amp; Services</div>
            <div className="p2-step-sub">Help us match you with tourists based on spoken languages, group size, and accessibility services.</div>
            <div className="p2-field"><label className="p2-label">Languages Spoken *</label><ToggleSet items={LANGUAGES} selected={form.languages} onToggle={v => toggle('languages', v)} /></div>
            <div className="p2-field"><label className="p2-label">Services Provided</label><ToggleSet items={SERVICES} selected={form.services} onToggle={v => toggle('services', v)} /></div>
            <div className="p2-field">
              <label className="p2-label">Accessibility &amp; Special Services Provided</label>
              <CheckGroup
                items={['Wheelchair Accessible Tours', 'Sign Language Available', 'Braille Materials Provided', 'Slow-Paced Tours (seniors)', 'Child-Friendly Tours', 'Hearing Loop Available']}
                selected={form.accessibilityServices}
                onToggle={v => toggle('accessibilityServices', v)}
              />
            </div>
            <div className="p2-field"><label className="p2-label">Maximum Group Size</label><input type="number" min="1" max="100" className="p2-input" value={form.maxGroupSize} onChange={e => setF('maxGroupSize', e.target.value)} /></div>
          </>
        );
      case 3:
        return (
          <>
            <div className="p2-step-title">Availability &amp; Pricing</div>
            <div className="p2-step-sub">Define your schedule and transparent pricing for tourist matching.</div>
            <div className="p2-field"><label className="p2-label">Available Days *</label><CheckGroup items={DAYS} selected={form.availableDays} onToggle={v => toggle('availableDays', v)} /></div>
            <div className="p2-field"><label className="p2-label">Preferred Time Slots</label><ToggleSet items={TIME_SLOTS} selected={form.timeSlots} onToggle={v => toggle('timeSlots', v)} /></div>
            <div className="p2-field"><label className="p2-label">Preferred Tour Duration</label><ToggleSet items={DURATION_OPTS} selected={form.tourDuration} onToggle={v => toggle('tourDuration', v)} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div className="p2-field"><label className="p2-label">Hourly Rate (₹)</label><input type="number" min="0" className="p2-input" value={form.hourlyRate} onChange={e => setF('hourlyRate', e.target.value)} placeholder="e.g. 500" /></div>
              <div className="p2-field"><label className="p2-label">Full Tour Rate (₹)</label><input type="number" min="0" className="p2-input" value={form.tourRate} onChange={e => setF('tourRate', e.target.value)} placeholder="e.g. 2500" /></div>
              <div className="p2-field"><label className="p2-label">Group Rate (₹/person)</label><input type="number" min="0" className="p2-input" value={form.groupRate} onChange={e => setF('groupRate', e.target.value)} placeholder="e.g. 300" /></div>
            </div>
            <div className="p2-field"><label className="p2-label">Additional Service Charges (if applicable)</label><textarea className="p2-textarea" style={{ minHeight: '70px' }} value={form.additionalCharges} onChange={e => setF('additionalCharges', e.target.value)} placeholder="e.g. Transport surcharge outside city limits: ₹500. Audio headset rental: ₹150/guest..." /></div>
          </>
        );
      case 4:
        return (
          <>
            <div className="p2-step-title">Qualifications &amp; Verification</div>
            <div className="p2-step-sub">Provide your licenses, certifications, and supporting documents for verification.</div>
            <div className="p2-field"><label className="p2-label">Relevant Certifications / Licenses (comma-separated)</label><textarea className="p2-textarea" value={form.certifications} onChange={e => setF('certifications', e.target.value)} placeholder="e.g. Ministry of Tourism Regional Guide License, ASI Heritage Certification, IATO Member, First Aid Certified..." /></div>
            <div className="p2-field">
              <label className="p2-label">Supporting Documents (Attach Files or List References)</label>
              <input type="file" multiple onChange={handleDocumentAttach} style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '0.6rem', display: 'block' }} />
              {form.documentFiles.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                  {form.documentFiles.map(fn => (
                    <span key={fn} style={{ fontSize: '0.76rem', padding: '3px 10px', borderRadius: '14px', background: 'rgba(245,158,11,0.12)', color: C.amber }}>
                      📎 {fn}
                    </span>
                  ))}
                </div>
              )}
              <textarea className="p2-textarea" style={{ minHeight: '70px' }} value={form.documents} onChange={e => setF('documents', e.target.value)} placeholder="e.g. Aadhaar / Passport ID, State Tourism License No., University Degree, Institutional Registration..." />
            </div>
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: C.amber }}>Verification &amp; Status Workflow</div>
              <div style={{ fontSize: '0.88rem', color: C.muted, lineHeight: 1.6 }}>
                Application Status lifecycle: <strong style={{ color: C.text }}>Pending → Under Review → Approved / Rejected</strong><br />
                Once approved, tourists can automatically match with your profile by heritage site, expertise, language, availability, group size, services, and pricing.
              </div>
            </div>
            <div className="p2-field">
              <label style={{ display: 'flex', gap: '0.75rem', cursor: 'pointer', alignItems: 'flex-start' }}>
                <input type="checkbox" checked={form.agreeTerms} onChange={e => setF('agreeTerms', e.target.checked)} style={{ accentColor: C.amber, marginTop: '2px', flexShrink: 0 }} />
                <span style={{ fontSize: '0.88rem', color: C.muted, lineHeight: 1.6 }}>
                  I confirm all information provided is accurate and agree to the Voices of Heritage Guide &amp; Cultural Institution verification guidelines.
                </span>
              </label>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <style>{css}</style>
      <div className="p2-root">
        <header className="p2-topbar">
          <Link to="/dashboard" className="p2-brand">
            <VoHLogo size={36} />
            <div>
              <div className="p2-title">Travel Guide &amp; Cultural Institution Portal</div>
              <div className="p2-subtitle">Register, verify credentials &amp; match with heritage travellers</div>
            </div>
          </Link>
          <ThemeToggle />
        </header>

        <div className="p2-tabs">
          <button className={`p2-tab ${activeTab === 'apply' ? 'active' : ''}`} onClick={() => { setActiveTab('apply'); setStep(0); setSubmitted(null); }}>📝 Apply as Guide / Institution</button>
          <button className={`p2-tab ${activeTab === 'status' ? 'active' : ''}`} onClick={() => setActiveTab('status')}>🔍 Check Application Status</button>
          <button className={`p2-tab ${activeTab === 'directory' ? 'active' : ''}`} onClick={() => setActiveTab('directory')}>🤝 Match Guides &amp; Review</button>
          <button className={`p2-tab ${activeTab === 'integrations' ? 'active' : ''}`} onClick={() => setActiveTab('integrations')}>🔗 Integrations</button>
        </div>

        <div className="p2-content">
          {/* ── TAB 1: APPLICATION FORM ── */}
          {activeTab === 'apply' && (
            submitted ? (
              <div className="p2-success">
                <div className="p2-success-icon">🎉</div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '0.5rem' }}>Application Submitted!</h2>
                <p style={{ color: C.muted, marginBottom: '1.5rem' }}>Your application has been persisted in our database and queued for verification.</p>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '1.5rem', maxWidth: '440px', margin: '0 auto 1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: C.muted, fontSize: '0.85rem' }}>Application ID</span>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.88rem' }}>{submitted.applicationId || submitted._id}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: C.muted, fontSize: '0.85rem' }}>Application Status</span>
                    <span className="p2-status-badge p2-status-pending">{STATUS_LABELS[submitted.status] || 'Pending'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: C.muted, fontSize: '0.85rem' }}>Verification Status</span>
                    <span className="p2-status-badge p2-status-pending">{STATUS_LABELS[submitted.verificationStatus] || 'Pending'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => { setStatusEmail(form.email); setActiveTab('status'); }} className="p2-btn p2-btn-primary">🔍 Track Status</button>
                  <button onClick={() => { setSubmitted(null); setStep(0); setForm(f => ({ ...f, agreeTerms: false })); }} className="p2-btn p2-btn-ghost">Submit Another</button>
                </div>
              </div>
            ) : (
              <>
                <div className="p2-steps">
                  {STEPS.map((s, i) => (
                    <div key={s} className={`p2-step-pill ${i < step ? 'done' : i === step ? 'active' : 'pending'}`}>
                      {i < step ? '✓ ' : `${i + 1}. `}{s}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="p2-card">
                    {renderStep()}
                    {submitError && <div style={{ color: '#ef4444', fontSize: '0.88rem', marginBottom: '1rem', fontWeight: 600 }}>⚠️ {submitError}</div>}
                    <div className="p2-nav">
                      <button type="button" className="p2-btn p2-btn-ghost" style={{ visibility: step === 0 ? 'hidden' : 'visible' }} onClick={() => setStep(s => s - 1)}>← Back</button>
                      {step < STEPS.length - 1
                        ? <button type="button" className="p2-btn p2-btn-primary" disabled={!stepValid()} onClick={() => { if (stepValid()) setStep(s => s + 1); }}>Next →</button>
                        : <button type="submit" className="p2-btn p2-btn-primary" disabled={!stepValid() || submitting}>{submitting ? '⏳ Submitting...' : '🚀 Submit Application'}</button>
                      }
                    </div>
                  </div>
                </form>
              </>
            )
          )}

          {/* ── TAB 2: STATUS CHECK ── */}
          {activeTab === 'status' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.4rem' }}>Check Application &amp; Verification Status</h2>
              <p style={{ color: C.muted, marginBottom: '1.25rem' }}>Enter the email address used when registering.</p>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <input className="p2-input" style={{ flex: 1 }} type="email" value={statusEmail} onChange={e => setStatusEmail(e.target.value)} placeholder="your@email.com" />
                <button className="p2-btn p2-btn-primary" onClick={checkStatus} disabled={statusLoading}>{statusLoading ? '⏳' : '🔍 Check'}</button>
              </div>
              {statusError && <div style={{ color: '#ef4444', fontSize: '0.9rem' }}>⚠️ {statusError}</div>}
              {statusResult && (
                <div className="p2-status-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      {statusResult.profilePhotoUrl && (
                        <img src={statusResult.profilePhotoUrl} alt={statusResult.fullName} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${C.amber}` }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{statusResult.fullName}</div>
                        <div style={{ color: C.muted, fontSize: '0.85rem' }}>{statusResult.guideType} · {statusResult.location} · {statusResult.yearsExperience || 0} yrs exp</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className={getStatusClass(statusResult.applicationStatus || 'pending')}>
                        Status: {STATUS_LABELS[statusResult.applicationStatus] || statusResult.applicationStatus}
                      </span>
                      <span className={getStatusClass(statusResult.verificationStatus || 'pending')}>
                        Verify: {STATUS_LABELS[statusResult.verificationStatus] || statusResult.verificationStatus}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', fontSize: '0.85rem', color: C.muted }}>
                    <div><strong style={{ color: C.text }}>Application ID</strong><br /><span style={{ fontFamily: 'monospace' }}>{statusResult._id}</span></div>
                    <div><strong style={{ color: C.text }}>Submitted</strong><br />{statusResult.submittedAt ? new Date(statusResult.submittedAt).toLocaleString('en-IN') : 'N/A'}</div>
                    <div><strong style={{ color: C.text }}>Heritage Sites</strong><br />{(statusResult.heritageSites || []).join(', ') || '—'}</div>
                    <div><strong style={{ color: C.text }}>Languages</strong><br />{(statusResult.languages || []).join(', ') || '—'}</div>
                    <div><strong style={{ color: C.text }}>Max Group &amp; Pricing</strong><br />Up to {statusResult.maxGroupSize || 10} · ₹{statusResult.tourRate || statusResult.hourlyRate || 0}</div>
                    <div><strong style={{ color: C.text }}>Available Days</strong><br />{(statusResult.availableDays || []).join(', ') || '—'}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: GUIDE MATCHING & APPLICATION REVIEW ── */}
          {activeTab === 'directory' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.4rem' }}>Guide Matching &amp; Application Review</h2>
              <p style={{ color: C.muted, marginBottom: '1.25rem' }}>Filter registered guides by heritage site, language, day, group size, and budget — or update verification status.</p>

              {/* Matching Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.65rem', marginBottom: '1rem', padding: '1rem', borderRadius: '14px', background: C.surface, border: `1px solid ${C.border}` }}>
                <select className="p2-select" value={matchSite} onChange={e => setMatchSite(e.target.value)}>
                  <option value="">Any Heritage Site</option>
                  {HERITAGE_SITES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="p2-select" value={matchLang} onChange={e => setMatchLang(e.target.value)}>
                  <option value="">Any Language</option>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <select className="p2-select" value={matchDay} onChange={e => setMatchDay(e.target.value)}>
                  <option value="">Any Day</option>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input className="p2-input" type="number" min="1" placeholder="Group Size" value={matchGroup} onChange={e => setMatchGroup(e.target.value)} />
                <input className="p2-input" type="number" min="0" placeholder="Max Tour ₹" value={matchMaxRate} onChange={e => setMatchMaxRate(e.target.value)} />
                <button className="p2-btn p2-btn-primary" onClick={loadDirectory}>🔍 Match</button>
              </div>

              {/* Status Filter Pills */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                {['all', 'pending', 'under_review', 'approved', 'rejected'].map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: '20px',
                      border: `1px solid ${statusFilter === st ? C.amber : C.border}`,
                      background: statusFilter === st ? C.amber : 'transparent',
                      color: statusFilter === st ? '#000' : C.muted,
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    {st === 'all' ? 'All Applications' : STATUS_LABELS[st]}
                  </button>
                ))}
              </div>

              {dirLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>Searching registered guides...</div>
              ) : displayedApps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: C.surface, borderRadius: '14px', border: `1px solid ${C.border}`, color: C.muted }}>
                  No guide applications match these filters yet. Submit one in the Apply tab!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {displayedApps.map(app => (
                    <div key={app._id} className="p2-status-card" style={{ marginTop: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.8rem' }}>
                        <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center' }}>
                          <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', border: `1.5px solid ${C.amber}` }}>
                            {app.profilePhotoUrl ? <img src={app.profilePhotoUrl} alt={app.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🧭'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{app.fullName}</div>
                            <div style={{ fontSize: '0.82rem', color: C.muted }}>
                              {app.guideType} · 📍 {app.location} · {app.yearsExperience || 0} yrs · Max group {app.maxGroupSize || 10}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className={getStatusClass(app.applicationStatus || 'pending')}>
                            {STATUS_LABELS[app.applicationStatus] || app.applicationStatus}
                          </span>
                          <select
                            className="p2-select"
                            style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                            value={app.applicationStatus || 'pending'}
                            onChange={e => handleUpdateApplicationStatus(app._id, e.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="under_review">Under Review</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.83rem', color: C.muted, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                        <div><strong style={{ color: C.text }}>Sites:</strong> {(app.heritageSites || []).join(', ') || '—'}</div>
                        <div><strong style={{ color: C.text }}>Languages:</strong> {(app.languages || []).join(', ') || '—'}</div>
                        <div><strong style={{ color: C.text }}>Specializations:</strong> {(app.specializations || []).join(', ') || '—'}</div>
                        <div><strong style={{ color: C.text }}>Pricing:</strong> ₹{app.hourlyRate || 0}/hr · ₹{app.tourRate || 0}/tour</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 4: INTEGRATIONS ── */}
          {activeTab === 'integrations' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Active API Integrations</h2>
              <p style={{ color: C.muted, marginBottom: '1.5rem' }}>Real-time integration status with government bodies and service providers.</p>
              {[
                { title: 'ASI Data Sync', badge: 'Connected', badgeColor: '#22c55e', desc: 'Real-time synchronization with the Archaeological Survey of India database for monument status, ticketing restrictions, and restoration alerts.', stat1: '3,691 Monuments', stat2: '2ms Latency' },
                { title: 'State Tourism Boards', badge: 'OAuth Active', badgeColor: '#3b82f6', desc: 'API connections with Karnataka, Maharashtra, Rajasthan, Tamil Nadu State Tourism boards for verified guide listings.', stat1: '12 Active States', stat2: '14K+ Guides' },
                { title: 'Travel Aggregators', badge: 'Connected', badgeColor: '#22c55e', desc: 'Two-way integration with IRCTC, MakeMyTrip, and hotel booking platforms for end-to-end trip planning.', stat1: '2.4M Queries/Day', stat2: '₹45K Revenue' },
              ].map(card => (
                <div key={card.title} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{card.title}</div>
                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: `${card.badgeColor}22`, color: card.badgeColor, border: `1px solid ${card.badgeColor}44` }}>{card.badge}</span>
                  </div>
                  <p style={{ color: C.muted, fontSize: '0.9rem', marginBottom: '0.75rem' }}>{card.desc}</p>
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: C.muted }}>
                    <span>📊 {card.stat1}</span><span>⚡ {card.stat2}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
