import React from 'react';

const PRICE_SECTIONS = [
  {
    title: 'Individualni treninzi',
    rows: [
      { plan: '1/1',  sessions: '1 trening',    price: 1200 },
      { plan: '8/1',  sessions: '8 treninga',   price: 8800 },
      { plan: '10/1', sessions: '10 treninga',  price: 9800 },
      { plan: '12/1', sessions: '12 treninga',  price: 11800 },
    ],
  },
  {
    title: 'Duo treninzi',
    subtitle: 'cena po osobi',
    rows: [
      { plan: '1/1',  sessions: '1 trening',    price: 1000 },
      { plan: '8/1',  sessions: '8 treninga',   price: 6800 },
      { plan: '10/1', sessions: '10 treninga',  price: 7800 },
      { plan: '12/1', sessions: '12 treninga',  price: 8800 },
    ],
  },
  {
    title: 'Vodjeni treninzi',
    rows: [
      { plan: '8/1',  sessions: '8 treninga',   price: 3600 },
      { plan: '10/1', sessions: '10 treninga',  price: 4100 },
      { plan: '12/1', sessions: '12 treninga',  price: 4600 },
      { plan: '16/1', sessions: '16 treninga',  price: 5100 },
    ],
  },
  {
    title: 'Samostalno vezbanje',
    rows: [
      { plan: '1/1',  sessions: '1 trening',           price: 450 },
      { plan: '8/1',  sessions: '8 treninga',           price: 2600 },
      { plan: '12/1', sessions: '12 treninga',          price: 2800 },
      { plan: '30/1', sessions: 'Neograniceno / 30 dana', price: 3200 },
    ],
  },
  {
    title: 'Samostalno vezbanje — Popust',
    subtitle: 'Osnovna skola · Srednja skola · Clan porodice',
    accent: 'purple',
    rows: [
      { plan: '12/1', sessions: '12 treninga',          price: 2500 },
      { plan: '30/1', sessions: 'Neograniceno / 30 dana', price: 2700 },
    ],
  },
  {
    title: 'Kardio',
    rows: [
      { plan: '30/1', sessions: 'Neograniceno / 30 dana', price: 2600 },
    ],
  },
  {
    title: 'FitPass',
    rows: [
      { plan: 'Group session', sessions: 'Jedna poseta', price: 300 },
      { plan: 'Solo visit',    sessions: 'Jedna poseta', price: 0,  free: true },
    ],
  },
];

export default function PricesPage() {
  return (
    <div className="h-full overflow-auto scrollbar-thin">
      <div className="px-6 py-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Cenovnik</h1>
          <p className="text-sm text-gray-500 mt-1">Trenutne cene clanarina — za osoblje</p>
        </div>

        <div className="space-y-4">
          {PRICE_SECTIONS.map((section) => (
            <PriceCard key={section.title} section={section} />
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-6 text-center">Sve cene su u srpskim dinarima (din)</p>
      </div>
    </div>
  );
}

function PriceCard({ section }) {
  const isDiscount = section.accent === 'purple';
  return (
    <div className={`bg-white rounded-2xl border overflow-hidden ${isDiscount ? 'border-purple-200' : 'border-gray-200'}`}>
      <div className={`px-5 py-3.5 border-b ${isDiscount ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <h2 className={`font-bold text-sm ${isDiscount ? 'text-purple-800' : 'text-gray-800'}`}>
            {section.title}
          </h2>
          {isDiscount && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              Discount
            </span>
          )}
        </div>
        {section.subtitle && (
          <p className={`text-xs mt-0.5 ${isDiscount ? 'text-purple-500' : 'text-gray-500'}`}>{section.subtitle}</p>
        )}
      </div>
      <div className="divide-y divide-gray-100">
        {section.rows.map((row) => (
          <div key={row.plan} className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center justify-center w-14 h-7 rounded-lg text-xs font-bold ${
                isDiscount ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'
              }`}>
                {row.plan}
              </span>
              <span className="text-sm text-gray-500">{row.sessions}</span>
            </div>
            <div className="text-right">
              {row.free ? (
                <span className="text-sm font-semibold text-emerald-600">Besplatno</span>
              ) : (
                <>
                  <span className={`text-base font-bold ${isDiscount ? 'text-purple-700' : 'text-gray-900'}`}>
                    {row.price.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">din</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
