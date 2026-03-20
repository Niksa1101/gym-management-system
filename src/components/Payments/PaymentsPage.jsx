import React, { useState, useEffect, useCallback } from 'react';
import { todayStr, formatDate, weekRange, monthRange, MEMBERSHIP_TYPES } from '../../lib/constants';
import { useConfirm } from '../ConfirmDialog';

const TABS = [
  { id: 'day',   label: 'Dan' },
  { id: 'week',  label: 'Nedelja' },
  { id: 'month', label: 'Mesec' },
];

function paymentLabel(type, category) {
  if (type === 'fitpass') return `FitPass ${category === 'group' ? 'Group' : 'Solo'}`;
  if (!type) return '—';
  return `${MEMBERSHIP_TYPES[type] || type}${category ? ` ${category}` : ''}`;
}

export default function PaymentsPage() {
  const [tab, setTab] = useState('day');
  const [refDate, setRefDate] = useState(todayStr());
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const [startDate, endDate] = tab === 'day'
    ? [refDate, refDate]
    : tab === 'week'
    ? weekRange(refDate)
    : monthRange(refDate);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.api.getPayments(startDate, endDate);
      setPayments(data);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    const ok = await confirm('Obrisati ovaj zapis o uplati?', {
      title: 'Obrisi uplatu', confirmLabel: 'Obrisi', danger: true,
    });
    if (!ok) return;
    await window.api.deletePayment(id);
    load();
  }

  const total = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  function rangeLabel() {
    if (tab === 'day') return formatDate(startDate);
    if (tab === 'week') return `${formatDate(startDate)} – ${formatDate(endDate)}`;
    const [y, m] = refDate.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }

  function shiftRef(direction) {
    const d = new Date(refDate + 'T00:00:00');
    if (tab === 'day')   d.setDate(d.getDate() + direction);
    if (tab === 'week')  d.setDate(d.getDate() + direction * 7);
    if (tab === 'month') d.setMonth(d.getMonth() + direction);
    setRefDate(d.toISOString().split('T')[0]);
  }

  return (
    <div className="h-full flex flex-col">
      {ConfirmDialog}
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Uplate</h1>
          <div className="flex items-center gap-3">
            {/* Tab switcher */}
            <div className="flex bg-gray-100 rounded-lg p-1 gap-0.5">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {/* Date nav */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftRef(-1)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-medium text-gray-700 min-w-40 text-center">{rangeLabel()}</span>
              <button
                onClick={() => shiftRef(1)}
                disabled={refDate >= todayStr()}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-30"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {tab === 'day' && (
                <input
                  type="date"
                  value={refDate}
                  max={todayStr()}
                  onChange={(e) => setRefDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-emerald-600">{total.toLocaleString()}</span>
            <span className="text-sm text-gray-400">din ukupno</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">{payments.length}</span>
            <span className="text-sm text-gray-400">{payments.length === 1 ? 'uplata' : 'uplata'}</span>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto scrollbar-thin px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Ucitavanje…</div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <svg className="w-10 h-10 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm">Nema uplata za ovaj period</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Datum</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Clan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Clanarina</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Iznos</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(p.date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.member_name}</td>
                    <td className="px-4 py-3 text-gray-500">{paymentLabel(p.membership_type, p.membership_category)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-emerald-700">{(p.amount || 0).toLocaleString()}</span>
                      <span className="text-gray-400 text-xs ml-1">din</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                        title="Delete payment"
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
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-700">
                    {tab === 'day' ? 'Dnevni' : tab === 'week' ? 'Nedeljni' : 'Mesecni'} zbir
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-lg text-emerald-700">{total.toLocaleString()}</span>
                    <span className="text-gray-400 text-xs ml-1">din</span>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
