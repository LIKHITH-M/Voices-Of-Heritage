/**
 * RouteCompanion.tsx — Voices of Heritage
 * Floating AI Route Companion — lives on every page
 *
 * Phase 1-4 Complete:
 *  ✅ Floating button & Overlay (Home, Planner, Active, SOS, Vehicle Profile)
 *  ✅ Nominatim geocoding & OSRM routing
 *  ✅ Leaflet map with Overpass POI markers & Route Coloring
 *  ✅ PDF Generation grouped by category
 *  ✅ Vehicle Profile (Car/Bike/EV) & AI Insights (Fuel warnings, Tolls)
 *  ✅ Offline Save & Breakdown Mode
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* ═══════════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════════ */
type Mode = 'home' | 'planner' | 'active' | 'sos' | 'vehicle' | 'offline_list' | 'offline_select' | 'offline_view';
interface LatLng { lat: number; lng: number; label?: string }
interface NomResult { display_name: string; lat: string; lon: string }
interface RouteOption { distance: number; duration: number; geometry: [number, number][]; label: string; tolls: number; tollCost: number }
interface ServicePoint { lat: number; lng: number; name: string; type: string; category: string; icon: string; color: string; tags?: Record<string, string>; city?: string; }
interface SavedRoute { id: string; origin: LatLng; destination: LatLng; distance: number; duration: number; savedAt: string; isOffline?: boolean }
interface VehicleProfile { type: 'car' | 'bike' | 'ev'; fuelType: 'petrol' | 'diesel' | 'cng' | 'electric'; mileage: number; tankSize: number; currentLevel: number; }
interface OfflineRegion {
  id: string;
  name: string;
  bounds: { north: number; south: number; east: number; west: number };
  center: [number, number];
  zoom: number;
  tileCount: number;
  sizeMB: string;
  savedAt: string;
  tiles: string[];
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SERVICE CATEGORIES
   ═══════════════════════════════════════════════════════════════════════════════ */
const CATEGORIES = [
  { id: 'fuel',      label: 'Fuel',       icon: '⛽', color: '#EF4444' },
  { id: 'medical',   label: 'Medical',    icon: '🏥', color: '#EC4899' },
  { id: 'repair',    label: 'Repair',     icon: '🔧', color: '#8B5CF6' },
  { id: 'food',      label: 'Food',       icon: '🍽️', color: '#F97316' },
  { id: 'stay',      label: 'Stay',       icon: '🏨', color: '#06B6D4' },
  { id: 'amenity',   label: 'Amenities',  icon: '🚻', color: '#10B981' },
  { id: 'hazard',    label: 'Alerts',     icon: '⚠️', color: '#FBBF24' },
  { id: 'heritage',  label: 'Heritage',   icon: '🏛️', color: '#D99C53' },
];

const QUICK_DESTS = [
  { label: 'Hampi', lat: 15.335, lng: 76.461 },
  { label: 'Jaipur', lat: 26.912, lng: 75.787 },
  { label: 'Varanasi', lat: 25.317, lng: 82.974 },
  { label: 'Goa', lat: 15.299, lng: 74.124 },
  { label: 'Udaipur', lat: 24.585, lng: 73.713 },
  { label: 'Mysore', lat: 12.296, lng: 76.639 },
  { label: 'Agra', lat: 27.177, lng: 78.008 },
  { label: 'Rishikesh', lat: 30.087, lng: 78.268 },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   APIS
   ═══════════════════════════════════════════════════════════════════════════════ */
async function geocode(q: string): Promise<NomResult[]> {
  if (!q || q.length < 2) return [];
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=in`, { headers: { 'Accept-Language': 'en' } });
    return await r.json();
  } catch { return []; }
}

async function calcRoute(o: LatLng, d: LatLng): Promise<RouteOption[]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${o.lng},${o.lat};${d.lng},${d.lat}?overview=full&geometries=geojson&alternatives=true`;
    const r = await fetch(url);
    const j = await r.json();
    if (j.code !== 'Ok' || !j.routes?.length) return [];
    return j.routes.slice(0, 3).map((rt: any, i: number) => ({
      distance: Math.round(rt.distance / 1000),
      duration: Math.round(rt.duration / 60),
      geometry: rt.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]),
      label: i === 0 ? 'Fastest' : i === 1 ? 'Alternative' : 'Scenic',
      tolls: Math.floor(rt.distance / 120000),
      tollCost: Math.floor(rt.distance / 120000) * 95,
    }));
  } catch { return []; }
}

// Priority weight for sorting: hospitals > clinics > pharmacies, etc.
const MEDICAL_PRIORITY: Record<string, number> = {
  hospital: 1, pharmacy: 2, clinic: 3,
};
const FUEL_PRIORITY: Record<string, number> = {
  'Indian Oil': 1, 'IOCL': 1, 'HP': 2, 'HPCL': 2, 'BPCL': 2, 'Bharat Petroleum': 2,
  'Shell': 3, 'Essar': 3, 'Reliance': 3, 'fuel': 99,
};

// Build accurate Google Maps search link using place name + exact coordinates
function googleMapsLink(name: string, lat: number, lng: number): string {
  // Use search with name as query and location bias — this ensures correct named place opens
  const q = encodeURIComponent(name);
  return `https://www.google.com/maps/search/?api=1&query=${q}&ll=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

async function fetchServices(bbox: [number, number, number, number], cats: string[]): Promise<ServicePoint[]> {
  const activeCats = CATEGORIES.filter(c => cats.includes(c.id));
  if (!activeCats.length) return [];
  const queries = activeCats.map(cat => {
    if (cat.id === 'repair') return `nwr["shop"~"car_repair|car_parts|tyres"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});nwr["craft"~"mechanic"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});`;
    if (cat.id === 'hazard') return `nwr["barrier"="toll_booth"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});nwr["highway"="speed_camera"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});`;
    const tags = cat.id === 'fuel' ? 'nwr["amenity"="fuel"]' : cat.id === 'medical' ? 'nwr["amenity"~"hospital|pharmacy|clinic"]' : cat.id === 'food' ? 'nwr["amenity"~"restaurant|cafe|fast_food"]' : cat.id === 'stay' ? 'nwr["tourism"~"hotel|guest_house|motel|hostel"]' : cat.id === 'amenity' ? 'nwr["amenity"~"toilets|atm|bank"]' : 'nwr["historic"]["tourism"~"attraction|museum|viewpoint"]';
    return `${tags}(${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});`;
  });
  const query = `[out:json][timeout:25];(${queries.join('')});out center 300;`;
  try {
    const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: `data=${encodeURIComponent(query)}` });
    const j = await r.json();
    const results: ServicePoint[] = [];
    for (const el of (j.elements || [])) {
      const tags = el.tags || {};
      const lat = el.lat || el.center?.lat;
      const lng = el.lon || el.center?.lon;
      if (!lat || !lng) continue;

      const amenity = tags.amenity || tags.shop || tags.tourism || tags.historic || tags.barrier || tags.highway || tags.craft || '';
      const cat = amenity.includes('fuel') ? 'fuel'
        : amenity.includes('hospital') || amenity.includes('pharmacy') || amenity.includes('clinic') ? 'medical'
        : amenity.includes('car_repair') || amenity.includes('car_parts') || amenity.includes('tyres') || tags.craft === 'mechanic' ? 'repair'
        : amenity.includes('restaurant') || amenity.includes('cafe') || amenity.includes('fast_food') ? 'food'
        : amenity.includes('hotel') || amenity.includes('guest') || amenity.includes('motel') || amenity.includes('hostel') ? 'stay'
        : amenity.includes('toilet') || amenity.includes('atm') || amenity.includes('bank') ? 'amenity'
        : amenity.includes('toll') || amenity.includes('speed') ? 'hazard' : 'heritage';

      const catDef = CATEGORIES.find(c => c.id === cat) || CATEGORIES[0];

      // Use name or brand — skip anonymous entries with no real name
      const rawName = tags.name || tags.brand || tags['name:en'] || tags['official_name'] || '';
      if (!rawName.trim()) continue; // skip unnamed places — inaccurate links

      const city = tags['addr:city'] || tags['addr:village'] || tags['addr:town'] || tags['addr:district'] || tags['addr:suburb'] || tags['is_in:city'] || '';

      results.push({
        lat, lng,
        name: rawName.trim(),
        type: amenity || tags.craft || catDef.label,
        category: cat,
        icon: catDef.icon, color: catDef.color, tags, city
      });
    }
    return results;
  } catch { return []; }
}

// Find how far along the route a POI sits (returns route polyline index 0 = start, max = end)
function routeProgress(lat: number, lng: number, geom: [number, number][]): number {
  if (!geom.length) return 0;
  let minDist = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < geom.length; i++) {
    const d = Math.hypot(lat - geom[i][0], lng - geom[i][1]);
    if (d < minDist) { minDist = d; bestIdx = i; }
  }
  return bestIdx;
}

// Sort services purely by location along route — from start to end
// Falls back to distance from origin if no route geometry is available
function sortServices(
  svcs: ServicePoint[],
  origin: { lat: number; lng: number } | null,
  geom?: [number, number][]
): ServicePoint[] {
  return [...svcs].sort((a, b) => {
    if (geom && geom.length > 0) {
      // Sort by where the POI sits along the route polyline (start = 0, end = max index)
      return routeProgress(a.lat, a.lng, geom) - routeProgress(b.lat, b.lng, geom);
    }
    // Fallback: sort by straight-line distance from origin
    if (origin) {
      return Math.hypot(a.lat - origin.lat, a.lng - origin.lng)
           - Math.hypot(b.lat - origin.lat, b.lng - origin.lng);
    }
    return 0;
  });
}

/* ═══════════════════════════════════════════════════════════════════════════════
   LOCAL STORAGE
   ═══════════════════════════════════════════════════════════════════════════════ */
const RC_LS = 'voh_rc_routes';
const RC_VEHICLE = 'voh_rc_vehicle';
function getRecentRoutes(): SavedRoute[] { try { return JSON.parse(localStorage.getItem(RC_LS) || '[]'); } catch { return []; } }
function addRecentRoute(r: SavedRoute) {
  const ex = getRecentRoutes().filter(x => x.id !== r.id).slice(0, 9);
  localStorage.setItem(RC_LS, JSON.stringify([r, ...ex]));
}
function markRouteOffline(id: string) {
  const routes = getRecentRoutes();
  const route = routes.find(r => r.id === id);
  if (route) { route.isOffline = true; localStorage.setItem(RC_LS, JSON.stringify(routes)); }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   OFFLINE MAPS & TILE CACHING ENGINE
   ═══════════════════════════════════════════════════════════════════════════════ */
const RC_OFFLINE_REGIONS = 'voh_rc_offline_regions';
const CACHE_NAME = 'voh-offline-map-tiles';

function getOfflineRegions(): OfflineRegion[] {
  try { return JSON.parse(localStorage.getItem(RC_OFFLINE_REGIONS) || '[]'); } catch { return []; }
}
function saveOfflineRegion(r: OfflineRegion) {
  const existing = getOfflineRegions().filter(x => x.id !== r.id);
  localStorage.setItem(RC_OFFLINE_REGIONS, JSON.stringify([r, ...existing]));
}
async function removeOfflineRegion(id: string) {
  const all = getOfflineRegions();
  const target = all.find(x => x.id === id);
  if (target && 'caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(target.tiles.map(url => cache.delete(url)));
    } catch (e) {
      console.warn('Cache clear error:', e);
    }
  }
  const filtered = all.filter(x => x.id !== id);
  localStorage.setItem(RC_OFFLINE_REGIONS, JSON.stringify(filtered));
}

function lon2tile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}
function lat2tile(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom));
}

function getTileUrlsForBounds(bounds: L.LatLngBounds, minZoom: number, maxZoom: number): string[] {
  const urls: string[] = [];
  const subdomains = ['a', 'b', 'c'];
  const minLat = bounds.getSouth();
  const maxLat = bounds.getNorth();
  const minLng = bounds.getWest();
  const maxLng = bounds.getEast();

  for (let z = minZoom; z <= maxZoom; z++) {
    const xMin = Math.min(lon2tile(minLng, z), lon2tile(maxLng, z));
    const xMax = Math.max(lon2tile(minLng, z), lon2tile(maxLng, z));
    const yMin = Math.min(lat2tile(maxLat, z), lat2tile(minLat, z));
    const yMax = Math.max(lat2tile(maxLat, z), lat2tile(minLat, z));

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const s = subdomains[(x + y) % subdomains.length];
        urls.push(`https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`);
      }
    }
  }
  return urls;
}

function createOfflineTileLayer() {
  const CustomLayer = (L.TileLayer as any).extend({
    createTile(coords: any, done: any) {
      const tile = document.createElement('img');
      const url = this.getTileUrl(coords);
      tile.alt = '';
      tile.setAttribute('role', 'presentation');

      if ('caches' in window) {
        caches.open(CACHE_NAME).then(cache => {
          cache.match(url).then(response => {
            if (response) {
              response.blob().then(blob => {
                tile.src = URL.createObjectURL(blob);
                done(null, tile);
              }).catch(() => {
                tile.src = url;
                tile.onload = () => done(null, tile);
                tile.onerror = (e) => done(e, tile);
              });
            } else {
              tile.src = url;
              tile.onload = () => done(null, tile);
              tile.onerror = (e) => done(e, tile);
            }
          }).catch(() => {
            tile.src = url;
            tile.onload = () => done(null, tile);
            tile.onerror = (e) => done(e, tile);
          });
        }).catch(() => {
          tile.src = url;
          tile.onload = () => done(null, tile);
          tile.onerror = (e) => done(e, tile);
        });
      } else {
        tile.src = url;
        tile.onload = () => done(null, tile);
        tile.onerror = (e) => done(e, tile);
      }

      return tile;
    }
  });

  return new CustomLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    crossOrigin: true
  });
}

async function cacheTileUrls(
  urls: string[],
  onProgress: (done: number, total: number) => void
): Promise<number> {
  if (!('caches' in window)) {
    throw new Error('Offline storage is not supported in this browser.');
  }
  const cache = await caches.open(CACHE_NAME);
  let done = 0;
  const concurrency = 6;
  for (let i = 0; i < urls.length; i += concurrency) {
    const chunk = urls.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (url) => {
        try {
          const match = await cache.match(url);
          if (!match) {
            const resp = await fetch(url, { mode: 'cors' });
            if (resp.ok) {
              await cache.put(url, resp);
            }
          }
        } catch (e) {
          // ignore single tile error
        } finally {
          done++;
          onProgress(done, urls.length);
        }
      })
    );
  }
  return done;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PDF GENERATOR & MAP ICONS
   ═══════════════════════════════════════════════════════════════════════════════ */
function svcIcon(emoji: string, color: string, big = false) {
  const sz = big ? 32 : 24;
  return L.divIcon({
    className: '',
    html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:${big ? 14 : 10}px;line-height:1;cursor:pointer;transition:transform .15s" onmouseenter="this.style.transform='scale(1.25)'" onmouseleave="this.style.transform='scale(1)'">${emoji}</div>`,
    iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
  });
}
function endIcon(emoji: string, color: string) {
  const sz = 36;
  return L.divIcon({
    className: '',
    html: `<div style="width:${sz}px;height:${sz}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 3px 12px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:16px">${emoji}</span></div>`,
    iconSize: [sz, sz], iconAnchor: [sz / 2, sz], popupAnchor: [0, -sz],
  });
}

function getDistKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))/2;
  return Math.round(12742 * Math.asin(Math.sqrt(a)));
}

function printRouteCompanionPdf(route: RouteOption, origin: LatLng, dest: LatLng, services: ServicePoint[]) {
  const byCategory: Record<string, ServicePoint[]> = {};
  CATEGORIES.forEach(c => byCategory[c.label] = []);
  
  // Sort all services by route progression: start → end
  const sorted = sortServices(services, origin, route.geometry);
  
  sorted.forEach(s => {
    const cat = CATEGORIES.find(c => c.id === s.category)?.label || 'Other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(s); // already sorted, push in order
  });

  const parts = [];
  parts.push('<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Route Companion</title>');
  parts.push('<style>');
  parts.push("@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');");
  parts.push("body { font-family: 'Inter', sans-serif; padding: 30px; color: #1a1a1a; background: #fff; }");
  parts.push("h1 { color: #B4773B; border-bottom: 2px solid #B4773B; padding-bottom: 10px; margin-bottom: 5px; font-size: 24px; }");
  parts.push(".meta { color: #666; font-size: 14px; margin-bottom: 30px; }");
  parts.push(".cat-sec { margin-bottom: 30px; page-break-inside: avoid; }");
  parts.push("h2 { font-size: 18px; color: #333; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px; }");
  parts.push("table { width: 100%; border-collapse: collapse; font-size: 12px; }");
  parts.push("th { text-align: left; background: #f7f7f7; padding: 8px; color: #555; text-transform: uppercase; letter-spacing: 0.05em; font-size: 10px; }");
  parts.push("td { padding: 8px; border-bottom: 1px solid #eee; vertical-align: top; }");
  parts.push("a { color: #2563eb; text-decoration: none; }");
  parts.push("a:hover { text-decoration: underline; }");
  parts.push(".type-badge { background: #eee; padding: 2px 6px; border-radius: 4px; font-size: 10px; color: #555; text-transform: uppercase; }");
  parts.push('</style></head><body>');
  
  parts.push('<h1>Route: ' + (origin.label || 'Start') + ' &rarr; ' + (dest.label || 'End') + '</h1>');
  parts.push('<div class="meta">' + route.distance + ' km &middot; ' + Math.floor(route.duration/60) + 'h ' + (route.duration%60) + 'm &middot; Tolls: ' + route.tolls + '</div>');

  CATEGORIES.forEach(c => {
    const svcs = byCategory[c.label];
    if (!svcs || svcs.length === 0) return;
    
    parts.push('<div class="cat-sec">');
    parts.push('<h2>' + c.icon + ' ' + c.label + ' (' + svcs.length + ')</h2>');
    parts.push('<table><thead><tr><th width="35%">Name</th><th width="35%">Location Area</th><th width="15%">Type</th><th width="15%">Map Link</th></tr></thead><tbody>');
    
    // Per-category list is already in route-progress order from the global sort above
    svcs.forEach(s => {
      const locText = s.city ? s.city : `~${getDistKm(origin.lat, origin.lng, s.lat, s.lng)} km from start`;
      const mapsUrl = googleMapsLink(s.name, s.lat, s.lng);
      parts.push('<tr>');
      parts.push('<td><strong>' + s.name + '</strong></td>');
      parts.push('<td>' + locText + '</td>');
      parts.push('<td><span class="type-badge">' + s.type.replace('_', ' ') + '</span></td>');
      parts.push('<td><a href="' + mapsUrl + '" target="_blank">Open in Maps ↗</a></td>');
      parts.push('</tr>');
    });
    
    parts.push('</tbody></table></div>');
  });

  parts.push('</body></html>');
  const html = parts.join('');

  const w = window.open('', '_blank');
  if (!w) { alert('Allow popups to download PDF.'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */
function RouteCompanionInner() {
  const { theme } = useTheme();
  const dk = theme === 'dark';

  const C = {
    bg: dk ? '#0A0A0B' : '#FFFFFF',
    surface: dk ? '#0F0F11' : '#F7F3E9',
    card: dk ? '#151518' : '#EEE8DA',
    border: dk ? 'rgba(255,255,255,.06)' : 'rgba(180,130,80,.15)',
    amber: dk ? '#B4773B' : '#A15B17',
    gold: dk ? '#D99C53' : '#D97706',
    text: dk ? '#EDEDED' : '#2E251E',
    muted: dk ? '#7A7A7A' : '#786A5E',
    green: '#4ADE80', red: '#EF4444', blue: '#60A5FA',
  };

  /* state */
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<Mode>('home');
  const [originText, setOriginText] = useState('');
  const [destText, setDestText] = useState('');
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [dest, setDest] = useState<LatLng | null>(null);
  const [originSugg, setOriginSugg] = useState<NomResult[]>([]);
  const [destSugg, setDestSugg] = useState<NomResult[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selRoute, setSelRoute] = useState(0);
  const [activeFilters, setActiveFilters] = useState<string[]>(['fuel', 'food', 'medical', 'heritage']);
  const [services, setServices] = useState<ServicePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSvc, setLoadingSvc] = useState(false);
  const [recentRoutes, setRecentRoutes] = useState<SavedRoute[]>([]);
  const [locating, setLocating] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [breakdownMode, setBreakdownMode] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [currentRouteId, setCurrentRouteId] = useState<string>('');
  
  const [vehicle, setVehicle] = useState<VehicleProfile>(() => {
    const saved = localStorage.getItem(RC_VEHICLE);
    return saved ? JSON.parse(saved) : { type: 'car', fuelType: 'petrol', mileage: 15, tankSize: 40, currentLevel: 100 };
  });

  // Offline Maps State
  const [offlineRegions, setOfflineRegions] = useState<OfflineRegion[]>(() => getOfflineRegions());
  const [offlineRegionName, setOfflineRegionName] = useState<string>('Heritage Exploration Area');
  const [offlineEstimate, setOfflineEstimate] = useState<{ count: number; sizeMB: string; urls: string[] }>({ count: 0, sizeMB: '0.0 MB', urls: [] });
  const [offlineDownloading, setOfflineDownloading] = useState(false);
  const [offlineProgress, setOfflineProgress] = useState(0);
  const [offlineDownloadSuccess, setOfflineDownloadSuccess] = useState(false);
  const [activeOfflineRegion, setActiveOfflineRegion] = useState<OfflineRegion | null>(null);
  const [gmapsGuideRegion, setGmapsGuideRegion] = useState<OfflineRegion | null>(null);

  /* refs */
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<L.Map | null>(null);
  const offlineSelectMapRef = useRef<HTMLDivElement>(null);
  const offlineSelectMapObj = useRef<L.Map | null>(null);
  const offlineViewMapRef = useRef<HTMLDivElement>(null);
  const offlineViewMapObj = useRef<L.Map | null>(null);
  const markersLayer = useRef(L.layerGroup());
  const routeLayer = useRef<L.Polyline | null>(null);
  const originMarker = useRef<L.Marker | null>(null);
  const destMarker = useRef<L.Marker | null>(null);
  const debounceRef = useRef<any>(null);

  useEffect(() => { setRecentRoutes(getRecentRoutes()); }, []);

  useEffect(() => {
    const handleOpenCompanion = (e: any) => {
      const { o, d } = e.detail || {};
      if (o) { setOrigin(o); setOriginText(o.label || 'Origin'); }
      if (d) { setDest(d); setDestText(d.label || 'Destination'); }
      if (o || d) { setMode('planner'); setOpen(true); }
    };
    window.addEventListener('openRouteCompanion', handleOpenCompanion);
    return () => window.removeEventListener('openRouteCompanion', handleOpenCompanion);
  }, []);

  const saveVehicle = (v: VehicleProfile) => { setVehicle(v); localStorage.setItem(RC_VEHICLE, JSON.stringify(v)); };

  const doGeocode = useCallback((q: string, setter: (r: NomResult[]) => void) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => { setter(await geocode(q)); }, 350);
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'My Location' }); setOriginText('📍 My Location'); setLocating(false); },
      () => setLocating(false), { enableHighAccuracy: true }
    );
  };

  const calculateRoutes = async () => {
    if (!origin || !dest) return;
    setLoading(true); setRoutes([]);
    const r = await calcRoute(origin, dest);
    setRoutes(r); setSelRoute(0);
    
    // AI Insights
    if (r.length > 0) {
      const rt = r[0];
      const maxRange = (vehicle.tankSize * vehicle.currentLevel / 100) * vehicle.mileage;
      const insights = [];
      if (rt.distance > maxRange) {
        insights.push(`⚠️ Low fuel range (${Math.round(maxRange)} km). You must refuel on the way.`);
      } else if (rt.distance > maxRange * 0.8) {
        insights.push(`⚠️ Fuel is tight. Consider a quick top-up.`);
      }
      if (rt.tolls > 0) insights.push(`🎫 This route has ${rt.tolls} toll plazas (est. ₹${rt.tollCost}).`);
      if (rt.distance > 300) insights.push(`🥱 Long drive (${rt.distance} km). Plan a 30-min break at a dhaba.`);
      setAiInsights(insights);
      setMode('active'); 
    }
    setLoading(false);
  };

  const toggleFilter = (id: string) => { setActiveFilters(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]); };

  useEffect(() => {
    if (mode !== 'active' || !mapRef.current || mapObj.current) return;
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([20.5, 78.9], 5);
    createOfflineTileLayer().addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    markersLayer.current.addTo(map);
    mapObj.current = map;
    
    // Fix Leaflet gray map rendering issue when container size changes
    setTimeout(() => { map.invalidateSize(); }, 300);
    setTimeout(() => { map.invalidateSize(); }, 800);

    return () => { map.remove(); mapObj.current = null; };
  }, [mode]);

  // Offline Area Selection Map Lifecycle
  useEffect(() => {
    if (mode !== 'offline_select' || !offlineSelectMapRef.current) return;
    if (offlineSelectMapObj.current) {
      offlineSelectMapObj.current.remove();
      offlineSelectMapObj.current = null;
    }

    const initCenter: [number, number] = dest ? [dest.lat, dest.lng] : origin ? [origin.lat, origin.lng] : [15.335, 76.461];
    const map = L.map(offlineSelectMapRef.current, { zoomControl: false, attributionControl: false }).setView(initCenter, 13);
    createOfflineTileLayer().addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    offlineSelectMapObj.current = map;

    const updateBoxEstimate = () => {
      const curMap = offlineSelectMapObj.current;
      if (!curMap) return;
      const size = curMap.getSize();
      const w = size.x > 0 ? Math.min(size.x * 0.76, 280) : 260;
      const h = size.y > 0 ? Math.min(size.y * 0.55, 180) : 180;
      const cx = size.x > 0 ? size.x / 2 : 180;
      const cy = size.y > 0 ? size.y / 2 : 180;
      const p1 = curMap.containerPointToLatLng([cx - w / 2, cy - h / 2]);
      const p2 = curMap.containerPointToLatLng([cx + w / 2, cy + h / 2]);
      const b = L.latLngBounds(p1, p2);
      const z = curMap.getZoom();
      const urls = getTileUrlsForBounds(b, z, Math.min(z + 1, 16));
      const count = urls.length;
      setOfflineEstimate({
        count,
        sizeMB: (count * 0.019).toFixed(1) + ' MB',
        urls
      });
    };

    map.on('move', updateBoxEstimate);
    map.on('zoomend', updateBoxEstimate);

    setTimeout(() => {
      if (offlineSelectMapObj.current) {
        offlineSelectMapObj.current.invalidateSize();
        updateBoxEstimate();
      }
    }, 150);

    setTimeout(() => {
      if (offlineSelectMapObj.current) {
        offlineSelectMapObj.current.invalidateSize();
        updateBoxEstimate();
      }
    }, 450);

    return () => {
      map.remove();
      offlineSelectMapObj.current = null;
    };
  }, [mode, dest, origin]);

  // Offline View Map Lifecycle
  useEffect(() => {
    if (mode !== 'offline_view' || !offlineViewMapRef.current || !activeOfflineRegion) return;
    if (offlineViewMapObj.current) {
      offlineViewMapObj.current.remove();
      offlineViewMapObj.current = null;
    }

    const reg = activeOfflineRegion;
    const map = L.map(offlineViewMapRef.current, { zoomControl: false, attributionControl: false }).setView(reg.center, reg.zoom || 13);
    createOfflineTileLayer().addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    offlineViewMapObj.current = map;

    const b = reg.bounds;
    if (b) {
      map.fitBounds(L.latLngBounds([b.south, b.west], [b.north, b.east]));
    }

    const m = L.marker(reg.center, { icon: endIcon('📍', C.amber) }).addTo(map);
    m.bindPopup(`<b>${reg.name}</b><br/><span style="font-size:10px;color:#666">Offline Cached Region</span>`);

    setTimeout(() => { map.invalidateSize(); }, 300);

    return () => {
      map.remove();
      offlineViewMapObj.current = null;
    };
  }, [mode, activeOfflineRegion]);

  const handleDownloadOfflineArea = async () => {
    if (offlineDownloading || offlineEstimate.urls.length === 0) return;
    setOfflineDownloading(true);
    setOfflineProgress(0);
    try {
      const map = offlineSelectMapObj.current;
      if (!map) return;
      const size = map.getSize();
      const w = Math.min(size.x * 0.76, 320);
      const h = Math.min(size.y * 0.60, 220);
      const x1 = (size.x - w) / 2;
      const y1 = (size.y - h) / 2;
      const p1 = map.containerPointToLatLng([x1, y1]);
      const p2 = map.containerPointToLatLng([x1 + w, y1 + h]);
      const b = L.latLngBounds(p1, p2);
      const center = map.getCenter();

      await cacheTileUrls(offlineEstimate.urls, (done, total) => {
        setOfflineProgress(Math.round((done / total) * 100));
      });

      const newRegion: OfflineRegion = {
        id: 'off_' + Date.now(),
        name: offlineRegionName.trim() || 'Offline Heritage Area',
        bounds: { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() },
        center: [center.lat, center.lng],
        zoom: map.getZoom(),
        tileCount: offlineEstimate.count,
        sizeMB: offlineEstimate.sizeMB,
        savedAt: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
        tiles: offlineEstimate.urls
      };
      saveOfflineRegion(newRegion);
      setOfflineRegions(getOfflineRegions());
      setOfflineDownloadSuccess(true);
      setTimeout(() => {
        setOfflineDownloadSuccess(false);
        setOfflineDownloading(false);
        setMode('offline_list');
      }, 1200);
    } catch (err: any) {
      alert('Download error: ' + (err.message || 'Failed to cache tiles.'));
      setOfflineDownloading(false);
    }
  };

  const handleDeleteOfflineRegion = async (id: string) => {
    if (!window.confirm('Delete this offline map and free up storage?')) return;
    await removeOfflineRegion(id);
    setOfflineRegions(getOfflineRegions());
  };

  useEffect(() => {
    const map = mapObj.current; if (!map || mode !== 'active') return;
    const route = routes[selRoute]; if (!route) return;

    if (routeLayer.current) { map.removeLayer(routeLayer.current); routeLayer.current = null; }
    if (originMarker.current) { map.removeLayer(originMarker.current); originMarker.current = null; }
    if (destMarker.current) { map.removeLayer(destMarker.current); destMarker.current = null; }

    const rColor = route.label === 'Fastest' ? C.green : route.label === 'Scenic' ? C.blue : C.gold;
    routeLayer.current = L.polyline(route.geometry, { color: rColor, weight: 5, opacity: .85 }).addTo(map);

    if (origin) {
      originMarker.current = L.marker([origin.lat, origin.lng], { icon: endIcon('🟢', '#22C55E') }).addTo(map);
      originMarker.current.bindPopup(`<b>${origin.label || 'Origin'}</b>`);
    }
    if (dest) {
      destMarker.current = L.marker([dest.lat, dest.lng], { icon: endIcon('📍', C.amber) }).addTo(map);
      destMarker.current.bindPopup(`<b>${dest.label || 'Destination'}</b>`);
    }

    if (route.geometry.length > 1) {
      map.fitBounds(L.latLngBounds(route.geometry.map(p => L.latLng(p[0], p[1]))).pad(0.12), { animate: true });
    }

    if (origin && dest) {
      const rId = `${origin.lat}_${dest.lat}_${Date.now()}`;
      setCurrentRouteId(rId);
      addRecentRoute({ id: rId, origin, destination: dest, distance: route.distance, duration: route.duration, savedAt: new Date().toISOString() });
      setRecentRoutes(getRecentRoutes());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selRoute, routes]);

  useEffect(() => {
    if (mode !== 'active' || !routes[selRoute]) return;
    const route = routes[selRoute];
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    route.geometry.forEach(([lat, lng]) => { if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat; if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng; });
    const pad = 0.05; 
    const bbox: [number, number, number, number] = [minLat - pad, minLng - pad, maxLat + pad, maxLng + pad];

    setLoadingSvc(true);
    fetchServices(bbox, breakdownMode ? ['repair', 'fuel', 'medical'] : activeFilters).then(svc => {
      setServices(svc);
      setLoadingSvc(false);
      const map = mapObj.current; if (!map) return;
      markersLayer.current.clearLayers();
      const sortedSvc = sortServices(svc, origin, routes[selRoute]?.geometry);
      sortedSvc.forEach(s => {
        const m = L.marker([s.lat, s.lng], { icon: svcIcon(s.icon, s.color) });
        const brand = s.tags?.brand || '';
        const locText = s.city ? s.city : origin ? `~${getDistKm(origin.lat, origin.lng, s.lat, s.lng)} km from start` : 'En-route';
        const mapsUrl = googleMapsLink(s.name, s.lat, s.lng);
        m.bindPopup(`
          <div style="font-family:'Inter',sans-serif;min-width:180px">
            <div style="font-weight:700;font-size:12px">${s.icon} ${s.name}</div>
            ${brand && brand !== s.name ? `<div style="font-size:10px;color:#888">${brand}</div>` : ''}
            <div style="font-size:10px;color:#666;margin:2px 0">${s.type.replace('_',' ')} · ${locText}</div>
            <a href="${mapsUrl}" target="_blank" rel="noopener"
               style="display:inline-block;margin-top:6px;padding:4px 10px;border-radius:5px;background:#1A73E8;color:#fff;font-size:9px;font-weight:700;text-decoration:none">🗺 Open in Google Maps →</a>
          </div>`);
        markersLayer.current.addLayer(m);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selRoute, activeFilters, routes, breakdownMode]);

  const upcomingServices = sortServices(services, origin, routes[selRoute]?.geometry).slice(0, 10);

  const fmtDur = (m: number) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;

  const css = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Inter:wght@400;500;600;700;800&display=swap');
.rc-fab{position:fixed;bottom:24px;right:24px;z-index:9999;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg, #1C1B24 0%, #121118 100%);border:1.5px solid rgba(217, 156, 83, 0.5);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.4rem;color:#D99C53;box-shadow:0 4px 20px rgba(0,0,0,0.65), 0 0 12px rgba(217, 156, 83, 0.25);transition:all .25s cubic-bezier(0.16, 1, 0.3, 1);animation:rcPulse 3s ease-in-out infinite}
.rc-fab:hover{transform:scale(1.08) translateY(-2px);border-color:rgba(217, 156, 83, 0.9);box-shadow:0 6px 24px rgba(0,0,0,0.8), 0 0 18px rgba(217, 156, 83, 0.45)}
.rc-fab.open{animation:none;transform:rotate(45deg) scale(1);background:#1C1B24;border-color:${C.red};color:${C.red}}
@keyframes rcPulse{0%,100%{box-shadow:0 4px 20px rgba(0,0,0,0.65), 0 0 12px rgba(217, 156, 83, 0.25)}50%{box-shadow:0 4px 28px rgba(0,0,0,0.85), 0 0 18px rgba(217, 156, 83, 0.45), 0 0 0 6px rgba(217, 156, 83, 0.1)}}
.rc-fab-badge{position:absolute;top:4px;right:4px;width:10px;height:10px;border-radius:50%;background:${C.green};border:2px solid #1C1B24}
.rc-panel{position:fixed;bottom:90px;right:24px;z-index:9998;width:400px;height:540px;max-height:min(650px, calc(100vh - 120px));border-radius:20px;background:${C.bg};border:1px solid ${C.border};box-shadow:0 12px 48px rgba(0,0,0,${dk ? '.6' : '.12'});display:flex;flex-direction:column;overflow:hidden;animation:rcSlide .25s ease;font-family:'Inter',sans-serif}
.rc-panel.full{position:fixed;inset:0;bottom:0;right:0;width:100vw;height:100vh;max-height:100vh;border-radius:0;z-index:10000}
@keyframes rcSlide{from{opacity:0;transform:translateY(20px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
@media(max-width:768px){
  .rc-fab{bottom:86px;right:16px;width:48px;height:48px;font-size:1.2rem;}
  .rc-panel{width:calc(100vw - 20px);right:10px;bottom:140px;height:75vh;max-height:75vh;}
}
.rc-head{display:flex;align-items:center;justify-content:space-between;padding:.6rem .85rem;border-bottom:1px solid ${C.border};background:${C.surface};flex-shrink:0}
.rc-head-title{font:700 .78rem 'Cinzel',serif;color:${C.amber};display:flex;align-items:center;gap:.35rem}
.rc-head-acts{display:flex;gap:.3rem;align-items:center}
.rc-hbtn{width:28px;height:28px;border-radius:50%;border:1px solid ${C.border};background:none;color:${C.muted};font-size:.7rem;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .12s}
.rc-hbtn:hover{color:${C.text};border-color:${C.amber}}
.rc-hbtn.sos{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.2);color:${C.red}}
.rc-hbtn.sos:hover{background:rgba(239,68,68,.15)}
.rc-hbtn.veh{color:${C.blue};border-color:rgba(96,165,250,.3)}
.rc-body{flex:1;overflow-y:auto;padding:.7rem .85rem}
.rc-body::-webkit-scrollbar{width:3px}.rc-body::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
.rc-search{position:relative;margin-bottom:.55rem}
.rc-sinp{width:100%;padding:.48rem .75rem .48rem 2rem;border-radius:10px;border:1px solid ${C.border};background:${C.surface};color:${C.text};font:400 .78rem 'Inter';outline:none;transition:border .12s}
.rc-sinp:focus{border-color:${C.amber}}
.rc-sinp::placeholder{color:${C.muted}}
.rc-sicon{position:absolute;left:.65rem;top:50%;transform:translateY(-50%);font-size:.8rem;pointer-events:none}
.rc-sugg{position:absolute;top:100%;left:0;right:0;z-index:10;background:${C.bg};border:1px solid ${C.border};border-radius:8px;margin-top:2px;max-height:160px;overflow-y:auto;box-shadow:0 6px 20px rgba(0,0,0,${dk ? '.4' : '.08'})}
.rc-sugg-item{padding:.4rem .7rem;font-size:.72rem;color:${C.text};cursor:pointer;border-bottom:1px solid ${C.border};transition:background .1s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rc-sugg-item:hover{background:rgba(180,119,59,.06)}
.rc-qlabel{font-size:.6rem;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:.06em;margin-bottom:.35rem}
.rc-qdests{display:flex;flex-wrap:wrap;gap:.3rem;margin-bottom:.65rem}
.rc-qd{padding:.22rem .55rem;border-radius:6px;border:1px solid ${C.border};background:${C.surface};color:${C.text};font:500 .66rem 'Inter';cursor:pointer;transition:all .12s}
.rc-qd:hover{border-color:${C.amber};color:${C.amber}}
.rc-rcard{display:flex;align-items:center;gap:.5rem;padding:.4rem .6rem;border-radius:8px;border:1px solid ${C.border};background:${C.surface};margin-bottom:.3rem;cursor:pointer;transition:all .12s}
.rc-rcard:hover{border-color:${C.amber}}
.rc-field{margin-bottom:.45rem;position:relative}
.rc-flbl{font-size:.6rem;font-weight:700;color:${C.gold};text-transform:uppercase;letter-spacing:.04em;margin-bottom:.18rem;display:block}
.rc-finp{width:100%;padding:.42rem .7rem;border-radius:8px;border:1px solid ${C.border};background:${C.surface};color:${C.text};font:400 .76rem 'Inter';outline:none}
.rc-myloc{display:inline-flex;align-items:center;gap:.25rem;padding:.22rem .55rem;border-radius:6px;border:1px solid ${C.border};background:${C.surface};color:${C.blue};font:600 .62rem 'Inter';cursor:pointer;margin-bottom:.3rem;transition:all .12s}
.rc-routes{display:flex;flex-direction:column;gap:.32rem;margin:.55rem 0}
.rc-roption{display:flex;align-items:center;gap:.5rem;padding:.45rem .65rem;border-radius:9px;border:1px solid ${C.border};background:${C.surface};cursor:pointer;transition:all .12s}
.rc-roption.on{border-color:${C.amber};background:rgba(180,119,59,.06)}
.rc-filters{display:grid;grid-template-columns:repeat(4,1fr);gap:.28rem;margin:.45rem 0}
.rc-filt{display:flex;flex-direction:column;align-items:center;gap:.12rem;padding:.32rem .2rem;border-radius:8px;border:1px solid ${C.border};background:${C.surface};cursor:pointer;transition:all .12s;font-size:.55rem;font-weight:600;color:${C.muted}}
.rc-filt.on{border-color:${C.amber};background:rgba(180,119,59,.06);color:${C.amber}}
.rc-abtn{width:100%;padding:.48rem;border-radius:9px;border:none;background:linear-gradient(135deg,${C.amber},${C.gold});color:#fff;font:700 .76rem 'Inter';cursor:pointer;transition:all .12s;margin-top:.4rem}
.rc-abtn-ghost{width:100%;padding:.42rem;border-radius:9px;border:1px solid ${C.border};background:none;color:${C.text};font:600 .72rem 'Inter';cursor:pointer;transition:all .12s;margin-top:.3rem}
.rc-map-area{flex:1;position:relative;min-height:0}
.rc-map-overlay{position:absolute;top:.5rem;left:.5rem;z-index:1000;display:flex;gap:.22rem;flex-wrap:wrap}
.rc-map-tag{padding:.15rem .45rem;border-radius:5px;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,.1);font:600 .58rem 'Inter';color:#fff}
.rc-sheet{background:${C.bg};border-top:1px solid ${C.border};flex-shrink:0;max-height:220px;overflow-y:auto;transition:max-height .2s}
.rc-sheet.closed{max-height:36px;overflow:hidden}
.rc-sheet-head{display:flex;align-items:center;justify-content:space-between;padding:0 .75rem .25rem;font-size:.65rem;color:${C.muted};font-weight:600}
.rc-up-item{display:flex;align-items:center;gap:.4rem;padding:.25rem 0;border-bottom:1px solid ${dk ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.04)'};font-size:.66rem;color:${C.text}}
.rc-ai-alert{background:rgba(180,119,59,.1);border:1px solid rgba(180,119,59,.2);border-radius:8px;padding:.5rem;margin:.4rem 0;font-size:.68rem;color:${C.text}}
.rc-loading{display:flex;align-items:center;justify-content:center;padding:1.5rem;color:${C.muted};font-size:.78rem;gap:.35rem}
.rc-spin{display:inline-block;width:16px;height:16px;border:2px solid ${C.border};border-top-color:${C.amber};border-radius:50%;animation:rcSpin .6s linear infinite}
@keyframes rcSpin{to{transform:rotate(360deg)}}
.rc-hbtn.off{color:${C.amber};border-color:rgba(217,156,83,.4)}
.rc-hbtn.off:hover{background:rgba(217,156,83,.1)}
.rc-offline-frame-wrap{position:relative;width:100%;height:100%;overflow:hidden}
.rc-offline-frame{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:76%;max-width:320px;height:58%;max-height:220px;pointer-events:none;z-index:1000;border:2px dashed #3B82F6;background:rgba(59,130,246,0.12);border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,0.38)}
.rc-corner-tl{position:absolute;top:-4px;left:-4px;width:16px;height:16px;border-top:3px solid #60A5FA;border-left:3px solid #60A5FA;border-top-left-radius:8px}
.rc-corner-tr{position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-top:3px solid #60A5FA;border-right:3px solid #60A5FA;border-top-right-radius:8px}
.rc-corner-bl{position:absolute;bottom:-4px;left:-4px;width:16px;height:16px;border-bottom:3px solid #60A5FA;border-left:3px solid #60A5FA;border-bottom-left-radius:8px}
.rc-corner-br{position:absolute;bottom:-4px;right:-4px;width:16px;height:16px;border-bottom:3px solid #60A5FA;border-right:3px solid #60A5FA;border-bottom-right-radius:8px}
.rc-offline-bar{position:absolute;top:.5rem;left:.5rem;right:.5rem;z-index:1001;display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.4rem .6rem;background:rgba(15,15,17,0.88);backdrop-filter:blur(8px);border-radius:10px;border:1px solid rgba(255,255,255,0.1)}
.rc-offline-foot{position:absolute;bottom:.6rem;left:.6rem;right:.6rem;z-index:1001;display:flex;flex-direction:column;gap:.35rem}
.rc-card-off{padding:.65rem;border-radius:10px;border:1px solid ${C.border};background:${C.surface};margin-bottom:.5rem;transition:all .15s}
.rc-card-off:hover{border-color:${C.amber}}
.rc-prog-modal{position:absolute;inset:0;z-index:1002;background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1.5rem;text-align:center}
.rc-modal-over{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:1rem}
.rc-modal-dialog{width:100%;max-width:380px;background:${C.bg};border:1px solid ${C.border};border-radius:14px;padding:1.2rem;box-shadow:0 16px 40px rgba(0,0,0,0.6);font-family:'Inter',sans-serif}
  `;

  return (
    <>
      <style>{css}</style>
      <button className={`rc-fab ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} title="AI Route Companion">
        {open ? '✕' : '🧭'}
        {recentRoutes.length > 0 && !open && <div className="rc-fab-badge" />}
      </button>

      {open && (
        <div className={`rc-panel ${expanded ? 'full' : ''}`}>
          <div className="rc-head">
            <div className="rc-head-title">🧭 Route Companion</div>
            <div className="rc-head-acts">
              <button className="rc-hbtn off" title="Offline Maps (Download Area)" onClick={() => setMode('offline_list')}>📥</button>
              <button className="rc-hbtn veh" title="Vehicle Profile" onClick={() => setMode('vehicle')}>🚗</button>
              <button className="rc-hbtn sos" title="Emergency" onClick={() => setMode('sos')}>🚨</button>
              <button className="rc-hbtn" title={expanded ? 'Collapse' : 'Expand'} onClick={() => setExpanded(!expanded)}>{expanded ? '↙' : '↗'}</button>
              <button className="rc-hbtn" title="Close" onClick={() => setOpen(false)}>✕</button>
            </div>
          </div>

          {mode === 'home' && (
            <div className="rc-body">
              <div className="rc-search">
                <span className="rc-sicon">🔍</span>
                <input className="rc-sinp" placeholder="Where are you heading?" value={destText} onChange={e => { setDestText(e.target.value); doGeocode(e.target.value, setDestSugg); }} />
                {destSugg.length > 0 && <div className="rc-sugg">{destSugg.map((s, i) => (
                  <div key={i} className="rc-sugg-item" onClick={() => { setDest({ lat: +s.lat, lng: +s.lon, label: s.display_name.split(',')[0] }); setDestText(s.display_name.split(',')[0]); setDestSugg([]); setMode('planner'); }}>{s.display_name}</div>
                ))}</div>}
              </div>
              <button className="rc-myloc" onClick={useMyLocation} disabled={locating}>📍 Use My Location</button>
              <div className="rc-qlabel">Heritage Destinations</div>
              <div className="rc-qdests">{QUICK_DESTS.map(d => <button key={d.label} className="rc-qd" onClick={() => { setDest(d); setDestText(d.label); setMode('planner'); }}>🏛️ {d.label}</button>)}</div>
              
              {recentRoutes.length > 0 && (
                <><div className="rc-qlabel" style={{marginTop:'.5rem'}}>Saved / Recent Routes</div>
                {recentRoutes.slice(0, 4).map(r => (
                  <div key={r.id} className="rc-rcard" onClick={() => { setOrigin(r.origin); setDest(r.destination); setOriginText(r.origin.label||''); setDestText(r.destination.label||''); setMode('planner'); }}>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontSize:'.7rem', fontWeight:600}}>{r.origin.label} → {r.destination.label} {r.isOffline && '💾'}</div>
                      <div style={{fontSize:'.58rem', color:C.muted}}>{r.distance} km · {fmtDur(r.duration)}</div>
                    </div>→
                  </div>
                ))}</>
              )}
            </div>
          )}

          {mode === 'planner' && (
            <div className="rc-body">
              <div className="rc-field"><label className="rc-flbl">From</label><button className="rc-myloc" onClick={useMyLocation}>📍 My Location</button>
                <input className="rc-finp" placeholder="Start" value={originText} onChange={e => { setOriginText(e.target.value); doGeocode(e.target.value, setOriginSugg); }} />
                {originSugg.length > 0 && <div className="rc-sugg">{originSugg.map((s,i)=><div key={i} className="rc-sugg-item" onClick={()=>{setOrigin({lat:+s.lat,lng:+s.lon,label:s.display_name.split(',')[0]}); setOriginText(s.display_name.split(',')[0]); setOriginSugg([])}}>{s.display_name}</div>)}</div>}
              </div>
              <div className="rc-field"><label className="rc-flbl">To</label>
                <input className="rc-finp" placeholder="Destination" value={destText} onChange={e => { setDestText(e.target.value); doGeocode(e.target.value, setDestSugg); }} />
                {destSugg.length > 0 && <div className="rc-sugg">{destSugg.map((s,i)=><div key={i} className="rc-sugg-item" onClick={()=>{setDest({lat:+s.lat,lng:+s.lon,label:s.display_name.split(',')[0]}); setDestText(s.display_name.split(',')[0]); setDestSugg([])}}>{s.display_name}</div>)}</div>}
              </div>
              
              <div className="rc-qlabel" style={{marginTop:'.4rem'}}>Show Along Route</div>
              <div className="rc-filters">{CATEGORIES.map(c => <button key={c.id} className={`rc-filt ${activeFilters.includes(c.id)?'on':''}`} onClick={() => toggleFilter(c.id)}><span>{c.icon}</span>{c.label}</button>)}</div>
              
              {routes.length > 0 && (
                <><div className="rc-qlabel">Route Options</div>
                <div className="rc-routes">{routes.map((r,i) => (
                  <div key={i} className={`rc-roption ${selRoute===i?'on':''}`} onClick={() => setSelRoute(i)}>
                    <span style={{padding:'2px 6px', background:'rgba(180,119,59,.1)', color:C.amber, borderRadius:4, fontSize:10, fontWeight:700}}>{r.label}</span>
                    <div style={{flex:1, fontSize:11, color:C.text}}><b>{r.distance} km</b> · {fmtDur(r.duration)} {r.tolls>0 && `· 🎫 ₹${r.tollCost}`}</div>
                  </div>
                ))}</div></>
              )}
              {loading && <div className="rc-loading"><span className="rc-spin"/> Calculating…</div>}
              <button className="rc-abtn" onClick={calculateRoutes} disabled={!origin||!dest||loading}>{routes.length > 0 ? 'Show on Map →' : 'Find Routes ✈️'}</button>
              <button className="rc-abtn-ghost" onClick={() => setMode('home')}>← Back</button>
            </div>
          )}

          {mode === 'active' && (
            <div style={{display:'flex',flexDirection:'column',flex:1,minHeight:0}}>
              <div style={{display:'flex',gap:'.2rem',padding:'.35rem',borderBottom:`1px solid ${C.border}`,overflowX:'auto',flexShrink:0}}>
                {CATEGORIES.map(c => <button key={c.id} style={{padding:'3px 8px',borderRadius:5,border:`1px solid ${activeFilters.includes(c.id)?c.color:C.border}`,background:activeFilters.includes(c.id)?`${c.color}18`:'none',color:activeFilters.includes(c.id)?c.color:C.muted,fontSize:10,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}} onClick={() => toggleFilter(c.id)}>{c.icon} {c.label}</button>)}
              </div>
              {aiInsights.length > 0 && !breakdownMode && (
                <div style={{padding:'0 .5rem'}}>{aiInsights.map((ins,i) => <div key={i} className="rc-ai-alert">{ins}</div>)}</div>
              )}
              {breakdownMode && (
                <div style={{padding:'.5rem', background: 'rgba(239,68,68,.1)', color:C.red, fontSize:11, fontWeight:700, display:'flex', justifyContent:'space-between'}}>
                  <span>🚨 BREAKDOWN MODE ACTIVE (Showing Mechanics & Fuel)</span>
                  <button onClick={() => setBreakdownMode(false)} style={{background:'none',border:'none',color:C.red,cursor:'pointer'}}>✕</button>
                </div>
              )}
              <div className="rc-map-area">
                <div className="rc-map-overlay">
                  <div className="rc-map-tag">📍 <em style={{color:C.gold,fontStyle:'normal'}}>{origin?.label}</em> → <em style={{color:C.gold,fontStyle:'normal'}}>{dest?.label}</em></div>
                  {loadingSvc && <div className="rc-map-tag"><span className="rc-spin" style={{width:10,height:10,borderWidth:1.5}}/> Loading services…</div>}
                </div>
                <div ref={mapRef} className="rc-map" style={{width:'100%',height:'100%'}}/>
              </div>
              <div className={`rc-sheet ${sheetOpen?'':'closed'}`}>
                <div style={{display:'flex',justifyContent:'center',padding:'5px',cursor:'pointer'}} onClick={() => setSheetOpen(!sheetOpen)}><div style={{width:32,height:3,background:C.border,borderRadius:2}}/></div>
                {sheetOpen && (
                  <div style={{padding:'0 .75rem .5rem'}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:C.muted,fontWeight:600,marginBottom:10}}>
                      <span>Upcoming stops along your route</span>
                    </div>
                    {upcomingServices.map((s,i) => {
                      const locText = s.city ? s.city : origin ? `~${getDistKm(origin.lat, origin.lng, s.lat, s.lng)} km from start` : 'En-route';
                      return (
                      <div key={i} className="rc-up-item" style={{cursor:'pointer'}} onClick={() => mapObj.current?.setView([s.lat,s.lng],15,{animate:true})}>
                        <div style={{width:22,height:22,borderRadius:'50%',background:`${s.color}22`,border:`1px solid ${s.color}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,flexShrink:0}}>{s.icon}</div>
                        <span style={{flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',fontWeight:500}}>{s.name}</span>
                        <span style={{fontSize:9,color:C.muted}}>{locText}</span>
                      </div>
                      )
                    })}
                    <div style={{marginTop: 15, display: 'flex', flexDirection: 'column', gap: 8}}>
                      <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin!.lat},${origin!.lng}&destination=${dest!.lat},${dest!.lng}`, '_blank')} style={{padding:'.6rem', background: '#2563eb', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6}}>
                        🗺️ OPEN IN GOOGLE MAPS (MOBILE)
                      </button>
                      <button onClick={() => printRouteCompanionPdf(routes[selRoute],origin!,dest!,services)} style={{padding:'.6rem', background: `linear-gradient(135deg, ${C.amber}, ${C.gold})`, color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(180,119,59,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6}}>
                        📄 DOWNLOAD TRIP DETAILS (PDF)
                      </button>
                      <button onClick={() => {
                        setOfflineRegionName(`${origin?.label || 'Start'} to ${dest?.label || 'Destination'}`);
                        setMode('offline_select');
                      }} style={{padding:'.4rem', background: 'transparent', color: C.amber, borderRadius: 8, fontSize: 11, fontWeight: 600, border: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6}}>
                        💾 Select & Download Offline Map
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === 'sos' && (
            <div className="rc-body">
              <div style={{textAlign:'center',padding:'1rem .5rem'}}>
                <h3 style={{font:'700 .9rem "Cinzel",serif',color:C.red,marginBottom:'.5rem'}}>🚨 Emergency Help</h3>
                <button onClick={() => { setBreakdownMode(true); setMode('active'); }} style={{width:'100%',padding:'.6rem',background:C.red,color:'#fff',border:'none',borderRadius:8,fontWeight:700,fontSize:12,cursor:'pointer',marginBottom:'1rem',boxShadow:'0 4px 12px rgba(239,68,68,.4)'}}>🔧 MY VEHICLE BROKE DOWN</button>
                {[
                  {ico:'🚔',label:'Police',sub:'Nearest station',num:'100'},
                  {ico:'🚑',label:'Ambulance',sub:'Medical emergency',num:'108'},
                  {ico:'📞',label:'Emergency',sub:'Unified helpline',num:'112'},
                  {ico:'🛣️',label:'Highway Helpline',sub:'NHAI assistance',num:'1033'}
                ].map(s => (
                  <a key={s.num} href={`tel:${s.num}`} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'8px 12px',borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:12,textDecoration:'none',marginBottom:6}}>
                    <span style={{fontSize:18}}>{s.ico}</span>
                    <span style={{flex:1,textAlign:'left'}}><b>{s.label}</b><div style={{fontSize:9,color:C.muted}}>{s.sub}</div></span>
                    <span style={{fontWeight:700,color:C.gold}}>{s.num}</span>
                  </a>
                ))}
                <div style={{marginTop:10,padding:10,borderRadius:8,background:C.surface,border:`1px solid ${C.border}`,fontSize:10,color:C.muted}}>
                  📍 Share your coordinates:<br/>
                  <button onClick={() => navigator.geolocation?.getCurrentPosition(p => navigator.clipboard.writeText(`https://maps.google.com/?q=${p.coords.latitude},${p.coords.longitude}`).then(()=>alert('Copied!')))} style={{marginTop:5,padding:'4px 8px',borderRadius:6,border:`1px solid ${C.border}`,background:C.surface,color:C.amber,fontSize:10,fontWeight:700,cursor:'pointer'}}>📋 Copy Location Link</button>
                </div>
                <button className="rc-abtn-ghost" onClick={() => setMode(routes.length?'active':'home')}>← Back</button>
              </div>
            </div>
          )}

          {mode === 'vehicle' && (
            <div className="rc-body">
              <h3 style={{font:'700 .9rem "Cinzel",serif',color:C.amber,marginBottom:15}}>🚗 Vehicle Profile</h3>
              <div className="rc-field"><label className="rc-flbl">Vehicle Type</label>
                <select className="rc-finp" value={vehicle.type} onChange={e => saveVehicle({...vehicle, type: e.target.value as any})}>
                  <option value="car">Car / SUV</option><option value="bike">Two Wheeler</option><option value="ev">Electric Vehicle</option>
                </select>
              </div>
              <div className="rc-field"><label className="rc-flbl">Fuel Type</label>
                <select className="rc-finp" value={vehicle.fuelType} onChange={e => saveVehicle({...vehicle, fuelType: e.target.value as any})}>
                  <option value="petrol">Petrol</option><option value="diesel">Diesel</option><option value="cng">CNG</option><option value="electric">Electric (kWh)</option>
                </select>
              </div>
              <div style={{display:'flex',gap:10}}>
                <div className="rc-field" style={{flex:1}}><label className="rc-flbl">Mileage ({vehicle.type==='ev'?'km/kWh':'km/L'})</label>
                  <input type="number" className="rc-finp" value={vehicle.mileage} onChange={e => saveVehicle({...vehicle, mileage: +e.target.value})} />
                </div>
                <div className="rc-field" style={{flex:1}}><label className="rc-flbl">Tank ({vehicle.type==='ev'?'kWh':'Liters'})</label>
                  <input type="number" className="rc-finp" value={vehicle.tankSize} onChange={e => saveVehicle({...vehicle, tankSize: +e.target.value})} />
                </div>
              </div>
              <div className="rc-field"><label className="rc-flbl">Current Fuel Level: {vehicle.currentLevel}%</label>
                <input type="range" min="5" max="100" value={vehicle.currentLevel} onChange={e => saveVehicle({...vehicle, currentLevel: +e.target.value})} style={{width:'100%',accentColor:C.amber}} />
                <div style={{fontSize:10,color:C.muted,marginTop:5}}>Est. Range: <b>{Math.round((vehicle.tankSize * vehicle.currentLevel / 100) * vehicle.mileage)} km</b></div>
              </div>
              <p style={{fontSize:9,color:C.muted,marginTop:15}}>We use this to warn you about low fuel ranges and suggest stops on long routes.</p>
              <button className="rc-abtn" onClick={() => setMode('home')}>Save & Continue</button>
            </div>
          )}

          {/* OFFLINE MAPS LIST */}
          {mode === 'offline_list' && (
            <div className="rc-body" style={{display:'flex', flexDirection:'column', height:'100%'}}>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
                <h3 style={{font:'700 .92rem "Cinzel",serif', color:C.amber, margin:0}}>📥 My Offline Maps</h3>
                <button
                  onClick={() => {
                    setOfflineRegionName('Custom Heritage Region');
                    setMode('offline_select');
                  }}
                  style={{padding:'5px 10px', borderRadius:7, background:`linear-gradient(135deg, ${C.amber}, ${C.gold})`, color:'#fff', border:'none', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:4}}
                >
                  + Download Area
                </button>
              </div>

              {/* Storage Info Banner */}
              <div style={{padding:'8px 10px', borderRadius:8, background:C.surface, border:`1px solid ${C.border}`, fontSize:11, color:C.text, marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                <div>
                  <div style={{fontWeight:700, fontSize:11.5}}>💾 Storage Used: {offlineRegions.reduce((acc, r) => acc + (parseFloat(r.sizeMB) || 0), 0).toFixed(1)} MB</div>
                  <div style={{fontSize:9.5, color:C.muted}}>{offlineRegions.length} offline regions saved on your device</div>
                </div>
                <span style={{padding:'2px 6px', borderRadius:4, background:'rgba(34,197,94,.15)', color:C.green, fontSize:9, fontWeight:700}}>🟢 Offline Ready</span>
              </div>

              {offlineRegions.length === 0 ? (
                <div style={{textAlign:'center', padding:'1.5rem .5rem', flex:1}}>
                  <div style={{fontSize:32, marginBottom:8}}>🗺️</div>
                  <div style={{fontSize:13, fontWeight:700, color:C.text, marginBottom:4}}>No Offline Maps Downloaded Yet</div>
                  <p style={{fontSize:10.5, color:C.muted, lineHeight:1.5, marginBottom:16}}>
                    Download map areas to explore heritage monuments, mountain passes, and remote temple trails without any cellular signal.
                  </p>

                  <div style={{textAlign:'left', marginBottom:14}}>
                    <div style={{fontSize:10, fontWeight:700, color:C.gold, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6}}>Quick Heritage Downloads</div>
                    {[
                      { name: 'Hampi UNESCO World Heritage Zone', lat: 15.335, lng: 76.461 },
                      { name: 'Jaipur Pink City & Amer Fort', lat: 26.912, lng: 75.787 },
                      { name: 'Mysore Palace & Chamundi Hills', lat: 12.296, lng: 76.639 },
                    ].map((preset, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setDest({ lat: preset.lat, lng: preset.lng, label: preset.name });
                          setOfflineRegionName(preset.name);
                          setMode('offline_select');
                        }}
                        style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 10px', borderRadius:7, border:`1px solid ${C.border}`, background:C.surface, marginBottom:6, cursor:'pointer', fontSize:11, fontWeight:600, color:C.text}}
                      >
                        <span>🏛️ {preset.name}</span>
                        <span style={{color:C.amber, fontSize:10}}>Select →</span>
                      </div>
                    ))}
                  </div>

                  <button className="rc-abtn" onClick={() => { setOfflineRegionName('My Offline Region'); setMode('offline_select'); }}>
                    📐 Select Your Own Area on Map
                  </button>
                </div>
              ) : (
                <div style={{flex:1, overflowY:'auto'}}>
                  {offlineRegions.map(reg => (
                    <div key={reg.id} className="rc-card-off">
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6}}>
                        <div>
                          <div style={{fontWeight:700, fontSize:12, color:C.text}}>{reg.name}</div>
                          <div style={{fontSize:10, color:C.muted, marginTop:2}}>
                            {reg.tileCount} tiles · {reg.sizeMB} · Saved {reg.savedAt}
                          </div>
                        </div>
                        <span style={{padding:'2px 6px', borderRadius:4, background:'rgba(34,197,94,.12)', color:C.green, fontSize:9, fontWeight:700}}>Ready</span>
                      </div>

                      <div style={{display:'flex', gap:6, marginTop:8}}>
                        <button
                          onClick={() => { setActiveOfflineRegion(reg); setMode('offline_view'); }}
                          style={{flex:1, padding:'6px 8px', borderRadius:6, border:'none', background:`linear-gradient(135deg, ${C.amber}, ${C.gold})`, color:'#fff', fontSize:10.5, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4}}
                        >
                          🗺️ View Map
                        </button>
                        <button
                          onClick={() => setGmapsGuideRegion(reg)}
                          style={{flex:1, padding:'6px 8px', borderRadius:6, border:`1px solid #2563eb`, background:'rgba(37,99,235,.08)', color:'#2563eb', fontSize:10.5, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4}}
                          title="Sync to Google Maps mobile app"
                        >
                          📱 Google Maps
                        </button>
                        <button
                          onClick={() => handleDeleteOfflineRegion(reg.id)}
                          style={{padding:'6px 8px', borderRadius:6, border:`1px solid ${C.border}`, background:'transparent', color:C.red, fontSize:11, cursor:'pointer'}}
                          title="Delete offline map"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button className="rc-abtn-ghost" onClick={() => setMode(routes.length ? 'active' : 'home')} style={{marginTop:10}}>
                ← Back
              </button>
            </div>
          )}

          {/* OFFLINE SELECT AREA (Google Maps Style "Select your own map") */}
          {mode === 'offline_select' && (
            <div style={{display:'flex', flexDirection:'column', flex:1, height:'100%', position:'relative'}}>
              {/* Header with Title, Input & Live estimate */}
              <div style={{padding:'.45rem .65rem', borderBottom:`1px solid ${C.border}`, background:C.surface, display:'flex', alignItems:'center', gap:8, flexShrink:0}}>
                <button onClick={() => setMode('offline_list')} style={{border:'none', background:'none', color:C.text, fontSize:14, cursor:'pointer', padding:'2px 4px'}}>←</button>
                <div style={{flex:1, minWidth:0}}>
                  <input
                    className="rc-sinp"
                    value={offlineRegionName}
                    onChange={e => setOfflineRegionName(e.target.value)}
                    placeholder="Region name (e.g. Hampi UNESCO Area)"
                    style={{padding:'.32rem .6rem', fontSize:11, fontWeight:600}}
                  />
                </div>
                <div style={{padding:'3px 7px', borderRadius:5, background:'rgba(59,130,246,.15)', border:'1px solid rgba(59,130,246,.3)', color:C.blue, fontSize:10, fontWeight:700, whiteSpace:'nowrap'}}>
                  {offlineEstimate.count} tiles ({offlineEstimate.sizeMB})
                </div>
              </div>

              {/* Map Viewport with Centered Bounding Frame */}
              <div className="rc-offline-frame-wrap" style={{flex:1, position:'relative', minHeight:300}}>
                <div ref={offlineSelectMapRef} style={{position:'absolute', inset:0, width:'100%', height:'100%'}} />

                {/* Shaded Selection Box Overlay (Visual Selector Frame) */}
                <div className="rc-offline-frame">
                  <div className="rc-corner-tl" />
                  <div className="rc-corner-tr" />
                  <div className="rc-corner-bl" />
                  <div className="rc-corner-br" />
                  <div style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', padding:'4px 8px', borderRadius:5, background:'rgba(0,0,0,.75)', color:'#fff', fontSize:9.5, fontWeight:600, pointerEvents:'none', whiteSpace:'nowrap', backdropFilter:'blur(4px)'}}>
                    📐 Drag & Zoom Map to Frame Area
                  </div>
                </div>

                {/* Bottom Bar: Action & Size Confirmation */}
                <div className="rc-offline-foot">
                  {offlineEstimate.count > 150 && (
                    <div style={{padding:'4px 8px', borderRadius:6, background:'rgba(239,68,68,.9)', color:'#fff', fontSize:9.5, fontWeight:600, textAlign:'center'}}>
                      ⚠️ Area too large ({offlineEstimate.count} tiles). Zoom in to keep download fast.
                    </div>
                  )}
                  <button
                    className="rc-abtn"
                    onClick={handleDownloadOfflineArea}
                    disabled={offlineDownloading || offlineEstimate.count === 0 || offlineEstimate.count > 150}
                    style={{margin:0, boxShadow:'0 4px 16px rgba(180,119,59,.4)', opacity: offlineEstimate.count > 150 ? 0.6 : 1}}
                  >
                    💾 Download Map ({offlineEstimate.sizeMB})
                  </button>
                </div>

                {/* Download Progress Modal Overlay */}
                {offlineDownloading && (
                  <div className="rc-prog-modal">
                    {offlineDownloadSuccess ? (
                      <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:8}}>
                        <div style={{fontSize:40}}>✅</div>
                        <div style={{fontSize:14, fontWeight:700, color:'#22C55E'}}>Area Saved Offline!</div>
                        <div style={{fontSize:11, color:'#E2E8F0'}}>Cached {offlineEstimate.count} tiles ({offlineEstimate.sizeMB})</div>
                      </div>
                    ) : (
                      <div style={{display:'flex', flexDirection:'column', alignItems:'center', width:'100%', maxWidth:240, gap:12}}>
                        <div style={{position:'relative', width:64, height:64, display:'flex', alignItems:'center', justifyContent:'center'}}>
                          <div className="rc-spin" style={{width:60, height:60, borderWidth:3, borderColor:'rgba(255,255,255,.15)', borderTopColor:C.gold}} />
                          <div style={{position:'absolute', fontSize:13, fontWeight:800, color:'#fff'}}>{offlineProgress}%</div>
                        </div>
                        <div>
                          <div style={{fontSize:13, fontWeight:700, color:'#fff', marginBottom:3}}>Downloading Map...</div>
                          <div style={{fontSize:10, color:C.muted}}>Storing tiles in device cache for offline travel</div>
                        </div>
                        <div style={{width:'100%', height:6, background:'rgba(255,255,255,.12)', borderRadius:3, overflow:'hidden'}}>
                          <div style={{width:`${offlineProgress}%`, height:'100%', background:`linear-gradient(90deg, ${C.amber}, ${C.gold})`, transition:'width .2s'}} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OFFLINE VIEWER */}
          {mode === 'offline_view' && activeOfflineRegion && (
            <div style={{display:'flex', flexDirection:'column', flex:1, height:'100%', position:'relative'}}>
              {/* Top Banner */}
              <div style={{padding:'.45rem .65rem', borderBottom:`1px solid ${C.border}`, background:C.surface, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0}}>
                <div>
                  <div style={{fontWeight:700, fontSize:11.5, color:C.text}}>{activeOfflineRegion.name}</div>
                  <div style={{fontSize:9.5, color:C.green, fontWeight:600}}>🟢 100% Offline (Cached Tiles)</div>
                </div>
                <div style={{display:'flex', gap:4}}>
                  <button onClick={useMyLocation} className="rc-myloc" style={{margin:0, padding:'3px 7px', fontSize:10}}>
                    📍 My GPS
                  </button>
                  <button onClick={() => setMode('offline_list')} className="rc-hbtn" style={{width:24, height:24, fontSize:10}}>
                    ✕
                  </button>
                </div>
              </div>

              {/* Map Container */}
              <div style={{flex:1, position:'relative', minHeight:300}}>
                <div ref={offlineViewMapRef} style={{position:'absolute', inset:0, width:'100%', height:'100%'}} />
              </div>

              {/* Bottom Actions */}
              <div style={{padding:'.5rem .75rem', borderTop:`1px solid ${C.border}`, background:C.surface, display:'flex', gap:8, flexShrink:0}}>
                <button
                  onClick={() => setGmapsGuideRegion(activeOfflineRegion)}
                  style={{flex:1, padding:'.45rem', borderRadius:7, border:`1px solid #2563eb`, background:'rgba(37,99,235,.1)', color:'#2563eb', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4}}
                >
                  📱 Sync to Google Maps App
                </button>
                <button
                  onClick={() => setMode('offline_list')}
                  style={{padding:'.45rem .75rem', borderRadius:7, border:`1px solid ${C.border}`, background:'transparent', color:C.text, fontSize:11, fontWeight:600, cursor:'pointer'}}
                >
                  ← All Maps
                </button>
              </div>
            </div>
          )}

          {/* GOOGLE MAPS OFFLINE SYNC GUIDE MODAL */}
          {gmapsGuideRegion && (
            <div className="rc-modal-over" onClick={() => setGmapsGuideRegion(null)}>
              <div className="rc-modal-dialog" onClick={e => e.stopPropagation()}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
                  <h4 style={{font:'700 .9rem "Cinzel",serif', color:C.amber, margin:0}}>📱 Save in Google Maps App</h4>
                  <button onClick={() => setGmapsGuideRegion(null)} style={{background:'none', border:'none', color:C.muted, fontSize:14, cursor:'pointer'}}>✕</button>
                </div>

                <p style={{fontSize:11, color:C.text, lineHeight:1.5, marginBottom:10}}>
                  Google does not allow third-party websites to write tiles directly into its closed mobile app. You can save <strong>{gmapsGuideRegion.name}</strong> inside Google Maps in 3 easy steps:
                </p>

                <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:14, fontSize:10.5, color:C.text}}>
                  <div style={{display:'flex', gap:8, alignItems:'flex-start'}}>
                    <span style={{width:18, height:18, borderRadius:'50%', background:C.amber, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0}}>1</span>
                    <span>Tap <strong>'Launch Google Maps'</strong> below to center on this exact region.</span>
                  </div>
                  <div style={{display:'flex', gap:8, alignItems:'flex-start'}}>
                    <span style={{width:18, height:18, borderRadius:'50%', background:C.amber, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0}}>2</span>
                    <span>In Google Maps app, tap your <strong>Profile Photo</strong> in the top-right corner.</span>
                  </div>
                  <div style={{display:'flex', gap:8, alignItems:'flex-start'}}>
                    <span style={{width:18, height:18, borderRadius:'50%', background:C.amber, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0}}>3</span>
                    <span>Select <strong>'Offline maps'</strong> ➔ <strong>'SELECT YOUR OWN MAP'</strong> ➔ Tap <strong>'Download'</strong>.</span>
                  </div>
                </div>

                <div style={{display:'flex', flexDirection:'column', gap:6}}>
                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps/@${gmapsGuideRegion.center[0]},${gmapsGuideRegion.center[1]},${gmapsGuideRegion.zoom || 13}z`;
                      window.open(url, '_blank');
                    }}
                    style={{padding:'.6rem', borderRadius:8, border:'none', background:'#2563eb', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}
                  >
                    🗺️ Launch Google Maps App
                  </button>
                  <button
                    onClick={() => setGmapsGuideRegion(null)}
                    style={{padding:'.4rem', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.muted, fontSize:11, fontWeight:600, cursor:'pointer'}}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function RouteCompanion() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Guard: Do NOT give access to AI maps before login
  if (loading || !user) {
    return null;
  }

  // Also do not display on public landing page or authentication pages
  if (['/', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/verify-email'].includes(location.pathname)) {
    return null;
  }

  return <RouteCompanionInner />;
}
