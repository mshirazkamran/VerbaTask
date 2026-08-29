import { IconChevronUp, IconChevronDown, IconSelector } from '@tabler/icons-react';
import { flexRender } from '@tanstack/react-table';


/**
 * Stripe-styled table wrapper for TanStack Table with tabular typography.
 */
export function Table({ table, onRowClick, emptyText = 'No records found' }) {
  const rows = table.getRowModel().rows;

  return (
    <div className="w-full overflow-x-auto border border-hairline rounded-lg bg-canvas shadow-card">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="border-b border-hairline bg-canvas-soft/60"
            >
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const isSorted = header.column.getIsSorted();

                return (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className={`py-3 px-4 text-[11px] font-medium uppercase tracking-wider text-ink-mute select-none ${
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
                            <IconChevronUp className="w-3.5 h-3.5 text-primary" />
                          ) : isSorted === 'desc' ? (
                            <IconChevronDown className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <IconSelector className="w-3.5 h-3.5 opacity-40" />
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

        <tbody className="divide-y divide-hairline font-normal text-ink">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={table.getAllColumns().length}
                className="py-12 text-center text-sm text-ink-mute"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick && onRowClick(row.original)}
                className={`transition-colors duration-100 ${
                  onRowClick ? 'cursor-pointer hover:bg-canvas-soft' : 'hover:bg-canvas-soft/40'
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="py-3.5 px-4 text-sm whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
