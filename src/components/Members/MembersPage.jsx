import React, { useState, useEffect, useCallback } from 'react';
import { isExpired, MEMBERSHIP_TYPES } from '../../lib/constants';
import MemberCard from './MemberCard';
import MemberForm from './MemberForm';

export default function MembersPage({ jumpToMemberId, onClearJump }) {
  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      let results;
      if (query.trim()) {
        results = await window.api.searchMembers(query.trim());
      } else {
        results = await window.api.getMembers();
      }
      setMembers(results);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const t = setTimeout(loadMembers, 200);
    return () => clearTimeout(t);
  }, [loadMembers]);

  // Handle jump from daily log
  useEffect(() => {
    if (jumpToMemberId) {
      setSelectedMemberId(jumpToMemberId);
      onClearJump();
    }
  }, [jumpToMemberId, onClearJump]);

  function handleMemberSaved() {
    setShowAddForm(false);
    loadMembers();
  }

  function handleMemberDeleted() {
    setSelectedMemberId(null);
    loadMembers();
  }

  return (
    <div className="h-full flex">
      {/* Left panel — member list */}
      <div className={`flex flex-col border-r border-gray-200 bg-white ${selectedMemberId ? 'w-72 shrink-0' : 'flex-1'}`}>
        {/* Search / header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <h1 className="text-lg font-bold text-gray-900 flex-1">Clanovi</h1>
            <button
              onClick={() => { setShowAddForm(true); setSelectedMemberId(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pretrazi po imenu ili ID…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto scrollbar-thin">
          {loading ? (
            <div className="p-6 text-center text-gray-400 text-sm">Ucitavanje…</div>
          ) : members.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">
              {query ? 'Nema rezultata' : 'Nema clanova'}
            </div>
          ) : (
            <ul>
              {members.map((m) => {
                const paused = !!m.is_paused;
                const expired = m.membership_id && !paused ? isExpired(m) : false;
                const active = selectedMemberId === m.id;
                return (
                  <li key={m.id}>
                    <button
                      onClick={() => { setSelectedMemberId(m.id); setShowAddForm(false); }}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                        active ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`font-medium text-sm truncate ${active ? 'text-blue-700' : 'text-gray-900'}`}>
                            {m.name} {m.surname}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            #{m.id}{m.phone ? ` · ${m.phone}` : ''}
                          </p>
                        </div>
                        <MembershipStatusDot expired={expired} paused={paused} hasMs={!!m.membership_id} />
                      </div>
                      {m.membership_category && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {MEMBERSHIP_TYPES[m.membership_type]} {m.membership_category}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
          {members.length} {members.length === 1 ? 'clan' : 'clanova'}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        {showAddForm && (
          <MemberForm
            onSave={handleMemberSaved}
            onCancel={() => setShowAddForm(false)}
          />
        )}
        {!showAddForm && selectedMemberId && (
          <MemberCard
            memberId={selectedMemberId}
            onDeleted={handleMemberDeleted}
            onUpdated={loadMembers}
          />
        )}
        {!showAddForm && !selectedMemberId && (
          <div className="h-full flex items-center justify-center text-gray-300">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="text-sm">Izaberite clana da vidite karticu</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MembershipStatusDot({ expired, paused, hasMs }) {
  if (!hasMs) return <span className="w-2 h-2 rounded-full bg-gray-200 shrink-0" title="Bez clanarine" />;
  if (paused) return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Pauzirana" />;
  if (expired) return <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" title="Istekla" />;
  return <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" title="Aktivna" />;
}
