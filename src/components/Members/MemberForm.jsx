import React, { useState } from 'react';
import { DISCOUNT_CATEGORIES } from '../../lib/constants';

export default function MemberForm({ member, onSave, onCancel }) {
  const isEdit = !!member;

  const [form, setForm] = useState({
    name: member?.name || '',
    surname: member?.surname || '',
    phone: member?.phone || '',
    discount_eligible: member?.discount_eligible ? true : false,
    discount_category: member?.discount_category || '',
    notes: member?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Obavezno';
    if (!form.surname.trim()) errs.surname = 'Obavezno';
    if (form.discount_eligible && !form.discount_category) errs.discount_category = 'Izaberite kategoriju';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        discount_category: form.discount_eligible ? form.discount_category : null,
      };
      if (isEdit) {
        await window.api.updateMember(member.id, payload);
      } else {
        await window.api.createMember(payload);
      }
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
          <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Izmeni clana' : 'Dodaj novog clana'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Ime" error={errors.name} required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className={inputCls(errors.name)}
                  placeholder="Anna"
                />
              </Field>
              <Field label="Prezime" error={errors.surname} required>
                <input
                  type="text"
                  value={form.surname}
                  onChange={(e) => set('surname', e.target.value)}
                  className={inputCls(errors.surname)}
                  placeholder="Smith"
                />
              </Field>
            </div>

            <Field label="Broj telefona">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className={inputCls()}
                placeholder="+1 555 000 0000"
              />
            </Field>

            <Field label="Napomene">
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                className={`${inputCls()} resize-none h-20`}
                placeholder="Napomene…"
              />
            </Field>
          </div>

          {/* Discount section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.discount_eligible}
                onChange={(e) => set('discount_eligible', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
              <div>
                <p className="font-medium text-gray-900 text-sm">Pravo na popust</p>
                <p className="text-xs text-gray-400">Vazi za Samostalno vezbanje 12/1 i 30/1</p>
              </div>
            </label>

            {form.discount_eligible && (
              <div className="mt-3">
                <Field label="Kategorija popusta" error={errors.discount_category} required>
                  <select
                    value={form.discount_category}
                    onChange={(e) => set('discount_category', e.target.value)}
                    className={inputCls(errors.discount_category)}
                  >
                    <option value="">Izaberite kategoriju…</option>
                    {DISCOUNT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
          </div>

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
              {saving ? 'Cuvanje…' : isEdit ? 'Sacuvaj izmene' : 'Dodaj clana'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, error, required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function inputCls(error) {
  return `w-full border ${error ? 'border-red-300' : 'border-gray-300'} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white`;
}
