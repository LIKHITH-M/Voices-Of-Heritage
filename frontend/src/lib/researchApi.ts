/**
 * frontend/src/lib/researchApi.ts
 *
 * Axios client for the VoH Research Service (port 5003).
 * This is the ONLY file that should import from VITE_RESEARCH_SERVICE_URL.
 *
 * Usage:
 *   import researchApi from '@/lib/researchApi';
 *   await researchApi.post('/feedback', { userId, payload });
 */

import axios from 'axios';
import { auth } from '@/lib/firebase';

const BASE_URL =
  import.meta.env.VITE_RESEARCH_SERVICE_URL || 'http://localhost:5003/api';

const researchApi = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Firebase ID token to every request (same pattern as api.ts)
researchApi.interceptors.request.use(async (config) => {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Non-critical — research endpoints are not auth-gated yet
  }
  return config;
});

// ─── Typed helper functions ───────────────────────────────────────────────────

export interface SiteFeedbackPayload {
  userId: string;
  tripId?: string;
  payload: {
    siteId: string;
    siteName: string;
    satisfactionRating: number;       // 1–5
    activities?: string[];
    feedbackTags?: string[];
    notes?: string;
    duration?: number;                // minutes
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    crowdLevel?: 'low' | 'mid' | 'high';
    transportMode?: string;
    weather?: string;
    companions?: number;
    wouldRecommend?: boolean;
    wouldRevisit?: boolean;
  };
}

export interface TripReflectionPayload {
  userId: string;
  tripId: string;
  payload: {
    overallSatisfaction: number;      // 1–5
    bestMoment?: string;
    wouldChange?: string[];
    dimensionRatings?: {
      heritage_value?: number;
      food_quality?: number;
      accommodation?: number;
      transport?: number;
      crowd_comfort?: number;
      value_for_money?: number;
      guide_quality?: number;
      accessibility?: number;
    };
    preferencesDiscovered?: string[];
    notes?: string;
  };
}

/** Record a post-visit feedback event for a heritage site */
export async function submitSiteFeedback(data: SiteFeedbackPayload) {
  const res = await researchApi.post('/feedback', data);
  return res.data;
}

/** Record a post-trip holistic reflection */
export async function submitTripReflection(data: TripReflectionPayload) {
  const res = await researchApi.post('/reflection', data);
  return res.data;
}

/** Record any generic implicit event (search, bookmark, map click, etc.) */
export async function recordEvent(data: {
  userId: string;
  tripId?: string;
  eventType: string;
  payload: Record<string, unknown>;
  source?: string;
}) {
  const res = await researchApi.post('/experiences', data);
  return res.data;
}

/** Get user's experience history */
export async function getExperiences(
  userId: string,
  options?: { limit?: number; offset?: number; eventType?: string }
) {
  const res = await researchApi.get(`/experiences/${userId}`, { params: options });
  return res.data;
}

/** Save a generated trip to the backend */
export async function saveTrip(tripData: Record<string, unknown>) {
  const res = await researchApi.post('/trips', tripData);
  return res.data;
}

/** Get user's trip history from backend */
export async function getUserTrips(
  userId: string,
  options?: { limit?: number; offset?: number; status?: string }
) {
  const res = await researchApi.get(`/trips/${userId}`, { params: options });
  return res.data;
}

/** Get single trip */
export async function getTrip(userId: string, tripId: string) {
  const res = await researchApi.get(`/trips/${userId}/${tripId}`);
  return res.data;
}

/** Update trip status */
export async function updateTrip(
  userId: string,
  tripId: string,
  data: { status?: string; overallSatisfaction?: number }
) {
  const res = await researchApi.put(`/trips/${userId}/${tripId}`, data);
  return res.data;
}

export default researchApi;

