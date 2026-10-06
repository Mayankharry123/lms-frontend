/**
 * @file BriefLog.tsx
 * @description Brief activity log and plan history navigation.
 * @author Sanjay Jangid <sanjay.jangid@dgtoohl.com>
 * @date 2026-05-25
 */

import { updatePlannerStatus } from '../../services/UpdatePlannerStatus';

import React, { useState, useMemo, useEffect } from 'react';
import Pagination from '../../components/ui/Pagination';
import Table, { type Column } from '../../components/ui/Table';
import { useParams, useNavigate } from 'react-router-dom';
import MasterHeader from '../../components/ui/MasterHeader';
import SearchBar from '../../components/ui/SearchBar';
import StatusDropdown from '../../components/ui/StatusDropdown';
import AssignDropdown from '../../components/ui/AssignDropdown';
import { listChildPlaningUsers } from '../../api/lookups';
import updateAssignUser from '../../services/BriefAssignTo';
import { usePermissions } from '../../hooks/SidebarMenuHooks';
import { ROUTES } from '../../constants';
import { listBriefLogs } from '../../services/BriefLog';
import type { BriefLogItem } from '../../services/BriefLog';
import { getPlannerStatuses } from '../../services/BriefLog';
import SweetAlert from '../../utils/SweetAlert';
import FilePreviewModal from '../../components/ui/FilePreviewModal';
import { Eye, MessageCircle } from 'lucide-react';

// Data is fetched from API via `listBriefLogs` service

const BriefLog: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  type PlannerOption = { id: string | number; name: string };

  // Validate URL to only allow safe protocols (http, https, blob)
  const isValidAttachmentUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    try {
      const urlObj = new URL(url, window.location.origin);
      const protocol = urlObj.protocol.toLowerCase();
      return ['http:', 'https:', 'blob:'].includes(protocol);
    } catch {
      // If URL is relative, allow it (will be treated as http/https relative URL)
      return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 10;
  const [briefLogs, setBriefLogs] = useState<BriefLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [plannerStatusOptions, setPlannerStatusOptions] = useState<{ id: number; name: string }[]>([]);
  const [assignOptionsByBriefId, setAssignOptionsByBriefId] = useState<Record<string, PlannerOption[]>>({});
  const [reloadKey, setReloadKey] = useState(0);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  // removed unused pendingStatusChange state
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [attachmentModalSource, setAttachmentModalSource] = useState<{ kind: 'remote'; url: string; name?: string } | null>(null);

  // Status options for the dropdown (from API)
  const statusOptions = useMemo(() => plannerStatusOptions, [plannerStatusOptions]);

  // Fetch planner statuses for dropdown
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await getPlannerStatuses();
        if (mounted && res && Array.isArray(res.data)) {
          setPlannerStatusOptions(res.data.map((item: any) => ({ id: item.id, name: item.name })));
        }
      } catch {
        // ignore
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Fetch brief logs (server-side paginated)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const filters: Record<string, any> = {};
        if (id) filters.brief_id = id;
        const res = await listBriefLogs(currentPage, itemsPerPage, filters);
        if (!mounted) return;
        setBriefLogs(res.data || []);
        const total = res.meta?.pagination?.total ?? res.meta?.total ?? 0;
        setTotalItems(Number(total || 0));
      } catch (err) {
        if (!mounted) return;
        console.error(err);
        setBriefLogs([]);
        setTotalItems(0);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [currentPage, id, reloadKey]);

  useEffect(() => {
    let cancelled = false;

    const loadPlannerOptions = async () => {
      if (briefLogs.length === 0) {
        setAssignOptionsByBriefId({});
        return;
      }

      const entries = await Promise.all(
        briefLogs.map(async (log) => {
          const briefId = String(log.brief_id ?? log.id);
          const contact = log.contact_person;
          const contactPersonId = contact && typeof contact === 'object' ? contact.id : undefined;
          try {
            const users = await listChildPlaningUsers(briefId, contactPersonId);
            return [briefId, users.map((user) => ({ id: user.id, name: user.name }))] as const;
          } catch (err) {
            console.error(`Failed to fetch planning users for brief ${briefId}:`, err);
            return [briefId, []] as const;
          }
        })
      );

      if (!cancelled) setAssignOptionsByBriefId(Object.fromEntries(entries));
    };

    loadPlannerOptions();
    return () => {
      cancelled = true;
    };
  }, [briefLogs]);

  const handleAssignPlanner = async (briefId: string, plannerName: string) => {
    try {
      setLoading(true);
      const found = (assignOptionsByBriefId[briefId] || []).find((option) => option.name === plannerName);
      const assignId = found ? found.id : plannerName;
      await updateAssignUser(briefId, assignId);
      setBriefLogs((current) =>
        current.map((log) => {
          if (String(log.brief_id ?? log.id) !== briefId) return log;
          return {
            ...log,
            assigned_user: {
              id: Number(assignId) || log.assigned_user?.id || 0,
              name: plannerName,
            },
          };
        })
      );
      SweetAlert.showUpdateSuccess();
      setReloadKey((value) => value + 1);
    } catch (err) {
      console.error('Failed to update planner', err);
      SweetAlert.showError('Failed to update assignment');
    } finally {
      setLoading(false);
    }
  };

  // Filter logs locally (search only applies to current page of results)
  const filteredLogs = useMemo(() => {
    let filtered = briefLogs;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((log) =>
        (log.brief_name || log.name || `Brief #${log.brief_id ?? log.id}` || '').toString().toLowerCase().includes(query) ||
        (log.action || '').toString().toLowerCase().includes(query) ||
        (log.comment || log.description || '').toString().toLowerCase().includes(query) ||
        (log.budget || '').toString().toLowerCase().includes(query) ||
        (log.brand_name || log.brand?.name || '').toString().toLowerCase().includes(query) ||
        (log.product_name || '').toString().toLowerCase().includes(query) ||
        (typeof log.contact_person === 'string' ? log.contact_person || '' : (log.contact_person as any)?.name || '').toString().toLowerCase().includes(query) ||
        (log.mode_of_campaign || '').toString().toLowerCase().includes(query) ||
        (log.media_type || '').toString().toLowerCase().includes(query) ||
        (log.priority || '').toString().toLowerCase().includes(query) ||
        (log.status || (log.planner_status as any)?.name || log.planner_status || '').toString().toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [searchQuery, briefLogs]);

  // current page logs come from server; apply local search above
  const currentLogs = filteredLogs;

  const columns: Column<BriefLogItem>[] = [
    {
      key: 'chat',
      header: 'CHAT',
      minWidth: 72,
      allowOverflow: true,
      className: 'text-center whitespace-nowrap',
      headerClassName: 'text-center',
      render: (item) => (
        <div className="flex items-center justify-center">
          <button
            type="button"
            title="Chat"
            aria-label={`Chat for brief ${item.brief_id ?? item.id}`}
            onClick={(event) => {
              event.stopPropagation();
              navigate(ROUTES.BRIEF.CHAT(String(item.brief_id ?? item.id)));
            }}
            className="app-icon-btn inline-flex items-center justify-center rounded-full border-0 text-white shadow-sm"
            style={{
              width: '2rem',
              height: '2rem',
              minWidth: '2rem',
              padding: 0,
              backgroundColor: '#f26222',
              color: '#ffffff',
            }}
          >
            <MessageCircle
              className="h-4 w-4"
              strokeWidth={2.25}
              color="#ffffff"
              style={{ width: 16, height: 16, stroke: '#ffffff', fill: 'none' }}
            />
          </button>
        </div>
      ),
    },
    {
      key: 'brief_id',
      header: 'Brief Id',
      render: (item) => `#${item.brief_id ?? item.id}`,
    },
    {
      key: 'brief_name',
      header: 'Brief Name',
      render: (item) => item.brief_name || item.name || `Brief #${item.brief_id ?? item.id}`,
    },
    {
      key: 'brand_name',
      header: 'Brand Name',
      render: (item) => item.brand_name || item.brand?.name || 'N/A',
    },
    {
      key: 'product_name',
      header: 'Product Name',
      render: (item) => item.product_name || 'N/A',
    },
    {
      key: 'contact_person',
      header: 'Contact Person',
      render: (item) => item.contact_person || 'N/A',
    },
    {
      key: 'mode_of_campaign',
      header: 'Mode Of Campaign',
      render: (item) => item.mode_of_campaign || 'N/A',
    },
    {
      key: 'media_type',
      header: 'Media Type',
      render: (item) => item.media_type || 'N/A',
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (item) => item.priority || 'N/A',
    },
    {
      key: 'planner',
      header: 'Planner',
      className: 'min-w-[140px]',
      allowOverflow: true,
      render: (item) => {
        const briefId = String(item.brief_id ?? item.id);
        const assigned = item.assigned_user;
        const displayName = assigned && typeof assigned === 'object' && assigned.name
          ? String(assigned.name)
          : '';
        const optionNames = (assignOptionsByBriefId[briefId] || []).map((option) => option.name);
        const options = displayName && !optionNames.includes(displayName)
          ? [displayName, ...optionNames]
          : optionNames;

        if (!hasPermission('brief.assign')) {
          return <div className="min-w-[140px] text-sm text-gray-700">{displayName || 'Not Assigned'}</div>;
        }

        return (
          <div className="relative min-w-[140px]">
            <AssignDropdown
              value={displayName}
              options={options}
              onChange={(plannerName: string) => handleAssignPlanner(briefId, plannerName)}
              onConfirm={async () => undefined}
            />
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => {
        // Show dropdown with planner statuses, default to '-' if null
        const status = item.planner_status;
        let statusValue: string = '-';
        if (status && typeof status === 'object' && 'name' in status) {
          statusValue = String(status.name);
        } else if (typeof status === 'string' || typeof status === 'number') {
          statusValue = String(status);
        }
        const isLoading = statusUpdatingId === item.id;
        return (
          <div className="min-w-[140px]">
            <StatusDropdown
              value={statusValue}
              options={statusOptions.map(opt => opt.name)}
              onChange={(newStatus: string) => handleSelectStatus(item.planner_id?.toString(), newStatus)}
              onConfirm={(newStatus: string) => handleStatusConfirm(item.planner_id?.toString(), newStatus)}
            />
            {isLoading && <span className="ml-2 text-xs text-blue-500">Updating...</span>}
          </div>
        );
      },
      className: 'min-w-[140px]',
      allowOverflow: true,
    },
    {
      key: 'budget',
      header: 'Budget',
      render: (item) => {
        const val = typeof item.budget === 'string' ? parseFloat(item.budget) : (item.budget as any) || 0;
        return val ? `₹${Number(val).toLocaleString()}` : 'N/A';
      },
    },
    {
      key: 'attachment',
      header: 'Attachment',
      render: (item) => {
        // Extract URL from various possible formats (string or object)
        // Check all possible attachment keys in order of preference
        let url = '';
        const attachmentVal = (item as any).attachmentUrl ||
          (item as any).attachment_url ||
          (item as any).attachment ||
          (item as any).attachment_path ||
          (item as any).attachment_file_url ||
          (item as any).file_url ||
          (item as any).file_path ||
          (item as any).document_url ||
          (item as any).brief_attachment ||
          (item as any).brief_file ||
          (item as any).attachment_file ||
          '';
        if (typeof attachmentVal === 'object' && attachmentVal !== null && 'url' in attachmentVal) {
          url = String((attachmentVal as any).url || '').trim();
        } else if (typeof attachmentVal === 'string') {
          url = String(attachmentVal).trim();
        }
        if (!url) return <span className="text-xs text-gray-400">—</span>;
        
        // Extract name from various possible formats
        let name = '';
        const attachmentNameVal = (item as any).attachmentName || (item as any).attachment_name || '';
        if (typeof attachmentNameVal === 'object' && attachmentNameVal !== null && 'name' in attachmentNameVal) {
          name = String((attachmentNameVal as any).name || '').trim();
        } else if (typeof attachmentNameVal === 'string') {
          name = String(attachmentNameVal).trim();
        }
        
        // Fallback to filename from URL if no name provided
        if (!name) {
          name = url.split('/').pop() || 'attachment';
        }
        
        // Validate URL protocol to prevent XSS attacks
        const isUrlValid = isValidAttachmentUrl(url);
        if (!isUrlValid) {
          console.warn('Invalid attachment URL protocol:', url);
          return <span className="text-xs text-gray-400">—</span>;
        }
        
        return (
          <button
            type="button"
            className="inline-flex items-center justify-center w-10 h-10 !p-0 rounded-md border border-gray-200 !bg-gray-100 hover:!bg-gray-200"
            onClick={() => {
              setAttachmentModalSource({ kind: 'remote', url, name: name || undefined });
              setIsAttachmentModalOpen(true);
            }}
            aria-label="View attachment"
            title="View attachment"
          >
            <Eye className="w-4 h-4 !text-black" />
          </button>
        );
      },
      className: 'whitespace-nowrap',
    },
    {
      key: 'description',
      header: 'Brief Detail',
      render: (item) => item.comment || item.description,
      className: 'truncate',
    },
    {
      key: 'created_at',
      header: 'Submission Date & Time',
      render: (item) => {
        const dateStr = item.submission_date || item.created_at;
        if (!dateStr) return 'N/A';
        // Parse date by taking YYYY-MM-DD HH:mm:ss part, ignoring AM/PM
        const parts = dateStr.split(' ');
        const dateTime = parts.slice(0, 2).join(' ');
        return new Date(dateTime).toLocaleString();
      },
    },
    {
      key: 'campaign_duration',
      header: 'Campaign Duration',
      render: (item) => item.campaign_duration !== undefined && item.campaign_duration !== null ? `${item.campaign_duration}` : 'N/A',
    },
    {
      key: 'action',
      header: 'Left Time',
      render: (item) => {
        if (item.left_time) {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {item.left_time}
            </span>
          );
        }
        const now = new Date();
        const created = new Date(item.created_at || Date.now());
        const diffTime = now.getTime() - created.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {diffDays} days
          </span>
        );
      },
    },
  ];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Called when dropdown value changes (before confirmation)
  const handleSelectStatus = (id: string | null, newStatus: string) => {
    console.log('handleSelectStatus called with:', { id, newStatus });
    if (!id) {
      SweetAlert.showWarning('Planner ID not found for this row. Cannot update status.');
      return;
    }
    // removed setPendingStatusChange (no longer needed)
  };

  // Called when user confirms status change
  const handleStatusConfirm = async (id: string | null, newStatus: string) => {
    console.log('handleStatusConfirm called with:', { id, newStatus });
    if (!id) {
      SweetAlert.showWarning('Planner ID not found. Cannot update status.');
      return;
    }
    if (!newStatus) return;
    // Find status id from name
    const statusObj = plannerStatusOptions.find(opt => opt.name === newStatus);
    if (!statusObj) return;
    setStatusUpdatingId(Number(id));
    try {
      // Debug log
      console.log('Updating planner status', { plannerId: id, planner_status_id: statusObj.id });
      const response = await updatePlannerStatus(id, statusObj.id);
      console.log('Update response:', response);
      // Refetch logs after update
      // Do NOT filter by id here, fetch all logs for the page
      const res = await listBriefLogs(currentPage, itemsPerPage);
      setBriefLogs(res.data || []);
      SweetAlert.showUpdateSuccess();
    } catch (err) {
      // Show error feedback
      SweetAlert.showError('Failed to update status. Please try again.');
      console.error('Failed to update status', err);
    } finally {
      setStatusUpdatingId(null);
      // removed setPendingStatusChange (no longer needed)
    }
  };

  const handleEdit = (item: BriefLogItem) => {
    navigate(`/brief/edit-submitted-plan/${item.brief_id || item.id}`);
  };

  const startIndex = (currentPage - 1) * itemsPerPage;

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
      <MasterHeader
        showBreadcrumb={true}
        showCreateButton={false}
        onCreateClick={() => { }}
      />

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="bg-gray-50 px-3 md:px-5 py-3 md:py-4 flex flex-row items-center justify-between gap-3 flex-wrap md:flex-nowrap border-b border-gray-200">
          <h2 className="text-sm md:text-base font-semibold text-gray-900 flex-shrink-0">
            {id ? `Brief Log - Brief #${id}` : 'Brief Log'}
          </h2>

          <div className="w-full sm:w-auto sm:ml-auto">
            <SearchBar
              delay={0}
              placeholder="Search logs..."
              onSearch={handleSearch}
            />
          </div>
        </div>

        <div className="pt-0 overflow-visible">
          <Table
            data={currentLogs}
            startIndex={startIndex}
            loading={loading}
            desktopOnMobile={true}
            keyExtractor={(it: BriefLogItem, idx: number) => `${it.id}-${idx}`}
            columns={columns}
            onEdit={(item: BriefLogItem) => handleEdit(item)}
            onView={(item: BriefLogItem) => navigate(ROUTES.BRIEF.PLAN_HISTORY((item.brief_id || item.id).toString()))}
            onUpload={(item: BriefLogItem) => navigate(`/brief/plan-submission/${item.brief_id || item.id}`)}
            editPermissionSlug="brief.edit"
            viewPermissionSlug="brief.view"
            deletePermissionSlug="brief.delete"
            uploadPermissionSlug="brief.upload"
            planSubmissionPermissionSlug="brief.plan-submission"
            costSheetPermissionSlug="brief.cost-sheet"
            onBriefCreation={(item: BriefLogItem) => navigate(`/brief/plan-submission/${item.brief_id || item.id}`)}
            onCostSheet={(item: BriefLogItem) => navigate(ROUTES.BRIEF.COST_SHEET(String(item.brief_id || item.id)))}
          />
        </div>
      </div>

      <div className="mt-6">
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      <FilePreviewModal
        isOpen={isAttachmentModalOpen}
        source={attachmentModalSource}
        onClose={() => {
          setIsAttachmentModalOpen(false);
          setAttachmentModalSource(null);
        }}
        panelClassName="!w-[95%] md:!w-[600px]"
        bodyClassName="attachment-file-img"
        closeButtonClassName="btn-secondary"
      />
    </div>
  );
};

export default BriefLog;