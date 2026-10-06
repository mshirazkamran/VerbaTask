import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { flexRender } from '@tanstack/react-table';

/**
 * Stripe-styled table wrapper for TanStack Table with tabular typography.
 */
export function Table({ table, onRowClick, emptyText = 'No records found', getRowClassName }) {
  const rows = table.getRowModel().rows;

  return (
    <div className="custom-scrollbar w-full overflow-x-auto touch-pan-x [-webkit-overflow-scrolling:touch]">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="border-b border-rule"
            >
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const isSorted = header.column.getIsSorted();

                return (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className={`label whitespace-nowrap px-3 py-3 select-none first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6 ${
                      canSort ? 'cursor-pointer hover:text-ink' : ''
                    }`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1.5">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {canSort && (
                        <span className="text-ink-mute/70">
                          {isSorted === 'asc' ? (
                            <ChevronUp className="size-3.5 text-ink" />
                          ) : isSorted === 'desc' ? (
                            <ChevronDown className="size-3.5 text-ink" />
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>

        <tbody className="divide-y divide-rule text-ink">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={table.getAllColumns().length}
                className="py-14 text-center text-sm text-muted"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const customClass = getRowClassName ? getRowClassName(row) : '';
              return (
                <tr
                  key={row.id}
                  onClick={() => onRowClick && onRowClick(row.original)}
                  className={`transition-colors duration-100 ${
                    onRowClick ? 'cursor-pointer hover:bg-paper-2' : 'hover:bg-paper-2'
                  } ${customClass}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="whitespace-nowrap px-3 py-3.5 text-sm first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
