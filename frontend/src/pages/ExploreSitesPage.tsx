import { useState, useEffect, useRef, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
  Polyline,
  CircleMarker,
} from 'react-leaflet';
import { Link } from 'react-router-dom';
import PanoramaViewer from '@/components/PanoramaViewer';
import ThemeToggle from '@/components/ThemeToggle';
import VoHLogo from '@/components/VoHLogo';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon paths (broken in Vite)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

import {
  SubSite,
  HeritageSite,
  INITIAL_SITES,
  searchOrGenerateHeritageSite,
} from '@/data/heritageSites';

// ─── Site Data ────────────────────────────────────────────────────────────────

const SITES: HeritageSite[] = INITIAL_SITES;

// ─── Custom VoH map marker icon ───────────────────────────────────────────────
function makeIcon(color: string, active = false) {
  const size = active ? 42 : 32;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:${color};
      border:3px solid #fff;
      box-shadow:0 2px 12px rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);font-size:${active ? 16 : 12}px">🏛️</span></div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor:[0, -size],
  });
}

function makeSubIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:22px;height:22px;
      border-radius:50%;
      background:${color};
      border:2px solid rgba(255,255,255,0.7);
      box-shadow:0 1px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize:   [22, 22],
    iconAnchor: [11, 11],
  });
}

// ─── Map fly-to helper ────────────────────────────────────────────────────────
function FlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    try {
      map.invalidateSize({ animate: false });
    } catch (e) {}
    const t = setTimeout(() => {
      try {
        map.invalidateSize({ animate: false });
        map.flyTo([lat, lng], zoom, { duration: 1.2 });
      } catch (e) {}
    }, 100);
    return () => clearTimeout(t);
  }, [lat, lng, zoom, map]);
  return null;
}

// ─── Map container auto-resizer ───────────────────────────────────────────────
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;
    const ro = new ResizeObserver(() => {
      try {
        map.invalidateSize({ animate: false });
      } catch (e) {}
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

// ─── Stars display ────────────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <span className="es-stars">
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= Math.round(rating) ? '#f59e0b' : '#334155' }}>★</span>
      ))}
      <span className="es-rating-num">{rating.toFixed(1)}</span>
    </span>
  );
}

// ─── Street View map click handler ──────────────────────────────────────────
function StreetViewClickHandler({
  active,
  onMapClick,
}: {
  active: boolean;
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (active) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ─── Route line between sub-sites ─────────────────────────────────────────────
function RoutePolyline({ sites, color }: { sites: SubSite[]; color: string }) {
  const positions = sites.map(s => [s.lat, s.lng] as [number, number]);
  return (
    <Polyline
      positions={positions}
      pathOptions={{ color, weight: 3, opacity: 0.55, dashArray: '8 6' }}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ExploreSitesPage() {
  const [sites,         setSites]         = useState<HeritageSite[]>(INITIAL_SITES);
  const [selected,      setSelected]      = useState<HeritageSite | null>(null);
  const [search,        setSearch]        = useState('');
  const [filterType,    setFilterType]    = useState('All');
  const [activeTab,     setActiveTab]     = useState<'overview'|'map'|'stay'|'experiences'|'reach'>('overview');
  const [showRoute,     setShowRoute]     = useState(true);
  const [mapView,       setMapView]       = useState<'overview'|'detail'>('overview');
  const [showModal,     setShowModal]     = useState(false);
  const [showPanorama,  setShowPanorama]  = useState(false);
  const [panoIndex,     setPanoIndex]     = useState(0);
  const [svMode,        setSvMode]        = useState(false);
  const [svLatLng,      setSvLatLng]      = useState<[number, number] | null>(null);
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [isMobile,      setIsMobile]      = useState(window.innerWidth <= 900);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const TYPES = ['All', 'Temple', 'Ruins', 'Archaeological', 'UNESCO', 'Coastal', 'Pilgrimage', 'Fort', 'Palace', 'Caves'];

  const filtered = useMemo(() => sites.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || s.name.toLowerCase().includes(q)
      || s.subtitle.toLowerCase().includes(q)
      || s.state.toLowerCase().includes(q)
      || s.district.toLowerCase().includes(q)
      || s.tags.some(t => t.toLowerCase().includes(q))
      || s.category.some(c => c.toLowerCase().includes(q))
      || s.subSites.some(sub => sub.name.toLowerCase().includes(q));
    const matchType = filterType === 'All' || s.category.includes(filterType);
    return matchSearch && matchType;
  }), [search, filterType, sites]);

  const handleSelect = (site: HeritageSite) => {
    console.log('ExploreSitesPage: selecting site', site.id);
    setSelected(site);
    setActiveTab('overview');
    setShowRoute(true);
    setMapView('detail');
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          detailRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          detailRef.current?.focus?.();
        } catch (e) {
          console.warn('ExploreSitesPage: scrollTo failed', e);
        }
      }, 150);
    });
  };

  const handleSearchSubmit = async (queryToSearch?: string) => {
    const q = (queryToSearch ?? search).trim();
    if (!q || isGenerating) return;
    setIsGenerating(true);
    try {
      const { site: targetSite, isNew } = await searchOrGenerateHeritageSite(q, sites);
      if (isNew) {
        setSites(prev => [targetSite, ...prev.filter(s => s.id !== targetSite.id)]);
      }
      setFilterType('All');
      handleSelect(targetSite);
    } catch (err) {
      console.error('Error generating heritage site:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const clearSelection = () => {
    setSelected(null);
    setMapView('overview');
  };

  // Map state: use selected site's center, else India overview
  const mapCenter: [number, number] = selected
    ? selected.mapCenter
    : [22.8, 79.5];
  const mapZoom = selected ? selected.mapZoom : 5;

  return (
    <div className="es-root">
      {/* ── MOBILE UI OVERLAYS ─────────────────────────────────────────── */}
      {isMobile && !selected && (
        <div style={{ position: 'absolute', top: '15px', left: '15px', right: '15px', zIndex: 1000, background: 'var(--voh-surface)', padding: '15px', borderRadius: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.6)', border: '1px solid var(--voh-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--voh-text)', fontWeight: 800 }}>Explore Sites</h3>
            <div style={{ display: 'flex', gap: '10px' }}><ThemeToggle /></div>
          </div>
          <select 
            value=""
            onChange={(e) => {
              const site = sites.find(s => s.id === e.target.value);
              if (site) { handleSelect(site); }
            }}
            style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', background: 'var(--voh-bg)', color: 'var(--voh-text)', border: '1px solid var(--voh-border)', outline: 'none', fontSize: '1rem', fontWeight: 600, appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\' viewBox=\'0 0 10 6\'%3E%3Cpath d=\'M0 0l5 6 5-6z\' fill=\'%23d97706\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
          >
            <option value="">🗺️ Choose a heritage site...</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.state})</option>)}
          </select>
        </div>
      )}

      {isMobile && selected && (
        <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', zIndex: 1000, background: 'var(--voh-surface)', padding: '20px', borderRadius: '24px 24px 0 0', boxShadow: '0 -10px 40px rgba(0,0,0,0.6)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={clearSelection} style={{ position: 'absolute', top: '15px', right: '15px', background: 'var(--voh-bg)', border: '1px solid var(--voh-border)', color: 'var(--voh-text)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>✕</button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `radial-gradient(circle at 30% 30%, ${selected.color}30, ${selected.color}08)`, border: `1px solid ${selected.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>{selected.image}</div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: selected.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{selected.category[0]}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--voh-text)', fontFamily: '"Cinzel", serif' }}>{selected.name}</div>
            </div>
          </div>
          
          <div style={{ fontSize: '0.85rem', color: 'var(--voh-muted)', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{selected.subtitle}</div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => { setShowModal(true); setActiveTab('overview'); }} style={{ flex: 1, padding: '12px', background: selected.color, color: '#0a0a14', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>View Full Details</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('openRouteCompanion', { detail: { d: { lat: selected.lat, lng: selected.lng, label: selected.name } } }))} style={{ flex: 1, padding: '12px', background: 'transparent', color: selected.color, border: `1px solid ${selected.color}`, borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>🧭 Route</button>
          </div>
        </div>
      )}

      {/* ── LEFT PANEL ────────────────────────────────────────────────── */}
      <aside className="es-left-panel">

        {/* Header */}
        <div className="es-panel-header">
          <div className="es-panel-title">
            <span className="es-panel-icon">🗺️</span>
            <div>
              <div className="es-panel-heading">Explore Heritage Sites</div>
              <div className="es-panel-sub">
                {filtered.length > 0
                  ? `${filtered.length} site${filtered.length !== 1 ? 's' : ''} found in India`
                  : search.trim().length >= 2
                    ? `✨ Ready to generate "${search.trim()}"`
                    : '0 sites found in India'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <Link to="/" style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }} aria-label="Back to Home">
              <VoHLogo size={32} />
            </Link>
            <Link
              to="/explore/ai-trip-planner"
              className="es-chip es-chip--active"
              style={{ width: 'fit-content', textDecoration: 'none', display: 'inline-flex' }}
            >
              🧠 AI Trip Planner
            </Link>
            <ThemeToggle />
          </div>

          {/* Search */}
          <div className="es-search-wrap">
            <span className="es-search-icon">🔍</span>
            <input
              className="es-search-input"
              placeholder="Search historical sites in India (e.g. Unakoti, Mirjan Fort, Hampi)…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit(); }}
              aria-label="Search heritage sites"
            />
            {search && (
              <button className="es-search-clear" onClick={() => setSearch('')} aria-label="Clear search">✕</button>
            )}
            <button
              type="button"
              className="es-search-btn"
              onClick={() => handleSearchSubmit()}
              disabled={isGenerating}
              title="Search or generate historical site"
            >
              {isGenerating ? <span className="es-btn-spinner" /> : 'Search'}
            </button>
          </div>

          {/* Type filter chips */}
          <div className="es-filter-chips" role="group" aria-label="Filter by type">
            {TYPES.map(t => (
              <button
                key={t}
                className={`es-chip${filterType === t ? ' es-chip--active' : ''}`}
                onClick={() => setFilterType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Site list */}
        <div className="es-site-list" role="list">
          {filtered.length === 0 && (
            search.trim().length >= 2 ? (
              <div className="es-generator-card">
                <div className="es-gen-badge">
                  <span className="es-gen-sparkle">✨</span> AI Heritage Engine
                </div>
                <h3 className="es-gen-title">Looking for "{search.trim()}"?</h3>
                <p className="es-gen-desc">
                  Generate the interactive site map, walking trail, sub-sites, 360° views &amp; historical information for <strong>{search.trim()}</strong>.
                </p>
                <button
                  type="button"
                  className="es-gen-btn"
                  onClick={() => handleSearchSubmit()}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <span className="es-spinner" /> Generating Heritage Experience…
                    </>
                  ) : (
                    <>🗺️ Generate &amp; Explore "{search.trim()}" Now →</>
                  )}
                </button>
                <div className="es-gen-hint">
                  💡 Tip: Hit <kbd>Enter</kbd> or click <strong>Search</strong> anytime to generate
                </div>
              </div>
            ) : (
              <div className="es-empty">
                <span style={{ fontSize: '2.5rem' }}>🔭</span>
                <p>No sites match your search.<br/>Try "Hampi", "Unakoti", or type any historical place.</p>
              </div>
            )
          )}
          {filtered.map(site => (
            <div
              key={site.id}
              className={`es-site-card${selected?.id === site.id ? ' es-site-card--active' : ''}`}
              onClick={() => handleSelect(site)}
              role="listitem"
              aria-selected={selected?.id === site.id}
            >
              <div className="es-card-thumb" style={{ background: `radial-gradient(circle at 30% 30%, ${site.color}30, ${site.color}08)`, borderColor: `${site.color}40` }}>
                <span className="es-card-emoji">{site.image}</span>
                <div className="es-card-type-badge" style={{ background: `${site.color}22`, color: site.color, borderColor: `${site.color}40` }}>
                  {site.category[0]}
                </div>
              </div>

              <div className="es-card-body">
                <div className="es-card-location">📍 {site.district}, {site.state}</div>
                <div className="es-card-name">{site.name}</div>
                <div className="es-card-subtitle">{site.subtitle}</div>
                <div className="es-card-meta">
                  <Stars rating={site.rating}/>
                  <span className="es-card-reviews">({site.reviews.toLocaleString()} reviews)</span>
                </div>
                <div className="es-card-chips">
                  <span className="es-mini-chip">⏱️ {site.duration}</span>
                  <span className="es-mini-chip">🌤️ {site.bestTime}</span>
                  <span className="es-mini-chip">🎟️ {site.entryFee.split('|')[0].trim()}</span>
                </div>
              </div>

              {selected?.id === site.id && (
                <div className="es-card-active-indicator" style={{ background: site.color }}/>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* ── CENTRE — MAP ──────────────────────────────────────────────── */}
      <div className={`es-map-panel${svMode ? ' sv-mode-active' : ''}`}>
        {/* Map controls bar */}
        <div className="es-map-topbar">
          <div className="es-map-label">
            {selected
              ? <><span style={{ color: selected.color }}>●</span> {selected.name} — Interactive Site Map</>
              : '🗺️ Indian Heritage Map'
            }
          </div>
          <div className="es-map-controls">
            {selected && (
              <>
                <button
                  className={`es-map-btn${showRoute ? ' es-map-btn--active' : ''}`}
                  onClick={() => setShowRoute(v => !v)}
                  title="Toggle recommended walking route"
                >
                  🔗 Walking Route
                </button>
                <button className="es-map-btn" onClick={clearSelection}>✕ All India Sites</button>
              </>
            )}
          </div>
        </div>

        <MapContainer
          center={[22.8, 79.5]}
          zoom={5}
          className="es-leaflet-map"
          zoomControl={true}
          attributionControl={true}
        >
          {/* Fly to when site selected */}
          <FlyTo lat={mapCenter[0]} lng={mapCenter[1]} zoom={mapZoom} />
          <MapResizer />

          {/* Map tiles — OpenStreetMap */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />

          {/* Main site markers */}
          {sites.map(site => (
            <Marker
              key={site.id}
              position={[site.lat, site.lng]}
              icon={makeIcon(site.color, selected?.id === site.id)}
              eventHandlers={{ click: () => handleSelect(site) }}
            >
              <Popup className="es-popup">
                <div className="es-popup-inner">
                  <div className="es-popup-name">{site.name}</div>
                  <div className="es-popup-sub">{site.subtitle}</div>
                  <div className="es-popup-type" style={{ color: site.color }}>{site.type}</div>
                  <Stars rating={site.rating} />
                  <button
                    className="es-popup-btn"
                    style={{ background: site.color, marginBottom: '5px' }}
                    onClick={(e) => { e.stopPropagation(); setSelected(site); setActiveTab('overview'); setShowModal(true); setMapView('detail'); }}
                  >
                    View Full Details →
                  </button>
                  <button
                    className="es-popup-btn"
                    style={{ background: 'transparent', border: `1px solid ${site.color}`, color: site.color }}
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      window.dispatchEvent(new CustomEvent('openRouteCompanion', { 
                        detail: { d: { lat: site.lat, lng: site.lng, label: site.name } } 
                      })); 
                    }}
                  >
                    🧭 Get Directions
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Sub-site markers when a site is selected */}
          {selected && selected.subSites.map((sub, i) => (
            <Marker
              key={i}
              position={[sub.lat, sub.lng]}
              icon={makeSubIcon(selected.color)}
            >
              <Popup className="es-popup">
                <div className="es-popup-inner es-popup-inner--sub">
                  <div className="es-popup-name" style={{ fontSize: '0.9rem' }}>{sub.name}</div>
                  <div className="es-popup-sub" style={{ color: selected.color }}>{sub.type}</div>
                  <div className="es-popup-desc">{sub.desc}</div>
                  {sub.walkTime && <div className="es-popup-walk">🚶 {sub.walkTime} walk from main gate</div>}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Circular highlight radius for selected site */}
          {selected && (
            <CircleMarker
              center={[selected.lat, selected.lng]}
              radius={selected.id === 'hampi' ? 40 : 30}
              pathOptions={{ color: selected.color, fillColor: selected.color, fillOpacity: 0.06, weight: 2, opacity: 0.3 }}
            />
          )}

          {/* Route polyline between sub-sites */}
          {selected && showRoute && (
            <RoutePolyline sites={selected.subSites} color={selected.color} />
          )}

          {/* Street View click handler */}
          <StreetViewClickHandler
            active={svMode}
            onMapClick={(lat, lng) => setSvLatLng([lat, lng])}
          />
        </MapContainer>

        {/* ── Street View Panel ───────────────────────────────── */}
        {svMode && (
          <div className="es-sv-panel">
            <div className="es-sv-header">
              <span>
                🚶 Street View
                {selected && (
                  <button
                    className="es-sv-jump-btn"
                    onClick={() => setSvLatLng(selected.svCoord)}
                    title="Jump to best street view location for this site"
                  >
                    📍 Jump to {selected.name}
                  </button>
                )}
                {!svLatLng && <span className="es-sv-hint-text"> — Click anywhere on the map above</span>}
              </span>
              <button className="es-sv-close" onClick={() => { setSvMode(false); setSvLatLng(null); }}>✕ Close</button>
            </div>
            {svLatLng ? (
              <iframe
                key={svLatLng.join(',')}
                src={`https://www.google.com/maps/embed/v1/streetview?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&location=${svLatLng[0]},${svLatLng[1]}&fov=80&pitch=0`}
                className="es-sv-iframe"
                title="Google Street View"
                allowFullScreen
              />
            ) : (
              <div className="es-sv-placeholder">
                <span style={{ fontSize: '2rem' }}>🚶</span>
                <p>Click anywhere on the map to view Street View imagery at that location</p>
                {selected && (
                  <button
                    className="es-sv-placeholder-btn"
                    style={{ borderColor: `${selected.color}50`, color: selected.color, background: `${selected.color}12` }}
                    onClick={() => setSvLatLng(selected.svCoord)}
                  >
                    📍 Jump to {selected.name} Street View
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Map legend */}
        <div className="es-map-legend">
          {sites.slice(0, 10).map(s => (
            <div key={s.id} className="es-legend-item" onClick={() => handleSelect(s)}>
              <span className="es-legend-dot" style={{ background: s.color }}/>
              <span>{s.name}</span>
            </div>
          ))}
          {selected && <div className="es-legend-item"><span className="es-legend-dot" style={{ background: '#94a3b8', width: 8, height: 8 }}/><span>Sub-sites</span></div>}
        </div>
      </div>

      {/* ── RIGHT PANEL — Detail (trimmed) ─────────────────────────────── */}
      {selected && (
        <div className="es-detail-panel" ref={detailRef}>

          {/* Compact Hero + quick actions (keeps panel light; full details in modal) */}
          <div className="es-detail-hero" style={{ background: `linear-gradient(135deg, ${selected.color}22 0%, ${selected.color}06 100%)`, borderBottom: `2px solid ${selected.color}30` }}>
            <button className="es-detail-close" onClick={clearSelection} aria-label="Close detail">✕</button>
            <div className="es-dh-emoji">{selected.image}</div>
            <div className="es-dh-type" style={{ color: selected.color, borderColor: `${selected.color}40`, background: `${selected.color}15` }}>{selected.type}</div>
            <h2 className="es-dh-name">{selected.name}</h2>
            <div className="es-dh-sub">{selected.subtitle}</div>
            <div className="es-dh-loc">📍 {selected.district}, {selected.state}</div>
            <Stars rating={selected.rating} />
            <span className="es-dh-reviews">{selected.reviews.toLocaleString()} verified reviews</span>

            {/* A smaller quick row (minimal) */}
            <div className="es-dh-quick">
              <div className="es-quick-stat">
                <span className="es-qs-icon">🎟️</span>
                <span className="es-qs-label">Entry</span>
                <span className="es-qs-val">{selected.entryFee.split('|')[0].trim()}</span>
              </div>
              <div className="es-quick-stat">
                <span className="es-qs-icon">⏰</span>
                <span className="es-qs-label">Timings</span>
                <span className="es-qs-val">{selected.timings.split('|')[0].trim()}</span>
              </div>
            </div>

            {/* Primary actions: route + open full details modal + 360 view */}
            <div className="es-dh-ctas">
              <button
                className="es-cta-primary"
                style={{ background: `linear-gradient(135deg, ${selected.color}, ${selected.color}cc)` }}
                onClick={() => { setShowRoute(true); setActiveTab('map'); }}
              >
                🔗 Show Walking Route
              </button>
              <button className="es-cta-ghost" onClick={() => setShowModal(true)}>
                📋 View Full Details
              </button>
            </div>

            {/* 360° panorama thumbnails */}
            <div className="es-dh-pano-section">
              <div className="es-dh-pano-label">🔭 360° Panorama Views</div>
              <div className="es-dh-pano-list">
                {selected.panoramas.map((p, i) => (
                  <button
                    key={i}
                    className="es-dh-pano-btn"
                    style={{ borderColor: `${selected.color}50` }}
                    onClick={() => { setPanoIndex(i); setShowPanorama(true); }}
                  >
                    <span className="es-dh-pano-icon">🌐</span>
                    <span className="es-dh-pano-title">{p.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── Full details modal (centered, 75% height) ───────────────────────── */}
      {/* ── 360° Panorama Viewer ──────────────────────────────────────────────── */}
      {showPanorama && selected && (() => {
        const p = selected.panoramas[panoIndex] ?? selected.panoramas[0];
        return (
          <PanoramaViewer
            lat={p.lat}
            lng={p.lng}
            heading={p.heading}
            pitch={p.pitch}
            fov={p.fov}
            siteName={selected.name}
            subTitle={p.title}
            imageUrl={(p as any).imageUrl}
            availablePanos={selected.panoramas}
            activePanoIndex={panoIndex}
            onSelectPano={(idx) => setPanoIndex(idx)}
            onClose={() => setShowPanorama(false)}
          />
        );
      })()}

      {showModal && selected && (
        <div className="es-fullmodal-overlay" onClick={() => setShowModal(false)}>
          <div className="es-fullmodal" role="dialog" aria-modal="true" aria-label={`${selected.name} — full details`} onClick={e => e.stopPropagation()}>
            <button className="es-fullmodal-close" onClick={() => setShowModal(false)} aria-label="Close">✕</button>
            <div className="es-fullmodal-body">
              <div className="es-fullmodal-hero" style={{ borderBottom: `2px solid ${selected.color}30` }}>
                <div className="es-fm-emoji">{selected.image}</div>
                <h2 className="es-fm-name">{selected.name}</h2>
                <div className="es-fm-sub">{selected.subtitle} — {selected.district}, {selected.state}</div>
                <div className="es-fm-stats">
                  <Stars rating={selected.rating} />
                  <span className="es-fm-reviews">{selected.reviews.toLocaleString()} reviews</span>
                </div>
              </div>

              <div className="es-fullmodal-content">
                <section>
                  <h3>Overview</h3>
                  <p className="es-overview-desc">{selected.longDesc}</p>
                </section>

                <section>
                  <h3>Key Facts</h3>
                  <div className="es-facts-grid">
                    {[
                      { label: 'State',        val: selected.state },
                      { label: 'District',     val: selected.district },
                      { label: 'Established',  val: selected.established },
                      { label: 'Total Area',   val: selected.area },
                      { label: 'Distance',     val: selected.distance },
                      { label: 'Difficulty',   val: selected.difficulty },
                      { label: 'Language',     val: selected.language },
                      { label: 'Entry Fee',    val: selected.entryFee },
                      { label: 'Timings',      val: selected.timings },
                    ].map(f => (
                      <div key={f.label} className="es-fact">
                        <span className="es-fact-label">{f.label}</span>
                        <span className="es-fact-val">{f.val}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3>Highlights</h3>
                  <ul className="es-highlights">
                    {selected.highlights.map((h, i) => (
                      <li key={i} className="es-highlight-item"><span className="es-hi-dot" style={{ background: selected.color }}/> <span>{h}</span></li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3>Tags</h3>
                  <div className="es-tags">
                    {selected.tags.map(t => (
                      <span key={t} className="es-tag" style={{ borderColor: `${selected.color}50`, color: selected.color, background: `${selected.color}12` }}>{t}</span>
                    ))}
                  </div>
                </section>

                <section>
                  <h3>Conservation</h3>
                  <div className="es-conservation" style={{ borderColor: `${selected.color}40`, background: `${selected.color}08` }}>
                    <div className="es-con-text">{selected.conservation}</div>
                    <button className="es-con-btn" style={{ color: selected.color, borderColor: `${selected.color}40` }}>Support Conservation →</button>
                  </div>
                </section>

                <section>
                  <h3>Sub-sites</h3>
                  <div className="es-subsite-list">
                    {selected.subSites.map((sub, i) => (
                      <div key={i} className="es-subsite-item">
                        <div className="es-subsite-num" style={{ background: selected.color, color: '#0a0a14' }}>{i + 1}</div>
                        <div className="es-subsite-info">
                          <div className="es-subsite-name">{sub.name}</div>
                          <div className="es-subsite-type" style={{ color: selected.color }}>{sub.type}</div>
                          <div className="es-subsite-desc">{sub.desc}</div>
                          {sub.walkTime && <div className="es-subsite-walk">🚶 {sub.walkTime} from main entrance</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3>Where to Stay & Eat</h3>
                  <div className="es-stay-list">
                    {selected.nearbyStay.map((s, i) => (
                      <div key={i} className="es-stay-card">
                        <div className="es-stay-icon">🛏️</div>
                        <div className="es-stay-info">
                          <div className="es-stay-name">{s.name}</div>
                          <div className="es-stay-type">{s.type}</div>
                        </div>
                        <div className="es-stay-price" style={{ color: selected.color }}>{s.price}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <h4>Food</h4>
                    <div className="es-food-list">
                      {selected.food.map((f, i) => (
                        <div key={i} className="es-food-item">
                          <span className="es-food-emoji">🍽️</span>
                          <div>
                            <div className="es-food-name">{f.name}</div>
                            <div className="es-food-type">{f.type}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section>
                  <h3>360° Panorama Views</h3>
                  <div className="es-pano-grid">
                    {selected.panoramas.map((p, i) => (
                      <button
                        key={i}
                        className="es-pano-card"
                        style={{ borderColor: `${selected.color}40`, background: `${selected.color}08` }}
                        onClick={() => { setShowModal(false); setPanoIndex(i); setShowPanorama(true); }}
                      >
                        <div className="es-pano-icon">🌐</div>
                        <div className="es-pano-name">{p.title}</div>
                        <div className="es-pano-cta" style={{ color: selected.color }}>Open 360° View →</div>
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3>Experiences</h3>
                  <div className="es-exp-grid">
                    {selected.experiences.map((e, i) => (
                      <div key={i} className={`es-exp-card${!e.available ? ' es-exp-card--unavailable' : ''}`} style={e.available ? { borderColor: `${selected.color}40`, background: `${selected.color}08` } : {}}>
                        <div className="es-exp-emoji">{e.emoji}</div>
                        <div className="es-exp-title">{e.title}</div>
                        {e.available ? <button className="es-exp-book" style={{ background: selected.color, color: '#0a0a14' }}>Book</button> : <span className="es-exp-soon">Coming Soon</span>}
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3>How to reach</h3>
                  <div className="es-reach-list">
                    {selected.howToReach.map((r,i) => (
                      <div key={i} className="es-reach-card"><div className="es-reach-mode">{r.mode}</div><div className="es-reach-detail">{r.detail}</div><div className="es-reach-duration">{r.duration}</div></div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty right panel hint */}
      {!selected && (
        <div className="es-empty-detail">
          <div className="es-ed-icon">🏛️</div>
          <h3>Select a Heritage Site</h3>
          <p>Click any site card or map marker<br/>to see full details, sub-sites, stay options, and more.</p>
          <div className="es-ed-sites">
            {sites.slice(0, 8).map(s => (
              <button key={s.id} className="es-ed-site-btn" style={{ borderColor: `${s.color}50`, color: s.color, background: `${s.color}10` }} onClick={() => handleSelect(s)}>
                {s.image} {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
