import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import { api } from '../api.js';
import AddActivityModal from '../components/AddActivityModal.jsx';

const TYPE_ICONS = {
  run: '🏃',
  cycle: '🚴',
  walk: '🚶',
};

function formatDuration(seconds) {
  if (!seconds) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyActivities() {
  const { user, login } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState(''); // 'success' | 'error'
  const [currentUser, setCurrentUser] = useState(user);

  const stravaConnected = Boolean(currentUser?.strava_athlete_id);

  const showStatus = useCallback((msg, type = 'success') => {
    setStatusMsg(msg);
    setStatusType(type);
    setTimeout(() => setStatusMsg(''), 4000);
  }, []);

  // Handle Strava redirect query params
  useEffect(() => {
    const connected = searchParams.get('strava_connected');
    const errParam = searchParams.get('strava_error');

    if (connected) {
      showStatus('Strava connected and activities imported!', 'success');
      // Refresh user to get updated strava_athlete_id
      api.me().then(({ user: u }) => setCurrentUser(u)).catch(() => {});
      setSearchParams({}, { replace: true });
    } else if (errParam) {
      showStatus(`Strava connection failed: ${errParam}`, 'error');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, showStatus]);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const { activities: list } = await api.getActivities();
      setActivities(list);
    } catch (err) {
      showStatus('Failed to load activities', 'error');
    } finally {
      setLoading(false);
    }
  }, [showStatus]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  async function handleSync() {
    setSyncing(true);
    try {
      const { imported } = await api.stravaSync();
      showStatus(`Synced ${imported} new activit${imported === 1 ? 'y' : 'ies'} from Strava`, 'success');
      loadActivities();
    } catch (err) {
      showStatus(err.message || 'Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm('Disconnect Strava? Your imported activities will remain.')) return;
    setDisconnecting(true);
    try {
      await api.stravaDisconnect();
      setCurrentUser((u) => ({ ...u, strava_athlete_id: null }));
      showStatus('Strava disconnected', 'success');
    } catch (err) {
      showStatus(err.message || 'Failed to disconnect', 'error');
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this activity?')) return;
    try {
      await api.deleteActivity(id);
      setActivities((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      showStatus(err.message || 'Delete failed', 'error');
    }
  }

  function handleAdded(activity) {
    setActivities((prev) => [activity, ...prev]);
    showStatus('Activity added!', 'success');
  }

  function handleConnectStrava() {
    window.location.href = '/api/strava/auth';
  }

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-white">My Activities</h1>

          <div className="flex flex-wrap items-center gap-2">
            {/* Strava buttons */}
            {stravaConnected ? (
              <>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  <span className={syncing ? 'animate-spin inline-block' : ''}>⚡</span>
                  {syncing ? 'Syncing...' : 'Sync from Strava'}
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="px-4 py-2 rounded-lg border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500 disabled:opacity-50 text-sm transition-colors"
                >
                  {disconnecting ? 'Disconnecting...' : 'Disconnect Strava'}
                </button>
              </>
            ) : (
              <button
                onClick={handleConnectStrava}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors"
              >
                <span>⚡</span>
                Connect Strava
              </button>
            )}

            {/* Add activity */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              Add Activity
            </button>
          </div>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div className={`px-4 py-3 rounded-xl text-sm border ${
            statusType === 'error'
              ? 'bg-red-900/40 border-red-700 text-red-300'
              : 'bg-teal-900/40 border-teal-700 text-teal-300'
          }`}>
            {statusMsg}
          </div>
        )}

        {/* Activities Table */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          {loading ? (
            <div className="px-6 py-12 text-center text-slate-500">Loading...</div>
          ) : activities.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-4xl mb-3">🏃</div>
              <p className="text-slate-400">No activities yet.</p>
              <p className="text-slate-500 text-sm mt-1">
                Add one manually or connect Strava to import.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-slate-700">
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold text-right">Distance</th>
                    <th className="px-5 py-3 font-semibold text-right">Duration</th>
                    <th className="px-5 py-3 font-semibold text-right">Elevation</th>
                    <th className="px-5 py-3 font-semibold text-center">Source</th>
                    <th className="px-5 py-3 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((act, i) => (
                    <tr
                      key={act.id}
                      className={`border-t border-slate-700/50 hover:bg-slate-700/20 transition-colors ${
                        i % 2 === 0 ? '' : 'bg-slate-700/10'
                      }`}
                    >
                      <td className="px-5 py-3 text-slate-300 text-sm whitespace-nowrap">
                        {formatDate(act.activity_date)}
                      </td>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2 text-sm text-white">
                          <span>{TYPE_ICONS[act.type]}</span>
                          <span className="capitalize">{act.type}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-slate-200 text-sm">
                        {Number(act.distance_km).toFixed(2)} km
                      </td>
                      <td className="px-5 py-3 text-right text-slate-300 text-sm">
                        {formatDuration(act.duration_seconds)}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-400 text-sm">
                        {act.elevation_m > 0 ? `${Math.round(act.elevation_m)}m` : '—'}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {act.source === 'strava' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-900/40 border border-orange-700/50 text-orange-300 text-xs font-medium">
                            ⚡ Strava
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-700 border border-slate-600 text-slate-300 text-xs font-medium">
                            Manual
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleDelete(act.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors text-lg leading-none"
                          title="Delete activity"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Activity Modal */}
      {showModal && (
        <AddActivityModal
          onClose={() => setShowModal(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
}
