import React, { useCallback, useRef, useState, type ReactNode } from 'react';
import { Download } from 'lucide-react';
import LoadingModal from './LoadingModal';
import SweetAlert from '../../utils/SweetAlert';

export type ExportExcelButtonProps = {
  /** Trigger export (e.g. call API and download generated file) */
  fetchExport?: () => Promise<void>;
  /** Server-provided download path/URL for the current filters */
  downloadUrl?: string | null;
  label?: string;
  exportingLabel?: string;
  className?: string;
  buttonClassName?: string;
  icon?: ReactNode;
  disabled?: boolean;
  'aria-label'?: string;
};

const ExportExcelButton: React.FC<ExportExcelButtonProps> = ({
  fetchExport,
  downloadUrl,
  label = 'Export Excel',
  exportingLabel = 'Exporting…',
  className = '',
  buttonClassName = 'btn-primary !bg-gray-800',
  icon,
  disabled = false,
  'aria-label': ariaLabel,
}) => {
  const [exporting, setExporting] = useState(false);
  const inFlight = useRef(false);
  const canExport = Boolean(fetchExport || downloadUrl);

  const handleClick = useCallback(async () => {
    if (disabled || !canExport || inFlight.current) return;
    inFlight.current = true;
    setExporting(true);
    try {
      if (downloadUrl) {
        const { downloadDeviceInventoryExport } = await import('../../services/DeviceInventory');
        await downloadDeviceInventoryExport(downloadUrl, 'device-inventory.xlsx');
        return;
      }

      if (fetchExport) {
        await fetchExport();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to export Excel file';
      try {
        SweetAlert.showError(message);
      } catch {
        console.error(message);
      }
    } finally {
      inFlight.current = false;
      setExporting(false);
    }
  }, [disabled, canExport, downloadUrl, fetchExport]);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || exporting || !canExport}
        className={`inline-flex items-center whitespace-nowrap shrink-0 ${buttonClassName}`}
        aria-label={ariaLabel ?? 'Export data as Excel'}
        aria-busy={exporting}
      >
        {icon ?? <Download className="h-4 w-4 mr-2 shrink-0" aria-hidden />}
        {exporting ? exportingLabel : label}
      </button>
      <LoadingModal
        isOpen={exporting}
        title="Preparing Excel export"
        message="Generating Excel file with your current filters. This may take a moment for large inventories."
      />
    </div>
  );
};

export default ExportExcelButton;
