export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
      <span className="w-4 h-4 border-2 border-gray-300 border-t-slate-600 rounded-full animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-4">
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-semibold underline shrink-0">
          Retry
        </button>
      )}
    </div>
  );
}

export function Empty({ message }) {
  return <div className="py-10 text-center text-sm text-gray-400">{message}</div>;
}
