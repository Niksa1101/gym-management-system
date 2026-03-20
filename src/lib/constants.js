export const MEMBERSHIP_TYPES = {
  group_workout: 'Vodjeni treninzi',
  personal_trainer: 'Individualni treninzi',
  duo_workout: 'Duo treninzi',
  standard_gym: 'Samostalno vezbanje',
  just_cardio: 'Kardio',
};

export const MEMBERSHIP_CATEGORIES = {
  group_workout: ['8/1', '10/1', '12/1', '16/1'],
  personal_trainer: ['1/1', '8/1', '10/1', '12/1'],
  duo_workout: ['1/1', '8/1', '10/1', '12/1'],
  standard_gym: ['1/1', '8/1', '12/1', '30/1'],
  just_cardio: ['30/1'],
};

export const DISCOUNT_CATEGORIES = [
  'Ucenik osnovne skole',
  'Ucenik srednje skole',
  'Clan porodice',
];

export const LOCKER_KEYS = Array.from({ length: 22 }, (_, i) => String(i + 1));

// ── Pricing ───────────────────────────────────────────────────────────────────

export const PRICES = {
  personal_trainer: { '1/1': 1200, '8/1': 8800, '10/1': 9800, '12/1': 11800 },
  duo_workout:      { '1/1': 1000, '8/1': 6800, '10/1': 7800, '12/1': 8800 },
  standard_gym:     { '1/1': 450,  '8/1': 2600, '12/1': 2800, '30/1': 3200 },
  just_cardio:      { '30/1': 2600 },
  group_workout:    { '8/1': 3600, '10/1': 4100, '12/1': 4600, '16/1': 5100 },
};

export const DISCOUNT_PRICES = {
  standard_gym: { '12/1': 2500, '30/1': 2700 },
};

export const FITPASS_PRICES = {
  group: 300,
  solo: 0,
};

export function getPrice(type, category, isDiscounted = false) {
  if (isDiscounted && DISCOUNT_PRICES[type]?.[category] !== undefined) {
    return DISCOUNT_PRICES[type][category];
  }
  return PRICES[type]?.[category] ?? null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getSessionsFromCategory(category) {
  const n = parseInt(category.split('/')[0]);
  return n === 30 ? null : n;
}

export function isUnlimited(category) {
  return category === '30/1';
}

export function isExpired(membership) {
  if (!membership) return true;
  const today = todayStr();
  if (today > membership.expiry_date) return true;
  if (membership.sessions_total && membership.sessions_used >= membership.sessions_total) return true;
  return false;
}

export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateLong(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatMembershipLabel(type, category) {
  return `${MEMBERSHIP_TYPES[type] || type} ${category}`;
}

export function allowsSoloVisit(membershipType) {
  return ['duo_workout', 'personal_trainer', 'group_workout'].includes(membershipType);
}

export function weekRange(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(d); mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return [mon.toISOString().split('T')[0], sun.toISOString().split('T')[0]];
}

export function monthRange(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  const first = `${y}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(y, m, 0).toISOString().split('T')[0];
  return [first, last];
}
