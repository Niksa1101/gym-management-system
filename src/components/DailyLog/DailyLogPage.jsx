import React, { useState, useEffect, useCallback } from 'react';
import { todayStr, formatDateLong, formatMembershipLabel, LOCKER_KEYS, formatDate } from '../../lib/constants';
import CheckInModal from './CheckInModal';

export default function DailyLogPage({ onMemberClick }) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [logEntries, setLogEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showLostKey, setShowLostKey] = useState(false);

  const loadLog = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await window.api.getAttendanceByDate(selectedDate);
      setLogEntries(entries);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { loadLog(); }, [loadLog]);

  async function handleDeleteEntry(id) {
    if (!window.confirm('Ukloniti ovaj unos?')) return;
    await window.api.deleteAttendance(id);
    loadLog();
  }

  const sessions = logEntries.filter((e) => e.visit_type === 'session').length;
  const solos = logEntries.filter((e) => e.visit_type === 'solo').length;
  const fitpass = logEntries.filter((e) => e.visit_type === 'fitpass_group' || e.visit_type === 'fitpass_solo').length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dnevna evidencija</h1>
            <p className="text-sm text-gray-500 mt-0.5">{formatDateLong(selectedDate)}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              max={todayStr()}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {selectedDate !== todayStr() && (
              <button
                onClick={() => setSelectedDate(todayStr())}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium px-2 py-2"
              >
                Danas
              </button>
            )}
            <button
              onClick={() => setShowLostKey(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
            >
              🔑 Izgubljen kljuc
            </button>
            <button
              onClick={() => setShowCheckIn(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Prijava
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-4">
          <StatChip label="Ukupno" value={logEntries.length} color="gray" />
          <StatChip label="Treninga" value={sessions} color="blue" />
          <StatChip label="Solo" value={solos} color="amber" />
          {fitpass > 0 && <StatChip label="FitPass" value={fitpass} color="purple" />}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto scrollbar-thin px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Ucitavanje…</div>
        ) : logEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <svg className="w-10 h-10 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">Nema prijava za ovaj datum</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Clan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ormaric</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Poseta</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Clanarina</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {logEntries.map((entry, i) => (
                  <tr key={entry.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onMemberClick(entry.member_id)}
                        className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-left"
                      >
                        {entry.name} {entry.surname}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-400">#{entry.member_id}</td>
                    <td className="px-4 py-3">
                      {entry.locker_key ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                          🔑 {entry.locker_key}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <VisitTypeBadge type={entry.visit_type} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {entry.membership_type
                        ? formatMembershipLabel(entry.membership_type, entry.membership_category)
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                        title="Ukloni unos"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCheckIn && (
        <CheckInModal
          date={selectedDate}
          onClose={() => setShowCheckIn(false)}
          onSuccess={loadLog}
        />
      )}

      {showLostKey && (
        <LostKeyModal onClose={() => setShowLostKey(false)} />
      )}
    </div>
  );
}

// ── Lost Key Modal ────────────────────────────────────────────────────────────

function LostKeyModal({ onClose }) {
  const [selectedKey, setSelectedKey] = useState('');
  const [result, setResult] = useState(undefined); // null = not found, object = found
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function lookup(key) {
    setSelectedKey(key);
    setLoading(true);
    try {
      const r = await window.api.getLastLockerUser(key);
      setResult(r || null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">🔑 Pretraga izgubljenog kljuca</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-3">Izaberite broj ormarca da vidite ko ga je poslednji koristio:</p>
            <div className="grid grid-cols-6 gap-1.5">
              {LOCKER_KEYS.map((k) => (
                <button
                  key={k}
                  onClick={() => lookup(k)}
                  className={`h-10 rounded-lg text-sm font-bold transition-colors ${
                    selectedKey === k
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-amber-100 hover:text-amber-800'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          {selectedKey && (
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Poslednja osoba sa ormaricem #{selectedKey}
              </p>
              {loading ? (
                <p className="text-sm text-gray-400">Trazenje…</p>
              ) : result === null ? (
                <p className="text-sm text-gray-400 italic">Nema zapisa za ovaj kljuc ormarca.</p>
              ) : result ? (
                <div className="space-y-1">
                  <p className="text-lg font-bold text-gray-900">{result.name} {result.surname}</p>
                  <p className="text-sm text-gray-600">{result.phone || 'Nema broja telefona'}</p>
                  <p className="text-xs text-gray-400 mt-1">Poslednje korisceno: {formatDate(result.date)}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Zatvori
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatChip({ label, value, color }) {
  const colors = { gray: 'text-gray-900', blue: 'text-blue-600', amber: 'text-amber-600', purple: 'text-purple-600' };
  return (
    <div className="flex items-center gap-2">
      <span className={`text-2xl font-bold ${colors[color]}`}>{value}</span>
      <span className="text-sm text-gray-400">{label}</span>
    </div>
  );
}

export function VisitTypeBadge({ type }) {
  const map = {
    session:       'bg-blue-100 text-blue-700',
    solo:          'bg-amber-100 text-amber-700',
    fitpass_group: 'bg-purple-100 text-purple-700',
    fitpass_solo:  'bg-slate-100 text-slate-600',
  };
  const labels = {
    session: 'Trening',
    solo: 'Solo',
    fitpass_group: 'FitPass Group',
    fitpass_solo: 'FitPass Solo',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${map[type] || 'bg-gray-100 text-gray-600'}`}>
      {labels[type] || type}
    </span>
  );
}
