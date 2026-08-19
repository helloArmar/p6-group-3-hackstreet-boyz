const PALETTE = {
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-600',
  navy: 'bg-slate-700 text-white',
};

export default function Badge({ label, color = 'gray' }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
        PALETTE[color] ?? PALETTE.gray
      }`}
    >
      {label}
    </span>
  );
}
