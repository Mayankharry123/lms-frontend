/**
 * @file PlanSubmission.tsx
 * @description Submit or upload a plan for a brief.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Eye, Download, Trash2 } from 'lucide-react';
import MasterFormHeader from '../../components/ui/MasterFormHeader';
import Button from '../../components/ui/Button';
import UploadCard from '../../components/ui/UploadCard';
import { getBriefById, uploadPlanSubmission } from '../../services/PlanSubmission';
import SweetAlert from '../../utils/SweetAlert';
import type { BriefDetail } from '../../services/PlanSubmission';

function getPlanSubmissionErrorMessage(error: unknown, planFiles: File[]): string {
  if (!error || typeof error !== 'object') {
    return 'Failed to submit plan.';
  }

  const responseData = (error as {
    response?: {
      data?: {
        message?: unknown;
        errors?: Record<string, unknown>;
      };
    };
    message?: unknown;
  }).response?.data;

  if (responseData?.errors) {
    const details = Object.entries(responseData.errors).flatMap(([field, rawMessages]) => {
      const messages = (Array.isArray(rawMessages) ? rawMessages : [rawMessages])
        .filter((message): message is string => typeof message === 'string');
      const planIndex = /^submitted_plan(?:\.|\[)(\d+)\]?$/.exec(field);
      const fieldLabel = planIndex
        ? `Plan file "${planFiles[Number(planIndex[1])]?.name || `#${Number(planIndex[1]) + 1}`}"`
        : field;
      return messages.map((message) => `${fieldLabel}: ${message}`);
    });

    if (details.length) return details.join('\n');
  }

  if (typeof responseData?.message === 'string') return responseData.message;

  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' ? message : 'Failed to submit plan.';
}

const PlanSubmission: React.FC = () => {
  const navigate = useNavigate();
  // Get briefId from route params (assume route: /briefs/:id/plan-submission)
  const { id } = useParams<{ id: string }>();
  const [brief, setBrief] = useState<BriefDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planFiles, setPlanFiles] = useState<File[]>([]);
  const [backupFiles, setBackupFiles] = useState<File[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    console.log('PlanSubmission id from URL:', id);
    getBriefById(Number(id))
      .then((data) => {
        console.log('Fetched brief data:', data);
        setBrief(data);
      })
      .catch(() => setError('Failed to load brief details.'))
      .finally(() => setLoading(false));
  }, [id]);

  const getFileExtension = (fileName: string): string => {
    return fileName.split('.').pop()?.toUpperCase() || 'FILE';
  };

  const getFileTypeColor = (ext: string): string => {
    const colorMap: Record<string, string> = {
      'PDF': 'bg-red-100 text-red-700',
      'XLS': 'bg-green-100 text-green-700',
      'XLSX': 'bg-green-100 text-green-700',
      'DOC': 'bg-blue-100 text-blue-700',
      'DOCX': 'bg-blue-100 text-blue-700',
      'PPT': 'bg-orange-100 text-orange-700',
      'PPTX': 'bg-orange-100 text-orange-700',
      'CSV': 'bg-green-100 text-green-700',
    };
    return colorMap[ext] || 'bg-gray-100 text-gray-700';
  };

  const FileCard = ({ file, onRemove }: { file: File; onRemove: () => void }) => {
    const ext = getFileExtension(file.name);
    const colorClass = getFileTypeColor(ext);

    return (
      <div className="relative inline-flex flex-col items-center p-4 border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow">
        <div className="relative mb-3">
          <div className="w-24 h-32 border-2 border-gray-200 rounded bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className={`inline-block px-2 py-1 rounded text-xs font-bold mb-2 ${colorClass}`}>
                {ext}
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-600 text-center truncate w-28 mb-3">{file.name}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="View"
            onClick={() => window.open(URL.createObjectURL(file))}
          >
            <Eye className="w-4 h-4 text-gray-600" />
          </button>
          <button
            type="button"
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Download"
            onClick={() => {
              const a = document.createElement('a');
              a.href = URL.createObjectURL(file);
              a.download = file.name;
              a.click();
            }}
          >
            <Download className="w-4 h-4 text-gray-600" />
          </button>
          <button
            type="button"
            className="p-1.5 hover:bg-red-50 rounded transition-colors"
            title="Delete"
            onClick={onRemove}
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <MasterFormHeader onBack={() => navigate(-1)} title="Plan Submission" />
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">
            Plan Submission
          </h2>
        </div>
        <div className="p-6 text-sm">
          {/* Loading & Error States */}
          {loading && <div className="mb-4 text-blue-600">Loading brief details...</div>}
          {error && <div className="mb-4 text-red-600">{error}</div>}

          {/* Brief Details Section */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Brief ID:</span>
                  <span className="text-gray-600">{brief ? `#${brief.id}` : '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Brief Name:</span>
                  <span className="text-gray-600">{brief?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Planner:</span>
                  <span className="text-gray-600">{brief?.assigned_user?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Brief Status:</span>
                  <span className="text-gray-600">{brief?.brief_status?.name || brief?.status || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Budget:</span>
                  <span className="text-gray-600">{brief?.budget || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Brief Submission Date & Time:</span>
                  <span className="text-gray-600">{brief?.submission_date || '-'}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Brand Name:</span>
                  <span className="text-gray-600">{brief?.brand?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Product Name:</span>
                  <span className="text-gray-600">{brief?.product_name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Media:</span>
                  <span className="text-gray-600">{brief?.mode_of_campaign || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Media Type:</span>
                  <span className="text-gray-600">{brief?.media_type || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Priority:</span>
                  <span className="text-gray-600">{brief?.priority?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Brief Detail:</span>
                  <span className="text-gray-600">{brief?.comment || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Upload Plan Section */}
            <div className="mb-6">
              <h3 className="text-base font-medium text-gray-900 mb-2">Upload Plan</h3>
              {planFiles.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {planFiles.map((file, idx) => (
                      <FileCard
                        key={idx}
                        file={file}
                        onRemove={() => setPlanFiles(planFiles.filter((_, i) => i !== idx))}
                      />
                    ))}
                    <div className="flex items-center justify-center">
                      <label className="w-full h-40 flex items-center justify-center border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors bg-blue-50">
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          accept=".xls,.xlsx,.xlsm,.csv,.doc,.docx,.ppt,.pptx"
                          onChange={(e) => {
                            if (e.target.files) {
                              const files = Array.from(e.target.files);
                              setPlanFiles((prev) => {
                                const combined = [...prev, ...files];
                                return combined.slice(0, 2);
                              });
                            }
                          }}
                        />
                        <div className="text-center">
                          <svg
                            className="mx-auto h-8 w-8 text-blue-400"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                          >
                            <path
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <p className="text-sm text-blue-600 font-medium">Add Plan</p>
                          <p className="text-xs text-blue-500">Supported formats: Word, PPT</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <UploadCard
                  files={planFiles}
                  onChange={(files: File[]) => setPlanFiles(files.slice(0, 2))}
                  accept=".xls,.xlsx,.xlsm,.csv,.doc,.docx,.ppt,.pptx"
                  supported="Excel, Word, PPT"
                />
              )}
            </div>

            {/* Upload Back-Up Plan Section */}
            <div className="mb-6">
              <h3 className="text-base font-medium text-gray-900 mb-2">Upload Back-Up Plan</h3>
              {backupFiles.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {backupFiles.map((file, idx) => (
                      <FileCard
                        key={idx}
                        file={file}
                        onRemove={() => setBackupFiles(backupFiles.filter((_, i) => i !== idx))}
                      />
                    ))}
                    <div className="flex items-center justify-center">
                      <label className="w-full h-40 flex items-center justify-center border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors bg-blue-50">
                        <input
                          type="file"
                          className="hidden"
                          accept=".xls,.xlsx,.xlsm,.csv,.doc,.docx,.ppt,.pptx"
                          onChange={(e) => {
                            if (e.target.files) {
                              const files = Array.from(e.target.files);
                              setBackupFiles((prev) => {
                                const combined = [...prev, ...files];
                                return combined.slice(0, 1);
                              });
                            }
                          }}
                        />
                        <div className="text-center">
                          <svg
                            className="mx-auto h-8 w-8 text-blue-400"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                          >
                            <path
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <p className="text-sm text-blue-600 font-medium">Add Plan</p>
                          <p className="text-xs text-blue-500">Supported formats: Word, PPT</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <UploadCard
                  files={backupFiles}
                  onChange={(files: File[]) => setBackupFiles(files.slice(0, 1))}
                  accept=".xls,.xlsx,.xlsm,.csv,.doc,.docx,.ppt,.pptx"
                  supported="Excel, Word, PPT"
                />
              )}
            </div>
          </div>


          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
            <Button
              variant="primary"
              size="md"
              className="bg-gray-200 text-gray-700 hover:bg-gray-300"
              onClick={() => { setPlanFiles([]); setBackupFiles([]); setSubmitError(null); setSubmitSuccess(null); }}
              disabled={submitLoading}
            >
              RESET
            </Button>

            <Button
              variant="primary"
              size="md"
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={submitLoading || planFiles.length === 0}
              onClick={async () => {
                setSubmitLoading(true);
                setSubmitError(null);
                setSubmitSuccess(null);
                try {
                  if (!id) throw new Error('No brief ID');
                  // show loading SweetAlert while upload is in progress
                  SweetAlert.showLoading({ title: 'Submitting Proposal...', text: 'Please wait while we upload your plan' });

                  const response = await uploadPlanSubmission(
                    Number(id),
                    planFiles,
                    backupFiles[0]
                  );
                  console.log('Plan Submission API response:', response);

                  // close the loading modal before showing success
                  SweetAlert.close();

                  // wait for the success alert to finish (it auto-closes), then navigate
                  await SweetAlert.showSubmitSuccess();

                  setPlanFiles([]);
                  setBackupFiles([]);
                  navigate('/brief/log');
                } catch (err: unknown) {
                  const msg = getPlanSubmissionErrorMessage(err, planFiles);
                  setSubmitError(msg);
                  // ensure any loading modal is closed then show error
                  SweetAlert.close();
                  SweetAlert.showError(msg);
                } finally {
                  setSubmitLoading(false);
                }
              }}
            >
              {submitLoading ? 'Submitting...' : 'SUBMIT PROPOSAL'}
            </Button>
            {/* Submission Success/Error Messages */}
            {submitError && <div className="mb-4 text-red-600">{submitError}</div>}
            {submitSuccess && <div className="mb-4 text-green-600">{submitSuccess}</div>}
          </div>
        </div>
      </div>
    </>
  );
};

export default PlanSubmission;