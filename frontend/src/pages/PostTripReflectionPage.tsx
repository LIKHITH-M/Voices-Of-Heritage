/**
 * frontend/src/pages/PostTripReflectionPage.tsx
 *
 * Full-page wrapper for the post-trip reflection flow.
 * Accessed via /reflection/:tripId
 *
 * This page is linked from:
 *   1. ProfilePage — "Reflect on this trip" button next to each completed trip
 *   2. TripPlannerPage — after marking a trip as completed
 *   3. Email notifications (future) — "How was your trip?" CTA
 *
 * Data flow:
 *   User fills PostTripReflectionForm
 *   → submitTripReflection() → POST /api/research/reflection
 *   → research-service stores TravelExperience (eventType='trip_reflection')
 *   → triggerProcessing() → Phase 6: ObservationExtractor
 *   → Phase 7: Preference Inference → PTKG update
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getTrip } from '@/lib/researchApi';
import PostTripReflectionForm from '@/components/research/PostTripReflectionForm';

export default function PostTripReflectionPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = authUser?.id || authUser?.email || '';

  // Load the trip details so we can pass destination/days to the form
  useEffect(() => {
    if (!userId || !tripId) return;
    getTrip(userId, tripId)
      .then(res => { setTrip(res.data); setLoading(false); })
      .catch(() => {
        // If backend unreachable, allow reflection with minimal info
        setTrip({ destination: 'Your Trip', totalDays: 1, tripId });
        setLoading(false);
      });
  }, [userId, tripId]);

  if (loading) {
    return (
      <div style={styles.loadingBox}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <p>Loading trip details…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorBox}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
        <p>{error}</p>
        <button onClick={() => navigate('/profile')} style={styles.backBtn}>← Back to Profile</button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.inner}>

        {/* Back link */}
        <button onClick={() => navigate('/profile')} style={styles.backLink}>
          ← Back to Profile
        </button>

        {/* Research context banner */}
        <div style={styles.researchBanner}>
          <span style={{ fontSize: 20 }}>🧠</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1D4ED8' }}>
              Personal Knowledge Graph Update
            </div>
            <div style={{ fontSize: 12, color: '#3B82F6', marginTop: 2 }}>
              Your reflection helps your PTKG learn your true travel preferences for better future recommendations.
            </div>
          </div>
        </div>

        {/* Form */}
        {trip && userId && (
          <PostTripReflectionForm
            userId={userId}
            tripId={tripId!}
            tripDestination={trip.destination}
            tripDays={trip.totalDays || 1}
            onSuccess={() => {
              setTimeout(() => navigate('/profile'), 500);
            }}
            onCancel={() => navigate('/profile')}
          />
        )}

        {!userId && (
          <div style={styles.authWarning}>
            <p>Please <a href="/auth/login" style={{ color: '#2563EB' }}>log in</a> to save your reflection.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', background: '#F3F4F6',
    display: 'flex', justifyContent: 'center', padding: '2rem 1rem',
  },
  inner: { width: '100%', maxWidth: 760 },
  loadingBox: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', color: '#555',
  },
  errorBox: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', color: '#B91C1C',
  },
  backLink: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 14, color: '#6B7280', marginBottom: '1rem',
    padding: 0, fontWeight: 600,
  },
  backBtn: {
    marginTop: 16, padding: '10px 20px', background: '#2563EB',
    color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
  },
  researchBanner: {
    background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10,
    padding: '12px 16px', display: 'flex', alignItems: 'flex-start',
    gap: 12, marginBottom: '1.5rem',
  },
  authWarning: {
    background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 10,
    padding: '1rem', textAlign: 'center', marginTop: '1rem',
  },
};

