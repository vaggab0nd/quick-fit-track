import { useState } from 'react';
import { api } from '../api.js';

const TYPES = [
  { value: 'run', label: 'Run', icon: '🏃' },
  { value: 'cycle', label: 'Cycle', icon: '🚴' },
  { value: 'walk', label: 'Walk', icon: '🚶' },
];

export default function AddActivityModal({ onClose, onAdded }) {
  const today = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState('run');
  const [date, setDate] = useState(today);
  const [distance, setDistance] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [elevation, setElevation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const distKm = parseFloat(distance);
    if (!distance || isNaN(distKm) || distKm <= 0) {
      return setError('Enter a valid distance');
    }

    const h = parseInt(hours || '0', 10);
    const m = parseInt(minutes || '0', 10);
    const totalSeconds = h * 3600 + m * 60;
    if (totalSeconds <= 0) {
      return setError('Enter a valid duration');
    }

    setSaving(true);
    try {
      const { activity } = await api.addActivity({
        type,
        distance_km: distKm,
        duration_seconds: totalSeconds,
        elevation_m: parseFloat(elevation || '0'),
        activity_date: date,
      });
      onAdded(activity);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-md shadow-2xl border border-slate-700">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Log Activity</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Activity type */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Activity type</label>
            <div className="flex gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                    type === t.value
                      ? 'bg-teal-600 border-teal-500 text-white'
                      : 'border-slate-600 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Distance */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Distance (km)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 5.2"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Duration</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="number"
                  min="0"
                  max="23"
                  placeholder="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">h</span>
              </div>
              <div className="flex-1 relative">
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="30"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">m</span>
              </div>
            </div>
          </div>

          {/* Elevation (optional) */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Elevation gain (m) <span className="text-slate-500">— optional</span>
            </label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 120"
              value={elevation}
              onChange={(e) => setElevation(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 text-sm hover:border-slate-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
