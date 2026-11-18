import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import VoHLogo from '@/components/VoHLogo';
// @ts-ignore
import { tripAPI } from '@/services/api';

/* ─── Option Constants (Sections 2, 3, 4, 7, 8, 11) ─────────────────────── */
const VISIT_STATUS_OPTIONS = [
  { value: 'visited', label: '✓ Visited' },
  { value: 'partially_visited', label: '◐ Partially Visited' },
  { value: 'not_visited', label: '✕ Not Visited' },
  { value: 'cancelled', label: '🚫 Cancelled' },
  { value: 'could_not_visit', label: '⚠️ Could Not Visit' },
  { value: 'different_from_planned', label: '🔄 Visited (Different Activity)' },
];

const ENJOY_DISLIKE_TAGS = [
  'History', 'Architecture', 'Art', 'Religious significance', 'Local culture',
  'Nature', 'Photography', 'Stories/legends', 'Museums', 'Food',
  'Local people', 'Festivals/events', '3D/AR/VR experiences',
  'Peaceful environment', 'Adventure', 'Shopping',
];

const DISLIKE_EXTRA_TAGS = [
  'Crowding', 'Long walking distances', 'High cost', 'Heat / Weather', 'Long waiting queue',
];

const NEXT_TIME_PREFS = [
  'Less crowded places', 'More historical sites', 'More nature', 'More local food',
  'More spiritual experiences', 'Shorter walking distances', 'Longer exploration time',
  'More guided tours', 'More photography opportunities', 'More interactive experiences',
  'Lower-cost activities', 'Premium experiences', 'Early morning visits', 'Avoid afternoon crowds',
];

const WELLNESS_TYPES = ['Yoga', 'Meditation', 'Ayurveda', 'Temple', 'Spiritual Site', 'Retreat'];
const PREFERRED_TIMES = ['Early morning', 'Morning', 'Afternoon', 'Evening / Sunset', 'Flexible'];
const FOOD_CATEGORIES = ['Royal Heritage', 'Temple Cuisine', 'Street Food', 'Traditional Sweet', 'Regional Thali', 'Coastal / Backwater', 'Tribal / Local'];
const INDIAN_REGIONS = ['Karnataka', 'Kerala', 'Rajasthan', 'Tamil Nadu', 'Uttar Pradesh', 'Maharashtra', 'Gujarat', 'Bengal', 'Odisha', 'Uttarakhand', 'Delhi'];

const DARK_THEME = {
  bg: '#050505', surface: '#0B0B0E', card: '#121218',
  border: 'rgba(255,255,255,0.08)', amber: '#f59e0b', gold: '#d99c53',
  text: '#ededed', muted: '#94a3b8', green: '#22c55e', red: '#ef4444', blue: '#3b82f6', purple: '#a855f7',
};
const LIGHT_THEME = {
  bg: '#FDFBF7', surface: '#FFFFFF', card: '#F7F3E9',
  border: 'rgba(180,130,80,0.22)', amber: '#b45309', gold: '#d97706',
  text: '#2E251E', muted: '#786A5E', green: '#15803d', red: '#dc2626', blue: '#2563eb', purple: '#7e22ce',
};

/* ─── Compact 1–5 Rating Pill Control ───────────────────────────────────── */
function RatingRow({ label, value, onChange, hint }: { label: string; value: number; onChange: (n: number) => void; hint?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.45rem 0' }}>
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ fontSize: '0.7rem', opacity: 0.65 }}>{hint}</div>}
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)}
            style={{
              width: 30, height: 30, borderRadius: '8px', border: '1px solid rgba(217,156,83,0.35)',
              background: n <= value ? '#d97706' : 'transparent',
              color: n <= value ? '#fff' : 'inherit',
              fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Multi-Select Tag Pills ────────────────────────────────────────────── */
function TagPicker({ options, selected, onToggle, accent = '#d97706' }: { options: string[]; selected: string[]; onToggle: (v: string) => void; accent?: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            style={{
              padding: '0.32rem 0.75rem', borderRadius: '20px', fontSize: '0.76rem',
              fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s',
              border: `1px solid ${active ? accent : 'rgba(148,163,184,0.3)'}`,
              background: active ? accent : 'transparent',
              color: active ? '#fff' : 'inherit',
            }}
          >
            {active ? '✓ ' : ''}{opt}
          </button>
        );
      })}
    </div>
  );
}

type MainTab = 'trips' | 'log' | 'insights' | 'history';
type DomainType = 'food' | 'wellness' | 'booking' | 'stay' | 'other';

export default function ExperiencesPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const C = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

  const userId = user?.id || localStorage.getItem('voh_user_id') || 'demo-researcher-001';
  const userEmail = user?.email || '';

  const [activeTab, setActiveTab] = useState<MainTab>('trips');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Dashboard summary + DEPKG state
  const [summary, setSummary] = useState<any>(null);
  const [depkg, setDepkg] = useState<any>(null);
  const [allExperiences, setAllExperiences] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);

  // Selected Completed Trip Workspace
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [tripDetailData, setTripDetailData] = useState<any>(null);
  const [tripDetailLoading, setTripDetailLoading] = useState(false);

  // Feedback Modal State (Place / Activity / Edit)
  const [feedbackModal, setFeedbackModal] = useState<any>(null);
  const [fbForm, setFbForm] = useState<any>(null);
  const [extractPreview, setExtractPreview] = useState<any>(null);
  const [extracting, setExtracting] = useState(false);
  const [savingFb, setSavingFb] = useState(false);
  const [weatherFetching, setWeatherFetching] = useState(false);

  // Domain Quick Logger State (Food, Wellness, Stay, Ticket, Other VoH Modules)
  const [domainType, setDomainType] = useState<DomainType>('food');
  const [domainForm, setDomainForm] = useState<any>({
    // Food
    dish: '', cuisine: '', region: 'Karnataka', locationName: '', foodCategory: 'Traditional Sweet',
    favouriteDishes: '', dislikedDishes: '', dietaryPreferences: '', wouldTryAgain: 'yes',
    // Wellness
    wellnessPlace: '', wellnessSubType: 'Meditation', wellnessDuration: '2 hours', preferredTime: 'Early morning',
    // Other VoH (Heritage Site / Archive / 3D-AR-VR / Guide / Stay / Route)
    otherModule: 'archive', otherTitle: '', otherDestination: '', otherNotes: '',
    transportMode: '', walkingTolerance: 'moderate', ecoFriendly: false, guideName: '', guideLanguage: 'English',
    // Shared ratings & feedback
    overall: 5, authenticity: 5, taste: 5, hygiene: 4, valueForMoney: 4, portionSize: 4,
    peacefulness: 5, environment: 5, crowdLevel: 2, cleanliness: 4, accessibility: 4, satisfaction: 5,
    wouldVisitAgain: 'yes', wouldRecommend: true,
    enjoyedTags: [] as string[], dislikedTags: [] as string[], nextTimePreferences: [] as string[],
    freeTextFeedback: '',
  });
  const [domainExtract, setDomainExtract] = useState<any>(null);
  const [domainSaving, setDomainSaving] = useState(false);

  // Inspect Extracted Knowledge Modal
  const [inspectExp, setInspectExp] = useState<any>(null);

  const authHeaders = { headers: { 'x-user-id': userId } };

  const flashToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  /* ── Load All User Experience Data + Trips + DEPKG Graph ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, prefRes, expRes, tripRes] = await Promise.allSettled([
        axios.get(`/api/experiences/summary?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(userEmail)}`, authHeaders),
        axios.get(`/api/experiences/preferences?userId=${encodeURIComponent(userId)}`, authHeaders),
        axios.get(`/api/experiences?userId=${encodeURIComponent(userId)}`, authHeaders),
        tripAPI.getTrips(),
      ]);

      const sumData = sumRes.status === 'fulfilled' ? sumRes.value.data : null;
      if (sumData?.success) setSummary(sumData);

      if (prefRes.status === 'fulfilled' && prefRes.value.data?.success) {
        setDepkg(prefRes.value.data);
      }

      if (expRes.status === 'fulfilled' && expRes.value.data?.success) {
        setAllExperiences(expRes.value.data.experiences || []);
      }

      // Merge trips from summary + tripAPI (which includes local offline trips)
      const apiTrips = sumData?.trips || [];
      const localMerged = tripRes.status === 'fulfilled' ? (tripRes.value.data?.trips || []) : [];
      const mergedTrips = [...apiTrips];
      for (const lt of localMerged) {
        const lid = String(lt._id || lt.id);
        if (!mergedTrips.some((t: any) => String(t._id) === lid)) {
          const days = lt.itinerary?.days || lt.itinerary?.itinerary || [];
          const acts = days.flatMap((d: any) => d.activities || []);
          mergedTrips.push({
            _id: lid,
            title: lt.title || `Trip to ${typeof lt.destination === 'string' ? lt.destination : lt.destination?.city || 'Heritage'}`,
            destination: typeof lt.destination === 'string' ? lt.destination : `${lt.destination?.city || ''}${lt.destination?.country ? ', ' + lt.destination.country : ''}`,
            startDate: lt.startDate,
            endDate: lt.endDate,
            duration: lt.preferences?.duration || days.length || 1,
            placesCount: new Set(acts.map((a: any) => a.location?.name || a.activity).filter(Boolean)).size || days.length,
            activitiesCount: acts.length,
            status: lt.status || 'upcoming',
            overallRating: null,
            feedbackCompletedCount: 0,
          });
        }
      }
      setTrips(mergedTrips);
    } finally {
      setLoading(false);
    }
  }, [userId, userEmail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Auto-Sync Experiences from Bookings, Stays, Wellness, Trips ── */
  const handleAutoSync = async () => {
    setSyncing(true);
    try {
      const { data } = await axios.post('/api/experiences/auto-sync', { userId, email: userEmail }, authHeaders);
      flashToast(`Synced ${data.syncedCount || 0} travel interaction(s) & updated DEPKG graph!`);
      await loadData();
    } catch {
      flashToast('Could not sync — ensure backend service (port 5002) is running.');
    } finally {
      setSyncing(false);
    }
  };

  /* ── Mark Trip Completed (Lifecycle progression) ── */
  const handleMarkTripCompleted = async (trip: any) => {
    try {
      await tripAPI.updateTrip(trip._id, { status: 'completed', userId });
      flashToast(`"${trip.title}" marked as Completed! You can now record post-trip experiences.`);
      await loadData();
    } catch {
      flashToast('Failed to update trip status.');
    }
  };

  /* ── Open Completed Trip Experience Workspace ── */
  const openTripWorkspace = async (trip: any) => {
    setSelectedTrip(trip);
    setTripDetailLoading(true);
    try {
      const { data } = await axios.get(`/api/experiences/trip/${encodeURIComponent(trip._id)}?userId=${encodeURIComponent(userId)}`, authHeaders);
      setTripDetailData(data);
    } catch {
      setTripDetailData(null);
    } finally {
      setTripDetailLoading(false);
    }
  };

  /* ── Open Structured Feedback Modal for an Itinerary Item or Existing Experience ── */
  const openFeedbackForItem = (item: any, existingExp?: any) => {
    const exp = existingExp || item?.experience || null;
    setExtractPreview(exp?.extractedKnowledge || null);
    setFeedbackModal({ item, existingExp: exp });
    setFbForm({
      experienceId: exp?.experienceId || undefined,
      eventKey: exp?.eventKey || item?.itemKey || undefined,
      tripId: exp?.tripId || selectedTrip?._id || null,
      placeId: exp?.placeId || item?.siteId || null,
      activityId: exp?.activityId || item?.itemKey || null,
      experienceType: exp?.experienceType || (item?.linkedBooking ? 'booking' : 'place'),
      title: exp?.title || item?.activityName || item?.placeName || '',
      placeName: exp?.placeName || item?.placeName || item?.activityName || '',
      destination: exp?.destination || selectedTrip?.destination || '',
      visitStatus: exp?.visitStatus || (item?.visitStatus && item.visitStatus !== 'planned' ? item.visitStatus : 'visited'),
      plannedData: exp?.plannedData || {
        destination: selectedTrip?.destination || '',
        placeName: item?.placeName || '',
        activityName: item?.activityName || '',
        plannedTime: item?.plannedTime || '',
        plannedDurationHours: item?.plannedDurationHours || 2,
        estimatedCostINR: item?.estimatedCostINR || 0,
      },
      actualData: {
        actualActivity: exp?.actualData?.actualActivity || '',
        actualTime: exp?.actualData?.actualTime || item?.plannedTime || '',
        actualDurationHours: exp?.actualData?.actualDurationHours || item?.plannedDurationHours || 2,
        actualCostINR: exp?.actualData?.actualCostINR ?? item?.linkedBooking?.ticketPriceINR ?? item?.estimatedCostINR ?? '',
        transportMode: exp?.actualData?.transportMode || '',
        groupSize: exp?.actualData?.groupSize || 1,
        companions: exp?.actualData?.companions || '',
        skippedReason: exp?.actualData?.skippedReason || '',
      },
      bookingData: exp?.bookingData || item?.linkedBooking || {},
      weatherContext: exp?.weatherContext || null,
      ratings: {
        overall: exp?.ratings?.overall || 4,
        experienceQuality: exp?.ratings?.experienceQuality || 4,
        authenticity: exp?.ratings?.authenticity || 4,
        cleanliness: exp?.ratings?.cleanliness || 4,
        crowdLevel: exp?.ratings?.crowdLevel || 3,
        accessibility: exp?.ratings?.accessibility || 4,
        safety: exp?.ratings?.safety || 5,
        valueForMoney: exp?.ratings?.valueForMoney || 4,
        informationQuality: exp?.ratings?.informationQuality || 4,
        satisfaction: exp?.ratings?.satisfaction || 4,
      },
      wouldVisitAgain: exp?.wouldVisitAgain || 'yes',
      wouldRecommend: exp?.wouldRecommend ?? true,
      enjoyedTags: exp?.enjoyedTags || [],
      dislikedTags: exp?.dislikedTags || [],
      nextTimePreferences: exp?.nextTimePreferences || [],
      freeTextFeedback: exp?.freeTextFeedback || '',
    });
  };

  /* ── Attach Real Weather Context from Smart Utilities API (Never Fabricated) ── */
  const attachRealWeather = async () => {
    const cityGuess = (fbForm?.destination || fbForm?.placeName || '').split(',')[0].trim();
    if (!cityGuess) return;
    setWeatherFetching(true);
    try {
      const { data } = await axios.get(`/api/utilities/weather?city=${encodeURIComponent(cityGuess)}`);
      if (data?.success && data?.current) {
        setFbForm((prev: any) => ({
          ...prev,
          weatherContext: {
            location: data.city || cityGuess,
            date: new Date().toISOString().split('T')[0],
            condition: data.condition?.label || 'Observed',
            temperatureC: Math.round(data.current.temperature_2m),
            rain: (data.current.weather_code || 0) >= 51,
            humidity: data.current.relative_humidity_2m,
            windKmh: data.current.wind_speed_10m,
            alerts: data.advisory ? [data.advisory] : [],
            itineraryChanged: false,
            source: data.source || 'open-meteo-live',
          },
        }));
        flashToast(`Attached live weather for ${data.city}: ${Math.round(data.current.temperature_2m)}°C, ${data.condition?.label}`);
      }
    } catch {
      flashToast('Live weather API unavailable — only real weather data is attached.');
    } finally {
      setWeatherFetching(false);
    }
  };

  /* ── Live Structured Knowledge Extraction Preview ── */
  const handlePreviewExtraction = async (target: 'modal' | 'domain') => {
    setExtracting(true);
    try {
      const payload =
        target === 'modal'
          ? {
              freeText: fbForm.freeTextFeedback,
              placeName: fbForm.placeName,
              ratings: fbForm.ratings,
              enjoyedTags: fbForm.enjoyedTags,
              dislikedTags: fbForm.dislikedTags,
              nextTimePreferences: fbForm.nextTimePreferences,
              experienceType: fbForm.experienceType,
            }
          : {
              freeText: domainForm.freeTextFeedback,
              placeName: domainType === 'food' ? domainForm.dish : domainType === 'wellness' ? domainForm.wellnessPlace : domainForm.otherTitle,
              ratings: { overall: domainForm.overall, authenticity: domainForm.authenticity, crowdLevel: domainForm.crowdLevel, peacefulness: domainForm.peacefulness },
              enjoyedTags: domainForm.enjoyedTags,
              dislikedTags: domainForm.dislikedTags,
              nextTimePreferences: domainForm.nextTimePreferences,
              foodDetails: domainType === 'food' ? { dish: domainForm.dish, cuisine: domainForm.cuisine, region: domainForm.region } : null,
              wellnessDetails: domainType === 'wellness' ? { experienceSubType: domainForm.wellnessSubType, preferredTime: domainForm.preferredTime } : null,
              experienceType: domainType === 'other' ? domainForm.otherModule : domainType,
            };

      const { data } = await axios.post('/api/experiences/extract', payload, authHeaders);
      if (target === 'modal') setExtractPreview(data.extractedKnowledge);
      else setDomainExtract(data.extractedKnowledge);
    } catch {
      flashToast('Extraction preview failed — check backend server.');
    } finally {
      setExtracting(false);
    }
  };

  /* ── Save Place / Activity Feedback (POST or PUT) ── */
  const handleSaveFeedback = async () => {
    if (!fbForm) return;
    setSavingFb(true);
    try {
      const safeTitle = fbForm.title || fbForm.placeName || selectedTrip?.title || 'Heritage Experience';
      const payload = {
        ...fbForm,
        title: safeTitle,
        placeName: fbForm.placeName || safeTitle,
        userId,
        feedbackStatus: 'completed',
      };
      if (fbForm.experienceId) {
        await axios.put(`/api/experiences/${encodeURIComponent(fbForm.experienceId)}`, payload, authHeaders);
        flashToast('Experience updated & DEPKG knowledge graph recalculated!');
      } else {
        await axios.post('/api/experiences', payload, authHeaders);
        flashToast('Experience saved, knowledge extracted & DEPKG updated!');
      }
      setFeedbackModal(null);
      await loadData();
      if (selectedTrip) await openTripWorkspace(selectedTrip);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404 || !err?.response) {
        flashToast('Backend needs restart to load /api/experiences! Run: npm run start:win');
      } else {
        flashToast(err?.response?.data?.error || `Failed to save experience (HTTP ${status}).`);
      }
    } finally {
      setSavingFb(false);
    }
  };

  /* ── Quick Inline Visit Status Update inside Trip Workspace ── */
  const handleQuickVisitStatus = async (item: any, newStatus: string) => {
    try {
      await axios.post('/api/experiences', {
        userId,
        experienceId: item.experience?.experienceId,
        eventKey: item.itemKey,
        tripId: selectedTrip._id,
        placeId: item.siteId,
        activityId: item.itemKey,
        experienceType: item.linkedBooking ? 'booking' : 'place',
        title: item.activityName,
        placeName: item.placeName,
        destination: selectedTrip.destination,
        visitStatus: newStatus,
        feedbackStatus: item.experience?.feedbackStatus || (['not_visited', 'cancelled', 'could_not_visit'].includes(newStatus) ? 'completed' : 'pending'),
        plannedData: {
          destination: selectedTrip.destination,
          placeName: item.placeName,
          activityName: item.activityName,
          plannedTime: item.plannedTime,
          plannedDurationHours: item.plannedDurationHours,
          estimatedCostINR: item.estimatedCostINR,
        },
        bookingData: item.linkedBooking || {},
      }, authHeaders);
      await openTripWorkspace(selectedTrip);
      await loadData();
    } catch {
      flashToast('Failed to update visit status.');
    }
  };

  /* ── Submit Domain Experience (Food / Wellness / Stay / Other VoH Modules) ── */
  const handleSaveDomainExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    setDomainSaving(true);
    try {
      let payload: any = {
        userId,
        visitStatus: 'visited',
        feedbackStatus: 'completed',
        wouldVisitAgain: domainForm.wouldVisitAgain,
        wouldRecommend: domainForm.wouldRecommend,
        enjoyedTags: domainForm.enjoyedTags,
        dislikedTags: domainForm.dislikedTags,
        nextTimePreferences: domainForm.nextTimePreferences,
        freeTextFeedback: domainForm.freeTextFeedback,
      };

      if (domainType === 'food') {
        if (!domainForm.dish.trim()) { flashToast('Please enter the dish name.'); setDomainSaving(false); return; }
        payload = {
          ...payload,
          experienceType: 'food',
          title: `${domainForm.dish} (${domainForm.region})`,
          placeName: domainForm.locationName || `${domainForm.region} Culinary Heritage`,
          destination: domainForm.region,
          region: domainForm.region,
          ratings: {
            overall: domainForm.overall,
            taste: domainForm.taste,
            authenticity: domainForm.authenticity,
            valueForMoney: domainForm.valueForMoney,
            hygiene: domainForm.hygiene,
            portionSize: domainForm.portionSize,
            satisfaction: domainForm.overall,
          },
          foodDetails: {
            locationName: domainForm.locationName,
            cuisine: domainForm.cuisine || `${domainForm.region} Traditional`,
            dish: domainForm.dish,
            region: domainForm.region,
            category: domainForm.foodCategory,
            favouriteDishes: domainForm.favouriteDishes.split(',').map((s: string) => s.trim()).filter(Boolean),
            dislikedDishes: domainForm.dislikedDishes.split(',').map((s: string) => s.trim()).filter(Boolean),
            dietaryPreferences: domainForm.dietaryPreferences.split(',').map((s: string) => s.trim()).filter(Boolean),
            wouldTryAgain: domainForm.wouldTryAgain,
          },
        };
      } else if (domainType === 'wellness') {
        if (!domainForm.wellnessPlace.trim()) { flashToast('Please enter the wellness or spiritual place.'); setDomainSaving(false); return; }
        payload = {
          ...payload,
          experienceType: 'wellness',
          title: `${domainForm.wellnessPlace} — ${domainForm.wellnessSubType}`,
          placeName: domainForm.wellnessPlace,
          destination: domainForm.region,
          region: domainForm.region,
          ratings: {
            overall: domainForm.overall,
            peacefulness: domainForm.peacefulness,
            environment: domainForm.environment,
            authenticity: domainForm.authenticity,
            crowdLevel: domainForm.crowdLevel,
            valueForMoney: domainForm.valueForMoney,
            satisfaction: domainForm.overall,
          },
          wellnessDetails: {
            experienceSubType: domainForm.wellnessSubType,
            duration: domainForm.wellnessDuration,
            preferredTime: domainForm.preferredTime,
          },
        };
      } else {
        if (!domainForm.otherTitle.trim()) { flashToast('Please enter a title/place name.'); setDomainSaving(false); return; }
        payload = {
          ...payload,
          experienceType: domainForm.otherModule,
          title: domainForm.otherTitle,
          placeName: domainForm.otherTitle,
          destination: domainForm.otherDestination || domainForm.region,
          region: domainForm.region,
          ratings: {
            overall: domainForm.overall,
            cleanliness: domainForm.cleanliness,
            accessibility: domainForm.accessibility,
            valueForMoney: domainForm.valueForMoney,
            satisfaction: domainForm.overall,
          },
          actualData: {
            transportMode: domainForm.transportMode,
          },
          moduleMetadata: {
            module: domainForm.otherModule,
            ecoFriendly: domainForm.ecoFriendly,
            guideName: domainForm.guideName,
            guideLanguage: domainForm.guideLanguage,
            walkingTolerance: domainForm.walkingTolerance,
            topic: domainForm.otherNotes,
          },
        };
      }

      const { data } = await axios.post('/api/experiences', payload, authHeaders);
      setDomainExtract(data.extractedKnowledge);
      flashToast('Experience recorded & DEPKG knowledge graph updated!');
      setDomainForm((f: any) => ({ ...f, freeTextFeedback: '', dish: '', wellnessPlace: '', otherTitle: '' }));
      await loadData();
    } catch (err: any) {
      flashToast(err?.response?.data?.error || 'Could not save experience.');
    } finally {
      setDomainSaving(false);
    }
  };

  /* ── Delete Experience (Privacy / Data Quality Control) ── */
  const handleDeleteExperience = async (expId: string) => {
    if (!window.confirm('Delete this experience and recalculate your DEPKG preferences?')) return;
    try {
      await axios.delete(`/api/experiences/${encodeURIComponent(expId)}?userId=${encodeURIComponent(userId)}`, authHeaders);
      flashToast('Experience removed and DEPKG preferences recalculated.');
      await loadData();
      if (selectedTrip) await openTripWorkspace(selectedTrip);
    } catch {
      flashToast('Failed to delete experience.');
    }
  };

  const toggleArr = (arr: string[], val: string) => (arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    .exp-page { min-height:100vh; background:${C.bg}; color:${C.text}; font-family:'Plus Jakarta Sans',system-ui,sans-serif; display:flex; flex-direction:column; }
    .exp-topbar { height:64px; padding:0 2rem; background:${C.surface}; border-bottom:1px solid ${C.border}; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:50; }
    .exp-brand { display:flex; align-items:center; gap:.75rem; text-decoration:none; color:${C.text}; }
    .exp-brand-title { font-family:'Cinzel',serif; font-weight:700; font-size:1.05rem; letter-spacing:.04em; text-transform:uppercase; }
    .exp-brand-sub { font-size:.7rem; color:${C.muted}; }
    .exp-tabs { display:flex; background:${C.surface}; border-bottom:1px solid ${C.border}; padding:0 2rem; gap:.25rem; overflow-x:auto; }
    .exp-tab { padding:.9rem 1.25rem; border:none; background:none; color:${C.muted}; font-weight:700; font-size:.86rem; cursor:pointer; border-bottom:3px solid transparent; white-space:nowrap; transition:all .2s; }
    .exp-tab.active { color:${C.gold}; border-bottom-color:${C.gold}; }
    .exp-container { max-width:1240px; width:100%; margin:0 auto; padding:1.75rem 2rem 3rem; flex:1; }
    .exp-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:1rem; margin-bottom:1.75rem; }
    .exp-stat { background:${C.surface}; border:1px solid ${C.border}; border-radius:14px; padding:1.15rem 1.25rem; display:flex; align-items:center; gap:.9rem; }
    .exp-stat-val { font-family:'Cinzel',serif; font-size:1.65rem; font-weight:800; color:${C.gold}; line-height:1; }
    .exp-stat-lbl { font-size:.74rem; color:${C.muted}; margin-top:4px; font-weight:600; }
    .exp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(330px,1fr)); gap:1.25rem; }
    .exp-card { background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; padding:1.35rem; display:flex; flex-direction:column; gap:.7rem; transition:border-color .2s; }
    .exp-card:hover { border-color:rgba(217,156,83,0.4); }
    .exp-btn { padding:.58rem 1.15rem; border-radius:9px; border:none; background:linear-gradient(135deg,${C.amber},${C.gold}); color:#fff; font-weight:700; font-size:.82rem; cursor:pointer; }
    .exp-btn:disabled { opacity:.45; cursor:not-allowed; }
    .exp-btn-ghost { padding:.55rem 1rem; border-radius:9px; border:1px solid ${C.border}; background:transparent; color:${C.text}; font-weight:600; font-size:.8rem; cursor:pointer; }
    .exp-btn-ghost:hover { border-color:${C.gold}; color:${C.gold}; }
    .exp-input, .exp-select, .exp-textarea { width:100%; padding:.65rem .85rem; border-radius:9px; border:1px solid ${C.border}; background:${C.card}; color:${C.text}; font-size:.85rem; font-family:inherit; outline:none; }
    .exp-input:focus, .exp-select:focus, .exp-textarea:focus { border-color:${C.gold}; }
    .exp-label { display:block; font-size:.72rem; font-weight:700; color:${C.muted}; text-transform:uppercase; letter-spacing:.04em; margin-bottom:5px; }
    .exp-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:.72rem; font-weight:700; }
    .exp-overlay { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.78); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:1.25rem; }
    .exp-modal { width:100%; max-width:780px; max-height:92vh; overflow-y:auto; background:${C.surface}; border:1px solid ${C.border}; border-radius:18px; padding:1.65rem; }
    .exp-section-title { font-family:'Cinzel',serif; font-size:1.15rem; font-weight:700; margin:0 0 .35rem; }
    @media (max-width:700px) { .exp-topbar, .exp-tabs, .exp-container { padding-left:1rem; padding-right:1rem; } }
  `;

  return (
    <div className="exp-page">
      <style>{css}</style>

      {/* Topbar */}
      <header className="exp-topbar">
        <Link to="/dashboard" className="exp-brand">
          <VoHLogo size={34} />
          <div>
            <div className="exp-brand-title">Travel Experiences &amp; DEPKG</div>
            <div className="exp-brand-sub">Post-Trip Capture · Structured Learning · Personalized AI Planning</div>
          </div>
        </Link>
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
          <button className="exp-btn-ghost" onClick={handleAutoSync} disabled={syncing}>
            {syncing ? '⏳ Syncing…' : '🔄 Sync Bookings & Trips'}
          </button>
          <button className="exp-btn" onClick={() => navigate('/trip-planner')}>
            ✈️ Plan Personalized Trip
          </button>
          <ThemeToggle />
          <button className="exp-btn-ghost" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 300, background: C.surface, border: `1px solid ${C.gold}`, color: C.text, padding: '0.85rem 1.25rem', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.4)', fontSize: '0.86rem', fontWeight: 600 }}>
          ✨ {toastMsg}
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="exp-tabs">
        <button className={`exp-tab ${activeTab === 'trips' ? 'active' : ''}`} onClick={() => { setActiveTab('trips'); setSelectedTrip(null); }}>
          🗺️ My Trips ({trips.length})
        </button>
        <button className={`exp-tab ${activeTab === 'log' ? 'active' : ''}`} onClick={() => setActiveTab('log')}>
          ✨ Log Food / Wellness / Site Experience
        </button>
        <button className={`exp-tab ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')}>
          🧠 DEPKG Insights &amp; Preferences
        </button>
        <button className={`exp-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          📝 Recorded Experiences ({allExperiences.length})
        </button>
      </nav>

      <main className="exp-container">
        {/* Live Top Stats */}
        <div className="exp-stats">
          <div className="exp-stat">
            <span style={{ fontSize: '1.6rem' }}>🧳</span>
            <div>
              <div className="exp-stat-val">{summary?.stats?.tripsCompleted ?? 0}</div>
              <div className="exp-stat-lbl">Trips Completed</div>
            </div>
          </div>
          <div className="exp-stat">
            <span style={{ fontSize: '1.6rem' }}>🏛️</span>
            <div>
              <div className="exp-stat-val">{summary?.stats?.placesVisited ?? 0}</div>
              <div className="exp-stat-lbl">Places Visited (Facts)</div>
            </div>
          </div>
          <div className="exp-stat">
            <span style={{ fontSize: '1.6rem' }}>🎭</span>
            <div>
              <div className="exp-stat-val">{summary?.stats?.experiencesRecorded ?? 0}</div>
              <div className="exp-stat-lbl">Experiences Recorded</div>
            </div>
          </div>
          <div className="exp-stat">
            <span style={{ fontSize: '1.6rem' }}>🧠</span>
            <div>
              <div className="exp-stat-val">{(depkg?.liked?.length || 0) + (depkg?.avoided?.length || 0)}</div>
              <div className="exp-stat-lbl">Active DEPKG Preferences</div>
            </div>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>Loading your personal travel history &amp; DEPKG graph…</div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 1: MY TRIPS & COMPLETED TRIP EXPERIENCE WORKSPACE
           ════════════════════════════════════════════════════════════════ */}
        {!loading && activeTab === 'trips' && !selectedTrip && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h1 className="exp-section-title">My Travel History</h1>
                <p style={{ margin: 0, fontSize: '0.85rem', color: C.muted }}>
                  Select a completed trip to review actual visits, bookings, weather context, and record feedback that improves future AI itineraries.
                </p>
              </div>
              <button className="exp-btn" onClick={() => navigate('/trip-planner')}>+ Plan New Heritage Trip</button>
            </div>

            {trips.length === 0 ? (
              <div className="exp-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', alignItems: 'center' }}>
                <div style={{ fontSize: '3rem' }}>✈️</div>
                <h3 style={{ margin: 0, fontFamily: 'Cinzel, serif' }}>No Trips Planned Yet</h3>
                <p style={{ color: C.muted, maxWidth: '480px', fontSize: '0.88rem' }}>
                  Create an itinerary in the AI Trip Planner or log a standalone Food, Wellness, Monument Ticket, or Stay experience to start teaching your DEPKG.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button className="exp-btn" onClick={() => navigate('/trip-planner')}>Open AI Trip Planner</button>
                  <button className="exp-btn-ghost" onClick={() => setActiveTab('log')}>Log Standalone Experience</button>
                </div>
              </div>
            ) : (
              <div className="exp-grid">
                {trips.map((trip: any) => {
                  const isCompleted = trip.status === 'completed';
                  const statusColor = isCompleted ? C.green : trip.status === 'ongoing' ? C.blue : C.amber;
                  const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Flexible');
                  return (
                    <div key={trip._id} className="exp-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 800, fontSize: '1.05rem' }}>{trip.title}</div>
                          <div style={{ fontSize: '0.82rem', color: C.muted, marginTop: '2px' }}>📍 {trip.destination}</div>
                        </div>
                        <span className="exp-badge" style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}40` }}>
                          {isCompleted ? '✓ Completed' : trip.status === 'ongoing' ? '● In Progress' : '📅 Upcoming'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: C.muted }}>
                        🗓️ {fmtDate(trip.startDate)} – {fmtDate(trip.endDate)}
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '8px', background: C.card, border: `1px solid ${C.border}` }}>🏛️ {trip.placesCount || 0} Places</span>
                        <span style={{ padding: '4px 10px', borderRadius: '8px', background: C.card, border: `1px solid ${C.border}` }}>🎯 {trip.activitiesCount || 0} Activities</span>
                        {trip.overallRating && (
                          <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(245,158,11,0.12)', color: C.amber, fontWeight: 700 }}>
                            ⭐ {trip.overallRating}/5
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: `1px solid ${C.border}` }}>
                        {isCompleted ? (
                          <button className="exp-btn" style={{ flex: 1 }} onClick={() => openTripWorkspace(trip)}>
                            {trip.feedbackCompletedCount > 0 ? '👁️ View / Edit Experience' : '🎭 Give Experience'}
                          </button>
                        ) : (
                          <>
                            <button className="exp-btn-ghost" disabled style={{ flex: 1, opacity: 0.55 }} title="Only completed trips accept full post-trip feedback">
                              🔒 Complete Trip First
                            </button>
                            <button className="exp-btn" onClick={() => handleMarkTripCompleted(trip)}>
                              ✓ Mark Completed
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── COMPLETED TRIP EXPERIENCE WORKSPACE (Section 2, 6, 9, 10) ── */}
        {!loading && activeTab === 'trips' && selectedTrip && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <button className="exp-btn-ghost" style={{ marginBottom: '0.5rem' }} onClick={() => setSelectedTrip(null)}>← Back to My Trips</button>
                <h1 className="exp-section-title">{selectedTrip.title} — Post-Trip Experience</h1>
                <p style={{ margin: 0, fontSize: '0.84rem', color: C.muted }}>
                  Mark what you <strong>actually visited, skipped, or changed</strong> and record structured feedback. Linked monument tickets &amp; hotel stays are auto-associated below.
                </p>
              </div>
              <button
                className="exp-btn"
                onClick={() => openFeedbackForItem({
                  itemKey: `trip:${selectedTrip._id}`,
                  placeName: selectedTrip.destination,
                  activityName: `${selectedTrip.title} (Overall Trip)`,
                  plannedTime: 'Full Trip',
                }, tripDetailData?.tripExperience)}
              >
                ⭐ Rate Overall Trip
              </button>
            </div>

            {tripDetailLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>Loading itinerary, linked bookings &amp; feedback…</div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
                  {(tripDetailData?.itineraryItems || []).length === 0 ? (
                    <div className="exp-card">
                      <p style={{ margin: 0, color: C.muted }}>
                        This trip has no itemized itinerary stops saved. Use <strong>Rate Overall Trip</strong> above or <strong>Log Food / Wellness / Site Experience</strong> to add places you visited.
                      </p>
                    </div>
                  ) : (
                    tripDetailData.itineraryItems.map((item: any) => {
                      const fbDone = item.feedbackStatus === 'completed';
                      return (
                        <div key={item.itemKey} className="exp-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                          <div style={{ flex: 1, minWidth: '240px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '4px' }}>
                              <span className="exp-badge" style={{ background: 'rgba(217,156,83,0.12)', color: C.gold }}>Day {item.day}</span>
                              <span style={{ fontWeight: 800, fontSize: '0.96rem' }}>{item.placeName}</span>
                              {item.activityName !== item.placeName && (
                                <span style={{ fontSize: '0.8rem', color: C.muted }}>({item.activityName})</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap', fontSize: '0.78rem', color: C.muted }}>
                              <span>⏰ Planned: {item.plannedTime} ({item.plannedDurationHours}h)</span>
                              <span>🎟️ Booking: <strong style={{ color: item.bookingStatus !== 'not_booked' ? C.green : C.muted }}>{item.bookingStatus}</strong></span>
                              <span>📝 Feedback: <strong style={{ color: fbDone ? C.green : C.amber }}>{fbDone ? `✓ Recorded (${item.experience?.ratings?.overall || '—'}/5)` : 'Pending'}</strong></span>
                            </div>
                            {item.linkedBooking && (
                              <div style={{ marginTop: '4px', fontSize: '0.74rem', color: C.blue }}>
                                Auto-linked ASI Ticket: <code>{item.linkedBooking.bookingId}</code> · ₹{item.linkedBooking.ticketPriceINR} ({item.linkedBooking.visitorType})
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <select
                              className="exp-select"
                              style={{ width: 'auto', minWidth: '180px', padding: '0.45rem 0.7rem', fontSize: '0.8rem' }}
                              value={item.visitStatus === 'planned' ? 'visited' : item.visitStatus}
                              onChange={e => handleQuickVisitStatus(item, e.target.value)}
                            >
                              {VISIT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <button className="exp-btn" onClick={() => openFeedbackForItem(item)}>
                              {fbDone ? '✏️ Edit Feedback' : '💬 Give Feedback'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Linked Smart Stays */}
                {(tripDetailData?.linkedStays || []).length > 0 && (
                  <div className="exp-card" style={{ marginBottom: '1rem' }}>
                    <div className="exp-section-title" style={{ fontSize: '1rem' }}>🏨 Linked Smart Stay Reservations</div>
                    {tripDetailData.linkedStays.map((s: any) => (
                      <div key={s.bookingId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderTop: `1px solid ${C.border}`, flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.84rem' }}>
                          <strong>{s.hotelName}</strong> · {s.hotelCity} ({s.checkIn} → {s.checkOut}) · ₹{s.totalAmount}
                        </div>
                        <button
                          className="exp-btn-ghost"
                          onClick={() => openFeedbackForItem({
                            itemKey: `stay:${s.bookingId}`,
                            placeName: s.hotelName,
                            activityName: s.hotelName,
                            plannedTime: s.checkIn,
                            linkedBooking: { bookingId: s.bookingId, sourceModule: 'smart_stay', bookingStatus: s.paymentStatus, ticketPriceINR: s.totalAmount },
                          })}
                        >
                          Rate Stay
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 2: LOG DOMAIN EXPERIENCES (FOOD, WELLNESS, STAY, OTHER VOH)
           ════════════════════════════════════════════════════════════════ */}
        {!loading && activeTab === 'log' && (
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <h1 className="exp-section-title">Record Heritage Experience</h1>
            <p style={{ color: C.muted, fontSize: '0.86rem', marginBottom: '1.25rem' }}>
              Log Food Heritage, Wellness &amp; Spiritual, Smart Stay, Digital Archives, 3D/AR/VR, Guided Tour, or Route experiences to feed your DEPKG.
            </p>

            {/* Domain Selector */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {[
                { id: 'food', label: '🍛 Food Heritage & Cuisine' },
                { id: 'wellness', label: '🧘 Wellness & Spiritual' },
                { id: 'other', label: '🌐 Site / Archive / 3D-VR / Guide / Stay / Route' },
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => { setDomainType(d.id as DomainType); setDomainExtract(null); }}
                  className={domainType === d.id ? 'exp-btn' : 'exp-btn-ghost'}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveDomainExperience} className="exp-card">
              {domainType === 'food' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <div><label className="exp-label">Dish Name *</label><input required className="exp-input" placeholder="e.g. Mysore Pak, Dal Baati Churma" value={domainForm.dish} onChange={e => setDomainForm({ ...domainForm, dish: e.target.value })} /></div>
                    <div><label className="exp-label">Cuisine</label><input className="exp-input" placeholder="e.g. South Indian Royal, Chettinad" value={domainForm.cuisine} onChange={e => setDomainForm({ ...domainForm, cuisine: e.target.value })} /></div>
                    <div>
                      <label className="exp-label">Region</label>
                      <select className="exp-select" value={domainForm.region} onChange={e => setDomainForm({ ...domainForm, region: e.target.value })}>
                        {INDIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="exp-label">Food Heritage Category</label>
                      <select className="exp-select" value={domainForm.foodCategory} onChange={e => setDomainForm({ ...domainForm, foodCategory: e.target.value })}>
                        {FOOD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}><label className="exp-label">Restaurant / Food Location</label><input className="exp-input" placeholder="e.g. Guru Sweet Mart, Devaraja Market, Mysuru" value={domainForm.locationName} onChange={e => setDomainForm({ ...domainForm, locationName: e.target.value })} /></div>
                    <div><label className="exp-label">Favourite Dishes (comma-separated)</label><input className="exp-input" placeholder="e.g. Mysore Pak, Filter Coffee" value={domainForm.favouriteDishes} onChange={e => setDomainForm({ ...domainForm, favouriteDishes: e.target.value })} /></div>
                    <div><label className="exp-label">Disliked Dishes (comma-separated)</label><input className="exp-input" placeholder="Optional" value={domainForm.dislikedDishes} onChange={e => setDomainForm({ ...domainForm, dislikedDishes: e.target.value })} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label className="exp-label">Voluntary Travel Dietary Preference (Optional — only if you want it used for planning)</label><input className="exp-input" placeholder="e.g. Vegetarian, Sattvic, Mild spice" value={domainForm.dietaryPreferences} onChange={e => setDomainForm({ ...domainForm, dietaryPreferences: e.target.value })} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem', marginTop: '0.5rem' }}>
                    <RatingRow label="Overall Rating" value={domainForm.overall} onChange={v => setDomainForm({ ...domainForm, overall: v })} />
                    <RatingRow label="Taste" value={domainForm.taste} onChange={v => setDomainForm({ ...domainForm, taste: v })} />
                    <RatingRow label="Authenticity" value={domainForm.authenticity} onChange={v => setDomainForm({ ...domainForm, authenticity: v })} />
                    <RatingRow label="Price / Value" value={domainForm.valueForMoney} onChange={v => setDomainForm({ ...domainForm, valueForMoney: v })} />
                    <RatingRow label="Hygiene" value={domainForm.hygiene} onChange={v => setDomainForm({ ...domainForm, hygiene: v })} />
                    <RatingRow label="Portion Size" value={domainForm.portionSize} onChange={v => setDomainForm({ ...domainForm, portionSize: v })} />
                  </div>
                </>
              )}

              {domainType === 'wellness' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <div><label className="exp-label">Place / Sanctuary / Circuit *</label><input required className="exp-input" placeholder="e.g. Hampi Temple Meditation Circuit, Rishikesh Ashram" value={domainForm.wellnessPlace} onChange={e => setDomainForm({ ...domainForm, wellnessPlace: e.target.value })} /></div>
                    <div>
                      <label className="exp-label">Experience Type</label>
                      <select className="exp-select" value={domainForm.wellnessSubType} onChange={e => setDomainForm({ ...domainForm, wellnessSubType: e.target.value })}>
                        {WELLNESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="exp-label">Region</label>
                      <select className="exp-select" value={domainForm.region} onChange={e => setDomainForm({ ...domainForm, region: e.target.value })}>
                        {INDIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="exp-label">Preferred Time</label>
                      <select className="exp-select" value={domainForm.preferredTime} onChange={e => setDomainForm({ ...domainForm, preferredTime: e.target.value })}>
                        {PREFERRED_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div><label className="exp-label">Duration</label><input className="exp-input" placeholder="e.g. 2 hours / 5 days" value={domainForm.wellnessDuration} onChange={e => setDomainForm({ ...domainForm, wellnessDuration: e.target.value })} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem', marginTop: '0.5rem' }}>
                    <RatingRow label="Overall Rating" value={domainForm.overall} onChange={v => setDomainForm({ ...domainForm, overall: v })} />
                    <RatingRow label="Peacefulness" value={domainForm.peacefulness} onChange={v => setDomainForm({ ...domainForm, peacefulness: v })} />
                    <RatingRow label="Environment" value={domainForm.environment} onChange={v => setDomainForm({ ...domainForm, environment: v })} />
                    <RatingRow label="Authenticity" value={domainForm.authenticity} onChange={v => setDomainForm({ ...domainForm, authenticity: v })} />
                    <RatingRow label="Crowd Level" hint="1 = Very quiet · 5 = Crowded" value={domainForm.crowdLevel} onChange={v => setDomainForm({ ...domainForm, crowdLevel: v })} />
                    <RatingRow label="Value" value={domainForm.valueForMoney} onChange={v => setDomainForm({ ...domainForm, valueForMoney: v })} />
                  </div>
                </>
              )}

              {domainType === 'other' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <div>
                      <label className="exp-label">VoH Experience Source</label>
                      <select className="exp-select" value={domainForm.otherModule} onChange={e => setDomainForm({ ...domainForm, otherModule: e.target.value })}>
                        <option value="place">🏛️ Heritage Site Visit</option>
                        <option value="archive">📚 Digital Archive / Manuscript</option>
                        <option value="immersive">🥽 3D / AR / VR / 360° Experience</option>
                        <option value="guide">🧭 Guided Tour Experience</option>
                        <option value="stay">🏨 Smart Stay / Accommodation</option>
                        <option value="route">🚌 Transport / Route Experience</option>
                      </select>
                    </div>
                    <div><label className="exp-label">Site / Artifact / Property / Guide Name *</label><input required className="exp-input" placeholder="e.g. Vijayanagara Copper Plate, Hampi 360 Tour" value={domainForm.otherTitle} onChange={e => setDomainForm({ ...domainForm, otherTitle: e.target.value })} /></div>
                    <div><label className="exp-label">Location / Destination</label><input className="exp-input" placeholder="e.g. Hampi, Karnataka" value={domainForm.otherDestination} onChange={e => setDomainForm({ ...domainForm, otherDestination: e.target.value })} /></div>
                    <div><label className="exp-label">Transport Mode / Topic / Language</label><input className="exp-input" placeholder="e.g. Auto-rickshaw / Temple Sculpture / English" value={domainForm.otherNotes} onChange={e => setDomainForm({ ...domainForm, otherNotes: e.target.value })} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem', marginTop: '0.5rem' }}>
                    <RatingRow label="Overall Rating" value={domainForm.overall} onChange={v => setDomainForm({ ...domainForm, overall: v })} />
                    <RatingRow label="Cleanliness / Quality" value={domainForm.cleanliness} onChange={v => setDomainForm({ ...domainForm, cleanliness: v })} />
                    <RatingRow label="Accessibility" value={domainForm.accessibility} onChange={v => setDomainForm({ ...domainForm, accessibility: v })} />
                    <RatingRow label="Value for Money" value={domainForm.valueForMoney} onChange={v => setDomainForm({ ...domainForm, valueForMoney: v })} />
                  </div>
                </>
              )}

              <div style={{ marginTop: '0.75rem' }}>
                <label className="exp-label">What would you prefer next time?</label>
                <TagPicker options={NEXT_TIME_PREFS} selected={domainForm.nextTimePreferences} onToggle={v => setDomainForm({ ...domainForm, nextTimePreferences: toggleArr(domainForm.nextTimePreferences, v) })} />
              </div>

              <div style={{ marginTop: '0.75rem' }}>
                <label className="exp-label">Tell us about your experience (Original text is preserved &amp; structured knowledge is extracted)</label>
                <textarea
                  className="exp-textarea"
                  rows={3}
                  placeholder="e.g. Really liked the traditional taste. Prefer authentic local sweets rather than modern versions..."
                  value={domainForm.freeTextFeedback}
                  onChange={e => setDomainForm({ ...domainForm, freeTextFeedback: e.target.value })}
                />
              </div>

              {domainExtract && (
                <div style={{ padding: '0.9rem', borderRadius: '12px', background: 'rgba(217,156,83,0.08)', border: '1px solid rgba(217,156,83,0.28)', fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 800, color: C.gold, marginBottom: '0.4rem' }}>🧠 Extracted Structured Knowledge ({domainExtract.sentiment} · {domainExtract.confidenceLabel} confidence)</div>
                  {domainExtract.positives?.length > 0 && <div>✅ Positives: {domainExtract.positives.join(', ')}</div>}
                  {domainExtract.negatives?.length > 0 && <div>⚠️ Negatives: {domainExtract.negatives.join(', ')}</div>}
                  {domainExtract.temporalPreferences?.length > 0 && <div>⏰ Temporal: {domainExtract.temporalPreferences.map((t: any) => t.label).join(', ')}</div>}
                  {domainExtract.weatherImpacts?.length > 0 && <div>🌧️ Weather Signal: {domainExtract.weatherImpacts.map((w: any) => w.futureSignal).join('; ')}</div>}
                  {domainExtract.futurePreferences?.length > 0 && <div>🎯 Future Planning Signals: {domainExtract.futurePreferences.join(', ')}</div>}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="exp-btn-ghost" onClick={() => handlePreviewExtraction('domain')} disabled={extracting}>
                  {extracting ? '⏳ Extracting…' : '✨ Preview Knowledge Extraction'}
                </button>
                <button type="submit" className="exp-btn" disabled={domainSaving}>
                  {domainSaving ? '⏳ Saving to DEPKG…' : '💾 Save Experience & Update DEPKG'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 3: DEPKG INSIGHTS, EXPLAINABILITY & TEMPORAL EVOLUTION
           ════════════════════════════════════════════════════════════════ */}
        {!loading && activeTab === 'insights' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {/* You Prefer */}
              <div className="exp-card">
                <h2 className="exp-section-title" style={{ color: C.green }}>✅ You Prefer</h2>
                <p style={{ margin: 0, fontSize: '0.78rem', color: C.muted }}>High-confidence signals actively guiding your next AI itinerary.</p>
                {(depkg?.liked || []).length === 0 ? (
                  <p style={{ color: C.muted, fontSize: '0.84rem' }}>Record feedback on a completed trip or domain experience to build your preference profile.</p>
                ) : (
                  depkg.liked.map((p: any, idx: number) => (
                    <div key={idx} style={{ padding: '0.75rem', borderRadius: '10px', background: C.card, border: `1px solid ${C.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '0.9rem' }}>{p.value}</strong>
                        <span className="exp-badge" style={{ background: p.evidenceType === 'explicit' ? 'rgba(34,197,94,0.14)' : 'rgba(59,130,246,0.14)', color: p.evidenceType === 'explicit' ? C.green : C.blue }}>
                          {p.evidenceType === 'explicit' ? 'Explicit' : 'Inferred'} · {Math.round(p.confidence * 100)}%
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: '4px' }}>💡 {p.explainability}</div>
                    </div>
                  ))
                )}
              </div>

              {/* You Often Avoid */}
              <div className="exp-card">
                <h2 className="exp-section-title" style={{ color: C.red }}>🚫 You Often Avoid</h2>
                <p style={{ margin: 0, fontSize: '0.78rem', color: C.muted }}>Negative evidence &amp; friction points the AI planner works around.</p>
                {(depkg?.avoided || []).length === 0 ? (
                  <p style={{ color: C.muted, fontSize: '0.84rem' }}>No strong avoidance signals yet.</p>
                ) : (
                  depkg.avoided.map((p: any, idx: number) => (
                    <div key={idx} style={{ padding: '0.75rem', borderRadius: '10px', background: C.card, border: `1px solid ${C.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '0.9rem' }}>{p.value}</strong>
                        <span className="exp-badge" style={{ background: 'rgba(239,68,68,0.14)', color: C.red }}>
                          {p.evidenceType === 'explicit' ? 'Explicit' : 'Inferred'} · {Math.round(p.confidence * 100)}%
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: '4px' }}>💡 {p.explainability}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Tentative Inferences (Prevents Bad Data from becoming absolute truth!) */}
              <div className="exp-card">
                <h2 className="exp-section-title" style={{ color: C.purple }}>🔮 Tentative Inferences</h2>
                <p style={{ margin: 0, fontSize: '0.78rem', color: C.muted }}>Patterns observed from single/few trips — labeled as inferred until repeated evidence confirms them.</p>
                {(depkg?.knowledgeLayers?.inferences || []).length === 0 ? (
                  <p style={{ color: C.muted, fontSize: '0.84rem' }}>No tentative behavioral inferences yet.</p>
                ) : (
                  depkg.knowledgeLayers.inferences.slice(0, 8).map((inf: any, idx: number) => (
                    <div key={idx} style={{ padding: '0.7rem', borderRadius: '10px', background: C.card, border: `1px solid ${C.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Possible: {inf.value}</span>
                        <span className="exp-badge" style={{ background: 'rgba(168,85,247,0.14)', color: C.purple }}>
                          {inf.confidenceLevel} ({inf.observationCount} obs)
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: C.muted, marginTop: '3px' }}>{inf.explainability}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Temporal Evolution & 4-Layer Knowledge Separation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div className="exp-card">
                <h2 className="exp-section-title">⏳ How Your Preferences Are Evolving</h2>
                {(depkg?.evolution || []).length === 0 ? (
                  <p style={{ color: C.muted, fontSize: '0.84rem' }}>
                    As you record experiences across multiple trips over time, temporal preference shifts (recency-weighted) will appear here without erasing older history.
                  </p>
                ) : (
                  depkg.evolution.map((ev: any, i: number) => (
                    <div key={i} style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', fontSize: '0.84rem' }}>
                      <strong>{ev.value}</strong>: {ev.note}
                    </div>
                  ))
                )}

                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginTop: '0.75rem', color: C.gold }}>Knowledge Layer Separation</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <div style={{ padding: '0.6rem', borderRadius: '8px', background: C.card }}>📌 <strong>Facts:</strong> {depkg?.knowledgeLayers?.facts?.length || 0}</div>
                  <div style={{ padding: '0.6rem', borderRadius: '8px', background: C.card }}>⭐ <strong>Experiences:</strong> {depkg?.knowledgeLayers?.experiences?.length || 0}</div>
                  <div style={{ padding: '0.6rem', borderRadius: '8px', background: C.card }}>🎯 <strong>Explicit Prefs:</strong> {depkg?.knowledgeLayers?.preferences?.length || 0}</div>
                  <div style={{ padding: '0.6rem', borderRadius: '8px', background: C.card }}>🔮 <strong>Inferences:</strong> {depkg?.knowledgeLayers?.inferences?.length || 0}</div>
                </div>
              </div>

              <div className="exp-card">
                <h2 className="exp-section-title">🤖 Live AI Trip Planner Context</h2>
                <p style={{ margin: 0, fontSize: '0.78rem', color: C.muted }}>
                  Exact compressed DEPKG context automatically injected into the AI Trip Planner &amp; RAG pipeline on your next trip request:
                </p>
                <pre style={{ margin: 0, padding: '0.9rem', borderRadius: '10px', background: C.card, border: `1px solid ${C.border}`, fontSize: '0.74rem', whiteSpace: 'pre-wrap', color: C.text, maxHeight: '260px', overflowY: 'auto' }}>
                  {depkg?.compressedContext || 'No personalization context yet — record at least one experience to activate personalized itinerary generation.'}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 4: ALL RECORDED EXPERIENCES (EDIT / DELETE / INSPECT)
           ════════════════════════════════════════════════════════════════ */}
        {!loading && activeTab === 'history' && (
          <div>
            <h1 className="exp-section-title">Your Recorded &amp; Auto-Captured Experiences</h1>
            <p style={{ color: C.muted, fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              You own all your experience records. Edit, inspect extracted knowledge, or delete any entry to immediately recalculate your DEPKG.
            </p>
            {allExperiences.length === 0 ? (
              <div className="exp-card" style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: C.muted }}>No experiences recorded yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {allExperiences.map(exp => (
                  <div key={exp.experienceId} className="exp-card" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span className="exp-badge" style={{ background: 'rgba(217,156,83,0.14)', color: C.gold, textTransform: 'uppercase' }}>{exp.experienceType}</span>
                        <strong style={{ fontSize: '0.96rem' }}>{exp.title}</strong>
                        <span className="exp-badge" style={{ background: exp.feedbackStatus === 'completed' ? 'rgba(34,197,94,0.14)' : 'rgba(245,158,11,0.14)', color: exp.feedbackStatus === 'completed' ? C.green : C.amber }}>
                          {exp.feedbackStatus === 'completed' ? '✓ Completed' : '⏳ Pending Feedback'}
                        </span>
                        {exp.ratings?.overall && <span style={{ fontSize: '0.82rem', fontWeight: 700, color: C.amber }}>⭐ {exp.ratings.overall}/5</span>}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: C.muted }}>
                        Status: <strong>{exp.visitStatus}</strong> · Source: {exp.sourceType} · {new Date(exp.visitedAt || exp.createdAt).toLocaleDateString('en-IN')}
                      </div>
                      {exp.freeTextFeedback && (
                        <div style={{ fontSize: '0.82rem', fontStyle: 'italic', marginTop: '5px', color: C.text }}>"{exp.freeTextFeedback}"</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {exp.extractedKnowledge && (
                        <button className="exp-btn-ghost" onClick={() => setInspectExp(exp)}>🧠 Knowledge</button>
                      )}
                      <button className="exp-btn-ghost" onClick={() => openFeedbackForItem(null, exp)}>✏️ Edit</button>
                      <button className="exp-btn-ghost" style={{ color: C.red, borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => handleDeleteExperience(exp.experienceId)}>🗑️ Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════════════
          STRUCTURED PLACE / ACTIVITY FEEDBACK MODAL
         ══════════════════════════════════════════════════════════════════ */}
      {feedbackModal && fbForm && (
        <div className="exp-overlay" onClick={() => setFeedbackModal(null)}>
          <div className="exp-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: C.gold, textTransform: 'uppercase' }}>Structured Experience Capture</div>
                <h2 style={{ fontFamily: 'Cinzel, serif', margin: '2px 0', fontSize: '1.25rem' }}>{fbForm.placeName || fbForm.title}</h2>
              </div>
              <button className="exp-btn-ghost" onClick={() => setFeedbackModal(null)}>✕</button>
            </div>

            {/* Visit Status & Actual Behaviour */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1rem' }}>
              <div>
                <label className="exp-label">Actual Visit Status</label>
                <select className="exp-select" value={fbForm.visitStatus} onChange={e => setFbForm({ ...fbForm, visitStatus: e.target.value })}>
                  {VISIT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="exp-label">Actual Visit Time</label>
                <input className="exp-input" placeholder="e.g. 07:30 AM / Afternoon" value={fbForm.actualData.actualTime || ''} onChange={e => setFbForm({ ...fbForm, actualData: { ...fbForm.actualData, actualTime: e.target.value } })} />
              </div>
              <div>
                <label className="exp-label">Actual Cost (₹)</label>
                <input type="number" className="exp-input" value={fbForm.actualData.actualCostINR ?? ''} onChange={e => setFbForm({ ...fbForm, actualData: { ...fbForm.actualData, actualCostINR: Number(e.target.value) } })} />
              </div>
              <div>
                <label className="exp-label">Transport Mode</label>
                <input className="exp-input" placeholder="e.g. Walk, Auto, Car, Bus" value={fbForm.actualData.transportMode || ''} onChange={e => setFbForm({ ...fbForm, actualData: { ...fbForm.actualData, transportMode: e.target.value } })} />
              </div>
              {fbForm.visitStatus === 'different_from_planned' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="exp-label">What activity did you actually do instead?</label>
                  <input className="exp-input" placeholder="Describe the actual activity" value={fbForm.actualData.actualActivity || ''} onChange={e => setFbForm({ ...fbForm, actualData: { ...fbForm.actualData, actualActivity: e.target.value } })} />
                </div>
              )}
              {['not_visited', 'cancelled', 'could_not_visit'].includes(fbForm.visitStatus) && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="exp-label">Why was it skipped / cancelled?</label>
                  <input className="exp-input" placeholder="e.g. Heavy rain, too crowded, closed on Monday, tired..." value={fbForm.actualData.skippedReason || ''} onChange={e => setFbForm({ ...fbForm, actualData: { ...fbForm.actualData, skippedReason: e.target.value } })} />
                </div>
              )}
            </div>

            {/* Weather Context Attach */}
            <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: C.card, border: `1px solid ${C.border}`, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.8rem' }}>
                <strong>⛅ Weather Context:</strong>{' '}
                {fbForm.weatherContext ? `${fbForm.weatherContext.location} — ${fbForm.weatherContext.condition}, ${fbForm.weatherContext.temperatureC}°C (Humidity ${fbForm.weatherContext.humidity}%)` : 'Not attached yet (only real API/observed weather is used)'}
              </div>
              <button type="button" className="exp-btn-ghost" onClick={attachRealWeather} disabled={weatherFetching}>
                {weatherFetching ? '⏳ Fetching…' : '📡 Attach Live Weather'}
              </button>
            </div>

            {/* Ticket Entry Experience (if booked) */}
            {fbForm.bookingData?.bookingId && (
              <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: C.blue, marginBottom: '0.5rem' }}>
                  🎟️ Pre-filled Booking: {fbForm.bookingData.bookingId} · ₹{fbForm.bookingData.ticketPriceINR} ({fbForm.bookingData.bookingStatus})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="exp-label">Waiting Time (Minutes)</label>
                    <input type="number" className="exp-input" placeholder="e.g. 15" value={fbForm.bookingData.waitingTimeMins ?? ''} onChange={e => setFbForm({ ...fbForm, bookingData: { ...fbForm.bookingData, waitingTimeMins: Number(e.target.value) } })} />
                  </div>
                  <RatingRow label="Entry Experience" value={fbForm.bookingData.entryExperience || 4} onChange={v => setFbForm({ ...fbForm, bookingData: { ...fbForm.bookingData, entryExperience: v } })} />
                </div>
              </div>
            )}

            {/* Structured Ratings (1–5) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.2rem 1.5rem', marginBottom: '1rem', padding: '0.9rem', borderRadius: '12px', background: C.card, border: `1px solid ${C.border}` }}>
              <RatingRow label="Overall Rating" value={fbForm.ratings.overall} onChange={v => setFbForm({ ...fbForm, ratings: { ...fbForm.ratings, overall: v } })} />
              <RatingRow label="Experience Quality" value={fbForm.ratings.experienceQuality} onChange={v => setFbForm({ ...fbForm, ratings: { ...fbForm.ratings, experienceQuality: v } })} />
              <RatingRow label="Authenticity" value={fbForm.ratings.authenticity} onChange={v => setFbForm({ ...fbForm, ratings: { ...fbForm.ratings, authenticity: v } })} />
              <RatingRow label="Cleanliness" value={fbForm.ratings.cleanliness} onChange={v => setFbForm({ ...fbForm, ratings: { ...fbForm.ratings, cleanliness: v } })} />
              <RatingRow label="Crowd Level" hint="1 = Empty · 5 = Extremely Crowded" value={fbForm.ratings.crowdLevel} onChange={v => setFbForm({ ...fbForm, ratings: { ...fbForm.ratings, crowdLevel: v } })} />
              <RatingRow label="Accessibility" value={fbForm.ratings.accessibility} onChange={v => setFbForm({ ...fbForm, ratings: { ...fbForm.ratings, accessibility: v } })} />
              <RatingRow label="Safety" value={fbForm.ratings.safety} onChange={v => setFbForm({ ...fbForm, ratings: { ...fbForm.ratings, safety: v } })} />
              <RatingRow label="Value for Money" value={fbForm.ratings.valueForMoney} onChange={v => setFbForm({ ...fbForm, ratings: { ...fbForm.ratings, valueForMoney: v } })} />
              <RatingRow label="Information Quality" value={fbForm.ratings.informationQuality} onChange={v => setFbForm({ ...fbForm, ratings: { ...fbForm.ratings, informationQuality: v } })} />
              <RatingRow label="Overall Satisfaction" value={fbForm.ratings.satisfaction} onChange={v => setFbForm({ ...fbForm, ratings: { ...fbForm.ratings, satisfaction: v } })} />
            </div>

            {/* Would Visit Again / Recommend */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div>
                <label className="exp-label">Would Visit Again?</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {(['yes', 'maybe', 'no'] as const).map(opt => (
                    <button key={opt} type="button" className={fbForm.wouldVisitAgain === opt ? 'exp-btn' : 'exp-btn-ghost'} style={{ padding: '0.35rem 0.85rem', textTransform: 'capitalize' }} onClick={() => setFbForm({ ...fbForm, wouldVisitAgain: opt })}>{opt}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="exp-label">Would Recommend?</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button type="button" className={fbForm.wouldRecommend === true ? 'exp-btn' : 'exp-btn-ghost'} style={{ padding: '0.35rem 0.85rem' }} onClick={() => setFbForm({ ...fbForm, wouldRecommend: true })}>Yes</button>
                  <button type="button" className={fbForm.wouldRecommend === false ? 'exp-btn' : 'exp-btn-ghost'} style={{ padding: '0.35rem 0.85rem' }} onClick={() => setFbForm({ ...fbForm, wouldRecommend: false })}>No</button>
                </div>
              </div>
            </div>

            {/* Multi-select Preference Questions (Section 4) */}
            <div style={{ marginBottom: '0.9rem' }}>
              <label className="exp-label">What did you enjoy?</label>
              <TagPicker options={ENJOY_DISLIKE_TAGS} selected={fbForm.enjoyedTags} onToggle={v => setFbForm({ ...fbForm, enjoyedTags: toggleArr(fbForm.enjoyedTags, v) })} accent={C.green} />
            </div>
            <div style={{ marginBottom: '0.9rem' }}>
              <label className="exp-label">What did you dislike?</label>
              <TagPicker options={[...DISLIKE_EXTRA_TAGS, ...ENJOY_DISLIKE_TAGS.slice(0, 8)]} selected={fbForm.dislikedTags} onToggle={v => setFbForm({ ...fbForm, dislikedTags: toggleArr(fbForm.dislikedTags, v) })} accent={C.red} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className="exp-label">What would you prefer next time?</label>
              <TagPicker options={NEXT_TIME_PREFS} selected={fbForm.nextTimePreferences} onToggle={v => setFbForm({ ...fbForm, nextTimePreferences: toggleArr(fbForm.nextTimePreferences, v) })} accent={C.gold} />
            </div>

            {/* Free-Text Experience + Live Extraction Preview (Section 5) */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="exp-label">Tell us about your experience (Optional)</label>
              <textarea
                className="exp-textarea"
                rows={3}
                placeholder='e.g. "The palace was beautiful but it was extremely crowded in the afternoon. I enjoyed the architecture and would prefer visiting early morning next time."'
                value={fbForm.freeTextFeedback}
                onChange={e => setFbForm({ ...fbForm, freeTextFeedback: e.target.value })}
              />
            </div>

            {extractPreview && (
              <div style={{ padding: '0.9rem', borderRadius: '12px', background: 'rgba(217,156,83,0.08)', border: '1px solid rgba(217,156,83,0.3)', marginBottom: '1rem', fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 800, color: C.gold, marginBottom: '0.35rem' }}>
                  🧠 Structured Knowledge Extracted — Sentiment: {extractPreview.sentiment} · Confidence: {extractPreview.confidenceLabel} ({Math.round((extractPreview.confidence || 0) * 100)}%)
                </div>
                {extractPreview.positives?.length > 0 && <div>✅ Positives: {extractPreview.positives.join(', ')}</div>}
                {extractPreview.negatives?.length > 0 && <div>⚠️ Negatives: {extractPreview.negatives.join(', ')}</div>}
                {extractPreview.temporalPreferences?.length > 0 && <div>⏰ Temporal Preferences: {extractPreview.temporalPreferences.map((t: any) => t.label).join(', ')}</div>}
                {extractPreview.weatherImpacts?.length > 0 && <div>🌧️ Weather Impact: {extractPreview.weatherImpacts.map((w: any) => `${w.weather} → ${w.futureSignal}`).join('; ')}</div>}
                {extractPreview.futurePreferences?.length > 0 && <div>🎯 Next-Trip Signals: {extractPreview.futurePreferences.join(', ')}</div>}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.7rem', flexWrap: 'wrap' }}>
              <button type="button" className="exp-btn-ghost" onClick={() => handlePreviewExtraction('modal')} disabled={extracting}>
                {extracting ? '⏳ Extracting…' : '✨ Preview Knowledge Extraction'}
              </button>
              <button type="button" className="exp-btn-ghost" onClick={() => setFeedbackModal(null)}>Cancel</button>
              <button type="button" className="exp-btn" onClick={handleSaveFeedback} disabled={savingFb}>
                {savingFb ? '⏳ Updating DEPKG…' : '💾 Save Feedback & Update DEPKG'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Extracted Knowledge Modal */}
      {inspectExp && (
        <div className="exp-overlay" onClick={() => setInspectExp(null)}>
          <div className="exp-modal" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontFamily: 'Cinzel, serif', margin: 0, fontSize: '1.15rem' }}>🧠 Extracted Knowledge — {inspectExp.title}</h2>
              <button className="exp-btn-ghost" onClick={() => setInspectExp(null)}>✕</button>
            </div>
            {inspectExp.freeTextFeedback && (
              <div style={{ marginBottom: '1rem', padding: '0.8rem', borderRadius: '10px', background: C.card, fontStyle: 'italic', fontSize: '0.85rem' }}>
                <strong>Original Feedback:</strong> "{inspectExp.freeTextFeedback}"
              </div>
            )}
            <pre style={{ margin: 0, padding: '0.9rem', borderRadius: '10px', background: C.card, fontSize: '0.76rem', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(inspectExp.extractedKnowledge, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
