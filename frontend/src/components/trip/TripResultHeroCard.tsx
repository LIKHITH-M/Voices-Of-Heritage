/**
 * frontend/src/components/trip/TripResultHeroCard.tsx
 *
 * Destination Hero Card & Summary Header (adapted from AI-TripPlanner-main).
 * Displays destination photography, trip stats, research mode status,
 * and quick-action buttons (PDF export, map focus, reflection).
 */

import React, { useState } from 'react';
import { exportItineraryToPDF } from './PDFExportService';

// Curated high-res imagery for popular Indian heritage destinations
const DESTINATION_IMAGES: Record<string, string> = {
  hampi: 'https://images.pexels.com/photos/1583339/pexels-photo-1583339.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
  gokarna: 'https://images.pexels.com/photos/931007/pexels-photo-931007.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
  jaipur: 'https://images.pexels.com/photos/3581368/pexels-photo-3581368.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
  varanasi: 'https://images.pexels.com/photos/2034335/pexels-photo-2034335.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
  agra: 'https://images.pexels.com/photos/1603650/pexels-photo-1603650.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
  delhi: 'https://images.pexels.com/photos/789750/pexels-photo-789750.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
  mumbai: 'https://images.pexels.com/photos/2403209/pexels-photo-2403209.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
  udaipur: 'https://images.pexels.com/photos/1206101/pexels-photo-1206101.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
  jodhpur: 'https://images.pexels.com/photos/3881104/pexels-photo-3881104.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
  mysore: 'https://images.pexels.com/photos/1583339/pexels-photo-1583339.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
  khajuraho: 'https://images.pexels.com/photos/2166559/pexels-photo-2166559.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
  default: 'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
};

function getHeroImage(destination = ''): string {
  const clean = destination.toLowerCase().replace(/[^a-z]/g, '');
  for (const [key, url] of Object.entries(DESTINATION_IMAGES)) {
    if (clean.includes(key)) return url;
  }
  return DESTINATION_IMAGES.default;
}

interface Props {
  destination: string;
  duration: number;
  startDate?: string;
  endDate?: string;
  travelers: number;
  totalCost?: { amount: number; currency: string };
  heritageTheme?: string;
  personalizationSummary?: string;
  itinerary: any[];
  depkgMeta?: any;
  onFocusMap?: () => void;
  className?: string;
}

export const TripResultHeroCard: React.FC<Props> = ({
  destination,
  duration,
  startDate,
  endDate,
  travelers,
  totalCost,
  heritageTheme,
  personalizationSummary,
  itinerary,
  depkgMeta,
  onFocusMap,
  className = '',
}) => {
  const [imgSrc, setImgSrc] = useState(getHeroImage(destination));
  const [isExporting, setIsExporting] = useState(false);

  const isResearchMode = depkgMeta?.mode === 'research';

  const handleDownloadPDF = () => {
    setIsExporting(true);
    try {
      exportItineraryToPDF({
        destination,
        duration,
        startDate,
        endDate,
        travelers,
        totalEstimatedCost: totalCost,
        heritageTheme,
        personalizationSummary,
        itinerary,
        depkgMeta,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const formattedCost = totalCost?.amount
    ? `${totalCost.currency || '₹'} ${totalCost.amount.toLocaleString('en-IN')}`
    : 'Custom Estimate';

  return (
    <div className={`rounded-2xl border border-amber-500/20 bg-neutral-900/95 overflow-hidden shadow-2xl ${className}`}>
      {/* Hero Image Header */}
      <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-neutral-950">
        <img
          src={imgSrc}
          alt={destination}
          onError={() => setImgSrc(DESTINATION_IMAGES.default)}
          className="w-full h-full object-cover object-center opacity-70 scale-105 transition-transform duration-700 hover:scale-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-lg ${
                isResearchMode
                  ? 'bg-amber-600/90 text-white border border-amber-400/50'
                  : 'bg-neutral-800/90 text-neutral-300 border border-neutral-700'
              }`}
            >
              {isResearchMode ? '🔬 Mode B: PTKG Research' : '📄 Mode A: Baseline'}
            </span>
            {depkgMeta?.verificationScore && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                Verified {depkgMeta.verificationScore}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="px-3 py-1.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 border border-neutral-700/80 shadow-md backdrop-blur-md transition flex items-center gap-1.5"
          >
            <span>📥</span>
            <span>{isExporting ? 'Exporting...' : 'Download PDF'}</span>
          </button>
        </div>

        {/* Bottom Content within Image */}
        <div className="absolute bottom-4 left-4 right-4">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
            {destination}
          </h2>
          {heritageTheme && (
            <p className="text-xs sm:text-sm text-amber-300/90 font-medium mt-1 drop-shadow-sm line-clamp-1">
              ✨ {heritageTheme}
            </p>
          )}
        </div>
      </div>

      {/* Stats and Action Bar */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-neutral-800">
        <div className="grid grid-cols-3 gap-4 sm:gap-8">
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Duration</div>
            <div className="text-base sm:text-lg font-bold text-white mt-0.5">{duration} Days</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Group Size</div>
            <div className="text-base sm:text-lg font-bold text-white mt-0.5">{travelers} Travelers</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Est. Budget</div>
            <div className="text-base sm:text-lg font-bold text-amber-400 mt-0.5">{formattedCost}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onFocusMap && (
            <button
              type="button"
              onClick={onFocusMap}
              className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5"
            >
              <span>🗺️</span>
              <span>View Interactive Map</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripResultHeroCard;

