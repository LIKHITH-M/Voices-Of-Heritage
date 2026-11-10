/**
 * frontend/src/components/research/PreferencesDashboard.tsx
 *
 * Real-time Personal Travel Knowledge Graph (PTKG) Dashboard.
 * Fetches and displays learned user affinities, confidence metrics, and drift flags
 * directly from the research-service backend.
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const RESEARCH_API = import.meta.env.VITE_RESEARCH_SERVICE_URL || 'http://localhost:5003/api';

interface PreferenceNode {
  dimension: string;
  value: string;
  affinity: number;
  confidence: number;
  status: 'like' | 'avoid' | 'weak' | 'retired';
  driftFlag?: boolean;
}

interface PTKGSummary {
  nodeCount: number;
  edgeCount: number;
  prefCount: number;
  tripCount: number;
  topLiked: Array<{ label: string; affinity: number; dimension: string }>;
  topAvoided: Array<{ label: string; affinity: number; dimension: string }>;
}

export const PreferencesDashboard: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id || user?.email || 'voh-user';

  const [summary, setSummary] = useState<PTKGSummary | null>(null);
  const [preferences, setPreferences] = useState<PreferenceNode[]>([]);
  const [selectedDimension, setSelectedDimension] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRebuilding, setIsRebuilding] = useState(false);

  async function loadPTKGData() {
    setIsLoading(true);
    try {
      // 1. Fetch summary
      const sumRes = await fetch(`${RESEARCH_API}/research/ptkg/${userId}`);
      if (sumRes.ok) {
        const sumJson = await sumRes.json();
        if (sumJson.success && sumJson.data) setSummary(sumJson.data);
      }

      // 2. Fetch all preferences
      const prefRes = await fetch(`${RESEARCH_API}/research/preferences/${userId}`);
      if (prefRes.ok) {
        const prefJson = await prefRes.json();
        if (prefJson.success && Array.isArray(prefJson.data)) {
          setPreferences(prefJson.data);
        }
      }
    } catch (err) {
      console.warn('[PTKG Dashboard] Backend offline or user has no consolidated trips yet');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPTKGData();
  }, [userId]);

  async function handleRebuild() {
    setIsRebuilding(true);
    try {
      const res = await fetch(`${RESEARCH_API}/research/ptkg/${userId}/build`, { method: 'POST' });
      if (res.ok) {
        await loadPTKGData();
      }
    } catch (e) {
      console.error('Failed to trigger PTKG rebuild', e);
    } finally {
      setIsRebuilding(false);
    }
  }

  // Dimension filter
  const dimensions = ['all', ...Array.from(new Set(preferences.map(p => p.dimension)))];
  const filteredPrefs = selectedDimension === 'all'
    ? preferences
    : preferences.filter(p => p.dimension === selectedDimension);

  const likedPrefs = filteredPrefs.filter(p => p.status === 'like');
  const avoidedPrefs = filteredPrefs.filter(p => p.status === 'avoid');

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-neutral-950 p-5 shadow-2xl text-neutral-100">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <h3 className="text-base font-bold text-white tracking-tight">
              Personal Travel Knowledge Graph (PTKG)
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
              Continual Learning Model
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Learned dynamically from your ratings, reviews, site feedbacks, and post-trip reflections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRebuild}
            disabled={isRebuilding}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 border border-neutral-700 transition flex items-center gap-1.5"
          >
            <span>🔄</span>
            <span>{isRebuilding ? 'Synchronizing...' : 'Sync Graph'}</span>
          </button>
        </div>
      </div>

      {/* Graph High-Level Stat Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
          <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Graph Nodes</div>
          <div className="text-xl font-bold text-white mt-1">
            {summary?.nodeCount ?? preferences.length + 1}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">Traveler, Sites, Prefs</div>
        </div>

        <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
          <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Learned Edges</div>
          <div className="text-xl font-bold text-white mt-1">
            {summary?.edgeCount ?? preferences.length}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">HAS_PREF, VISITED</div>
        </div>

        <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
          <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Consolidated Trips</div>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {summary?.tripCount ?? 0}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">Evidence source</div>
        </div>

        <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
          <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Active Preferences</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {preferences.length}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">Likes & Avoids</div>
        </div>
      </div>

      {/* Dimension Filter Pills */}
      {dimensions.length > 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none text-xs">
          {dimensions.map(dim => (
            <button
              key={dim}
              type="button"
              onClick={() => setSelectedDimension(dim)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium uppercase tracking-wider transition ${
                selectedDimension === dim
                  ? 'bg-amber-600 text-white font-bold shadow-sm'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              {dim.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}

      {/* Main Preferences Content */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-neutral-500">
          Reading user knowledge graph nodes...
        </div>
      ) : preferences.length === 0 ? (
        <div className="py-10 text-center rounded-xl bg-neutral-900/40 border border-dashed border-neutral-800 p-6">
          <div className="text-3xl mb-2">🧭</div>
          <h4 className="text-sm font-semibold text-neutral-300">Cold Start Traveler Profile</h4>
          <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1 leading-relaxed">
            Your personal travel knowledge graph is waiting for your first trip experiences. Rate visited sites or complete a post-trip reflection to begin learning your architectural and travel affinities!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Positive Liked Preferences */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wide px-1">
              <span>❤️ Liked Heritage Affinities ({likedPrefs.length})</span>
              <span className="text-[10px] text-neutral-500 font-normal">Affinity & Confidence</span>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {likedPrefs.length > 0 ? (
                likedPrefs.map((pref, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-emerald-500/30 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-white">
                        {pref.value}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {pref.driftFlag && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Shift
                          </span>
                        )}
                        <span className="text-[11px] font-mono font-bold text-emerald-400">
                          +{(pref.affinity || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {/* Confidence bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.round((pref.confidence || 0.5) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {Math.round((pref.confidence || 0.5) * 100)}% conf
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-1 uppercase">
                      {pref.dimension.replace('_', ' ')}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-neutral-500 italic p-2">No positive affinities in this category.</p>
              )}
            </div>
          </div>

          {/* Negative Avoided Preferences */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-rose-400 uppercase tracking-wide px-1">
              <span>👎 Avoided Preferences ({avoidedPrefs.length})</span>
              <span className="text-[10px] text-neutral-500 font-normal">Negative Affinity</span>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {avoidedPrefs.length > 0 ? (
                avoidedPrefs.map((pref, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-rose-500/30 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-white">
                        {pref.value}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-rose-400">
                        {(pref.affinity || 0).toFixed(2)}
                      </span>
                    </div>
                    {/* Confidence bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full"
                          style={{ width: `${Math.round((pref.confidence || 0.5) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {Math.round((pref.confidence || 0.5) * 100)}% conf
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-1 uppercase">
                      {pref.dimension.replace('_', ' ')}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-neutral-500 italic p-2">No negative preferences recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreferencesDashboard;

