import React, { useState } from 'react';
import {
  MEMBERSHIP_TYPES,
  MEMBERSHIP_CATEGORIES,
  getSessionsFromCategory,
  todayStr,
  addDays,
  formatDate,
} from '../../lib/constants';

export default function MembershipForm({ memberId, onSave, onCancel }) {
  const [form, setForm] = useState({
    membership_type: '',
    membership_category: '',
    start_date: todayStr(),
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  function set(field, value) {
    setForm((f) => {
      const updated = { ...f, [field]: value };
      // Reset category when type changes
      if (field === 'membership_type') updated.membership_category = '';
      return updated;
    });
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  const categories = form.membership_type ? MEMBERSHIP_CATEGORIES[form.membership_type] : [];
  const sessions = form.membership_category ? getSessionsFromCategory(form.membership_category) : null;
  const expiryDate = form.start_date ? addDays(form.start_date, 30) : '';

  function validate() {
    const errs = {};
    if (!form.membership_type) errs.membership_type = 'Obavezno';
    if (!form.membership_category) errs.membership_category = 'Obavezno';
    if (!form.start_date) errs.start_date = 'Obavezno';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      await window.api.createMembership({
        member_id: memberId,
        membership_type: form.membership_type,
        membership_category: form.membership_category,
        sessions_total: sessions, // null for 30/1
        start_date: form.start_date,
        expiry_date: expiryDate,
      });
      onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full overflow-auto scrollbar-thin">
      <div className="p-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-gray-900">Dodaj novu clanarinu</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">

            {/* Membership type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vrsta clanarine <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(MEMBERSHIP_TYPES).map(([key, label]) => (
                  <label key={key} className="cursor-pointer">
                    <input
                      type="radio"
                      name="membership_type"
                      value={key}
                      checked={form.membership_type === key}
                      onChange={() => set('membership_type', key)}
                      className="sr-only"
                    />
                    <div className={`px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                      form.membership_type === key
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}>
                      {label}
                    </div>
                  </label>
                ))}
              </div>
              {errors.membership_type && <p className="text-xs text-red-500 mt-1">{errors.membership_type}</p>}
            </div>

            {/* Category */}
            {categories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan <span className="text-red-400">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const s = getSessionsFromCategory(cat);
                    return (
                      <label key={cat} className="cursor-pointer">
                        <input
                          type="radio"
                          name="category"
                          value={cat}
                          checked={form.membership_category === cat}
                          onChange={() => set('membership_category', cat)}
                          className="sr-only"
                        />
                        <div className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                          form.membership_category === cat
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}>
                          {cat}
                          <span className="ml-1 text-xs font-normal opacity-60">
                            {s === null ? '∞' : `${s} treninga`}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {errors.membership_category && <p className="text-xs text-red-500 mt-1">{errors.membership_category}</p>}
              </div>
            )}

            {/* Start date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Datum pocetka <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => set('start_date', e.target.value)}
                className={`border ${errors.start_date ? 'border-red-300' : 'border-gray-300'} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.start_date && <p className="text-xs text-red-500 mt-1">{errors.start_date}</p>}
            </div>
          </div>

          {/* Summary */}
          {form.membership_type && form.membership_category && form.start_date && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm space-y-1.5">
              <p className="font-semibold text-blue-800">Pregled clanarine</p>
              <p className="text-blue-700">
                <span className="font-medium">{MEMBERSHIP_TYPES[form.membership_type]}</span> · {form.membership_category}
              </p>
              <p className="text-blue-600">
                {sessions === null
                  ? 'Neogranicene posete 30 dana'
                  : `${sessions} treninga, vaznost 30 dana`}
              </p>
              <p className="text-blue-500 text-xs">
                {formatDate(form.start_date)} → {formatDate(expiryDate)}
              </p>
              <p className="text-blue-400 text-xs italic">
                Napomena: postojeca aktivna clanarina ce biti deaktivirana.
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Otkazati
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Kreiranje…' : 'Kreiraj clanarinu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
