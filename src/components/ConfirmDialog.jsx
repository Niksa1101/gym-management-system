import { useCallback, useEffect, useState } from 'react';

function Dialog({ title, message, confirmLabel, danger, onConfirm, onCancel }) {
  useEffect(() => {
    const handle = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onCancel]);

  const confirmCls = danger
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-amber-500 hover:bg-amber-600 text-white';

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Otkazati
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${confirmCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback((message, options = {}) => {
    const { title = 'Potvrda', confirmLabel = 'Potvrdi', danger = true } = options;
    return new Promise((resolve) => {
      setDialog({ title, message, confirmLabel, danger, resolve });
    });
  }, []);

  function accept() { dialog.resolve(true); setDialog(null); }
  function reject() { dialog.resolve(false); setDialog(null); }

  const ConfirmDialog = dialog ? (
    <Dialog
      title={dialog.title}
      message={dialog.message}
      confirmLabel={dialog.confirmLabel}
      danger={dialog.danger}
      onConfirm={accept}
      onCancel={reject}
    />
  ) : null;

  return { confirm, ConfirmDialog };
}
