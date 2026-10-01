import React from 'react';
import ActionMenu from './ActionMenu';
import { Loader2 } from 'lucide-react';
import { toTitleCase } from '../../utils';
import { TableTextCell } from './TableCellTooltip';
import { useTableCellTooltip } from '../../hooks/useTableCellTooltip';

export type Column<T> = {
  /** unique key for the column */
  key: string;
  /** header label */
  header: React.ReactNode;
  /** optional cell renderer - receives the row item */
  render?: (item: T) => React.ReactNode;
  /** hide this column from mobile card view (default false) */
  hideOnMobile?: boolean;
  /** optional className for the column cells */
  className?: string;
  /** optional className for the header cell only */
  headerClassName?: string;
  /** minimum width for column (px number or CSS value) */
  minWidth?: number | string;
  /** maximum width for column (px number or CSS value) */
  maxWidth?: number | string;
  /** allow dropdowns/menus to extend outside the cell (default false) */
  allowOverflow?: boolean;
  /** disable 150-char truncation + hover tooltip for plain text (default false) */
  disableTooltip?: boolean;
  /** show only this many words in the cell; full text appears on hover */
  maxWords?: number;
};

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  startIndex?: number; // starting index for Sr. No.
  loading?: boolean;
  onEdit?: (item: T) => void;
  onView?: (item: T) => void;
  onDelete?: (item: T) => void;
  onUpload?: (item: T) => void;
  onChat?: (item: T) => void;
  onCreateMeeting?: (item: T) => void;
  onBriefCreation?: (item: T) => void;
  /** Permission slugs for actions */
  editPermissionSlug?: string;
  viewPermissionSlug?: string;
  deletePermissionSlug?: string;
  uploadPermissionSlug?: string;
  /** optional render key extractor (defaults to item.id || index) */
  keyExtractor?: (item: T, index: number) => string;
  /** compact mode reduces cell padding (default false) */
  compact?: boolean;
  /** when true, show desktop table layout even on small screens (compact styles applied) */
  desktopOnMobile?: boolean;
}

const Table = <T,>(props: TableProps<T>) => {
  const { data, columns, startIndex = 0, loading = false, onEdit, onView, onDelete, onUpload, onChat, onCreateMeeting, onBriefCreation, editPermissionSlug, viewPermissionSlug, deletePermissionSlug, uploadPermissionSlug, keyExtractor, compact = false, desktopOnMobile = true } = props;
  const { show: showCellTooltip, hide: hideCellTooltip, TooltipLayer } = useTableCellTooltip();

  // responsive padding classes used for cells/headers; compact mode reduces padding further
  // small screens get compact padding while larger screens keep desktop spacing
  const headerPadClass = compact
    ? 'px-3 py-2 lg:px-4'
    : 'px-4 py-2.5 lg:px-5';
  const cellPadClass = compact
    ? 'px-3 py-2.5 lg:px-4'
    : 'px-4 py-3 lg:px-5';

  const toCssSize = (value: number | string) =>
    typeof value === 'number' ? `${value}px` : value;

  const colStyle = (col: Column<T>): React.CSSProperties => {
    const style: React.CSSProperties = {};
    if (col.minWidth != null) style.minWidth = toCssSize(col.minWidth);
    if (col.maxWidth != null) style.maxWidth = toCssSize(col.maxWidth);
    return style;
  };

  const renderCellInner = (content: React.ReactNode, col: Column<T>) => {
    if (col.allowOverflow || React.isValidElement(content)) {
      return <div className="lms-table-cell lms-table-cell--interactive">{content}</div>;
    }

    const text = content === null || content === undefined ? '' : String(content);

    if (col.disableTooltip) {
      return (
        <div className="lms-table-cell">
          <span className="lms-table-cell__text">{text}</span>
        </div>
      );
    }

    return (
      <TableTextCell
        text={text}
        maxWords={col.maxWords}
        onShow={showCellTooltip}
        onHide={hideCellTooltip}
      />
    );
  };

  const extractCellContent = (col: Column<T>, item: T): React.ReactNode => {
    const extracted = col.render
      ? col.render(item)
      : (() => {
          const raw = String((item as Record<string, unknown>)[col.key] ?? '-');
          if (raw === '-' || /^[#\d]/.test(raw) || /\d{2}[-/.]\d{2}[-/.]\d{2,4}/.test(raw)) {
            return raw;
          }
          return toTitleCase(raw);
        })();

    if (React.isValidElement(extracted)) return extracted;

    if (extracted === null || extracted === undefined) return '';

    if (typeof extracted === 'object') {
      const value = extracted as { name?: string };
      if (value && 'name' in value) return String(value.name ?? '');
      try {
        return String(JSON.stringify(extracted));
      } catch {
        return String(extracted);
      }
    }

    return extracted;
  };

  // Always show table structure, even when loading or empty
  const hasData = data && data.length > 0;
  const showActions = !!(onEdit || onView || onDelete);

  return (
    <>
      {TooltipLayer}
      {/* Desktop Table View */}
      <div className={`lms-data-table-wrap ${desktopOnMobile ? 'block' : 'hidden lg:block'} overflow-x-auto overflow-y-visible`}>
        <div className="relative min-w-0">
          <table className="lms-data-table w-max min-w-full border-collapse">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  className={`${headerPadClass} text-left text-xs font-semibold uppercase tracking-wide text-[#007b83] bg-slate-50 border-b border-gray-200 whitespace-nowrap ${col.headerClassName || ''}`}
                  style={colStyle(col)}
                >
                  <span className="block truncate">
                    {typeof col.header === 'string' ? toTitleCase(col.header) : col.header}
                  </span>
                </th>
              ))}
              {showActions && (
                <th
                  className={`${headerPadClass} lms-table-actions-col text-center text-xs font-semibold uppercase tracking-wide text-[#007b83] bg-slate-50 border-b border-l border-gray-200 whitespace-nowrap`}
                  style={{ minWidth: 96, width: 96 }}
                >
                  {toTitleCase('Actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (showActions ? 1 : 0)} className={`${cellPadClass} py-20`}>
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    <p className="text-sm text-gray-500">Loading data...</p>
                  </div>
                </td>
              </tr>
            ) : !hasData ? (
              <tr>
                <td colSpan={columns.length + (showActions ? 1 : 0)} className={`${cellPadClass} py-20`}>
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <svg
                      className="w-12 h-12 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                    <p className="text-sm font-medium text-gray-500">No records found</p>
                    <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={keyExtractor ? keyExtractor(item, index) : (String((item as Record<string, unknown>).id) || String(index))}
                  className="group border-b border-gray-100 hover:bg-slate-50/80 transition-colors duration-150"
                >
                    {columns.map(col => (
                    <td
                      key={col.key}
                      className={`${cellPadClass} text-sm text-gray-800 align-middle border-b border-gray-100 ${
                        col.allowOverflow ? 'overflow-visible' : 'overflow-hidden'
                      } ${col.className || ''}`}
                      style={colStyle(col)}
                    >
                      {renderCellInner(extractCellContent(col, item), col)}
                    </td>
                  ))}
                  {showActions && (
                    <td className={`${cellPadClass} lms-table-actions-col whitespace-nowrap text-center text-sm relative border-b border-l border-gray-100 bg-white group-hover:bg-slate-50/80`}>
                      <div className="flex justify-center">
                        <ActionMenu
                          isLast={index === data.length - 1}
                          rowIndex={index}
                          totalRows={data.length}
                          onEdit={() => onEdit?.(item)}
                          onView={() => onView?.(item)}
                          {...(onDelete && { onDelete: () => onDelete(item) })}
                          {...(onUpload && { onUpload: () => onUpload(item) })}
                          {...(onChat && { onChat: () => onChat(item) })}
                          {...(onCreateMeeting && { onCreateMeeting: () => onCreateMeeting(item) })}
                          {...(onBriefCreation && { onBriefCreation: () => onBriefCreation(item) })}
                          editPermissionSlug={editPermissionSlug}
                          viewPermissionSlug={viewPermissionSlug}
                          deletePermissionSlug={deletePermissionSlug}
                          uploadPermissionSlug={uploadPermissionSlug}
                        />
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className={`${desktopOnMobile ? 'hidden' : 'lg:hidden'} space-y-3`}>
        {loading ? (
          <div className="px-4 py-16 flex flex-col items-center justify-center space-y-3 bg-white rounded-lg border border-gray-200">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <p className="text-sm text-gray-500">Loading data...</p>
          </div>
        ) : !hasData ? (
          <div className="px-4 py-16 text-center bg-white rounded-lg border border-gray-200">
            <div className="flex flex-col items-center justify-center space-y-2">
              <svg
                className="w-12 h-12 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p className="text-sm font-medium text-gray-500">No records found</p>
              <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
            </div>
          </div>
        ) : (
          data.map((item, index) => (
            <div
              key={keyExtractor ? keyExtractor(item, index) : (String((item as Record<string, unknown>).id) || String(index))}
              className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex flex-col items-center mb-3 pb-3 border-b border-gray-100">
                <div className="flex gap-2 items-center mb-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                    {startIndex + index + 1}
                  </span>
                </div>
                <ActionMenu
                  isLast={index === data.length - 1}
                  rowIndex={index}
                  totalRows={data.length}
                  onEdit={() => onEdit?.(item)}
                  onView={() => onView?.(item)}
                  {...(onDelete && { onDelete: () => onDelete(item) })}
                  {...(onUpload && { onUpload: () => onUpload(item) })}
                  {...(onChat && { onChat: () => onChat(item) })}
                  {...(onCreateMeeting && { onCreateMeeting: () => onCreateMeeting(item) })}
                  {...(onBriefCreation && { onBriefCreation: () => onBriefCreation(item) })}
                  editPermissionSlug={editPermissionSlug}
                  viewPermissionSlug={viewPermissionSlug}
                  deletePermissionSlug={deletePermissionSlug}
                  uploadPermissionSlug={uploadPermissionSlug}
                />
              </div>

              <div className="space-y-2.5">
                {columns
                  .filter(col => !col.hideOnMobile)
                  .map(col => (
                    <div
                      key={col.key}
                      className="flex flex-col items-start gap-1 text-left"
                    >
                      <span className="text-xs font-medium text-gray-500 tracking-wide whitespace-nowrap truncate">
                        {typeof col.header === 'string' ? toTitleCase(col.header) : col.key}
                      </span>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {(() => {
                          const out = col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '-');
                          if (React.isValidElement(out)) return out;
                          if (out === null || out === undefined) return '';
                          if (typeof out === 'object') {
                            const _out: any = out as any;
                            if (_out && 'name' in _out) return String(_out.name ?? '');
                            try { return JSON.stringify(out); } catch { return String(out); }
                          }
                          return String(out);
                        })()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default Table;
