/**
 * frontend/src/components/research/ResearchModeToggle.tsx
 *
 * Mode selector for evaluating Baseline AI vs Research PTKG System:
 *   - Mode A (Baseline): Standard Prompt-based LLM generation
 *   - Mode B (Research): Dynamic Personal Travel Knowledge Graph (PTKG) + RAG Knowledge Grounding
 */

import React from 'react';

export type PlannerMode = 'baseline' | 'research';

interface Props {
  mode: PlannerMode;
  onChange: (mode: PlannerMode) => void;
  className?: string;
}

export const ResearchModeToggle: React.FC<Props> = ({ mode, onChange, className = '' }) => {
  return (
    <div className={`rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 backdrop-blur-sm ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Research Comparison Mode
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40">
              VoH Experiment
            </span>
          </div>
          <p className="text-xs text-neutral-300 mt-0.5">
            Compare standard baseline trip planning against the dynamic Personal Travel Knowledge Graph (PTKG).
          </p>
        </div>

        {/* Toggle Pills */}
        <div className="inline-flex rounded-lg bg-neutral-900/80 p-1 border border-neutral-700/60 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => onChange('baseline')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              mode === 'baseline'
                ? 'bg-neutral-700 text-white shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>📄</span>
            <span>Mode A: Baseline</span>
          </button>

          <button
            type="button"
            onClick={() => onChange('research')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              mode === 'research'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-sm font-semibold ring-1 ring-amber-400/50'
                : 'text-neutral-400 hover:text-amber-200'
            }`}
          >
            <span>🧠</span>
            <span>Mode B: PTKG Research</span>
          </button>
        </div>
      </div>

      {/* Mode Description Banner */}
      <div className="mt-2.5 pt-2 border-t border-amber-500/15 text-[11px] leading-relaxed text-neutral-400">
        {mode === 'baseline' ? (
          <span className="text-neutral-300">
            <strong className="text-neutral-200">Baseline (Mode A):</strong> Uses pure LLM few-shot prompt synthesis without knowledge graph personalization or continual preference learning.
          </span>
        ) : (
          <span className="text-amber-200/90">
            <strong className="text-amber-300">Research (Mode B):</strong> Injects compressed PTKG graph context (learned architectural & dynasty affinities), external RAG heritage knowledge, and enables continual learning feedback loop.
          </span>
        )}
      </div>
    </div>
  );
};

