const axios = require("axios");
const { logger } = require("../middleware/logging");

// Helper to wait (simple backoff)
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

class FreeMapService {
  constructor() {
    this.nominatimBase = "https://nominatim.openstreetmap.org";
    this.overpassUrl = "https://overpass-api.de/api/interpreter";
    this.osrmBase = "https://router.project-osrm.org"; // Public OSRM instance
    // Nominatim requires descriptive User-Agent
    this.userAgent =
      process.env.MAPS_USER_AGENT ||
      "AI-TripPlanner/1.0 (Educational Project; Node.js Application)";
    this.referer = "http://localhost:3000";
  }

  // Validate coordinates
  validateCoordinates(lat, lng) {
    return (
      typeof lat === "number" &&
      typeof lng === "number" &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  // Haversine distance in km
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(deg) {
    return deg * (Math.PI / 180);
  }

  // Geocode address using Nominatim with fallback
  async geocode(address) {
    try {
      // Add delay to respect Nominatim's usage policy (max 1 request per second)
      await sleep(1500); // Increased to 1.5 seconds for safety
      
      let response;
      try {
        // Try Nominatim first
        response = await axios.get(`${this.nominatimBase}/search`, {
          params: {
            q: address,
            format: "json",
            addressdetails: 1,
            limit: 1,
          },
          headers: {
            "User-Agent": this.userAgent,
            Referer: this.referer,
          },
          timeout: 10000,
        });
      } catch (nominatimError) {
        // If Nominatim fails with 403, try alternative service
        if (nominatimError.response?.status === 403) {
          logger.warn("Nominatim blocked, using fallback geocoder");
          response = await axios.get("https://geocode.maps.co/search", {
            params: {
              q: address,
              format: "json",
            },
            timeout: 10000,
          });
        } else {
          throw nominatimError;
        }
      }
      
      if (!response.data || response.data.length === 0) {
        logger.warn(`No geocode results for: ${address}`);
        throw new Error("No results found");
      }
      
      const r = response.data[0];
      const result = {
        formatted_address: r.display_name,
        location: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) },
        place_id: r.osm_id || r.place_id,
        types: r.type ? [r.type] : [],
        address_components: r.address || {},
      };
      return result;
    } catch (err) {
      logger.error("Free geocode error:", {
        message: err.message,
        address,
        status: err.response?.status,
        statusText: err.response?.statusText,
      });
      throw err;
    }
  }

  // Reverse geocode using Nominatim
  async reverseGeocode(lat, lng) {
    try {
      const response = await axios.get(`${this.nominatimBase}/reverse`, {
        params: {
          lat,
          lon: lng,
          format: "json",
          addressdetails: 1,
        },
        headers: { "User-Agent": this.userAgent },
      });
      if (!response.data) throw new Error("No reverse geocode result");
      const r = response.data;
      const result = {
        formatted_address: r.display_name,
        location: { lat, lng },
        place_id: r.osm_id,
        types: r.type ? [r.type] : [],
        address_components: r.address || {},
      };
      return result;
    } catch (err) {
      logger.error("Free reverse geocode error", err.message);
      throw err;
    }
  }

  // Map Google-like place type to Overpass filters
  buildOverpassFilter(type) {
    switch (type) {
      case "restaurant":
        return "[amenity=restaurant]";
      case "cafe":
        return "[amenity=cafe]";
      case "lodging":
        return "[tourism=hotel]";
      case "museum":
        return "[tourism=museum]";
      case "park":
        return "[leisure=park]";
      case "shopping_mall":
        return "[shop=mall]";
      case "hospital":
        return "[amenity=hospital]";
      case "pharmacy":
        return "[amenity=pharmacy]";
      case "tourist_attraction":
        return "[tourism=attraction]";
      default:
        return "[amenity]"; // any amenity fallback
    }
  }

  // Nearby search using Overpass (node + ways around center) with Nominatim fallback
  async nearbySearch(location, radius = 5000, type = null, keyword = null) {
    const [lat, lng] = location.split(",").map(parseFloat);
    
    try {
      // Sanitize keyword for regex (remove non-alphanumeric, keep spaces)
      let safeKeyword = "";
      if (keyword) {
        safeKeyword = keyword.replace(/[^a-zA-Z0-9\s]/g, "").trim();
        // If keyword is too long, just use the first few words to improve match chances
        if (safeKeyword.split(" ").length > 3) {
          safeKeyword = safeKeyword.split(" ").slice(0, 3).join(" ");
        }
      }
      
      const filter = type ? this.buildOverpassFilter(type) : "[amenity]";
      const keywordFilter = safeKeyword ? `['name'~'${safeKeyword}',i]` : "";
      // Overpass QL query
      const query = `[out:json][timeout:5];(node(around:${radius},${lat},${lng})${filter}${keywordFilter};way(around:${radius},${lat},${lng})${filter}${keywordFilter};);out center 40;`;

      logger.info(`Attempting nearby search via Overpass (lat: ${lat}, lng: ${lng}, radius: ${radius}m, type: ${type || 'any'})...`);
      const response = await axios.post(
        this.overpassUrl,
        `data=${encodeURIComponent(query)}`,
        { 
          headers: { 
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": this.userAgent
          },
          timeout: 4000 // Strict 4-second timeout to fail fast
        }
      );

      const elements = response.data.elements || [];
      const results = elements
        .filter((el) => el.tags && el.tags.name)
        .map((el) => ({
          place_id: el.id,
          name: el.tags.name,
          vicinity:
            [el.tags.addr_full, el.tags.addr_city, el.tags.addr_state]
              .filter(Boolean)
              .join(", ") || "",
          geometry: {
            location: {
              lat: el.lat || el.center?.lat,
              lng: el.lon || el.center?.lon,
            },
          },
          rating: null,
          price_level: null,
          types: Object.keys(el.tags).filter((k) => !k.startsWith("addr")),
          opening_hours: null,
          photos: [],
        }));

      logger.info(`Overpass nearby search succeeded with ${results.length} results.`);
      return {
        results,
        status: results.length ? "OK" : "ZERO_RESULTS",
      };
    } catch (err) {
      logger.warn(`Overpass nearby search failed or timed out: ${err.message}. Falling back to Nominatim bounded search...`);
      
      try {
        // Calculate bounding box for Nominatim around the center lat, lng
        const latDiff = radius / 111320;
        const lngDiff = radius / (111320 * Math.cos(lat * Math.PI / 180));
        const left = lng - lngDiff;
        const right = lng + lngDiff;
        const bottom = lat - latDiff;
        const top = lat + latDiff;

        let searchQuery = type || "amenity";
        if (type === "lodging") searchQuery = "hotel";
        if (type === "shopping_mall") searchQuery = "mall";
        if (type === "tourist_attraction") searchQuery = "attraction";

        const q = keyword ? `${keyword} ${searchQuery}` : searchQuery;
        const viewbox = `${left},${top},${right},${bottom}`;

        const response = await axios.get(`${this.nominatimBase}/search`, {
          params: {
            q,
            viewbox,
            bounded: 1,
            format: "json",
            addressdetails: 1,
            limit: 40
          },
          headers: {
            "User-Agent": this.userAgent,
            Referer: this.referer
          },
          timeout: 5000 // 5-second timeout for Nominatim
        });

        const results = (response.data || []).map((r) => ({
          place_id: r.osm_id || r.place_id,
          name: r.name || r.display_name.split(",")[0] || "Unknown",
          vicinity: r.display_name || "",
          geometry: {
            location: {
              lat: parseFloat(r.lat),
              lng: parseFloat(r.lon)
            }
          },
          rating: null,
          price_level: null,
          types: [r.class, r.type].filter(Boolean),
          opening_hours: null,
          photos: []
        }));

        logger.info(`Nominatim fallback search succeeded with ${results.length} results.`);
        return {
          results,
          status: results.length ? "OK" : "ZERO_RESULTS",
        };
      } catch (fallbackErr) {
        logger.error("Both Overpass and Nominatim fallback failed.", fallbackErr.message);
        return { results: [], status: "ERROR" };
      }
    }
  }

  // Text search using Nominatim (broader than nearby)
  async searchPlaces(query, location = null, radius = 50000, type = null) {
    try {
      const response = await axios.get(`${this.nominatimBase}/search`, {
        params: {
          q: query,
          format: "json",
          addressdetails: 1,
          limit: 10,
        },
        headers: { "User-Agent": this.userAgent },
      });
      const results = (response.data || []).map((r) => ({
        place_id: r.osm_id,
        name: r.display_name.split(",")[0],
        formatted_address: r.display_name,
        geometry: {
          location: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) },
        },
        rating: null,
        price_level: null,
        types: r.type ? [r.type] : [],
        opening_hours: null,
        photos: [],
      }));
      const payload = {
        results,
        status: results.length ? "OK" : "ZERO_RESULTS",
      };
      return payload;
    } catch (err) {
      logger.error("Free search places error", err.message);
      return { results: [], status: "ERROR" };
    }
  }

  // Directions using OSRM
  async getDirections(origin, destination, mode = "driving") {
    try {
      const [oLat, oLng] = origin.split(",").map(parseFloat);
      const [dLat, dLng] = destination.split(",").map(parseFloat);
      const profile =
        mode === "walking" ? "foot" : mode === "bicycling" ? "bike" : "driving";

      const url = `${this.osrmBase}/route/v1/${profile}/${oLng},${oLat};${dLng},${dLat}`;
      const response = await axios.get(url, {
        params: { overview: "full", steps: true, geometries: "geojson" },
      });
      if (!response.data || response.data.code !== "Ok") {
        throw new Error("Routing failed");
      }
      const route = response.data.routes[0];
      const leg = route.legs[0];
      const directionsData = {
        routes: [
          {
            summary: "OSRM Route",
            legs: [
              {
                distance: {
                  value: leg.distance,
                  text: `${(leg.distance / 1000).toFixed(2)} km`,
                },
                duration: {
                  value: leg.duration,
                  text: `${Math.round(leg.duration / 60)} mins`,
                },
                start_address: origin,
                end_address: destination,
                start_location: { lat: oLat, lng: oLng },
                end_location: { lat: dLat, lng: dLng },
                steps: leg.steps.map((s) => ({
                  distance: {
                    value: s.distance,
                    text: `${Math.round(s.distance)} m`,
                  },
                  duration: {
                    value: s.duration,
                    text: `${Math.round(s.duration)} s`,
                  },
                  instructions: s.name || s.maneuver.type,
                  start_location: {
                    lat: s.maneuver.location[1],
                    lng: s.maneuver.location[0],
                  },
                  end_location: {
                    lat: s.maneuver.location[1],
                    lng: s.maneuver.location[0],
                  },
                  travel_mode: profile.toUpperCase(),
                })),
              },
            ],
            overview_polyline: route.geometry,
            bounds: null,
          },
        ],
        status: "OK",
      };
      return directionsData;
    } catch (err) {
      logger.error("Free directions error", err.message);
      throw err;
    }
  }

  // Multi-stop route using OSRM
  async getMultiStopRoute(points, mode = "driving") {
    try {
      if (!points || points.length < 2) {
        throw new Error("At least two points are required for a route");
      }

      const profile = mode === "walking" ? "foot" : mode === "bicycling" ? "bike" : "driving";
      const coordsString = points.map(p => `${p.lng},${p.lat}`).join(";");
      const url = `${this.osrmBase}/route/v1/${profile}/${coordsString}`;

      const response = await axios.get(url, {
        params: { overview: "full", steps: false, geometries: "geojson" },
      });

      if (!response.data || response.data.code !== "Ok") {
        throw new Error("Multi-stop routing failed");
      }

      return {
        success: true,
        route: response.data.routes[0],
        waypoints: response.data.waypoints
      };
    } catch (err) {
      logger.error("Multi-stop route error:", err.message);
      throw err;
    }
  }
}

module.exports = new FreeMapService();
