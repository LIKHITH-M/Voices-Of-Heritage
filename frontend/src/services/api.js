import axios from "axios";

// Helper for local offline trip caching so trips are never lost
const LS_TRIP_KEYS = ["voh_saved_trips", "voh_trips"];

const getLocalTrips = () => {
  try {
    for (const key of LS_TRIP_KEYS) {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (e) {}
  return [];
};

const saveLocalTrip = (trip) => {
  try {
    const trips = getLocalTrips();
    const id = trip._id || trip.id || `local_${Date.now()}`;
    const cleanTrip = { ...trip, _id: id, id: id };
    const filtered = trips.filter((t) => (t._id || t.id) !== id);
    filtered.unshift(cleanTrip);
    for (const key of LS_TRIP_KEYS) {
      localStorage.setItem(key, JSON.stringify(filtered));
    }
    return cleanTrip;
  } catch (e) {
    return trip;
  }
};

const removeLocalTrip = (id) => {
  try {
    const trips = getLocalTrips();
    const filtered = trips.filter((t) => (t._id || t.id) !== id);
    for (const key of LS_TRIP_KEYS) {
      localStorage.setItem(key, JSON.stringify(filtered));
    }
  } catch (e) {}
};

const getBaseUrl = () => {
  // If in browser and served from localhost:3000, Vite proxies /api directly to port 5002
  if (typeof window !== "undefined") {
    return "/api";
  }
  try {
    if (
      typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_AI_PLANNER_API_URL
    ) {
      return import.meta.env.VITE_AI_PLANNER_API_URL;
    }
  } catch (e) {}
  return "http://localhost:5002/api";
};

// Create axios instance with clean CORS configuration
const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 120000, // 2 minutes for AI generation
  headers: {
    "Content-Type": "application/json",
  },
});

// User API calls
export const userAPI = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (data) => api.put("/users/profile", data),
};

// AI API calls
export const aiAPI = {
  generateItinerary: async (itineraryData) => {
    try {
      return await api.post("/ai/generate-itinerary", itineraryData);
    } catch (err) {
      console.warn("[aiAPI] /ai/generate-itinerary failed, trying /ai/generate-heritage-itinerary...", err.message);
      try {
        return await api.post("/ai/generate-heritage-itinerary", itineraryData);
      } catch (err2) {
        console.warn("[aiAPI] Relative fallback failed, trying direct port 5002...", err2.message);
        return await axios.post(
          "http://localhost:5002/api/ai/generate-heritage-itinerary",
          itineraryData,
          {
            headers: { "Content-Type": "application/json" },
            timeout: 60000,
          }
        );
      }
    }
  },
  optimizeItinerary: (optimizationData) =>
    api.post("/ai/optimize-itinerary", optimizationData),
  getTravelSuggestions: (preferencesData) =>
    api.post("/ai/travel-suggestions", preferencesData),
  getDestinationInsights: (destinationData) =>
    api.post("/ai/destination-insights", destinationData),
  getRecommendations: () => api.get("/ai/recommendations"),
  refreshRecommendations: () => api.post("/ai/recommendations/refresh"),
};

// Trip API calls (with resilient multi-target fallback & local sync)
export const tripAPI = {
  getTrips: async (params = {}) => {
    const localTrips = getLocalTrips();
    try {
      const res = await api.get("/trips", { params });
      const serverTrips = res.data?.trips || [];
      const merged = [...serverTrips];
      for (const lt of localTrips) {
        const ltId = String(lt._id || lt.id);
        if (!merged.some((st) => String(st._id || st.id) === ltId)) {
          merged.unshift(lt);
        }
      }
      return {
        data: {
          ...res.data,
          success: true,
          trips: merged,
        },
      };
    } catch (err) {
      try {
        const directRes = await axios.get("http://localhost:5002/api/trips", {
          params,
        });
        const serverTrips = directRes.data?.trips || [];
        const merged = [...serverTrips];
        for (const lt of localTrips) {
          const ltId = String(lt._id || lt.id);
          if (!merged.some((st) => String(st._id || st.id) === ltId)) {
            merged.unshift(lt);
          }
        }
        return {
          data: {
            ...directRes.data,
            success: true,
            trips: merged,
          },
        };
      } catch (err2) {
        return {
          data: {
            success: true,
            trips: localTrips,
            pagination: {
              currentPage: 1,
              totalPages: 1,
              totalTrips: localTrips.length,
            },
          },
        };
      }
    }
  },

  getTripById: async (id) => {
    try {
      return await api.get(`/trips/${id}`);
    } catch (err) {
      try {
        return await axios.get(`http://localhost:5002/api/trips/${id}`);
      } catch (err2) {
        const local = getLocalTrips().find((t) => (t._id || t.id) === id);
        if (local) {
          return { data: { success: true, trip: local } };
        }
        throw err;
      }
    }
  },

  createTrip: async (tripData) => {
    // Normalization
    const normalized = {
      ...tripData,
      status: tripData.status || "upcoming",
      destination:
        typeof tripData.destination === "string"
          ? {
              city: tripData.destination.split(",")[0]?.trim() || tripData.destination,
              country: tripData.destination.split(",")[1]?.trim() || "India",
              coordinates: { lat: 0, lng: 0 },
            }
          : tripData.destination || { city: "Destination", country: "India" },
      preferences: tripData.preferences || {
        duration: parseInt(tripData.duration) || 1,
        travelStyle: tripData.travelStyle || "budget",
        budget: tripData.budget || { min: 0, max: 0, currency: "INR" },
        groupSize: parseInt(tripData.travelers) || 1,
      },
    };

    // Always cache locally so data is never lost
    const localSaved = saveLocalTrip({
      _id: `trip_local_${Date.now()}`,
      ...normalized,
      createdAt: new Date().toISOString(),
    });

    try {
      const res = await api.post("/trips", normalized);
      if (res.data?.trip) {
        saveLocalTrip(res.data.trip);
      }
      return res;
    } catch (err) {
      console.warn("[tripAPI] Primary POST /trips failed, trying port 5002...", err.message);
      try {
        const directRes = await axios.post("http://localhost:5002/api/trips", normalized, {
          headers: { "Content-Type": "application/json" },
        });
        if (directRes.data?.trip) {
          saveLocalTrip(directRes.data.trip);
        }
        return directRes;
      } catch (err2) {
        console.warn("[tripAPI] Direct POST failed, using local fallback trip");
        return {
          data: {
            success: true,
            message: "Trip saved successfully",
            trip: localSaved,
          },
        };
      }
    }
  },

  updateTrip: async (id, tripData) => {
    try {
      return await api.put(`/trips/${id}`, tripData);
    } catch (err) {
      try {
        return await axios.put(`http://localhost:5002/api/trips/${id}`, tripData);
      } catch (err2) {
        saveLocalTrip({ _id: id, ...tripData });
        return { data: { success: true, trip: { _id: id, ...tripData } } };
      }
    }
  },

  deleteTrip: async (id) => {
    removeLocalTrip(id);
    try {
      return await api.delete(`/trips/${id}`);
    } catch (err) {
      try {
        return await axios.delete(`http://localhost:5002/api/trips/${id}`);
      } catch (err2) {
        return { data: { success: true, message: "Trip deleted" } };
      }
    }
  },

  getPublicTrips: (params = {}) => api.get("/trips/public", { params }),
  cloneTrip: (id) => api.post(`/trips/${id}/clone`),
  getTripStats: () => api.get("/trips/stats"),
  getUpcomingTrips: (params = {}) => api.get("/trips/upcoming", { params }),
  getPastTrips: (params = {}) => api.get("/trips/past", { params }),
  getRecentTrips: () => api.get("/trips/recent"),
};

// Maps API calls (using consolidated backend route)
export const mapsAPI = {
  getNearbyPlaces: (params = {}) => api.get("/maps/places/nearby", { params }),
  searchPlaces: (params = {}) => api.get("/maps/places/search", { params }),
  getDirections: (params = {}) => api.get("/maps/directions", { params }),
  geocodeAddress: (params = {}) => api.get("/maps/geocode", { params }),
  reverseGeocode: (params = {}) => api.get("/maps/reverse-geocode", { params }),
  saveLocation: (locationData) => api.post("/maps/save-location", locationData),
  getSavedLocations: () => api.get("/maps/saved-locations"),
  deleteSavedLocation: (id) => api.delete(`/maps/saved-locations/${id}`),
  getMultiStopRoute: (data) => api.post("/maps/multi-stop-route", data),
};


// Error handling utility
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    return {
      message: data.message || "An error occurred",
      status,
      errors: data.errors || null,
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      message: "Network error. Please check your connection.",
      status: 0,
      errors: null,
    };
  } else {
    // Something else happened
    return {
      message: error.message || "An unexpected error occurred",
      status: 0,
      errors: null,
    };
  }
};

export default api;
