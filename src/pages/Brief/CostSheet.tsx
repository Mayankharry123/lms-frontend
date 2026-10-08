/**
 * @file CostSheet.tsx
 * @description Upload an Excel cost sheet for a selected brief.
 * @date 2026-10-04
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MasterFormHeader from '../../components/ui/MasterFormHeader';
import Button from '../../components/ui/Button';
import UploadCard from '../../components/ui/UploadCard';
import { getBriefById, uploadCostSheet } from '../../services/PlanSubmission';
import type { BriefDetail } from '../../services/PlanSubmission';
import SweetAlert from '../../utils/SweetAlert';
import { ROUTES } from '../../constants';

const EXCEL_EXTENSIONS = new Set(['xls', 'xlsx']);
const EXCEL_MIME_TYPES = new Set([
  '',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
  'application/zip',
  'application/x-zip-compressed',
]);
const EXCEL_ERROR = 'Please upload a valid Excel file (.xlsx or .xls).';
const EXCEL_ACCEPT =
  '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';

type NamedRef = { name?: string | null } | string | null | undefined;

function personName(...candidates: NamedRef[]): string {
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    if (typeof candidate === 'object' && candidate.name?.trim()) return candidate.name.trim();
  }
  return '-';
}

function formatCampaignDate(value?: string | null): string {
  if (!value) return '-';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function excelFileError(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mime = (file.type || '').toLowerCase();
  if (!EXCEL_EXTENSIONS.has(extension) || (mime && !EXCEL_MIME_TYPES.has(mime))) {
    return EXCEL_ERROR;
  }
  if (file.size <= 0) {
    return 'The selected file is empty. Please choose a valid Excel file.';
  }
  return null;
}

function uploadErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const err = error as {
      message?: string;
      response?: { status?: number; data?: { message?: string; errors?: unknown } };
    };
    const status = err.response?.status;
    const data = err.response?.data;
    if (typeof data?.message === 'string' && data.message.trim()) return data.message;
    if (data?.errors) {
      if (Array.isArray(data.errors)) return data.errors.map(String).join(', ');
      if (typeof data.errors === 'object') {
        const messages = Object.values(data.errors as Record<string, unknown>)
          .flatMap((value) => (Array.isArray(value) ? value : [value]))
          .map(String)
          .filter(Boolean);
        if (messages.length) return messages.join(', ');
      }
    }
    if (status === 413) {
      return 'The file is too large. Please upload a smaller Excel file.';
    }
    if (status === 422) {
      return 'The cost sheet could not be validated. Please upload a valid Excel file (.xlsx or .xls).';
    }
  }
  if (error instanceof Error && error.message && !error.message.startsWith('Request failed with status code')) {
    return error.message;
  }
  return 'Failed to submit the cost sheet. Please try again.';
}

const Field: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div>
    <span className="text-gray-800 font-semibold inline-block min-w-[170px]">{label}</span>
    <span className="text-gray-600">{value || '-'}</span>
  </div>
);

const CostSheet: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [brief, setBrief] = useState<BriefDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [costSheetFile, setCostSheetFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const submitLock = useRef(false);

  useEffect(() => {
    if (!id || Number.isNaN(Number(id))) {
      setBrief(null);
      setError('Brief not found.');
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    getBriefById(Number(id))
      .then((data) => {
        if (active) setBrief(data);
      })
      .catch(() => {
        if (active) setError('Failed to load brief details.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const resetForm = () => {
    setCostSheetFile(null);
    setFileError(null);
  };

  const handleFiles = (files: File[]) => {
    const file = files[0];
    if (!file) {
      setCostSheetFile(null);
      setFileError(null);
      return;
    }
    const message = excelFileError(file);
    if (message) {
      setFileError(message);
      return;
    }
    setFileError(null);
    setCostSheetFile(file);
  };

  const handleSubmit = async () => {
    if (submitLock.current || submitLoading) return;
    const plannerId = Number(brief?.planner_id);
    if (!id || Number.isNaN(Number(id))) {
      setFileError('Brief not found.');
      return;
    }
    if (!plannerId) {
      setFileError('Plan ID is missing for this brief.');
      return;
    }
    if (!costSheetFile) {
      setFileError('Please select an Excel file before submitting.');
      return;
    }
    const message = excelFileError(costSheetFile);
    if (message) {
      setFileError(message);
      setCostSheetFile(null);
      return;
    }

    submitLock.current = true;
    setSubmitLoading(true);
    setFileError(null);
    try {
      SweetAlert.showLoading({
        title: 'Submitting Cost Sheet...',
        text: 'Please wait while we upload your Excel file',
      });
      await uploadCostSheet(plannerId, costSheetFile);
      SweetAlert.close();
      await SweetAlert.showSubmitSuccess({
        title: 'Submitted Successfully!',
        text: 'Your cost sheet has been received',
      });
      setCostSheetFile(null);
      navigate(ROUTES.BRIEF.LOG);
    } catch (err: unknown) {
      const msg = uploadErrorMessage(err);
      setFileError(msg);
      SweetAlert.close();
      SweetAlert.showError(msg);
    } finally {
      submitLock.current = false;
      setSubmitLoading(false);
    }
  };

  const salesUser = personName(
    brief?.sales_user,
    brief?.sales_person,
    brief?.created_by_user
  );
  const planId = brief?.planner_id == null || brief.planner_id === '' ? '-' : String(brief.planner_id);
  const planStatus = personName(brief?.planner_status);

  return (
    <>
      <MasterFormHeader onBack={() => navigate(ROUTES.BRIEF.LOG)} title="Cost Sheet" />
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Cost Sheet</h2>
        </div>
        <div className="p-6 text-sm">
          {loading && <div className="mb-4 text-blue-600">Loading brief details...</div>}
          {error && <div className="mb-4 text-red-600">{error}</div>}
          {!loading && !error && !brief && (
            <div className="mb-4 text-gray-500">No brief details available.</div>
          )}

          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Field label="Brief ID:" value={brief ? `#${brief.id}` : '-'} />
                <Field label="Brief Name:" value={brief?.name} />
                <Field label="Planner:" value={brief?.assigned_user?.name} />
                <Field label="Plan ID:" value={planId} />
                <Field label="Plan Status:" value={planStatus} />
                <Field label="Sales User:" value={salesUser} />
                <Field label="Brief Status:" value={brief?.brief_status?.name || brief?.status} />
                <Field label="Budget:" value={brief?.budget} />
                <Field label="Campaign Start Date:" value={formatCampaignDate(brief?.campaign_start_date)} />
              </div>
              <div className="space-y-3">
                <Field label="Brand Name:" value={brief?.brand?.name} />
                <Field label="Product Name:" value={brief?.product_name} />
                <Field label="Campaign End Date:" value={formatCampaignDate(brief?.campaign_end_date)} />
                <Field label="Media:" value={brief?.mode_of_campaign} />
                <Field label="Media Type:" value={brief?.media_type} />
                <Field label="Priority:" value={brief?.priority?.name} />
                <Field label="Brief Detail:" value={brief?.comment} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="mb-6">
              <h3 className="text-base font-medium text-gray-900 mb-2">Upload Cost Sheet</h3>
              <UploadCard
                files={costSheetFile ? [costSheetFile] : []}
                multiple={false}
                accept={EXCEL_ACCEPT}
                dropLabel="Drag & drop file"
                hint="Supported format: Excel (.xlsx, .xls)"
                singleFileMessage={EXCEL_ERROR}
                validateFile={excelFileError}
                onReject={setFileError}
                onChange={handleFiles}
              />
              {fileError && <p className="mt-2 text-red-600">{fileError}</p>}
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
            <Button
              variant="primary"
              size="md"
              className="bg-gray-200 text-gray-700 hover:bg-gray-300"
              onClick={resetForm}
              disabled={submitLoading}
            >
              RESET
            </Button>
            <Button
              variant="primary"
              size="md"
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={submitLoading || !costSheetFile}
              loading={submitLoading}
              onClick={handleSubmit}
            >
              {submitLoading ? 'Submitting...' : 'SUBMIT COST SHEET'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CostSheet;
