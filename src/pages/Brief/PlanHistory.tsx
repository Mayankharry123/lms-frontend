/**
 * @file PlanHistory.tsx
 * @description Plan revision history for a brief.
 * @author Sanjay Jangid <sanjay.jangid@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import { useParams, useNavigate } from 'react-router-dom';
import MasterHeader from '../../components/ui/MasterHeader';
import MasterFormHeader from '../../components/ui/MasterFormHeader';
import { getBriefById } from '../../services/PlanSubmission';
import type { BriefDetail } from '../../services/PlanSubmission';
import { fetchPlannerHistories } from '../../services/PlanHistory';
import type { PlannerHistoryItem } from '../../services/PlanHistory';
import { ChevronRight } from 'lucide-react';
import Swal from 'sweetalert2';
import FilePreviewModal from '../../components/ui/FilePreviewModal';
import { IoIosArrowBack } from 'react-icons/io';
import type { SubmittedPlansListProps } from '../../types/pages/brief-pages.types';
import type { RootState } from '../../redux/store';

// No mock data, will fetch from API

const PlanHistory: React.FC = () => {

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [brief, setBrief] = useState<BriefDetail | null>(null);
  const [submittedPlans, setSubmittedPlans] = useState<PlannerHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getBriefById(Number(id))
      .then((data) => setBrief(data))
      .catch(() => {/* ignore error for now */ });
    fetchPlannerHistories(Number(id))
      .then((data) => {
        console.log('Fetched planner histories:', data);
        setSubmittedPlans(data);
      })
      .catch(() => setSubmittedPlans([]))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <>
      <MasterFormHeader onBack={() => navigate(-1)} title="Plan History" />

      <MasterHeader
        showBreadcrumb={false}
        breadcrumbItems={[
          { label: 'Brief', path: '/brief' },
          { label: 'Plan History', isActive: true }
        ]}
        showCreateButton={false}
        onCreateClick={() => { }}
      />

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="bg-gray-50 px-6 py-4 flex items-center border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {id ? `Plan History - Brief #${id}` : 'Plan History'}
          </h2>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Brief Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Brief ID: </span>
                  <span className="text-gray-600 ">{brief ? `#${brief.id}` : '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Brief Name:</span>
                  <span className="text-gray-600">{brief?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-800 font-semibold inline-block min-w-[120px]">Planner:</span>
                  <span className="text-gray-600">{brief?.assigned_user?.name || '-'}</span>
                </div>
                {/* Source field removed: not present in BriefDetail */}
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

          <h3 className="text-sm font-medium text-gray-700 mb-4">Submitted Plans</h3>
          <SubmittedPlansList plans={submittedPlans} loading={loading} />
        </div>
      </div>
    </>
  );
};


const SubmittedPlansList: React.FC<SubmittedPlansListProps> = ({ plans = [], loading }) => {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const canViewBackupPlan = (currentUser?.roles ?? []).some((role) => {
    const roleName = String(role?.name ?? '').trim().toLowerCase();
    return ['super admin', 'planner', 'planing admin', 'planning admin'].includes(roleName);
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSource, setPreviewSource] = useState<any>(null);
  const pageSize = 3;
  const totalPages = Math.max(1, Math.ceil(plans.length / pageSize));

  const startIndex = (currentPage - 1) * pageSize;
  const paginated = plans.slice(startIndex, startIndex + pageSize);

  const gotoPage = (p: number) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  const handleAttachmentAction = async (att: { name: string; url: string; label: string }) => {
    const result = await Swal.fire({
      title: 'Download / View',
      text: att.name,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'View',
      denyButtonText: 'Download',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      setPreviewSource({ kind: 'remote', url: att.url, name: att.name });
      setPreviewOpen(true);
    } else if (result.isDenied) {
      const a = document.createElement('a');
      a.href = att.url;
      a.download = att.name || '';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  if (loading) {
    return <div className="no-transitions text-center py-8 text-gray-500">Loading submitted plans...</div>;
  }

  if (!plans.length) {
    return <div className="no-transitions text-center py-8 text-gray-500 flex flex-col items-center justify-center">

      <div className="w-full max-w-lg mx-auto border border-gray-200 rounded-xl px-5 py-10 flex flex-col items-center justify-center text-center">
        <img src="/not-found.webp" alt="My Image" width="100" height="100" />
        No submitted plans found.
      </div>
    </div>;
  }

  return (
    <div className="no-transitions">
      <div className="space-y-4">
        {paginated.map((plan, idx) => {
          // Use created_at as submission date, and show planner/creator
          const dateObj = dayjs(plan.created_at, 'YYYY-MM-DD hh:mm:ss A');
          const formattedDateTime = dateObj.isValid() ? dateObj.format('DD MMM YYYY, hh:mm A') : '-';

          const backupPlan = plan.planner?.backup_plan ?? plan.backup_plan;
          const attachments = [
            ...(Array.isArray(plan.planner?.submitted_plan)
            ? plan.planner.submitted_plan.map((file: { name: string; url: string }, i: number) => ({
              type: file.name.toLowerCase().endsWith('.xlsx') ? 'xls' : file.name.toLowerCase().endsWith('.pptx') ? 'ppt' : 'file',
              label: (i + 1).toString(),
              url: file.url,
              name: file.name
            }))
            : []),
            ...(canViewBackupPlan && backupPlan ? [{
              type: backupPlan.name.toLowerCase().endsWith('.xlsx') ? 'xls' : backupPlan.name.toLowerCase().endsWith('.pptx') ? 'ppt' : 'file',
              label: 'Back-Up',
              url: backupPlan.url,
              name: backupPlan.name
            }] : [])
          ];

          return (
            <div key={plan.id} className="bg-gray-50 rounded-md shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Submitted Plan: <span className="font-semibold text-gray-800">{startIndex + idx + 1}</span></p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div>
                      <div className="text-xs text-gray-500">Plan ID</div>
                      <div className="mt-1">
                        <span className="text-sm text-blue-600">#{plan.id}</span>
                      </div>

                      <div className="text-xs text-gray-500 mt-3">Detail</div>
                      <div className="mt-1 text-sm text-gray-700">{plan.brief?.name || '-'}</div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">Plan Submitted Date & Time</div>
                      <div className="mt-1 text-sm text-gray-700">{formattedDateTime}</div>

                      <div className="text-xs text-gray-500 mt-3">Submitted By</div>
                      <div className="mt-1 text-sm">
                        <span className="text-blue-600">{plan.creator?.name || '-'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-6">
                      <div className="flex items-center space-x-6">
                        {attachments.map((att, aidx) => (
                          <div key={aidx} className="flex flex-col items-center">
                            <div
                              role="button"
                              tabIndex={0}
                              title={att.name}
                              aria-label={`Open attachment ${att.name}`}
                              onClick={() => handleAttachmentAction({ name: att.name, url: att.url, label: att.label })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleAttachmentAction({ name: att.name, url: att.url, label: att.label });
                                }
                              }}
                              className={`w-12 h-14 rounded border flex items-center justify-center cursor-pointer transition transform hover:shadow-md hover:scale-105 focus:outline-none focus:ring-2 ${att.type === 'xls' ? 'bg-green-50 border-green-200 focus:ring-green-300' : att.type === 'ppt' ? 'bg-red-50 border-red-200 focus:ring-red-300' : 'bg-gray-100 border-gray-200 focus:ring-gray-300'}`}>
                              <div className="text-xs font-semibold" style={{ color: att.type === 'xls' ? '#15803d' : att.type === 'ppt' ? '#b91c1c' : '#333' }}>{att.type.toUpperCase()}</div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{att.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end items-center space-x-3">
        <button onClick={() => gotoPage(currentPage - 1)} disabled={currentPage === 1} className="p-2 text-gray-400 hover:text-gray-600">
          <IoIosArrowBack className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1;
            const isActive = p === currentPage;
            return (
              <button key={p} onClick={() => gotoPage(p)} className={`px-3 py-1 rounded ${isActive ? 'text-purple-600 font-semibold' : 'text-gray-600 hover:text-gray-800'}`}>
                {p}
              </button>
            );
          })}
        </div>

        <button onClick={() => gotoPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 text-gray-400 hover:text-gray-600">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <FilePreviewModal
        isOpen={previewOpen}
        source={previewSource}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewSource(null);
        }}
      />

    </div>
  );
};

export default PlanHistory;

// Modal markup appended to file-level for small local component behavior handled in this file