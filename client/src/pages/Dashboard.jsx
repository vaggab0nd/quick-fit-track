import { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

const TYPE_ICONS = {
  run: '🏃',
  cycle: '🚴',
  walk: '🚶',
};

function formatTime(seconds) {
  if (!seconds) return '0h 0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatKm(km) {
  if (km === null || km === undefined) return '0';
  return Number(km).toFixed(1);
}

const TABS = ['overall', 'run', 'cycle', 'walk'];

const TAB_LABELS = {
  overall: 'Overall',
  run: '🏃 Run',
  cycle: '🚴 Cycle',
  walk: '🚶 Walk',
};

export default function Dashboard() {
  const [leaderboard, setLeaderboard] = useState(null);
  const [activeTab, setActiveTab] = useState('overall');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getLeaderboard();
      setLeaderboard(data);
    } catch (err) {
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const team = leaderboard?.team;
  const overallRows = leaderboard?.overall || [];
  const byType = leaderboard?.by_type || {};

  function getRows() {
    if (activeTab === 'overall') return overallRows;
    return byType[activeTab] || [];
  }

  const rows = getRows();

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Team Stats Bar */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4">
            Team Stats
          </h2>
          {loading ? (
            <div className="text-slate-500 text-sm">Loading...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total Distance" value={`${formatKm(team?.total_km)} km`} />
              <StatCard label="Total Time" value={formatTime(team?.total_seconds)} />
              <StatCard label="Activities" value={team?.activity_count || 0} />
              <StatCard label="This Week" value={`${formatKm(team?.this_week_km)} km`} accent />
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-700">
            <h2 className="text-white font-semibold text-lg">Leaderboard</h2>
            <button
              onClick={load}
              disabled={loading}
              className="text-sm text-teal-400 hover:text-teal-300 disabled:opacity-50 flex items-center gap-1 transition-colors"
            >
              <span className={loading ? 'animate-spin inline-block' : ''}>↻</span>
              Refresh
            </button>
          </div>

          {/* Tab Pills */}
          <div className="px-6 py-3 flex gap-2 border-b border-slate-700 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          {/* Table */}
          {error ? (
            <div className="px-6 py-8 text-center text-red-400">{error}</div>
          ) : loading ? (
            <div className="px-6 py-8 text-center text-slate-500">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-500">
              No activities yet. Get moving! 🏃
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3 font-semibold">Rank</th>
                    <th className="px-6 py-3 font-semibold">Name</th>
                    {activeTab === 'overall' ? (
                      <>
                        <th className="px-6 py-3 font-semibold text-right">Distance</th>
                        <th className="px-6 py-3 font-semibold text-right">Time</th>
                        <th className="px-6 py-3 font-semibold text-right">Count</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-3 font-semibold text-right">Distance</th>
                        <th className="px-6 py-3 font-semibold text-right">Time</th>
                        <th className="px-6 py-3 font-semibold text-right">Count</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.name}
                      className={`border-t border-slate-700 transition-colors ${
                        i === 0 ? 'bg-teal-900/20' : 'hover:bg-slate-700/30'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className={`font-bold text-lg ${
                          i === 0 ? 'text-yellow-400' :
                          i === 1 ? 'text-slate-300' :
                          i === 2 ? 'text-amber-600' :
                          'text-slate-500'
                        }`}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {activeTab !== 'overall' && (
                            <span>{TYPE_ICONS[activeTab]}</span>
                          )}
                          <span className="font-medium text-white">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-200 font-mono">
                        {formatKm(activeTab === 'overall' ? row.total_km : row.distance_km)} km
                      </td>
                      <td className="px-6 py-4 text-right text-slate-300 font-mono">
                        {formatTime(activeTab === 'overall' ? row.total_seconds : row.duration_seconds)}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400">
                        {activeTab === 'overall' ? row.activity_count : row.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className={`rounded-xl p-4 ${accent ? 'bg-teal-900/40 border border-teal-700/50' : 'bg-slate-700/50'}`}>
      <div className="text-slate-400 text-xs font-medium mb-1">{label}</div>
      <div className={`text-xl font-bold ${accent ? 'text-teal-300' : 'text-white'}`}>{value}</div>
    </div>
  );
}
