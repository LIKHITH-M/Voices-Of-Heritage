/**
 * frontend/src/components/trip/EditActivityModal.tsx
 *
 * Interactive Activity Edit Modal (adapted from AI-TripPlanner-main).
 * Allows the traveler to edit timing, monument names, costs, durations,
 * or swap activities with nearby heritage alternatives.
 *
 * Research Integration:
 *   Logs user modifications as an experience event to the PTKG
 *   so the graph continually learns what users add or replace!
 */

import React, { useState } from 'react';

export interface EditableActivity {
  dayIndex: number;
  activityIndex: number;
  time: string;
  name: string;
  type: string;
  duration: string | number;
  cost: number;
  note: string;
  emoji: string;
  lat: number;
  lng: number;
  preferenceMatch?: string | null;
}

interface Props {
  activity: EditableActivity;
  onSave: (updated: EditableActivity, reason: string) => void;
  onDelete: (dayIndex: number, activityIndex: number, reason: string) => void;
  onClose: () => void;
}

export const EditActivityModal: React.FC<Props> = ({
  activity,
  onSave,
  onDelete,
  onClose,
}) => {
  const [form, setForm] = useState<EditableActivity>({ ...activity });
  const [reason, setReason] = useState('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form, reason.trim());
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-neutral-100 font-sans">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <span className="text-lg">✏️</span>
            <div>
              <h3 className="text-sm font-bold text-white">Edit Activity Plan</h3>
              <p className="text-[11px] text-neutral-400">Day {activity.dayIndex + 1} · Stop #{activity.activityIndex + 1}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center text-xs transition"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Time</label>
              <input
                type="text"
                value={form.time}
                onChange={e => setForm({ ...form, time: e.target.value })}
                placeholder="09:00 AM"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Monument / Activity</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Virupaksha Temple"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Duration</label>
              <input
                type="text"
                value={form.duration}
                onChange={e => setForm({ ...form, duration: e.target.value })}
                placeholder="2 hours"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Cost (₹ INR)</label>
              <input
                type="number"
                min={0}
                value={form.cost}
                onChange={e => setForm({ ...form, cost: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Heritage Note / Description</label>
            <textarea
              rows={3}
              value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              placeholder="Historical significance, architectural style, or visitor tips..."
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Why are you changing this? <span className="normal-case font-normal">(optional)</span></label>
            <textarea
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="For example: too crowded, too much walking, or prefer more time here"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onDelete(activity.dayIndex, activity.activityIndex, reason.trim())}
              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition flex items-center gap-1"
            >
              <span>🗑️</span>
              <span>Remove</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-md transition flex items-center gap-1"
              >
                <span>💾</span>
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditActivityModal;

