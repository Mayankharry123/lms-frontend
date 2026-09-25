import React from 'react';
import { Download } from 'lucide-react';
import ModalPopup from '../ui/ModalPopup';
import type { BrandImportFailedRow, BrandImportResult } from '../../services/BrandMaster';

type BrandExcelImportModalProps = {
  isOpen: boolean;
  file: File | null;
  importing: boolean;
  downloadingFailedFile?: boolean;
  result: BrandImportResult | null;
  onClose: () => void;
  onImport: () => void;
  onChangeFile: () => void;
  onDownloadFailedRecords?: () => void;
};

function formatFailedRowMessage(row: BrandImportFailedRow): string {
  if (row.error_reason) return String(row.error_reason);
  if (row.reason) return String(row.reason);
  if (Array.isArray(row.errors)) {
    return row.errors.map(String).filter(Boolean).join(', ') || 'Invalid row';
  }
  if (typeof row.errors === 'string' && row.errors.trim()) return row.errors;
  if (row.error) return String(row.error);
  if (row.message) return String(row.message);
  return 'Invalid row';
}

function formatBrandName(row: BrandImportFailedRow): string {
  const name = row.brand_name ?? row.brandName;
  return name != null && String(name).trim() !== '' ? String(name) : '-';
}

function formatRowNumber(row: BrandImportFailedRow, index: number): string {
  const value = row.row ?? row.row_number ?? row.rowNumber ?? row.line;
  return value != null && String(value).trim() !== '' ? String(value) : String(index + 1);
}

const BrandExcelImportModal: React.FC<BrandExcelImportModalProps> = ({
  isOpen,
  file,
  importing,
  downloadingFailedFile = false,
  result,
  onClose,
  onImport,
  onChangeFile,
  onDownloadFailedRecords,
}) => {
  const title = result ? 'Import Results' : 'Import Excel';
  const hasFailedRecordsTable = Boolean(result?.failedRows.length);
  const showFailedDownload =
    Boolean(result && result.failed > 0 && result.failedFileUrl && onDownloadFailedRecords);

  return (
    <ModalPopup
      show={isOpen}
      onClose={importing || downloadingFailedFile ? () => undefined : onClose}
      title={title}
      panelClassName={result ? '!max-w-2xl' : ''}
      bodyClassName={result ? 'max-h-[70vh] overflow-y-auto' : ''}
    >
      {result ? (
        <div className="space-y-4">
          {result.failed > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-sm font-medium text-amber-800">
                Import completed with failed records.
              </p>
              <p className="mt-1 text-sm text-amber-700">
                {result.message || 'Brand import completed.'}
                {showFailedDownload
                  ? ' Download the failed records Excel to review each row and its error reason.'
                  : ''}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-sm font-medium text-emerald-800">Import completed successfully.</p>
              {result.message && <p className="mt-1 text-sm text-emerald-700">{result.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Total Records
              </div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{result.total}</div>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-center">
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                Successfully Imported Records
              </div>
              <div className="mt-1 text-lg font-semibold text-emerald-800">{result.successful}</div>
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-center">
              <div className="text-xs font-medium uppercase tracking-wide text-red-700">
                Failed Records
              </div>
              <div className="mt-1 text-lg font-semibold text-red-800">{result.failed}</div>
            </div>
          </div>

          {hasFailedRecordsTable && (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Row</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Brand Name</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {result.failedRows.map((row, index) => (
                    <tr key={`${formatRowNumber(row, index)}-${index}`}>
                      <td className="whitespace-nowrap px-3 py-2 align-top font-medium text-gray-900">
                        {formatRowNumber(row, index)}
                      </td>
                      <td className="px-3 py-2 align-top text-gray-900">{formatBrandName(row)}</td>
                      <td className="px-3 py-2 text-gray-700">{formatFailedRowMessage(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            {showFailedDownload && (
              <button
                type="button"
                className="btn-primary !bg-gray-800"
                onClick={onDownloadFailedRecords}
                disabled={downloadingFailedFile}
                aria-busy={downloadingFailedFile}
              >
                <Download className="h-4 w-4" aria-hidden />
                <span>{downloadingFailedFile ? 'Downloading…' : 'Download Failed Records'}</span>
              </button>
            )}
            <button type="button" className="btn-primary" onClick={onClose} disabled={downloadingFailedFile}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Confirm the selected Excel file to import brands.
          </p>

          <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-gray-900">{file?.name || 'No file selected'}</div>
              {file ? (
                <div className="text-xs text-gray-500">
                  {file.size > 0 ? `${(file.size / 1024).toFixed(1)} KB` : 'Empty file'}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="btn-secondary shrink-0"
              onClick={onChangeFile}
              disabled={importing}
            >
              Change
            </button>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={importing}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={onImport}
              disabled={importing || !file}
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      )}
    </ModalPopup>
  );
};

export default BrandExcelImportModal;
