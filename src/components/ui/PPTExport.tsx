import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Download } from 'lucide-react';
import {
  forEachDeviceInventoryPage,
  type DeviceInventoryFilterParams,
} from '../../services/DeviceInventory';
import {
  generateDeviceInventoryPptxStreaming,
  type DeviceInventoryPptxProgress,
} from '../../utils/devicePptxExport';
import LoadingModal from './LoadingModal';
import SweetAlert from '../../utils/SweetAlert';

const LARGE_EXPORT_CONFIRM_THRESHOLD = 250;

type PPTExportProps = {
  /** Current inventory filters (same as table / Excel export). */
  getExportFilters: () => DeviceInventoryFilterParams;
  /** Total rows matching filters (for confirm + progress). */
  recordCount?: number;
  className?: string;
  buttonClassName?: string;
  icon?: ReactNode;
  disabled?: boolean;
};

type ExportStage = DeviceInventoryPptxProgress['stage'];

function stageWeight(stage: ExportStage): number {
  if (stage === 'fetch') return 0;
  if (stage === 'slides') return 0.7;
  if (stage === 'file') return 0.92;
  return 1;
}

function computeOverallProgress(
  stage: ExportStage,
  loaded: number,
  total: number
): number {
  if (total <= 0) return 0;
  const ratio = Math.min(1, loaded / total);
  const start = stageWeight(stage);
  const end =
    stage === 'fetch'
      ? 0.35
      : stage === 'slides'
        ? 0.92
        : stage === 'file'
          ? 0.98
          : 1;
  return (start + (end - start) * ratio) * 100;
}

function formatProgressMessage(
  stage: ExportStage,
  loaded: number,
  total: number
): string {
  const loadedLabel = loaded.toLocaleString();
  const totalLabel = total.toLocaleString();

  if (stage === 'fetch') {
    return `Loading filtered devices ${loadedLabel} of ${totalLabel}…`;
  }
  if (stage === 'slides') {
    return `Building slides ${loadedLabel} of ${totalLabel}…`;
  }
  if (stage === 'file') {
    return `Saving presentation part ${loadedLabel} of ${totalLabel}…`;
  }
  return `Packaging export files… ${loadedLabel}%`;
}

function PPTExport({
  getExportFilters,
  recordCount = 0,
  className = '',
  buttonClassName = 'btn-primary inline-flex items-center whitespace-nowrap shrink-0',
  icon,
  disabled = false,
}: PPTExportProps) {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(
    'Your PowerPoint export is being created. Please wait a moment.'
  );
  const [loadingProgress, setLoadingProgress] = useState<number | undefined>(undefined);
  const inFlightRef = useRef(false);

  const handleExport = useCallback(async () => {
    if (inFlightRef.current || disabled) {
      return;
    }

    if (recordCount > LARGE_EXPORT_CONFIRM_THRESHOLD) {
      const confirmed = await SweetAlert.showConfirm({
        title: 'Export all filtered devices?',
        text: `${recordCount.toLocaleString()} device slide(s) will be exported in batches of 50 per file. Large exports are downloaded as a ZIP. Continue?`,
      });
      if (!confirmed) return;
    }

    inFlightRef.current = true;
    setLoading(true);
    setLoadingProgress(undefined);

    try {
      const filters = getExportFilters();
      let exportTotal = recordCount > 0 ? recordCount : 0;

      setLoadingMessage(
        exportTotal > 0
          ? `Loading filtered devices (0 of ${exportTotal.toLocaleString()})…`
          : 'Loading filtered device records…'
      );

      const result = await generateDeviceInventoryPptxStreaming(
        async (onPage) =>
          forEachDeviceInventoryPage(filters, {
            onPageRows: async (rows, progress) => {
              exportTotal = progress.total;
              await onPage(rows, { loaded: progress.loaded, total: progress.total });
            },
          }),
        {
          estimatedTotal: recordCount,
          onProgress: (progress: DeviceInventoryPptxProgress) => {
            exportTotal = Math.max(exportTotal, progress.total);
            setLoadingMessage(
              formatProgressMessage(progress.stage, progress.loaded, progress.total)
            );
            setLoadingProgress(
              computeOverallProgress(progress.stage, progress.loaded, progress.total)
            );
          },
        }
      );

      setLoadingProgress(100);

      const fileSummary =
        result.fileCount > 1
          ? `${result.exportedCount.toLocaleString()} slides saved in ${result.fileCount} files (${result.archiveName}).`
          : `${result.exportedCount.toLocaleString()} device slide(s) exported successfully.`;

      await SweetAlert.showSuccess({
        title: 'PPT export ready',
        text: fileSummary,
        timer: 3000,
      });
    } catch (err) {
      console.error('PPT export failed:', err);
      const rawMessage = err instanceof Error ? err.message : String(err);
      const message =
        rawMessage.includes('Array buffer allocation failed')
          ? 'This export is too large for the browser to build in one go. Try narrowing your filters or export in smaller batches.'
          : rawMessage;
      await SweetAlert.showError(message, {
        title: 'PPT export failed',
      });
    } finally {
      setLoading(false);
      setLoadingProgress(undefined);
      inFlightRef.current = false;
    }
  }, [disabled, getExportFilters, recordCount]);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleExport}
        disabled={loading || disabled}
        className={buttonClassName}
        aria-label="Export filtered device inventory to PowerPoint"
        aria-busy={loading}
      >
        {icon ?? <Download className="h-4 w-4 mr-2 shrink-0 text-gray-700" aria-hidden />}
        {loading ? 'Exporting PPT…' : 'PPT Export'}
      </button>
      <LoadingModal
        isOpen={loading}
        title="Generating PPT"
        message={loadingMessage}
        progress={loadingProgress}
      />
    </div>
  );
}

export default PPTExport;
