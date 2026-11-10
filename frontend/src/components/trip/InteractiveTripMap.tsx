/**
 * frontend/src/components/trip/InteractiveTripMap.tsx
 *
 * Synchronized Interactive Itinerary Map (adapted from AI-TripPlanner-main).
 * Features:
 *   - Custom numbered activity markers (1, 2, 3...)
 *   - Road route polyline connecting sequential activities
 *   - Auto-recenter and pan to active activity with popup
 *   - Day switching support
 */

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ActivityItem {
  time?: string;
  name?: string;
  activity?: string;
  duration?: string | number;
  cost?: number | { amount: number };
  note?: string;
  heritage_note?: string;
  lat: number;
  lng: number;
}

interface Props {
  activities: ActivityItem[];
  center: [number, number];
  selectedActivityIndex: number | null;
  onSelectActivity?: (index: number) => void;
  className?: string;
}

// Controller component to smoothly pan map when selected activity or day changes
function MapViewController({ center, selectedActivity }: { center: [number, number]; selectedActivity: ActivityItem | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedActivity?.lat && selectedActivity?.lng) {
      map.flyTo([selectedActivity.lat, selectedActivity.lng], 15, { duration: 1.2 });
    } else if (center) {
      map.setView(center, 13);
    }
  }, [center, selectedActivity, map]);

  return null;
}

// Create custom circular numbered pin icon for each sequential activity
function createNumberedIcon(number: number, isSelected: boolean) {
  const bgColor = isSelected ? '#d97706' : '#1e293b';
  const borderColor = isSelected ? '#fbbf24' : '#f59e0b';
  const scale = isSelected ? 'scale(1.2)' : 'scale(1.0)';

  return L.divIcon({
    className: 'custom-numbered-pin',
    html: `
      <div style="
        width: 30px;
        height: 30px;
        background: ${bgColor};
        border: 2px solid ${borderColor};
        border-radius: 50%;
        color: #ffffff;
        font-weight: 800;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        transform: ${scale};
        transition: transform 0.2s ease;
      ">
        ${number}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

export const InteractiveTripMap: React.FC<Props> = ({
  activities = [],
  center,
  selectedActivityIndex,
  onSelectActivity,
  className = '',
}) => {
  const markerRefs = useRef<Record<number, L.Marker | null>>({});
  const [tileLayer, setTileLayer] = useState<'streets' | 'satellite'>('streets');

  // Auto-open marker popup when selected in sidebar
  useEffect(() => {
    if (selectedActivityIndex !== null && markerRefs.current[selectedActivityIndex]) {
      markerRefs.current[selectedActivityIndex]?.openPopup();
    }
  }, [selectedActivityIndex]);

  // Valid coordinate positions for route line
  const positions: [number, number][] = activities
    .filter(a => a.lat && a.lng && !isNaN(a.lat) && !isNaN(a.lng))
    .map(a => [a.lat, a.lng]);

  const selectedActivity = (selectedActivityIndex !== null && activities[selectedActivityIndex])
    ? activities[selectedActivityIndex]
    : null;

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl bg-neutral-950 ${className}`}>
      {/* Map Control Bar Overlay */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 bg-neutral-900/90 backdrop-blur-md p-1.5 rounded-xl border border-neutral-700/70 shadow-lg text-xs">
        <button
          type="button"
          onClick={() => setTileLayer('streets')}
          className={`px-2.5 py-1 rounded-lg font-medium transition ${
            tileLayer === 'streets' ? 'bg-amber-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
          }`}
        >
          🗺️ Standard
        </button>
        <button
          type="button"
          onClick={() => setTileLayer('satellite')}
          className={`px-2.5 py-1 rounded-lg font-medium transition ${
            tileLayer === 'satellite' ? 'bg-amber-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
          }`}
        >
          🛰️ Satellite
        </button>
      </div>

      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', minHeight: '440px' }}
      >
        <MapViewController center={center} selectedActivity={selectedActivity} />

        {tileLayer === 'streets' ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <TileLayer
            attribution='Tiles &copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}

        {/* Route Polyline connecting daily stops */}
        {positions.length > 1 && (
          <Polyline
            positions={positions}
            pathOptions={{
              color: '#f59e0b',
              weight: 4,
              opacity: 0.85,
              dashArray: '8, 8',
            }}
          />
        )}

        {/* Numbered Activity Markers */}
        {activities.map((act, idx) => {
          if (!act.lat || !act.lng) return null;
          const isSelected = selectedActivityIndex === idx;

          return (
            <Marker
              key={idx}
              position={[act.lat, act.lng]}
              icon={createNumberedIcon(idx + 1, isSelected)}
              ref={el => { markerRefs.current[idx] = el; }}
              eventHandlers={{
                click: () => onSelectActivity && onSelectActivity(idx),
              }}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-1 max-w-[220px]">
                  <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">
                    Stop #{idx + 1} {act.time ? `· ${act.time}` : ''}
                  </div>
                  <h4 className="text-sm font-bold text-neutral-900 mt-0.5 leading-snug">
                    {act.activity || act.name || 'Heritage Monument'}
                  </h4>
                  {(act.heritage_note || act.note) && (
                    <p className="text-[11px] text-neutral-600 mt-1 line-clamp-3 leading-relaxed">
                      {act.heritage_note || act.note}
                    </p>
                  )}
                  {act.duration && (
                    <div className="mt-2 pt-1 border-t border-neutral-200 text-[10px] text-neutral-500 font-medium">
                      ⏱️ Duration: {typeof act.duration === 'number' ? `${act.duration}h` : act.duration}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default InteractiveTripMap;

