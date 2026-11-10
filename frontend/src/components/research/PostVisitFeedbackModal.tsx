/**
 * frontend/src/components/research/PostVisitFeedbackModal.tsx
 *
 * A modal that collects post-visit feedback after a user visits a heritage site.
 * This is the PRIMARY explicit signal that feeds into the PTKG.
 *
 * Usage (from TripPlannerPage, ExploreSitesPage, or anywhere):
 *   <PostVisitFeedbackModal
 *     isOpen={showFeedback}
 *     onClose={() => setShowFeedback(false)}
 *     siteName="Hampi"
 *     siteId="hampi"
 *     tripId={currentTripId}
 *     userId={authUser?.id}
 *   />
 *
 * On submit → POST /api/research/feedback → research-service → TravelExperience doc
 */

import { useState } from 'react';
import { submitSiteFeedback } from '@/lib/researchApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  siteName: string;
  siteId: string;
  userId: string;
  tripId?: string;
  onSuccess?: (experienceId: string) => void;
}

const FEEDBACK_TAGS = [
  { id: 'stunning',          emoji: '😍', label: 'Stunning' },
  { id: 'well-maintained',   emoji: '✨', label: 'Well Maintained' },
  { id: 'crowded',           emoji: '😤', label: 'Too Crowded' },
  { id: 'peaceful',          emoji: '🕊️', label: 'Peaceful' },
  { id: 'overpriced',        emoji: '💸', label: 'Overpriced' },
  { id: 'value-for-money',   emoji: '👍', label: 'Value for Money' },
  { id: 'great-guide',       emoji: '🎓', label: 'Great Guide' },
  { id: 'poor-facilities',   emoji: '🚽', label: 'Poor Facilities' },
  { id: 'photogenic',        emoji: '📸', label: 'Photogenic' },
  { id: 'hidden-gem',        emoji: '💎', label: 'Hidden Gem' },
  { id: 'kid-friendly',      emoji: '👶', label: 'Kid Friendly' },
  { id: 'accessibility-ok',  emoji: '♿', label: 'Accessible' },
];

const ACTIVITIES = [
  'Photography', 'Guided Tour', 'Self Guided', 'Trekking / Walking',
  'Meditation / Prayer', 'Sketching / Painting', 'Shopping (Crafts)',
  'Museum Visit', 'Sunrise / Sunset Watch', 'Food Tasting',
];

const TIME_OF_DAY = [
  { id: 'morning',   label: 'Morning', emoji: '🌅' },
  { id: 'afternoon', label: 'Afternoon', emoji: '☀️' },
  { id: 'evening',   label: 'Evening', emoji: '🌆' },
  { id: 'night',     label: 'Night', emoji: '🌙' },
];

const CROWD_LEVELS = [
  { id: 'low',  label: 'Quiet',   emoji: '😌' },
  { id: 'mid',  label: 'Moderate', emoji: '🙂' },
  { id: 'high', label: 'Crowded', emoji: '😤' },
];

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Amazing'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PostVisitFeedbackModal({
  isOpen, onClose, siteName, siteId, userId, tripId, onSuccess,
}: Props) {
  const [rating, setRating]           = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [tags, setTags]               = useState<string[]>([]);
  const [activities, setActivities]   = useState<string[]>([]);
  const [timeOfDay, setTimeOfDay]     = useState<string>('');
  const [crowdLevel, setCrowdLevel]   = useState<string>('');
  const [duration, setDuration]       = useState<number>(120);
  const [notes, setNotes]             = useState('');
  const [wouldRevisit, setWouldRevisit]       = useState<boolean | null>(null);
  const [wouldRecommend, setWouldRecommend]   = useState<boolean | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [error, setError]             = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleTag = (id: string) =>
    setTags(t => t.includes(id) ? t.filter(x => x !== id) : [...t, id]);
  const toggleActivity = (a: string) =>
    setActivities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const handleSubmit = async () => {
    if (rating === 0) { setError('Please rate your visit (1–5 stars)'); return; }
    setSubmitting(true); setError(null);
    try {
      const result = await submitSiteFeedback({
        userId,
        tripId,
        payload: {
          siteId,
          siteName,
          satisfactionRating: rating,
          activities,
          feedbackTags: tags,
          notes: notes.trim() || undefined,
          duration,
          timeOfDay: timeOfDay as any || undefined,
          crowdLevel: crowdLevel as any || undefined,
          wouldRevisit: wouldRevisit ?? undefined,
          wouldRecommend: wouldRecommend ?? undefined,
        },
      });
      setSubmitted(true);
      onSuccess?.(result.experienceId);
      setTimeout(() => { onClose(); setSubmitted(false); }, 2000);
    } catch {
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.headerBadge}>✨ Post-Visit Feedback</div>
            <h2 style={styles.headerTitle}>{siteName}</h2>
            <p style={styles.headerSub}>Your feedback shapes your personal heritage journey</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {submitted ? (
          <div style={styles.successBox}>
            <div style={{ fontSize: 48 }}>🙏</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#16A34A' }}>Feedback Saved!</div>
            <div style={{ color: '#555', marginTop: 4 }}>Your travel knowledge graph is being updated.</div>
          </div>
        ) : (
          <div style={styles.body}>

            {/* Star Rating */}
            <div style={styles.section}>
              <label style={styles.label}>Overall Experience</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <span style={{ fontSize: 32, color: s <= (hoverRating || rating) ? '#F59E0B' : '#D1D5DB' }}>
                      ★
                    </span>
                  </button>
                ))}
                {(hoverRating || rating) > 0 && (
                  <span style={{ color: '#F59E0B', fontWeight: 600, marginLeft: 4 }}>
                    {STAR_LABELS[hoverRating || rating]}
                  </span>
                )}
              </div>
            </div>

            {/* Time of Day */}
            <div style={styles.section}>
              <label style={styles.label}>When did you visit?</label>
              <div style={styles.chipRow}>
                {TIME_OF_DAY.map(t => (
                  <button key={t.id} onClick={() => setTimeOfDay(timeOfDay === t.id ? '' : t.id)}
                    style={timeOfDay === t.id ? styles.chipActive : styles.chip}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Crowd Level */}
            <div style={styles.section}>
              <label style={styles.label}>How crowded was it?</label>
              <div style={styles.chipRow}>
                {CROWD_LEVELS.map(c => (
                  <button key={c.id} onClick={() => setCrowdLevel(crowdLevel === c.id ? '' : c.id)}
                    style={crowdLevel === c.id ? styles.chipActive : styles.chip}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div style={styles.section}>
              <label style={styles.label}>Time spent: <strong>{duration >= 60 ? `${Math.floor(duration/60)}h ${duration%60 > 0 ? `${duration%60}m` : ''}` : `${duration}m`}</strong></label>
              <input type="range" min={15} max={480} step={15} value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#A15B17' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888' }}>
                <span>15 min</span><span>4 hrs</span><span>8 hrs</span>
              </div>
            </div>

            {/* Activities */}
            <div style={styles.section}>
              <label style={styles.label}>What did you do? <span style={{ color: '#888', fontWeight: 400 }}>(select all)</span></label>
              <div style={styles.chipRow}>
                {ACTIVITIES.map(a => (
                  <button key={a} onClick={() => toggleActivity(a)}
                    style={activities.includes(a) ? styles.chipActive : styles.chip}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div style={styles.section}>
              <label style={styles.label}>How would you describe it?</label>
              <div style={styles.chipRow}>
                {FEEDBACK_TAGS.map(t => (
                  <button key={t.id} onClick={() => toggleTag(t.id)}
                    style={tags.includes(t.id) ? styles.chipActive : styles.chip}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Would Revisit / Recommend */}
            <div style={{ display: 'flex', gap: 24, ...styles.section }}>
              <div>
                <label style={styles.label}>Would you revisit?</label>
                <div style={styles.chipRow}>
                  <button onClick={() => setWouldRevisit(true)}
                    style={wouldRevisit === true ? styles.chipActive : styles.chip}>✅ Yes</button>
                  <button onClick={() => setWouldRevisit(false)}
                    style={wouldRevisit === false ? { ...styles.chipActive, background: '#FEE2E2', borderColor: '#F87171', color: '#B91C1C' } : styles.chip}>❌ No</button>
                </div>
              </div>
              <div>
                <label style={styles.label}>Recommend to others?</label>
                <div style={styles.chipRow}>
                  <button onClick={() => setWouldRecommend(true)}
                    style={wouldRecommend === true ? styles.chipActive : styles.chip}>✅ Yes</button>
                  <button onClick={() => setWouldRecommend(false)}
                    style={wouldRecommend === false ? { ...styles.chipActive, background: '#FEE2E2', borderColor: '#F87171', color: '#B91C1C' } : styles.chip}>❌ No</button>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div style={styles.section}>
              <label style={styles.label}>Personal Notes <span style={{ color: '#888', fontWeight: 400 }}>(optional)</span></label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={`What stood out at ${siteName}? Any tips for future visitors?`}
                rows={3}
                maxLength={1000}
                style={styles.textarea}
              />
              <div style={{ textAlign: 'right', fontSize: 11, color: '#888' }}>{notes.length}/1000</div>
            </div>

            {/* Error */}
            {error && <div style={styles.errorBox}>{error}</div>}

            {/* Submit */}
            <button onClick={handleSubmit} disabled={submitting || rating === 0} style={styles.submitBtn}>
              {submitting ? '⏳ Saving…' : '💾 Save Feedback & Update My Knowledge Graph'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 8 }}>
              🔒 Your feedback is private and only used to personalize your future trips.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: '1rem',
  },
  modal: {
    background: '#FDFBF7', borderRadius: 16, width: '100%', maxWidth: 600,
    maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  header: {
    background: 'linear-gradient(135deg, #A15B17, #D97706)',
    padding: '1.5rem', borderRadius: '16px 16px 0 0',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  headerBadge: {
    background: 'rgba(255,255,255,0.2)', color: '#fff',
    padding: '2px 10px', borderRadius: 20, fontSize: 12, marginBottom: 6, display: 'inline-block',
  },
  headerTitle: { color: '#fff', margin: 0, fontSize: 22, fontWeight: 700 },
  headerSub: { color: 'rgba(255,255,255,0.8)', margin: '4px 0 0', fontSize: 13 },
  closeBtn: {
    background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
    width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  body: { padding: '1.5rem' },
  section: { marginBottom: '1.25rem' },
  label: { display: 'block', fontWeight: 600, fontSize: 14, color: '#2E251E', marginBottom: 8 },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: {
    padding: '5px 12px', border: '1.5px solid #D1D5DB', borderRadius: 20,
    background: '#fff', cursor: 'pointer', fontSize: 13, color: '#555',
    transition: 'all 0.15s',
  },
  chipActive: {
    padding: '5px 12px', border: '1.5px solid #A15B17', borderRadius: 20,
    background: '#FEF3C7', cursor: 'pointer', fontSize: 13, color: '#A15B17',
    fontWeight: 600, transition: 'all 0.15s',
  },
  textarea: {
    width: '100%', border: '1.5px solid #D1D5DB', borderRadius: 8, padding: '10px 12px',
    fontSize: 13, fontFamily: 'inherit', resize: 'vertical', minHeight: 80,
    outline: 'none', boxSizing: 'border-box',
  },
  errorBox: {
    background: '#FEE2E2', border: '1px solid #F87171', borderRadius: 8,
    padding: '10px 14px', color: '#B91C1C', fontSize: 13, marginBottom: 12,
  },
  successBox: {
    padding: '3rem 2rem', textAlign: 'center', display: 'flex',
    flexDirection: 'column', alignItems: 'center', gap: 8,
  },
  submitBtn: {
    width: '100%', padding: '14px', background: 'linear-gradient(135deg, #A15B17, #D97706)',
    color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15,
    cursor: 'pointer', transition: 'opacity 0.2s',
  },
};

