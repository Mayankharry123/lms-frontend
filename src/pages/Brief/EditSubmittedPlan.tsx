/**
 * @file EditSubmittedPlan.tsx
 * @description Edit a previously submitted brief plan.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Eye, Download, Trash2 } from 'lucide-react';
import MasterFormHeader from '../../components/ui/MasterFormHeader';
import Button from '../../components/ui/Button';
import UploadCard from '../../components/ui/UploadCard';
import FilePreviewModal from '../../components/ui/FilePreviewModal';
import { getBriefById } from '../../services/PlanSubmission';
import type { BriefDetail } from '../../services/PlanSubmission';
import http from '../../services/http';
import { updateSubmittedPlan } from '../../services/EditSubmittedPlan';
import SweetAlert from '../../utils/SweetAlert';

const EditSubmittedPlan: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [planFiles, setPlanFiles] = useState<File[]>([]);
  const [backupFiles, setBackupFiles] = useState<File[]>([]);
  const [briefDetails, setBriefDetails] = useState<BriefDetail | null>(null);
  const [plannerData, setPlannerData] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSource, setPreviewSource] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    // Fetch brief details
    getBriefById(Number(id))
      .then((data) => setBriefDetails(data))
      .catch((error) => {
        setBriefDetails(null);
        console.error('Failed to fetch brief details:', error);
      });
    // Fetch planner data (by planner_id from briefDetails or id)
    // We need to fetch planner data after briefDetails is loaded (to get planner_id)
  }, [id]);

  useEffect(() => {
    // Fetch planner data after briefDetails is loaded
    const fetchPlanner = async () => {
      if (!briefDetails) return;
      // Use planner_id only when it's explicitly set (not null/undefined).
      const plannerIdRaw = (briefDetails as any).planner_id;
      if (plannerIdRaw === null || plannerIdRaw === undefined) return;
      const plannerId = plannerIdRaw;
      try {
        const resp = await http.get(`/planners/${plannerId}`);
        setPlannerData(resp.data.data);
      } catch (error) {
        setPlannerData(null);

        console.error('Failed to fetch planner data:', error);
      }
    };
    fetchPlanner();
  }, [briefDetails, id]);

  const handleSubmit = async () => {
    if (!id || !briefDetails) return;
    // Try to get plannerId from briefDetails. If planner_id is explicitly null/undefined
    // do NOT fall back to the brief id — stop and notify the user instead.
    const plannerIdRaw = (briefDetails as any).planner_id;
    if (plannerIdRaw === null || plannerIdRaw === undefined) {
      SweetAlert.showError('No planner assigned for this brief. Cannot update plan.');
      return;
    }
    const plannerId = plannerIdRaw;
    const formData = new FormData();
    planFiles.forEach((file) => {
      formData.append('submitted_plan[]', file);
    });
    if (backupFiles[0]) {
      formData.append('backup_plan', backupFiles[0]);
    }
    // Debug: log FormData keys and values

    console.log('Submitting plan:', { briefId: id, plannerId, planFiles, backupFiles });
    for (const pair of formData.entries()) {

      console.log(pair[0], pair[1]);
    }
    try {
      const resp = await updateSubmittedPlan(Number(id), Number(plannerId), formData);
      // Show success toast/message
      if (window && (window as any).toast) {
        (window as any).toast.success(resp.message || 'Plan updated successfully');
      } else if (window && (window as any).showToast) {
        (window as any).showToast('success', resp.message || 'Plan updated successfully');
      } else {
        SweetAlert.showUpdateSuccess();
      }
      navigate(-1);
    } catch (err: any) {

      console.error('Update plan error:', err, err?.response);
      if (window && (window as any).toast) {
        (window as any).toast.error(err.message || 'Failed to update plan');
      } else if (window && (window as any).showToast) {
        (window as any).showToast('error', err.message || 'Failed to update plan');
      } else {
        SweetAlert.showError((err && err.message) ? err.message : 'Failed to update plan');
      }
    }
  };

  const handleReset = () => {
    setPlanFiles([]);
    setBackupFiles([]);
  };

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

  const FileCard = ({ file, onRemove, onView }: { file: File; onRemove: () => void; onView: () => void }) => {
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
            onClick={onView}
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
  } // <-- This closes FileCard

  if (!briefDetails) {
    return (
      <>
        <MasterFormHeader onBack={() => navigate(-1)} title="Edit Submitted Plan" />
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Brief details not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <MasterFormHeader onBack={() => navigate(-1)} title="Edit Submitted Plan" />

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">
            Edit Submitted Plan
          </h2>
        </div>

        <div className="p-6 text-sm">
          {/* Brief Details Section */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Brief ID:</span>
                  <span className="text-gray-600">{`#${briefDetails.id}`}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Brief Name:</span>
                  <span className="text-gray-600">{briefDetails.name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Planner:</span>
                  <span className="text-gray-600">{briefDetails.assigned_user?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Brief Lead:</span>
                  <span className="text-gray-600">{briefDetails.brief_status?.name || briefDetails.status || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Budget:</span>
                  <span className="text-gray-600">{briefDetails.budget || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Brief Submission Date & Time: </span>
                  <span className="text-gray-600"> {briefDetails.submission_date || '-'}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Brand Name:</span>
                  <span className="text-gray-600">{briefDetails?.brand?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Product Name: </span>
                  <span className="text-gray-600">{briefDetails?.product_name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Media:</span>
                  <span className="text-gray-600">{briefDetails?.mode_of_campaign || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Media Type:</span>
                  <span className="text-gray-600">{briefDetails?.media_type || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Priority:</span>
                  <span className="text-gray-600">{briefDetails?.priority?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Brief Detail: </span>
                  <span className="text-gray-600">{briefDetails?.comment || '-'}</span>
                </div>
              </div>
            </div>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upload Plan Section */}
            <div className="mb-8">
              <h3 className="text-base font-medium text-gray-900 mb-2">Upload Plan</h3>
              {/* Show existing submitted_plan files from plannerData using FileCard style, with delete */}
              <div className="mb-4 grid grid-cols-2 xl:grid-cols-3 gap-4">
                {plannerData?.submitted_plan?.map((file: any, idx: number) => {
                  const ext = getFileExtension(file.name);
                  const colorClass = getFileTypeColor(ext);
                  return (
                    <div key={idx} className="relative inline-flex flex-col items-center p-4 border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow">
                      <div className="relative mb-3">
                        <div className="w-24 h-24 border-2 border-gray-200 rounded bg-gray-50 flex items-center justify-center">
                          <div className="text-center">
                            <div className={`inline-block px-2 py-1 rounded text-xs font-bold mb-2 ${colorClass}`}>
                              {ext}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 text-center truncate w-28 mb-3" title={file.name}>{file.name}</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="!p-1.5 !bg-orange-600 hover:!bg-orange-700 !rounded transition-colors"
                          title="View"
                          onClick={() => {
                            setPreviewSource({ kind: 'remote', url: file.url, name: file.name });
                            setPreviewOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4 text-white" />
                        </button>
                        <a
                          href={file.url}
                          download
                          className="!p-1.5 !bg-gray-700 hover:!bg-gray-800 !rounded transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4 text-white" />
                        </a>
                        <button
                          type="button"
                          className="!p-1.5 !bg-red-600 hover:!bg-red-800 !rounded transition-colors"
                          title="Delete"
                          onClick={() => {
                            const updated = [...(plannerData.submitted_plan || [])];
                            updated.splice(idx, 1);
                            setPlannerData((prev: any) => ({ ...prev, submitted_plan: updated }));
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {planFiles.map((file, idx) => (
                  <FileCard
                    key={`plan-upload-${idx}`}
                    file={file}
                    onRemove={() => setPlanFiles(planFiles.filter((_, i) => i !== idx))}
                    onView={() => {
                      setPreviewSource({ kind: 'file', file });
                      setPreviewOpen(true);
                    }}
                  />
                ))}
              </div>
              {/* Upload area only if total files < 2 */}
              {(plannerData?.submitted_plan?.length || 0) + planFiles.length < 2 && (
                <UploadCard
                  files={planFiles}
                  onChange={(files: File[]) => setPlanFiles(files.slice(0, 2 - (plannerData?.submitted_plan?.length || 0)))}
                  accept=".xls,.xlsx,.xlsm,.csv,.doc,.docx,.ppt,.pptx"
                  supported="Excel, PPT"
                />
              )}
            </div>

            {/* Upload Back-Up Plan Section */}
            <div className="mb-8">
              <h3 className="text-base font-medium text-gray-900 mb-2">Upload Back-Up Plan</h3>
              <div className="mb-4 grid grid-cols-2 xl:grid-cols-3 gap-4">
                {plannerData?.backup_plan_url && (
                  <div className="relative inline-flex flex-col items-center p-4 border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow">
                    <div className="relative mb-3">
                      <div className="w-24 h-24 border-2 border-gray-200 rounded bg-gray-50 flex items-center justify-center">
                        <div className="text-center">
                          <div className={`inline-block px-2 py-1 rounded text-xs font-bold mb-2 ${getFileTypeColor(getFileExtension(plannerData.backup_plan?.split('/').pop() || 'FILE'))}`}>
                            {getFileExtension(plannerData.backup_plan?.split('/').pop() || 'FILE')}
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 text-center truncate w-28 mb-3" title={plannerData.backup_plan?.split('/').pop()}>{plannerData.backup_plan?.split('/').pop()}</p>
                    <div className="flex items-center gap-2">
                      <a
                        href={plannerData.backup_plan_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-orange-600 hover:bg-orange-700 !rounded transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4 text-white" />
                      </a>
                      <a
                        href={plannerData.backup_plan_url}
                        download
                        className="p-1.5 bg-gray-700 hover:bg-gray-800 !rounded transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-white" />
                      </a>
                      <button
                        type="button"
                        className="!p-1.5 !bg-red-700 hover:!bg-red-800 !rounded transition-colors"
                        title="Delete"
                        onClick={() => {
                          setPlannerData((prev: any) => ({ ...prev, backup_plan: null, backup_plan_url: null }));
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                )}
                {backupFiles.map((file, idx) => (
                  <FileCard
                    key={`backup-upload-${idx}`}
                    file={file}
                    onRemove={() => setBackupFiles(backupFiles.filter((_, i) => i !== idx))}
                    onView={() => {
                      setPreviewSource({ kind: 'file', file });
                      setPreviewOpen(true);
                    }}
                  />
                ))}
              </div>
              {/* Upload area only if total files < 1 */}
              {(!plannerData?.backup_plan_url && backupFiles.length < 1) && (
                <UploadCard
                  files={backupFiles}
                  onChange={(files: File[]) => setBackupFiles(files.slice(0, 1))}
                  accept=".xls,.xlsx,.xlsm,.csv,.doc,.docx,.ppt,.pptx"
                  supported="Excel"
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
              onClick={handleReset}
            >
              RESET
            </Button>

            <Button
              variant="primary"
              size="md"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleSubmit}
            >
              UPDATE PLAN
            </Button>
          </div>
        </div>
      </div>
      <FilePreviewModal
        isOpen={previewOpen}
        source={previewSource}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewSource(null);
        }}
      />
    </>
  );
};

export default EditSubmittedPlan;
