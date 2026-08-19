// Thin table shell so every list screen shares one set of header/row styles.
export default function DataTable({ columns, rows, renderRow, emptyMessage = 'Nothing here yet.' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide ${
                  column.align === 'right' ? 'text-right' : 'text-left'
                } ${column.hideBelow === 'md' ? 'hidden md:table-cell' : ''} ${
                  column.hideBelow === 'lg' ? 'hidden lg:table-cell' : ''
                }`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-sm text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map(renderRow)
          )}
        </tbody>
      </table>
    </div>
  );
}
