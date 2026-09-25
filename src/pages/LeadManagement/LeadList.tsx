/**
 * @file LeadList.tsx
 * @description Shared lead list table, filters, and row actions.
 * @author Sanjay Jangid <sanjay.jangid@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Table, { type Column } from '../../components/ui/Table';
import AssignDropdown from '../../components/ui/AssignDropdown';
import CallStatusDropdown from '../../components/ui/CallStatusDropdown';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { MasterHeader, StatusPill } from '../../components/ui';
import { FaRegCalendarAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { listLeads, listLeadsByStatus, updateLead, deleteLead } from '../../services/AllLeads';
import { assignUserToLead } from '../../services/leadAssignTo';
import { usePermissions } from '../../hooks/SidebarMenuHooks';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux/store';
import { setUnreadCount, setNotifications, incrementUnreadCount } from '../../redux/slices/notificationSlice';
import { getUnreadNotificationCount, listNotifications } from '../../services/notifications';
import type { Lead, UserOption } from '../../types/AllLeadtype';
import type { LeadListPageProps } from '../../types/pages/lead-list.types';

import { getCallStatuses } from '../../services/CallStatus';
import { listBrandsFlat, listChildUsers, listChildUsersByLead } from '../../api/lookups';
import { fetchLeadSubSources } from '../../services/ContactPersonsCard';
import http from '../../services/http';
import SweetAlert from '../../utils/SweetAlert';
import TableHeader from '../../components/ui/TableHeader';
import { MessageCircle } from 'lucide-react';
import LeadChatModal from '../../components/lead/LeadChatModal';
import { buildBriefInitialDataFromLead } from '../../utils/briefLeadPrefill';

const statusColors: Record<string, string> = {
  'Interested': '#22c55e',
  'Pending': '#f59e0b',
  'Brief Pending': '#f97316',
  'Meeting Schedule': '#3b82f6',
  'Meeting Scheduled': '#3b82f6',
  'Meeting Done': '#8b5cf6',
  'Brief Received': '#06b6d4',
  'Brief Recieved': '#06b6d4'
};

const assignPermissionMap: Record<string, string> = {
  'All': 'all-lead.assign',
  'Pending': 'pending.assign',
  'Interested': 'interested.assign',
  'Meeting Scheduled': 'meeting-scheduled.assign',
  'Meeting Done': 'meeting-done.assign',
  'Brief': 'brief-status.assign',
};

const callStatusPermissionMap: Record<string, string> = {
  'All': 'all-lead-call-status.update',
  'Pending': 'pending-call-status.update',
  'Interested': 'interested-call-status.update',
  'Meeting Scheduled': 'meeting-scheduled-call-status.update',
  'Meeting Done': 'meeting-done-call-status.update',
  'Brief': 'brief-status-call-status.update',
};

const createPermissionMap: Record<string, string> = {
  'All': 'leads.create',
  'Pending': 'leads-p.create',
  'Interested': 'leads-I.create',
  'Meeting Scheduled': 'leads-ms.create',
  'Meeting Done': 'leads-md.create',
  'Brief': 'leads-b.create',
};

const editPermissionMap: Record<string, string> = {
  'All': 'leads.edit',
  'Pending': 'leads-p.edit',
  'Interested': 'leads-I.edit',
  'Meeting Scheduled': 'leads-ms.edit',
  'Meeting Done': 'leads-md.edit',
  'Brief': 'leads-b.edit',
};

const viewPermissionMap: Record<string, string> = {
  'All': 'leads.view',
  'Pending': 'leads-p.view',
  'Interested': 'leads-I.view',
  'Meeting Scheduled': 'leads-ms.view',
  'Meeting Done': 'leads-md.view',
  'Brief': 'leads-b.view',
};

const deletePermissionMap: Record<string, string> = {
  'All': 'leads.delete',
  'Pending': 'leads-p.delete',
  'Interested': 'leads-I.delete',
  'Meeting Scheduled': 'leads-ms.delete',
  'Meeting Done': 'leads-md.delete',
  'Brief': 'leads-b.delete',
};

const EMPTY_EXTRA_STATUSES: string[] = [];

const LeadList: React.FC<LeadListPageProps> = ({
  title,
  filterStatus = 'All',
  extraStatuses = EMPTY_EXTRA_STATUSES,
  permissionStatus,
  headerActions,
  filterExtras,
  extraFilterActive = false,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const permissionKey = permissionStatus || filterStatus || 'All';
  const normalizedExtraStatuses = useMemo(
    () => extraStatuses.filter((status): status is string => Boolean(status)),
    [extraStatuses]
  );
  const extraStatusesKey = useMemo(() => normalizedExtraStatuses.join('|'), [normalizedExtraStatuses]);
  // Assign To options for table dropdown (per lead); filter users loaded separately
  const [assignOptionsByLeadId, setAssignOptionsByLeadId] = useState<
    Record<string, UserOption[]>
  >({});
  const { hasPermission } = usePermissions();
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await listChildUsers();
        setUserFilterOptions(
          users.map((u) => ({ value: String(u.id), label: u.name }))
        );
      } catch {
        setUserFilterOptions([]);
      }
    };
    loadUsers();
  }, []);

  useEffect(() => {
    const loadBrands = async () => {
      try {
        const brands = await listBrandsFlat();
        setBrandOptions(
          brands.map((b) => ({ value: String(b.id), label: b.name }))
        );
      } catch {
        setBrandOptions([]);
      }
    };
    loadBrands();
  }, []);

  useEffect(() => {
    const loadSubSources = async () => {
      try {
        const { data, error } = await fetchLeadSubSources();
        if (error || !Array.isArray(data)) {
          setSubSourceOptions([]);
          return;
        }
        setSubSourceOptions(
          data.map((item: { id: number | string; name: string }) => ({
            value: String(item.id),
            label: item.name,
          }))
        );
      } catch {
        setSubSourceOptions([]);
      }
    };
    loadSubSources();
  }, []);
  // Call status options will be fetched from API
  const [callStatusOptions, setCallStatusOptions] = useState<Array<{ id: number | string; name: string }>>([]);

  // Fetch call status options from API
  useEffect(() => {
    const loadCallStatuses = async () => {
      try {
        const resp = await getCallStatuses();
        const options = Array.isArray(resp)
          ? resp
            .map((item: { id?: number | string; name?: string }) => ({
              id: item.id ?? '',
              name: item.name ?? '',
            }))
            .filter((item) => item.id && item.name)
          : [];
        setCallStatusOptions(options);
      } catch {
        setCallStatusOptions([]);
      }
    };
    loadCallStatuses();
  }, []);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [brandOptions, setBrandOptions] = useState<{ value: string; label: string }[]>([]);
  const [subSourceOptions, setSubSourceOptions] = useState<{ value: string; label: string }[]>([]);
  const [userFilterOptions, setUserFilterOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteLabel, setConfirmDeleteLabel] = useState<string>('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [chatLead, setChatLead] = useState<Lead | null>(null);

  // Fetch leads from API
  // Wrap fetchLeads in useCallback
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const statusIdMap: Record<string, number> = {
        'Interested': 1,
        'Pending': 2,
        'Meeting Done': 3,
        'Brief Pending': 4,
        'Brief Recieved': 5,
        'Brief Received': 5,
        'Meeting Scheduled': 6,
        'Meeting Schedule': 6
      };

      const statusesToFetch = [filterStatus, ...normalizedExtraStatuses].filter(
        (status) => status && status !== 'All'
      );

      let response;
      if (statusesToFetch.length > 0) {
        const responses = await Promise.all(
          statusesToFetch.map((status) => {
            const statusId = statusIdMap[status] || undefined;
            return statusId
              ? listLeadsByStatus(statusId, currentPage, itemsPerPage, activeFilters)
              : listLeadsByStatus(status, currentPage, itemsPerPage, activeFilters);
          })
        );
        response = {
          data: responses.flatMap((res) => res.data || [])
        };
      } else {
        response = await listLeads(currentPage, itemsPerPage, activeFilters);
      }

      const transformedLeads = response.data.map((item: any) => ({
        id: item.id ? String(item.id) : '',
        agencyName: item.agency?.name || item.agency_name || '',
        brandName: item.brand_name || item.brand?.name || String(item.brand_id || ''),
        contactPerson: item.contact_person || item.name || '',
        phoneNumber: Array.isArray(item.mobile_number) && item.mobile_number.length > 0
          ? item.mobile_number[0].number
          : (item.mobile_number || item.number || item.phone || item.email || ''),
        source: item.lead_source || item.source || '',
        subSource: item.sub_source?.name || item.lead_sub_source?.name || item.lead_sub_source_name || item.lead_sub_source || '',
        organisation: item.organisation?.name || item.organisation?.name || item.organisation_name || item.organisation_name || item.organisation || item.organisation || '',
        assignBy: item.created_by_user?.name || item.assign_by_name || item.created_by || '',
        assignTo: item.current_assign_user_name || item.assigned_user?.name
          || (item.current_assign_user && typeof item.current_assign_user === 'object' ? item.current_assign_user.name : '')
          || item.assign_to_name || '',
        dateTime: item.created_at || new Date().toLocaleString(),
        status: item.lead_status_relation?.name || item.lead_status || '',
        callStatus: (() => {
          const raw = item.call_status_relation?.name ?? item.call_status ?? item.callStatus ?? '';
          return raw === null || raw === undefined || raw === '' ? 'N/A' : raw;
        })(),
        callAttempt: Number(item.call_attempt ?? item.callAttempt ?? 0),
        comment: item.comment || item.notes || '',
        leadNumericId: String(item.id ?? '').replace(/^#/, ''),
      }));

      const uniqueLeads = transformedLeads.filter(
        (lead, index, self) => index === self.findIndex((item) => item.id === lead.id)
      );
      setLeads(uniqueLeads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, normalizedExtraStatuses, currentPage, itemsPerPage, activeFilters]);

  useEffect(() => {
    fetchLeads();
  }, [currentPage, filterStatus, fetchLeads]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, extraStatusesKey, activeFilters]);

  // Filter leads by search query (local search across a few fields)
  const filteredLeads = useMemo(() => {
    const normalizeStatus = (value: string) => value.trim().toLowerCase();
    const allowedStatuses = [filterStatus, ...normalizedExtraStatuses]
      .filter((status) => status && status !== 'All')
      .map(normalizeStatus);

    return leads.filter((l) => {
      const normalizedLeadStatus = normalizeStatus(l.status || '');

      if (allowedStatuses.length > 0) {
        // Special handling for 'Brief' group: include both Received and Pending
        if (allowedStatuses.includes(normalizeStatus('Brief'))) {
          if (
            normalizedLeadStatus !== normalizeStatus('Brief Recieved') &&
            normalizedLeadStatus !== normalizeStatus('Brief Pending') &&
            normalizedLeadStatus !== normalizeStatus('Brief Received')
          ) return false;
        }
        // Special handling for 'Meeting Scheduled' group: only Meeting Schedule (not Meeting Done)
        else if (allowedStatuses.includes(normalizeStatus('Meeting Scheduled'))) {
          if (
            normalizedLeadStatus !== normalizeStatus('Meeting Schedule') &&
            normalizedLeadStatus !== normalizeStatus('Meeting Scheduled') &&
            !allowedStatuses.includes(normalizedLeadStatus)
          ) return false;
        }
        else {
          if (!allowedStatuses.includes(normalizedLeadStatus)) return false;
        }
      }
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        l.id.toLowerCase().includes(q) ||
        (l.brandName ?? '').toLowerCase().includes(q) ||
        (l.contactPerson ?? '').toLowerCase().includes(q) ||
        (l.phoneNumber ?? '').toLowerCase().includes(q) ||
        (l.callStatus ?? '').toLowerCase().includes(q)
      );
    });
  }, [leads, filterStatus, normalizedExtraStatuses, searchQuery]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = useMemo(
    () => filteredLeads.slice(startIndex, startIndex + itemsPerPage),
    [filteredLeads, startIndex, itemsPerPage]
  );

  const currentPageLeadIdsKey = useMemo(
    () => currentData.map((lead) => lead.id).join('|'),
    [currentData]
  );

  useEffect(() => {
    let cancelled = false;

    const fetchAssignOptionsForPage = async () => {
      if (currentData.length === 0) {
        setAssignOptionsByLeadId({});
        return;
      }

      const results = await Promise.all(
        currentData.map(async (lead) => {
          const cleanLeadId = String(lead.id).replace('#', '');
          try {
            const users = await listChildUsersByLead(cleanLeadId);
            return [lead.id, users.map((u) => ({ id: u.id, name: u.name }))] as const;
          } catch (err) {
            console.error(`Failed to fetch assign to users for lead ${lead.id}:`, err);
            try {
              const users = await listChildUsers();
              return [lead.id, users.map((u) => ({ id: u.id, name: u.name }))] as const;
            } catch (fallbackErr) {
              console.error(`Failed fallback assign to users for lead ${lead.id}:`, fallbackErr);
              return [lead.id, []] as const;
            }
          }
        })
      );

      if (cancelled) return;
      setAssignOptionsByLeadId(Object.fromEntries(results));
    };

    fetchAssignOptionsForPage();

    return () => {
      cancelled = true;
    };
  }, [currentPageLeadIdsKey, currentData]);

  const navigate = useNavigate();


  const handleCreateLead = () => navigate(ROUTES.LEAD.CREATE);
  const handleEdit = (id: string) => {
    const cleanId = id.replace('#', '');
    navigate(ROUTES.LEAD.EDIT(cleanId));
  };
  const handleView = (id: string) => {
    const cleanId = id.replace('#', '');
    navigate(ROUTES.LEAD.DETAIL(cleanId));
  };

  const handleCreateMeeting = (lead: Lead) => {
    const leadId = String(lead.leadNumericId ?? lead.id).replace(/^#/, '');
    navigate(ROUTES.LEAD.MEETING_SCHEDULE_WITH_LEAD(leadId), {
      state: { prefillLeadId: leadId },
    });
  };

  const handleBriefCreation = (lead: Lead) => {
    const leadId = String(lead.leadNumericId ?? lead.id).replace(/^#/, '');
    navigate(ROUTES.BRIEF.CREATE_WITH_LEAD(leadId), {
      state: { leadBriefPrefill: buildBriefInitialDataFromLead(lead) },
    });
  };

  const handleOpenChatPage = (lead: Lead) => {
    const leadId = String(lead.leadNumericId ?? lead.id).replace(/^#/, '');
    if (!leadId) return;
    navigate(ROUTES.LEAD.CHAT(leadId));
  };

  const syncLeadNotificationCounts = useCallback(async () => {
    const [count, notificationsRes, unreadLeadRes] = await Promise.all([
      getUnreadNotificationCount(),
      listNotifications(1, 10, 'lead-management', ['Lead Created', 'Assignment Updated']),
      listNotifications(1, 1, 'unread', ['Lead Created', 'Assignment Updated']),
    ]);

    const leadUnreadCount =
      unreadLeadRes.meta?.pagination?.total ??
      unreadLeadRes.meta?.total ??
      unreadLeadRes.data?.length ??
      0;

    dispatch(setUnreadCount({ module: 'all', count }));
    dispatch(setUnreadCount({ module: 'leadManagement', count: leadUnreadCount }));
    dispatch(
      setNotifications({
        module: 'leadManagement',
        notifications: notificationsRes.data || [],
        total: notificationsRes.meta?.pagination?.total || 0,
      })
    );
  }, [dispatch]);

  const handleAssignToChange = (leadId: string, newSalesMan: string) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, assignTo: newSalesMan } : lead
      )
    );
    (async () => {
      try {
        const numericId = String(leadId).replace('#', '');
        const found = (assignOptionsByLeadId[leadId] || []).find(u => u.name === newSalesMan);
        if (found && found.id != null) {
          await assignUserToLead(numericId, found.id);
        } else {
          await updateLead(numericId, { current_assign_user: newSalesMan });
        }
        SweetAlert.showUpdateSuccess();

        // Immediately increment badge in Redux, then sync with server
        dispatch(incrementUnreadCount({ module: 'all' }));
        dispatch(incrementUnreadCount({ module: 'leadManagement' }));

        // Sync with server count
        try {
          await syncLeadNotificationCounts();
        } catch (notifErr) {
          console.error('Failed to refresh notifications:', notifErr);
        }
      } catch (err) {
        console.warn('Failed to persist assignTo change', err);
        try { SweetAlert.showError('Failed to update assignment'); } catch {
          // no need to action
        }
      }
    })();
  };

  const handleAssignConfirm = async (_newSalesMan: string) => {
    void _newSalesMan; // mark as intentionally unused
  };

  const handleDelete = (leadId: string) => {
    const found = leads.find((l) => l.id === leadId);
    setConfirmDeleteId(leadId);
    setConfirmDeleteLabel(found ? (found.brandName || found.contactPerson || String(found.id)) : leadId);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setConfirmLoading(true);
    const numericId = String(confirmDeleteId).replace('#', '');
    try {
      await deleteLead(numericId);
      setLeads((prev) => prev.filter((l) => l.id !== confirmDeleteId));
      SweetAlert.showDeleteSuccess();

      // Sync with server count
      try {
        await syncLeadNotificationCounts();
      } catch (notifErr) {
        console.error('Failed to refresh notifications:', notifErr);
      }
    } catch (err: any) {
      console.error('Failed to delete lead', err);
      SweetAlert.showError(err?.message || 'Failed to delete lead');
    } finally {
      setConfirmLoading(false);
      setConfirmDeleteId(null);
      setConfirmDeleteLabel('');
    }
  };

  const handleCallStatusChange = (leadId: string, newStatus: string) => {
    // Use the shared axios http instance so cookies and Authorization header are handled automatically
    const updateCallStatus = async () => {
      try {
        setLoading(true);
        // Find call status id from name
        let callStatusId: number | undefined;
        const selected = callStatusOptions.find((opt) => opt.name === newStatus);
        callStatusId = selected?.id != null ? Number(selected.id) : undefined;
        if (!callStatusId) {
          // Fallback: fetch from API
          const resp = await getCallStatuses();
          const found = Array.isArray(resp) ? resp.find((item: any) => item.name === newStatus) : undefined;
          callStatusId = found?.id != null ? Number(found.id) : undefined;
        }
        if (!callStatusId) {
          SweetAlert.showWarning('Invalid call status');
          setLoading(false);
          return;
        }
        const formData = new FormData();
        formData.append('call_status_id', String(callStatusId));
        formData.append('_method', 'Put');
        const response = await http.post(`/leads/${leadId}/call-status`, formData);
        const result = response.data;
        if (result.success) {
          await fetchLeads();
          SweetAlert.showUpdateSuccess();
        } else {
          SweetAlert.showError(result.message || 'Failed to update call status');
        }
      } catch {
        SweetAlert.showError('Error updating call status');
      } finally {
        setLoading(false);
      }
    };
    updateCallStatus();
  };

  // const handleCallStatusConfirm = async (_newStatus: string) => {
  const handleCallStatusConfirm = async (_newStatus: string) => {
    void _newStatus; // mark as intentionally unused
    // This is called when user confirms the call status change in the dialog
    // The actual API call happens after confirmation in handleCallStatusChange
  };



  // Status is rendered as a non-clickable pill (same as AllLeads)

  const columns = ([
    {
      key: 'chat',
      header: 'Chat',
      minWidth: 72,
      allowOverflow: true,
      className: 'text-center whitespace-nowrap',
      headerClassName: 'text-center',
      render: (it: Lead) => (
        <div className="flex items-center justify-center">
          <button
            type="button"
            title="Chat"
            aria-label={`Chat for lead ${it.id}`}
            onClick={(event) => {
              event.stopPropagation();
              handleOpenChatPage(it);
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
    { key: 'sr', header: 'Id', minWidth: 72, maxWidth: 96, render: (it: Lead) => `#${it.id}` },
    { key: 'agencyName', header: 'Agency Name', minWidth: 120, maxWidth: 180, render: (it: Lead) => it.agencyName || '-' },
    { key: 'brandName', header: 'Brand Name', minWidth: 120, maxWidth: 180, render: (it: Lead) => it.brandName || '-' },
    { key: 'contactPerson', header: 'Contact Person', minWidth: 120, maxWidth: 160, render: (it: Lead) => it.contactPerson || '-' },
    { key: 'phoneNumber', header: 'Phone Number', minWidth: 120, maxWidth: 140, render: (it: Lead) => it.phoneNumber || '-' },
    { key: 'subSource', header: 'Sub-Source', minWidth: 100, maxWidth: 140, render: (it: Lead) => it.subSource || '-' },
    { key: 'organisation', header: 'Organisation', minWidth: 100, maxWidth: 140, render: (it: Lead) => it.organisation || '-' },
    { key: 'assignBy', header: 'Created By', minWidth: 110, maxWidth: 150, render: (it: Lead) => it.assignBy || '-' },
    ...(hasPermission(assignPermissionMap[permissionKey] || assignPermissionMap.All) ? [{
      key: 'assignTo',
      header: 'Assign To',
      minWidth: 160,
      maxWidth: 200,
      allowOverflow: true,
      render: (it: Lead) => {
        const displayedName = it.assignTo ?? '';
        const rowAssignOptions = assignOptionsByLeadId[it.id] || [];
        const optionNames = rowAssignOptions.map((opt) => opt.name);
        const assignDropdownOptions =
          displayedName && !optionNames.includes(displayedName)
            ? [displayedName, ...optionNames]
            : optionNames;

        return (
          <AssignDropdown
            value={displayedName}
            options={assignDropdownOptions}
            onChange={(newSalesMan) => handleAssignToChange(it.id, newSalesMan)}
            onConfirm={handleAssignConfirm}
            context="lead"
          />
        );
      },
    } as Column<Lead>] : []),
    { key: 'dateTime', header: 'Date & Time', minWidth: 130, maxWidth: 170, render: (it: Lead) => it.dateTime || '-' },
    {
      key: 'status',
      header: 'Status',
      minWidth: 120,
      maxWidth: 160,
      allowOverflow: true,
      render: (it: Lead) => (
        <StatusPill
          label={it.status ?? '-'}
          color={statusColors[it.status ?? ''] || '#6b7280'}
        />
      ),
    },
    {
      key: 'callStatus',
      header: 'Call Status',
      minWidth: 170,
      maxWidth: 200,
      allowOverflow: true,
      render: (it: Lead) => (
        hasPermission(callStatusPermissionMap[permissionKey] || callStatusPermissionMap.All) ? (
          <CallStatusDropdown
            value={(it.callStatus && it.callStatus !== 'N/A') ? it.callStatus : ''}
            options={callStatusOptions.map((opt) => opt.name)}
            onChange={(newStatus) => handleCallStatusChange(it.id, newStatus)}
            onConfirm={handleCallStatusConfirm}
          />
        ) : (
          <span className="block truncate">{it.callStatus || 'N/A'}</span>
        )
      ),
    },
    { key: 'followUp', header: 'Follow-Up / Meeting Type', minWidth: 140, maxWidth: 200, render: (it: Lead) => it.dateTime || '-' },
    { key: 'callAttempt', header: 'Call Attempt', minWidth: 90, maxWidth: 110, render: (it: Lead) => (it.callAttempt ? String(it.callAttempt) : '-') },
    {
      key: 'comment',
      header: 'Comment',
      minWidth: 140,
      maxWidth: 220,
      render: (it: Lead) => it.comment || '-',
    },
  ] as Column<Lead>[]);

  const handleFilterChange = (filters: Record<string, string>) => {
    setActiveFilters(filters);
    setCurrentPage(1);
  };

  const filterOptions = useMemo(
    () =>
      [
        {
          key: 'brand_id',
          label: 'Brand Name',
          options: brandOptions,
          isMulti: true,
        },
        {
          key: 'lead_sub_source_id',
          label: 'Sub-source',
          options: subSourceOptions,
          isMulti: true,
        },
        {
          key: 'created_by',
          label: 'Created By',
          options: userFilterOptions,
          isMulti: true,
        },
        {
          key: 'current_assign_user',
          label: 'Assign To',
          options: userFilterOptions,
          isMulti: true,
        },
        {
          key: 'call_status_id',
          label: 'Call Status',
          options: callStatusOptions.map((opt) => ({
            value: String(opt.id),
            label: opt.name,
          })),
          isMulti: true,
        },
      ].filter((option) => option.options.length > 0),
    [brandOptions, subSourceOptions, userFilterOptions, callStatusOptions]
  );

  return (
    <div className="flex-1 w-full max-w-full min-w-0">
      {hasPermission(createPermissionMap[permissionKey] || createPermissionMap.All) && (
        <MasterHeader
          onCreateClick={handleCreateLead}
          createButtonLabel="Create Lead"
          showSignInButton={true}
          signInIcon={<FaRegCalendarAlt className="cursor-pointer text-orange-500 hover:text-orange-500 w-4 h-4 sm:w-6 sm:h-6" />}
          onSignInClick={() => navigate(ROUTES.LEAD.MEETING_SCHEDULE)}
          createPermissionSlug={createPermissionMap[permissionKey]}
        />
      )}

      <div className="overflow-visible bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Table Header */}
        <TableHeader
          title={title}
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
          appliedFilters={activeFilters}
          filterExtras={filterExtras}
          extraFilterActive={extraFilterActive}
        >
          {headerActions}
          <SearchBar
            className="w-full"
            placeholder="Search leads..."
            delay={250}
            onSearch={(q: string) => {
              setSearchQuery(q);
              setCurrentPage(1);
            }}
          />
        </TableHeader>


        <div className="pt-0 overflow-x-auto">
          <Table
            data={currentData}
            startIndex={startIndex}
            loading={loading}
            desktopOnMobile={true}
            keyExtractor={(it: Lead) => it.id}
            columns={columns}
            onEdit={(it: Lead) => handleEdit(it.id)}
            onView={(it: Lead) => handleView(it.id)}
            onDelete={(it: Lead) => handleDelete(it.id)}
            onCreateMeeting={(it: Lead) => handleCreateMeeting(it)}
            onBriefCreation={(it: Lead) => handleBriefCreation(it)}
            onChat={(it: Lead) => setChatLead(it)}
            editPermissionSlug={editPermissionMap[permissionKey] || editPermissionMap.All}
            viewPermissionSlug={viewPermissionMap[permissionKey] || viewPermissionMap.All}
            deletePermissionSlug={deletePermissionMap[permissionKey] || deletePermissionMap.All}
          />
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={filteredLeads.length}
        itemsPerPage={itemsPerPage}
        onPageChange={(p: number) => setCurrentPage(p)}
      />

      {/* Confirmation dialog for delete */}
      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        title="Delete Lead"
        message={`Are you sure you want to delete the lead "${confirmDeleteLabel}"? This action cannot be undone.`}
        loading={confirmLoading}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
      />

      <LeadChatModal
        isOpen={Boolean(chatLead)}
        lead={chatLead}
        callStatusOptions={callStatusOptions
          .map((opt) => ({ id: Number(opt.id), name: opt.name }))
          .filter((opt) => Number.isFinite(opt.id) && opt.name)}
        onClose={() => setChatLead(null)}
        onSaved={async () => {
          setChatLead(null);
          await fetchLeads();
        }}
      />

    </div>
  );
};

export default LeadList;
