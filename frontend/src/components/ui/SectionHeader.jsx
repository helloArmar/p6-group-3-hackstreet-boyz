export default function SectionHeader({ title, action, onAction }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold text-white bg-navy hover:opacity-90 transition-opacity"
        >
          <span>+</span> {action}
        </button>
      )}
    </div>
  );
}
