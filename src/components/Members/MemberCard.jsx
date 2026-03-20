import React, { useState, useEffect, useCallback } from 'react';
import {
  isExpired,
  isUnlimited,
  formatDate,
  formatMembershipLabel,
  MEMBERSHIP_TYPES,
  DISCOUNT_CATEGORIES,
} from '../../lib/constants';
import MemberForm from './MemberForm';
import MembershipForm from './MembershipForm';

export default function MemberCard({ memberId, onDeleted, onUpdated }) {
  const [member, setMember] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // membershipId → attendanceRows
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState(false);
  const [addingMembership, setAddingMembership] = useState(false);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, ms] = await Promise.all([
        window.api.getMember(memberId),
        window.api.getMemberships(memberId),
      ]);
      setMember(m);
      setMemberships(ms);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    load();
    setEditingMember(false);
    setAddingMembership(false);
    setExpandedHistoryIds(new Set());
    setAttendanceMap({});
  }, [load]);

  async function loadAttendance(membershipId) {
    if (attendanceMap[membershipId]) return; // already loaded
    const rows = await window.api.getAttendanceByMembership(membershipId);
    setAttendanceMap((prev) => ({ ...prev, [membershipId]: rows }));
  }

  function toggleHistory(msId) {
    setExpandedHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(msId)) {
        next.delete(msId);
      } else {
        next.add(msId);
        loadAttendance(msId);
      }
      return next;
    });
  }

  async function handleDelete() {
    if (!window.confirm(`Obrisati ${member.name} ${member.surname}? Ovo ce ukloniti sve njihove podatke.`)) return;
    await window.api.deleteMember(memberId);
    onDeleted();
  }

  async function handleDeactivateMembership(msId) {
    if (!window.confirm('Deaktivirati ovu clanarinu?')) return;
    await window.api.deactivateMembership(msId);
    load();
    onUpdated();
  }

  async function handlePauseMembership(msId) {
    if (!window.confirm('Pauzirati ovu clanarinu?')) return;
    await window.api.pauseMembership(msId);
    load();
    onUpdated();
  }

  async function handleResumeMembership(msId) {
    await window.api.resumeMembership(msId);
    load();
    onUpdated();
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading…</div>
    );
  }

  if (!member) return null;

  if (editingMember) {
    return (
      <MemberForm
        member={member}
        onSave={() => { setEditingMember(false); load(); onUpdated(); }}
        onCancel={() => setEditingMember(false)}
      />
    );
  }

  if (addingMembership) {
    return (
      <MembershipForm
        memberId={memberId}
        onSave={() => { setAddingMembership(false); load(); }}
        onCancel={() => setAddingMembership(false)}
      />
    );
  }

  const activeMembership = memberships.find((ms) => ms.is_active);
  const historyMemberships = memberships.filter((ms) => !ms.is_active);
  const expired = activeMembership ? isExpired(activeMembership) : false;

  return (
    <div className="h-full overflow-auto scrollbar-thin">
      <div className="p-6 max-w-2xl mx-auto space-y-5">

        {/* Member header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
                {member.name[0]}{member.surname[0]}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{member.name} {member.surname}</h2>
                <p className="text-sm text-gray-400">Clan #{member.id}</p>
                {member.phone && <p className="text-sm text-gray-600 mt-0.5">{member.phone}</p>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setEditingMember(true)}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Izmeni
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 text-sm text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
              >
                Obrisi
              </button>
            </div>
          </div>

          {/* Discount */}
          {member.discount_eligible ? (
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                Popust · {member.discount_category}
              </span>
            </div>
          ) : null}

          {member.notes && (
            <p className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 italic">{member.notes}</p>
          )}
        </div>

        {/* Active membership */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Aktivna clanarina</h3>
            <button
              onClick={() => setAddingMembership(true)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              + Nova clanarina
            </button>
          </div>

          {activeMembership ? (
            <ActiveMembershipCard
              membership={activeMembership}
              attendance={attendanceMap[activeMembership.id]}
              expired={expired}
              expanded={expandedHistoryIds.has(activeMembership.id)}
              onToggle={() => toggleHistory(activeMembership.id)}
              onDeactivate={() => handleDeactivateMembership(activeMembership.id)}
              onPause={() => handlePauseMembership(activeMembership.id)}
              onResume={() => handleResumeMembership(activeMembership.id)}
            />
          ) : (
            <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-6 text-center">
              <p className="text-sm text-gray-400">Nema aktivne clanarine</p>
              <button
                onClick={() => setAddingMembership(true)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Dodaj clanarinu
              </button>
            </div>
          )}
        </div>

        {/* History */}
        {historyMemberships.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-2">
              Istorija clanarina ({historyMemberships.length})
            </h3>
            <div className="space-y-2">
              {historyMemberships.map((ms) => (
                <PastMembershipCard
                  key={ms.id}
                  membership={ms}
                  attendance={attendanceMap[ms.id]}
                  expanded={expandedHistoryIds.has(ms.id)}
                  onToggle={() => toggleHistory(ms.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Active membership card ────────────────────────────────────────────────────

function ActiveMembershipCard({ membership, attendance, expired, expanded, onToggle, onDeactivate, onPause, onResume }) {
  const unlimited = isUnlimited(membership.membership_category);
  const paused = !!membership.is_paused;
  const sessionsLeft = membership.sessions_total
    ? membership.sessions_total - membership.sessions_used
    : null;

  const borderColor = paused ? 'border-amber-300' : expired ? 'border-red-300' : 'border-green-300';

  return (
    <div className={`bg-white rounded-2xl border-2 ${borderColor} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-900">
                {formatMembershipLabel(membership.membership_type, membership.membership_category)}
              </span>
              <StatusBadge expired={expired} paused={paused} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
              <p className="text-xs text-gray-500">Pocetak: {formatDate(membership.start_date)}</p>
              {!paused && <p className="text-xs text-gray-500">Istice: {formatDate(membership.expiry_date)}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {!expired && (
              paused ? (
                <button
                  onClick={onResume}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                  title="Nastavi clanarinu"
                >
                  Nastavi
                </button>
              ) : (
                <button
                  onClick={onPause}
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors"
                  title="Pauziraj clanarinu"
                >
                  Pauziraj
                </button>
              )
            )}
            <button
              onClick={onDeactivate}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              title="Deaktiviraj clanarinu"
            >
              Deaktiviraj
            </button>
          </div>
        </div>

        {/* Paused info banner */}
        {paused && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 space-y-1">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs font-semibold text-amber-800">
                Pauzirana od {formatDate(membership.paused_date)}
              </p>
            </div>
            <p className="text-xs text-amber-700 pl-5">
              {membership.days_remaining_at_pause} {membership.days_remaining_at_pause === 1 ? 'dan preostao' : 'dana preostalo'} pri pauziranju
            </p>
            {membership.sessions_remaining_at_pause != null && (
              <p className="text-xs text-amber-700 pl-5">
                {membership.sessions_remaining_at_pause} {membership.sessions_remaining_at_pause === 1 ? 'trening preostao' : 'treninga preostalo'} pri pauziranju
              </p>
            )}
            <p className="text-xs text-amber-600 pl-5 italic">
              Po nastavku istice za {membership.days_remaining_at_pause} {membership.days_remaining_at_pause === 1 ? 'dan' : 'dana'} od danas
            </p>
          </div>
        )}

        {/* Session progress */}
        {!unlimited && membership.sessions_total && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500 font-medium">Iskorisceno treninga</span>
              <span className="text-xs font-bold text-gray-700">
                {membership.sessions_used} / {membership.sessions_total}
              </span>
            </div>
            <SessionProgressBar used={membership.sessions_used} total={membership.sessions_total} paused={paused} />
            {!expired && !paused && sessionsLeft !== null && (
              <p className="text-xs text-gray-400 mt-1">{sessionsLeft} {sessionsLeft === 1 ? 'trening preostao' : 'treninga preostalo'}</p>
            )}
          </div>
        )}

        {unlimited && !paused && (
          <div className="mt-3 text-xs text-gray-500 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Neogranicene posete
          </div>
        )}

        {/* Toggle attendance */}
        <button
          onClick={onToggle}
          className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {expanded ? 'Sakrij' : 'Prikazi'} datume poseta
        </button>
      </div>

      {expanded && (
        <AttendanceGrid
          attendance={attendance}
          sessionsTotal={membership.sessions_total}
          unlimited={unlimited}
        />
      )}
    </div>
  );
}

// ── Past membership card ──────────────────────────────────────────────────────

function PastMembershipCard({ membership, attendance, expanded, onToggle }) {
  const unlimited = isUnlimited(membership.membership_category);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-medium text-gray-700 text-sm">
              {formatMembershipLabel(membership.membership_type, membership.membership_category)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatDate(membership.start_date)} → {formatDate(membership.expiry_date)}
              {!unlimited && membership.sessions_total && (
                <span className="ml-2 text-gray-500">
                  · {membership.sessions_used}/{membership.sessions_total} treninga
                </span>
              )}
            </p>
          </div>
          <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <AttendanceGrid
          attendance={attendance}
          sessionsTotal={membership.sessions_total}
          unlimited={unlimited}
        />
      )}
    </div>
  );
}

// ── Attendance grid (punch card) ──────────────────────────────────────────────

function AttendanceGrid({ attendance, sessionsTotal, unlimited }) {
  if (!attendance) {
    return (
      <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-400">Ucitavanje…</div>
    );
  }

  if (attendance.length === 0) {
    return (
      <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-400 italic">Nema poseta za ovaj period.</div>
    );
  }

  const sessions = attendance.filter((a) => a.session_counted);
  const solos = attendance.filter((a) => !a.session_counted);

  return (
    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
      {/* Session slots (punch card visual) */}
      {!unlimited && sessionsTotal && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">Kartica treninga</p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: sessionsTotal }, (_, i) => {
              const session = sessions[i];
              return (
                <div
                  key={i}
                  title={session ? `Trening ${i + 1}: ${formatDate(session.date)}` : `Trening ${i + 1}: neiskoriscen`}
                  className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-center transition-colors ${
                    session
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {session ? (
                    <>
                      <span className="text-xs font-bold leading-none">
                        {new Date(session.date + 'T00:00:00').getDate()}
                      </span>
                      <span className="text-[9px] leading-none opacity-80">
                        {new Date(session.date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' })}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs">{i + 1}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unlimited: list all visit dates */}
      {unlimited && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">Datumi poseta ({attendance.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {attendance.map((a) => (
              <span
                key={a.id}
                className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium"
              >
                {formatDate(a.date)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Solo visits */}
      {solos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">Solo posete ({solos.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {solos.map((a) => (
              <span
                key={a.id}
                className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-medium"
              >
                {formatDate(a.date)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ expired, paused }) {
  if (paused) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        PAUZIRANA
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
      expired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
    }`}>
      {expired ? 'ISTEKLA' : 'AKTIVNA'}
    </span>
  );
}

function SessionProgressBar({ used, total, paused }) {
  const pct = Math.min(100, Math.round((used / total) * 100));
  const barColor = paused ? 'bg-amber-400' : pct >= 100 ? 'bg-red-400' : 'bg-blue-500';
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
