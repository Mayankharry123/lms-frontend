import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Upload } from 'lucide-react';
import LoadingModal from '../ui/LoadingModal';
import SweetAlert from '../../utils/SweetAlert';
import {
  downloadBrandImportTemplate,
  downloadFailedBrandImportFile,
  importBrandsFromExcel,
  type BrandImportResult,
} from '../../services/BrandMaster';
import BrandExcelImportModal from './BrandExcelImportModal';

const EXCEL_ACCEPT =
  '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';

type BrandExcelActionsProps = {
  onImported: () => void | Promise<void>;
};

function isExcelFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.xlsx') || name.endsWith('.xls');
}

const BrandExcelActions: React.FC<BrandExcelActionsProps> = ({ onImported }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInFlight = useRef(false);
  const templateInFlight = useRef(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<BrandImportResult | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [downloadingFailedFile, setDownloadingFailedFile] = useState(false);
  const failedFileInFlight = useRef(false);

  const busy = importing || downloadingTemplate || downloadingFailedFile;

  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const closeModal = useCallback(() => {
    if (importInFlight.current || failedFileInFlight.current) return;
    setModalOpen(false);
    setSelectedFile(null);
    setImportResult(null);
    resetFileInput();
  }, [resetFileInput]);

  const openFilePicker = useCallback(() => {
    if (busy) return;
    resetFileInput();
    fileInputRef.current?.click();
  }, [busy, resetFileInput]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isExcelFile(file)) {
      SweetAlert.showError('Please select a valid Excel file (.xlsx or .xls).');
      resetFileInput();
      return;
    }

    if (file.size === 0) {
      SweetAlert.showError('The selected file is empty. Please choose a valid Excel file.');
      resetFileInput();
      return;
    }

    setSelectedFile(file);
    setImportResult(null);
    setModalOpen(true);
  }, [resetFileInput]);

  const handleImport = useCallback(async () => {
    if (!selectedFile || importInFlight.current) return;

    importInFlight.current = true;
    setImporting(true);
    try {
      const result = await importBrandsFromExcel(selectedFile);
      setImportResult(result);

      if (result.successful > 0) {
        await onImported();
      }

      if (result.failed > 0) {
        return;
      }

      SweetAlert.showSuccess({
        title: 'Import Completed',
        text: result.message || 'Brand import completed.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to import Excel file.';
      SweetAlert.showError(message);
    } finally {
      importInFlight.current = false;
      setImporting(false);
    }
  }, [onImported, selectedFile]);

  const handleDownloadFailedRecords = useCallback(async () => {
    const fileUrl = importResult?.failedFileUrl;
    if (!fileUrl || failedFileInFlight.current) return;

    failedFileInFlight.current = true;
    setDownloadingFailedFile(true);
    try {
      await downloadFailedBrandImportFile(fileUrl);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to download failed records Excel.';
      SweetAlert.showError(message);
    } finally {
      failedFileInFlight.current = false;
      setDownloadingFailedFile(false);
    }
  }, [importResult?.failedFileUrl]);

  const handleDownloadTemplate = useCallback(async () => {
    if (templateInFlight.current || busy) return;

    templateInFlight.current = true;
    setDownloadingTemplate(true);
    try {
      await downloadBrandImportTemplate();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to download Excel template.';
      SweetAlert.showError(message);
    } finally {
      templateInFlight.current = false;
      setDownloadingTemplate(false);
    }
  }, [busy]);

  return (
    <div className="contents">
      <button
        type="button"
        onClick={handleDownloadTemplate}
        disabled={busy}
        className="btn-primary !bg-gray-800 flex-1 sm:flex-0 whitespace-nowrap"
        aria-label="Download brand Excel template"
        aria-busy={downloadingTemplate}
      >
        <Download className="w-5 h-5" aria-hidden />
        <span>{downloadingTemplate ? 'Downloading…' : 'Excel Template'}</span>
      </button>

      <button
        type="button"
        onClick={openFilePicker}
        disabled={busy}
        className="btn-primary !bg-gray-800 flex-1 sm:flex-0 whitespace-nowrap"
        aria-label="Import brands from Excel"
        aria-busy={importing}
      >
        <Upload className="w-5 h-5" aria-hidden />
        <span>{importing ? 'Importing…' : 'Import Excel'}</span>
      </button>

      {createPortal(
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept={EXCEL_ACCEPT}
            className="hidden"
            onChange={handleFileChange}
          />

          <BrandExcelImportModal
            isOpen={modalOpen}
            file={selectedFile}
            importing={importing}
            downloadingFailedFile={downloadingFailedFile}
            result={importResult}
            onClose={closeModal}
            onImport={handleImport}
            onChangeFile={openFilePicker}
            onDownloadFailedRecords={handleDownloadFailedRecords}
          />

          <LoadingModal
            isOpen={importing}
            title="Importing brands"
            message="Uploading and processing the Excel file. Please wait."
          />
          <LoadingModal
            isOpen={downloadingFailedFile}
            title="Downloading failed records"
            message="Preparing the failed records Excel file. Please wait."
          />
          <LoadingModal
            isOpen={downloadingTemplate}
            title="Downloading template"
            message="Preparing the Brand Excel template. Please wait."
          />
        </>,
        document.body
      )}
    </div>
  );
};

export default BrandExcelActions;
