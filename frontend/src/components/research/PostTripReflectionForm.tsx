/**
 * frontend/src/components/research/PostTripReflectionForm.tsx
 *
 * A structured reflection form collected after a trip is completed.
 * This is a SECONDARY high-quality signal for the PTKG — it captures
 * holistic trip-level preferences that cannot be inferred from individual site visits.
 *
 * Dimensions captured:
 *   - Overall satisfaction (1-5)
 *   - Per-dimension ratings (8 dimensions)
 *   - Best moment (free text)
 *   - What they would change (free text)
 *   - Discovered preferences (free-form chips)
 *   - Open notes
 *
 * On submit → POST /api/research/reflection → research-service → TravelExperience doc
 * → ObservationExtractor → Preference Inference → PTKG update
 */

import { useState } from 'react';
import { submitTripReflection } from '@/lib/researchApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  userId: string;
  tripId: string;
  tripDestination: string;
  tripDays: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface DimensionRating {
  key: string;
  label: string;
  emoji: string;
  description: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIMENSIONS: DimensionRating[] = [
  { key: 'heritage_value',    label: 'Heritage Value',     emoji: '🏛️', description: 'Depth of historical/cultural experience' },
  { key: 'food_quality',      label: 'Food & Cuisine',     emoji: '🍛', description: 'Local food quality and variety' },
  { key: 'accommodation',     label: 'Accommodation',      emoji: '🏨', description: 'Comfort and location of stays' },
  { key: 'transport',         label: 'Transport',          emoji: '🚌', description: 'Ease of getting around' },
  { key: 'crowd_comfort',     label: 'Crowd Comfort',      emoji: '👥', description: 'Whether crowds detracted from experience' },
  { key: 'value_for_money',   label: 'Value for Money',    emoji: '💰', description: 'Overall cost vs experience quality' },
  { key: 'guide_quality',     label: 'Guide / Info',       emoji: '🎓', description: 'Quality of guides or information boards' },
  { key: 'accessibility',     label: 'Accessibility',      emoji: '♿', description: 'Ease of access for all group members' },
];

const PREFERENCE_CHIPS = [
  'Prefer morning visits', 'Prefer smaller crowds', 'Love architectural detail',
  'Enjoy guided storytelling', 'Prefer offbeat over popular', 'Love local food markets',
  'Prefer budget stays', 'Enjoy slow travel', 'Prefer quick overviews',
  'Love photography spots', 'Enjoy night experiences', 'Prefer eco stays',
  'Love interaction with locals', 'Avoid steep climbs', 'Prefer AC transport',
];

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Amazing'];

// ─── Star Rater sub-component ─────────────────────────────────────────────────

function StarRater({
  value, onChange, size = 24,
}: { value: number; onChange: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
          <span style={{ fontSize: size, color: s <= (hover || value) ? '#F59E0B' : '#D1D5DB' }}>★</span>
        </button>
      ))}
      {(hover || value) > 0 && (
        <span style={{ color: '#F59E0B', fontWeight: 600, fontSize: 13, alignSelf: 'center', marginLeft: 4 }}>
          {STAR_LABELS[hover || value]}
        </span>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PostTripReflectionForm({
  userId, tripId, tripDestination, tripDays, onSuccess, onCancel,
}: Props) {
  const [overallRating, setOverallRating]       = useState(0);
  const [dimRatings, setDimRatings]             = useState<Record<string, number>>({});
  const [bestMoment, setBestMoment]             = useState('');
  const [wouldChange, setWouldChange]           = useState('');
  const [discoveredPrefs, setDiscoveredPrefs]   = useState<string[]>([]);
  const [notes, setNotes]                       = useState('');
  const [submitting, setSubmitting]             = useState(false);
  const [submitted, setSubmitted]               = useState(false);
  const [error, setError]                       = useState<string | null>(null);

  const setDim = (key: string, val: number) =>
    setDimRatings(r => ({ ...r, [key]: val }));

  const togglePref = (p: string) =>
    setDiscoveredPrefs(ps => ps.includes(p) ? ps.filter(x => x !== p) : [...ps, p]);

  const handleSubmit = async () => {
    if (overallRating === 0) { setError('Please rate your overall trip (1–5 stars)'); return; }
    setSubmitting(true); setError(null);
    try {
      await submitTripReflection({
        userId,
        tripId,
        payload: {
          overallSatisfaction: overallRating,
          dimensionRatings: dimRatings as any,
          bestMoment: bestMoment.trim() || undefined,
          wouldChange: wouldChange.trim() ? [wouldChange.trim()] : undefined,
          preferencesDiscovered: discoveredPrefs.length > 0 ? discoveredPrefs : undefined,
          notes: notes.trim() || undefined,
        },
      });
      setSubmitted(true);
      setTimeout(() => onSuccess?.(), 2000);
    } catch {
      setError('Failed to submit reflection. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={styles.successBox}>
        <div style={{ fontSize: 56 }}>🙏</div>
        <h3 style={{ color: '#16A34A', margin: '8px 0 4px' }}>Reflection Saved!</h3>
        <p style={{ color: '#555', margin: 0, fontSize: 14 }}>
          Your Personal Knowledge Graph is being updated. Future trips to similar destinations will be more personalized.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerBadge}>📖 Post-Trip Reflection</div>
        <h2 style={styles.headerTitle}>{tripDestination}</h2>
        <p style={styles.headerSub}>{tripDays}-day journey · Help us personalize your next trip</p>
      </div>

      <div style={styles.body}>

        {/* Overall Rating */}
        <div style={styles.section}>
          <label style={styles.label}>How was your overall trip?</label>
          <StarRater value={overallRating} onChange={setOverallRating} size={36} />
        </div>

        {/* Dimension Ratings */}
        <div style={styles.section}>
          <label style={styles.label}>Rate specific aspects</label>
          <div style={styles.dimGrid}>
            {DIMENSIONS.map(d => (
              <div key={d.key} style={styles.dimCard}>
                <div style={styles.dimLabel}>
                  <span>{d.emoji}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{d.label}</span>
                </div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>{d.description}</div>
                <StarRater value={dimRatings[d.key] || 0} onChange={v => setDim(d.key, v)} size={20} />
              </div>
            ))}
          </div>
        </div>

        {/* Best Moment */}
        <div style={styles.section}>
          <label style={styles.label}>What was your best moment? <span style={{ color: '#888', fontWeight: 400 }}>(optional)</span></label>
          <textarea value={bestMoment} onChange={e => setBestMoment(e.target.value)}
            placeholder={`e.g. "Sunrise at the Virupaksha Temple in Hampi — absolutely breathtaking"`}
            rows={2} maxLength={500} style={styles.textarea} />
        </div>

        {/* Would Change */}
        <div style={styles.section}>
          <label style={styles.label}>What would you do differently? <span style={{ color: '#888', fontWeight: 400 }}>(optional)</span></label>
          <textarea value={wouldChange} onChange={e => setWouldChange(e.target.value)}
            placeholder={`e.g. "Avoid weekends — too crowded. Would book a heritage homestay instead of hotel."`}
            rows={2} maxLength={500} style={styles.textarea} />
        </div>

        {/* Discovered Preferences */}
        <div style={styles.section}>
          <label style={styles.label}>What did you discover about your travel style?</label>
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 10px' }}>
            These help us understand your personal travel DNA.
          </p>
          <div style={styles.chipRow}>
            {PREFERENCE_CHIPS.map(p => (
              <button key={p} onClick={() => togglePref(p)}
                style={discoveredPrefs.includes(p) ? styles.chipActive : styles.chip}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div style={styles.section}>
          <label style={styles.label}>Any other thoughts? <span style={{ color: '#888', fontWeight: 400 }}>(optional)</span></label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Anything else about this trip that future-you should remember…"
            rows={3} maxLength={2000} style={styles.textarea} />
          <div style={{ textAlign: 'right', fontSize: 11, color: '#888' }}>{notes.length}/2000</div>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          {onCancel && (
            <button onClick={onCancel} style={styles.cancelBtn}>Skip for now</button>
          )}
          <button onClick={handleSubmit} disabled={submitting || overallRating === 0}
            style={{ ...styles.submitBtn, opacity: submitting || overallRating === 0 ? 0.6 : 1 }}>
            {submitting ? '⏳ Saving reflection…' : '💾 Save & Update My Knowledge Graph'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 8 }}>
          🔒 Your reflection is private and only used to personalize your future trips.
        </p>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: { background: '#FDFBF7', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
  header: {
    background: 'linear-gradient(135deg, #1E3A5F, #2563EB)',
    padding: '1.5rem 2rem',
  },
  headerBadge: {
    background: 'rgba(255,255,255,0.15)', color: '#fff',
    padding: '2px 10px', borderRadius: 20, fontSize: 12, marginBottom: 8, display: 'inline-block',
  },
  headerTitle: { color: '#fff', margin: '0 0 4px', fontSize: 24, fontWeight: 700 },
  headerSub:   { color: 'rgba(255,255,255,0.75)', margin: 0, fontSize: 14 },
  body: { padding: '1.5rem 2rem' },
  section: { marginBottom: '1.5rem' },
  label: { display: 'block', fontWeight: 700, fontSize: 15, color: '#2E251E', marginBottom: 10 },
  dimGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 },
  dimCard: {
    border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px',
    background: '#fff',
  },
  dimLabel: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: {
    padding: '6px 14px', border: '1.5px solid #D1D5DB', borderRadius: 20,
    background: '#fff', cursor: 'pointer', fontSize: 13, color: '#555',
  },
  chipActive: {
    padding: '6px 14px', border: '1.5px solid #2563EB', borderRadius: 20,
    background: '#EFF6FF', cursor: 'pointer', fontSize: 13, color: '#1D4ED8', fontWeight: 600,
  },
  textarea: {
    width: '100%', border: '1.5px solid #D1D5DB', borderRadius: 8,
    padding: '10px 12px', fontSize: 13, fontFamily: 'inherit',
    resize: 'vertical', outline: 'none', boxSizing: 'border-box',
  },
  errorBox: {
    background: '#FEE2E2', border: '1px solid #F87171', borderRadius: 8,
    padding: '10px 14px', color: '#B91C1C', fontSize: 13, marginBottom: 12,
  },
  successBox: {
    padding: '3rem 2rem', textAlign: 'center', background: '#FDFBF7',
    borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  },
  submitBtn: {
    flex: 1, padding: '14px', background: 'linear-gradient(135deg, #1E3A5F, #2563EB)',
    color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15,
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '14px 20px', background: 'none', border: '1.5px solid #D1D5DB',
    borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#6B7280',
  },
};

