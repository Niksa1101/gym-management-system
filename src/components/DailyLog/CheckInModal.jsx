import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  isExpired,
  isUnlimited,
  formatDate,
  formatMembershipLabel,
  allowsSoloVisit,
  LOCKER_KEYS,
  MEMBERSHIP_TYPES,
  MEMBERSHIP_CATEGORIES,
  PRICES,
  getPrice,
  getSessionsFromCategory,
  addDays,
  todayStr,
} from '../../lib/constants';

const VISIT_TYPES = [
  { id: 'session',       label: 'Trening',         desc: 'Oduzima jedan trening',  color: 'blue' },
  { id: 'solo',          label: 'Solo',             desc: 'Bez odbitka treninga',   color: 'amber' },
  { id: 'fitpass_group', label: 'FitPass Group',    desc: '300 din — auto-log',     color: 'purple' },
  { id: 'fitpass_solo',  label: 'FitPass Solo',     desc: 'Besplatna poseta',       color: 'slate' },
];

const isFitpass = (vt) => vt === 'fitpass_group' || vt === 'fitpass_solo';

export default function CheckInModal({ date, onClose, onSuccess }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [activeMembership, setActiveMembership] = useState(null);
  const [visitType, setVisitType] = useState('session');
  const [lockerKey, setLockerKey] = useState('');
  const [expiredAck, setExpiredAck] = useState(false);
  const [noMsAck, setNoMsAck] = useState(false);
  const [replaceConfirmAck, setReplaceConfirmAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successFlash, setSuccessFlash] = useState(null); // { name, visitType, locker }

  // Payment state
  const [recordPayment, setRecordPayment] = useState(false);
  const [payType, setPayType] = useState('');
  const [payCategory, setPayCategory] = useState('');
  const [payAmount, setPayAmount] = useState('');

  const searchRef = useRef(null);
  const flashTimerRef = useRef(null);

  // Focus search on open + Escape to close + cleanup on unmount
  useEffect(() => {
    searchRef.current?.focus();
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [onClose]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const results = await window.api.searchMembers(query.trim());
      setSearchResults(results);
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

  // Auto-fill payment when member/visitType changes
  useEffect(() => {
    if (visitType === 'fitpass_group') {
      setRecordPayment(true);
      setPayType('fitpass');
      setPayCategory('group');
      setPayAmount('300');
    } else if (visitType === 'fitpass_solo') {
      setRecordPayment(false);
      setPayType('');
      setPayCategory('');
      setPayAmount('');
    } else if (activeMembership && !isFitpass(visitType)) {
      setPayType(activeMembership.membership_type);
      setPayCategory(activeMembership.membership_category);
      const price = getPrice(
        activeMembership.membership_type,
        activeMembership.membership_category,
        !!selectedMember?.discount_eligible
      );
      setPayAmount(price !== null ? String(price) : '');
    }
  }, [visitType, activeMembership, selectedMember]);

  // Auto-fill payment amount when type/category changes manually
  // Also reset the replace-confirmation so staff must re-acknowledge if they change their mind
  useEffect(() => {
    setReplaceConfirmAck(false);
    if (!recordPayment || !payType || !payCategory) return;
    if (payType === 'fitpass') {
      setPayAmount(payCategory === 'group' ? '300' : '0');
      return;
    }
    const price = getPrice(payType, payCategory, !!selectedMember?.discount_eligible);
    if (price !== null) setPayAmount(String(price));
  }, [payType, payCategory]);

  async function selectMember(member) {
    setSelectedMember(member);
    setSearchResults([]);
    setQuery(`${member.name} ${member.surname}`);
    setExpiredAck(false);
    setNoMsAck(false);

    const ms = await window.api.getActiveMembership(member.id);
    setActiveMembership(ms || null);

    // Default visit type
    if (!ms || isExpired(ms)) {
      setVisitType('solo');
    } else {
      setVisitType('session');
    }
  }

  function resetForm() {
    setQuery('');
    setSearchResults([]);
    setSelectedMember(null);
    setActiveMembership(null);
    setVisitType('session');
    setLockerKey('');
    setExpiredAck(false);
    setNoMsAck(false);
    setReplaceConfirmAck(false);
    setRecordPayment(false);
    setPayType('');
    setPayCategory('');
    setPayAmount('');
    searchRef.current?.focus();
  }

  const memberExpired = activeMembership && isExpired(activeMembership);
  const memberPaused = activeMembership && !!activeMembership.is_paused;
  const noMembership = selectedMember && !activeMembership && !isFitpass(visitType);

  // A real membership will be created when payment is recorded for a non-fitpass type
  const shouldCreateMembership = recordPayment && payType && payType !== 'fitpass' && payCategory;

  // When creating a session-based membership and checking in simultaneously,
  // the visit must count as a session regardless of the UI visit type selector
  const newMembershipSessions = shouldCreateMembership ? getSessionsFromCategory(payCategory) : null;
  const willDeductSession = shouldCreateMembership && newMembershipSessions !== null;

  // Warn only when there's an unexpired active membership that would be replaced
  const needsReplaceConfirm = shouldCreateMembership
    && activeMembership
    && !isExpired(activeMembership)
    && !replaceConfirmAck;

  const needsAck = (memberExpired && !isFitpass(visitType) && !expiredAck)
    || (noMembership && !noMsAck)
    || needsReplaceConfirm
    || memberPaused;

  async function handleSubmit() {
    if (!selectedMember || needsAck || submitting) return;
    setSubmitting(true);

    try {
      // 1. Create membership first (so check-in can be linked to the new membership_id)
      let checkInMembershipId = (activeMembership && !isFitpass(visitType)) ? activeMembership.id : null;

      if (shouldCreateMembership) {
        const startDate = date; // use the check-in date as start
        const expiryDate = addDays(startDate, 30);
        const sessionsTotal = getSessionsFromCategory(payCategory);
        const newMs = await window.api.createMembership({
          member_id: selectedMember.id,
          membership_type: payType,
          membership_category: payCategory,
          sessions_total: sessionsTotal,
          start_date: startDate,
          expiry_date: expiryDate,
        });
        checkInMembershipId = newMs.id;
      }

      // 2. Check-in (linked to the new membership if one was just created)
      // Force 'session' when a session-based membership was just paid for — deduct session 1 immediately
      const effectiveVisitType = willDeductSession ? 'session' : visitType;
      await window.api.checkIn({
        member_id: selectedMember.id,
        membership_id: checkInMembershipId,
        date,
        locker_key: lockerKey || null,
        visit_type: effectiveVisitType,
      });

      // 3. Payment (if requested or FitPass Group)
      const shouldPay = recordPayment && payAmount && Number(payAmount) >= 0;
      if (shouldPay) {
        await window.api.createPayment({
          member_id: selectedMember.id,
          member_name: `${selectedMember.name} ${selectedMember.surname}`,
          date,
          membership_type: payType || null,
          membership_category: payCategory || null,
          amount: Number(payAmount),
        });
      }

      // Show flash then reset (modal stays open)
      setSuccessFlash({
        name: `${selectedMember.name} ${selectedMember.surname}`,
        visitType: effectiveVisitType,
        locker: lockerKey,
      });
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setSuccessFlash(null), 3500);

      resetForm();
      onSuccess(); // refresh daily log in background
    } finally {
      setSubmitting(false);
    }
  }

  const payCategories = payType && payType !== 'fitpass' ? (MEMBERSHIP_CATEGORIES[payType] || []) : [];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col"
         style={{ minHeight: '620px', maxHeight: '92vh' }}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Prijava clana</h2>
            <p className="text-xs text-gray-400 mt-0.5">{date}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success flash */}
        {successFlash && (
          <div className="mx-6 mt-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 shrink-0">
            <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">{successFlash.name} je prijavljen!</p>
              <p className="text-xs text-green-600">
                {VISIT_TYPES.find(v => v.id === successFlash.visitType)?.label}
                {successFlash.locker ? ` · Ormaric ${successFlash.locker}` : ''}
                {' · Spreman za sledeceg clana'}
              </p>
            </div>
          </div>
        )}

        {/*
          ── Search section ──
          MUST be outside the overflow-y-auto container.
          overflow:auto on a parent clips position:absolute children,
          so the dropdown would be invisible if placed inside the scrollable body.
        */}
        <div className="shrink-0 px-6 pt-4 pb-1">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Pretrazi clana</label>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (selectedMember) resetForm(); }}
              placeholder="Ime, prezime ili ID clana…"
              className="w-full pl-9 pr-9 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {selectedMember && (
              <button onClick={resetForm} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* Dropdown — absolute, not clipped because this parent has no overflow */}
            {searchResults.length > 0 && !selectedMember && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-30 overflow-y-auto scrollbar-thin"
                   style={{ maxHeight: '320px' }}>
                {searchResults.map((m) => {
                  const exp = m.membership_id && isExpired(m);
                  return (
                    <button
                      key={m.id}
                      onClick={() => selectMember(m)}
                      className="w-full text-left px-4 py-3.5 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{m.name} {m.surname}</p>
                          <p className="text-xs text-gray-400">#{m.id}{m.phone ? ` · ${m.phone}` : ''}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          !m.membership_id ? 'bg-gray-100 text-gray-500' :
                          exp ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                        }`}>
                          {!m.membership_id ? 'Bez clanarine' : exp ? 'Istekla' : m.membership_category}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable body — member details shown after selection */}
        {/* min-h-0 is required: without it a flex-1 child won't shrink below its content size */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-6 py-3 space-y-4">

          {/* ── Member info card ── */}
          {selectedMember && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-900">{selectedMember.name} {selectedMember.surname}</p>
                  <p className="text-xs text-gray-400">Member #{selectedMember.id}{selectedMember.phone ? ` · ${selectedMember.phone}` : ''}</p>
                </div>
              </div>
              {activeMembership ? (
                <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-x-5 gap-y-0.5 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">
                    {formatMembershipLabel(activeMembership.membership_type, activeMembership.membership_category)}
                  </span>
                  <span>Istice: {formatDate(activeMembership.expiry_date)}</span>
                  {activeMembership.sessions_total && (
                    <span>{activeMembership.sessions_used}/{activeMembership.sessions_total} treninga iskorisceno</span>
                  )}
                  {isUnlimited(activeMembership.membership_category) && <span>Neograniceno</span>}
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-1">Nema aktivne clanarine</p>
              )}
              {memberPaused && (
                <p className="text-xs text-amber-600 mt-1.5 font-medium flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Clanarina pauzirana
                </p>
              )}
              {selectedMember.discount_eligible && (
                <p className="text-xs text-purple-600 mt-1.5 font-medium">
                  Pravo na popust · {selectedMember.discount_category}
                </p>
              )}
            </div>
          )}

          {/* ── Warnings ── */}
          {selectedMember && memberPaused && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-3">
              <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-amber-800 text-sm">Clanarina je pauzirana</p>
                <p className="text-amber-700 text-xs mt-0.5">
                  Pauzirana od <span className="font-medium">{activeMembership.paused_date}</span> · {activeMembership.days_remaining_at_pause} {activeMembership.days_remaining_at_pause === 1 ? 'dan preostao' : 'dana preostalo'}.
                </p>
                <p className="text-amber-600 text-xs mt-0.5 italic">
                  Molimo nastavite clanarinu na kartici clana pre prijave.
                </p>
              </div>
            </div>
          )}

          {selectedMember && memberExpired && !isFitpass(visitType) && (
            <WarningBox
              title="Clanarina istekla"
              message={
                activeMembership.sessions_total && activeMembership.sessions_used >= activeMembership.sessions_total
                  ? `Svih ${activeMembership.sessions_total} treninga iskorisceno.`
                  : `Istekla ${formatDate(activeMembership.expiry_date)}.`
              }
              acked={expiredAck}
              onAck={() => setExpiredAck(true)}
            />
          )}
          {selectedMember && noMembership && (
            <WarningBox
              title="Nema aktivne clanarine"
              message="Ovaj clan nema aktivnu clanarinu. Mozete evidentirati Solo ili FitPass posetu."
              acked={noMsAck}
              onAck={() => setNoMsAck(true)}
            />
          )}

          {/* Replace membership confirmation */}
          {selectedMember && needsReplaceConfirm && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 flex gap-3">
              <svg className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-orange-800 text-sm">Aktivna clanarina ce biti zamenjena</p>
                <p className="text-orange-600 text-xs mt-0.5">
                  Ovaj clan vec ima aktivnu{' '}
                  <span className="font-medium">
                    {formatMembershipLabel(activeMembership.membership_type, activeMembership.membership_category)}
                  </span>{' '}
                  (istice {formatDate(activeMembership.expiry_date)}).
                  Bice premestena u istoriju i zamenjena novom{' '}
                  <span className="font-medium">{MEMBERSHIP_TYPES[payType]} {payCategory}</span>.
                </p>
                <button
                  onClick={() => setReplaceConfirmAck(true)}
                  className="mt-2 text-xs font-semibold text-orange-700 underline hover:no-underline"
                >
                  Da, zameni novom clanariom
                </button>
              </div>
            </div>
          )}

          {selectedMember && (
            <>
              {/* ── Visit type + Locker (side by side) ── */}
              <div className="grid grid-cols-2 gap-4">

                {/* Visit type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tip posete</label>
                  <div className="space-y-2">
                    {VISIT_TYPES.map((vt) => {
                      const disabled = vt.id === 'session' && (noMembership || memberExpired || memberPaused);
                      return (
                        <VisitTypeBtn
                          key={vt.id}
                          {...vt}
                          active={visitType === vt.id}
                          disabled={disabled}
                          onClick={() => !disabled && setVisitType(vt.id)}
                        />
                      );
                    })}
                  </div>
                  {visitType === 'session' && activeMembership && allowsSoloVisit(activeMembership.membership_type) && (
                    <p className="text-xs text-blue-500 mt-1.5">Ovaj clan moze posetiti Solo bez oduzimanja treninga.</p>
                  )}
                  {visitType === 'session' && activeMembership && isUnlimited(activeMembership.membership_category) && (
                    <p className="text-xs text-gray-400 mt-1.5">Neogranicena clanarina — poseta zabelezena, bez oduzimanja.</p>
                  )}
                  {willDeductSession && (
                    <p className="text-xs text-blue-600 mt-1.5 font-medium bg-blue-50 px-2 py-1 rounded-md">
                      1. trening od {newMembershipSessions} ce biti odbijen za danasnju posetu.
                    </p>
                  )}
                </div>

                {/* Locker key grid */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Kljuc ormarca</label>
                    {lockerKey && (
                      <button onClick={() => setLockerKey('')} className="text-xs text-gray-400 hover:text-red-500">
                        Ocisti
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {LOCKER_KEYS.map((k) => (
                      <button
                        key={k}
                        onClick={() => setLockerKey(lockerKey === k ? '' : k)}
                        className={`h-9 rounded-lg text-sm font-semibold transition-colors ${
                          lockerKey === k
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                  {lockerKey && (
                    <p className="text-xs text-blue-600 mt-1.5 font-medium">Kljuc #{lockerKey} izabran</p>
                  )}
                </div>
              </div>

              {/* ── Payment section ── */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => {
                    if (visitType === 'fitpass_group') return; // always on for fitpass group
                    setRecordPayment((v) => !v);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors ${
                    recordPayment ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {visitType === 'fitpass_group' ? 'Uplata · 300 din (FitPass Group)' : 'Evidentiranje uplate'}
                    {visitType !== 'fitpass_group' && (
                      <span className="text-xs font-normal text-gray-400">opciono</span>
                    )}
                  </span>
                  {visitType !== 'fitpass_group' && (
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      recordPayment ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                    }`}>
                      {recordPayment && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  )}
                </button>

                {recordPayment && (
                  <div className="px-4 py-3 space-y-3 bg-white border-t border-gray-100">
                    {payType !== 'fitpass' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Vrsta clanarine</label>
                          <select
                            value={payType}
                            onChange={(e) => { setPayType(e.target.value); setPayCategory(''); setPayAmount(''); }}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Izaberite vrstu…</option>
                            {Object.entries(MEMBERSHIP_TYPES).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
                          <select
                            value={payCategory}
                            onChange={(e) => setPayCategory(e.target.value)}
                            disabled={!payType || payType === 'fitpass'}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                          >
                            <option value="">Izaberite plan…</option>
                            {payCategories.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Iznos (din)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="0"
                          className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-500">din</span>
                        {selectedMember?.discount_eligible && payType === 'standard_gym' && (
                          <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-1 rounded-md">
                            Popust primenjen
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium">
            Zatvori
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedMember || needsAck || submitting}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Prijava…' : 'Potvrdi prijavu'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function WarningBox({ title, message, acked, onAck }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex gap-3">
      <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div className="flex-1">
        <p className="font-semibold text-red-800 text-sm">{title}</p>
        <p className="text-red-600 text-xs mt-0.5">{message}</p>
        {!acked ? (
          <button onClick={onAck} className="mt-1.5 text-xs font-semibold text-red-700 underline hover:no-underline">
            Potvrdeno — nastavi svejedno
          </button>
        ) : (
          <p className="mt-1 text-xs text-red-400 italic">Potvrdeno ✓</p>
        )}
      </div>
    </div>
  );
}

const COLOR_MAP = {
  blue:   { active: 'border-blue-500 bg-blue-50',   label: 'text-blue-700',   desc: 'text-blue-400' },
  amber:  { active: 'border-amber-500 bg-amber-50', label: 'text-amber-700',  desc: 'text-amber-400' },
  purple: { active: 'border-purple-500 bg-purple-50', label: 'text-purple-700', desc: 'text-purple-400' },
  slate:  { active: 'border-slate-400 bg-slate-50',  label: 'text-slate-700',  desc: 'text-slate-400' },
};

function VisitTypeBtn({ id, label, desc, color, active, disabled, onClick }) {
  const c = COLOR_MAP[color];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-2 rounded-lg border-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? c.active : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <p className={`text-xs font-bold leading-tight ${active ? c.label : 'text-gray-700'}`}>{label}</p>
      <p className={`text-[10px] mt-0.5 ${active ? c.desc : 'text-gray-400'}`}>{desc}</p>
    </button>
  );
}
