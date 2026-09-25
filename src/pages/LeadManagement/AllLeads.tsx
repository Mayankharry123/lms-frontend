/**
 * @file AllLeads.tsx
 * @description All leads listing with filters, actions, and pagination.
 * @author Sanjay Jangid <sanjay.jangid@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect, useMemo } from 'react';
import Table, { type Column } from '../../components/ui/Table';
import AssignDropdown from '../../components/ui/AssignDropdown';
import CallStatusDropdown from '../../components/ui/CallStatusDropdown';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import { MasterHeader, StatusPill } from '../../components/ui';
import { FaRegCalendarAlt } from 'react-icons/fa';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { listLeads, updateLead, deleteLead } from '../../services/AllLeads';
import SweetAlert from '../../utils/SweetAlert';
import { assignUserToLead } from '../../services/leadAssignTo';
import { getCallStatuses, updateCallStatus } from '../../services/CallStatus';
import { listBrandsFlat, listChildUsers, listChildUsersByLead } from '../../api/lookups';
import { fetchLeadSubSources } from '../../services/ContactPersonsCard';
import { usePermissions } from '../../hooks/SidebarMenuHooks';
import TableHeader from '../../components/ui/TableHeader';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux/store';
import { setUnreadCount, setNotifications } from '../../redux/slices/notificationSlice';
import { getUnreadNotificationCount, listNotifications } from '../../services/notifications';
import type { CallStatusOption, UserOption, AllLeadtype } from '../../types/AllLeadtype';
import { buildBriefInitialDataFromLead } from '../../utils/briefLeadPrefill';
import LeadChatModal from '../../components/lead/LeadChatModal';
import { MessageCircle } from 'lucide-react';

// Call status options will be fetched from API
// (status mapping removed - not used in this file)

const AllLeads: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [brandOptions, setBrandOptions] = useState<{ value: string; label: string }[]>([]);
  const [subSourceOptions, setSubSourceOptions] = useState<{ value: string; label: string }[]>([]);
  const [userFilterOptions, setUserFilterOptions] = useState<{ value: string; label: string }[]>([]);
  const itemsPerPage = 15;
  const [leads, setLeads] = useState<AllLeadtype[]>([]);
  const [callStatusOptions, setCallStatusOptions] = useState<CallStatusOption[]>([]);
  const [assignOptionsByLeadId, setAssignOptionsByLeadId] = useState<
    Record<string, UserOption[]>
  >({});
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch call status options from API
  useEffect(() => {
    const loadCallStatuses = async () => {
      try {
        const resp = await getCallStatuses();
        // Store as array of {id, name}
        const options = Array.isArray(resp)
          ? resp.map((item: any) => ({ id: item.id, name: item.name })).filter((item: any) => item.id && item.name)
          : [];
        setCallStatusOptions(options);
      } catch {
        setCallStatusOptions([]);
      }
    };
    loadCallStatuses();
  }, []);

  // Fetch user options for filters (assign dropdown loads per lead)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await listChildUsers(1000);
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

  // Use API paginated data directly
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = useMemo(() => leads, [leads]);

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
              const users = await listChildUsers(1000);
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
  }, [currentData]);

  const navigate = useNavigate();

  const syncLeadNotificationCounts = async () => {
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
  };

  const handleCreateLead = () => navigate(ROUTES.LEAD.CREATE);
  const handleEdit = (id: string) => {
    // Remove the '#' from the ID before using it in the URL
    const cleanId = id.replace('#', '');
    navigate(ROUTES.LEAD.EDIT(cleanId));
  };

  const handleView = (id: string) => {
    // Remove the '#' from the ID before using it in the URL
    const cleanId = id.replace('#', '');
    navigate(ROUTES.LEAD.DETAIL(cleanId));
  };

  const handleCreateMeeting = (lead: AllLeadtype) => {
    const leadId = String(lead.leadNumericId ?? lead.id).replace(/^#/, '');
    navigate(ROUTES.LEAD.MEETING_SCHEDULE_WITH_LEAD(leadId), {
      state: { prefillLeadId: leadId },
    });
  };

  const handleBriefCreation = (lead: AllLeadtype) => {
    const leadId = String(lead.leadNumericId ?? lead.id).replace(/^#/, '');
    navigate(ROUTES.BRIEF.CREATE_WITH_LEAD(leadId), {
      state: { leadBriefPrefill: buildBriefInitialDataFromLead(lead) },
    });
  };

  const handleOpenChatPage = (lead: AllLeadtype) => {
    const leadId = String(lead.leadNumericId ?? lead.id).replace(/^#/, '');
    if (!leadId) return;
    navigate(ROUTES.LEAD.CHAT(leadId));
  };

  const handleChat = (lead: AllLeadtype) => {
    setChatLead(lead);
  };

  const handleAssignToChange = (leadId: string, newSalesMan: string) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, assignTo: newSalesMan } : lead
      )
    );
    // Optionally, call API here to persist change
    // Try persisting assignTo change to server (best-effort)
    (async () => {
      try {
        // remove leading '#' if present
        const numericId = String(leadId).replace('#', '');
        // try to find user id from assignToOptions (we store options as {id, name})
        const found = (assignOptionsByLeadId[leadId] || []).find(u => u.name === newSalesMan);
        if (found && found.id != null) {
          await assignUserToLead(numericId, found.id);
        } else {
          // fallback to existing updateLead call if we only have the name
          await updateLead(numericId, { current_assign_user: newSalesMan });
        }
        SweetAlert.showUpdateSuccess();

        // Refresh notifications in Redux after lead update
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
    // This is called when user confirms the assignment in the dialog
    // The actual API call happens after confirmation in handleAssignToChange
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteLabel, setConfirmDeleteLabel] = useState<string>('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [chatLead, setChatLead] = useState<AllLeadtype | null>(null);

  // Open confirmation dialog (used by ActionMenu)
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
      setTotalItems((t) => Math.max(0, Number(t) - 1));

      const isLastOnPage = currentData.length === 1;
      if (isLastOnPage && currentPage > 1) setCurrentPage((p) => p - 1);

      // Refresh notifications in Redux after lead delete
      try {
        await syncLeadNotificationCounts();
      } catch (notifErr) {
        console.error('Failed to refresh notifications:', notifErr);
      }
    } catch (err: any) {
      console.error('Failed to delete lead', err);
      try { SweetAlert.showError(err?.message || 'Failed to delete lead'); } catch {
        //  no need to action
      }
    } finally {
      setConfirmLoading(false);
      setConfirmDeleteId(null);
      setConfirmDeleteLabel('');
    }
  };

  const handleCallStatusChange = async (leadId: string, newStatus: string) => {
    // Update the lead status in state and increment callAttempt when status actually changes
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id !== leadId) return lead;
        // Treat 'N/A' as empty when comparing previous value
        const prevStatus = lead.callStatus === 'N/A' ? '' : lead.callStatus;
        if (prevStatus === newStatus) return lead; // no change
        return { ...lead, callStatus: newStatus };
      })
    );

    // Find the id for the selected call status name
    const selectedOption = callStatusOptions.find(opt => opt.name === newStatus);
    if (!selectedOption) {
      console.warn('Call status id not found for name:', newStatus);
      return;
    }
    try {
      const numericId = String(leadId).replace('#', '');
      await updateCallStatus(numericId, selectedOption.id);
      // Refresh table after update
      await fetchLeads();
      SweetAlert.showUpdateSuccess();
    } catch (err) {
      console.warn('Failed to persist call status change', err);
      try { SweetAlert.showError('Failed to update call status'); } catch {
        //  no need to action
      }
    }
  };

  const handleCallStatusConfirm = async (_newStatus: string) => {
    void _newStatus; // mark as intentionally unused
    // This is called when user confirms the call status change in the dialog
    // The actual API call happens after confirmation in handleCallStatusChange
  };

  // Fetch leads from API
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const filters: Record<string, any> = { ...activeFilters };
      if (searchQuery) filters.search = searchQuery;
      const resp = await listLeads(currentPage, itemsPerPage, filters);
      const items = (resp.data || []).map((it: any) => ({
        id: it.id ? `#${String(it.id)}` : '#0',
        agencyName: it.agency?.name || it.agency_name || '',
        brandName: it.brand_name || it.brand?.name || String(it.brand_id || ''),
        contactPerson: it.contact_person || it.name || '',
        phoneNumber: Array.isArray(it.mobile_number) ? (it.mobile_number[0]?.number || '') : (it.number || it.mobile_number || it.phone || ''),
        source: it.lead_source || it.source || '',
        subSource: it.sub_source?.name || it.lead_sub_source?.name || it.lead_sub_source_name || it.lead_sub_source || '',
        organisation: it.organisation?.name || it.organisation?.name || it.organisation_name || it.organisation_name || it.organisation || it.organisation || '',
        assignBy: it.created_by_user?.name || it.assign_by_name || it.created_by || '',
        assignTo: it.current_assign_user_name || it.assigned_user?.name || (it.current_assign_user && typeof it.current_assign_user === 'object' ? it.current_assign_user.name : '') || it.assign_to_name || '',
        dateTime: it.created_at || it.dateTime || it.created_at_formatted || '',
        status: it.status || '',
        leadStatus: it.lead_status_relation?.name || it.lead_status || '',
        callStatus: (() => {
          const raw = it.call_status_relation?.name ?? it.call_status ?? it.callStatus ?? '';
          return raw === null || raw === undefined || raw === '' ? 'N/A' : raw;
        })(),
        callAttempt: Number(it.call_attempt ?? it.callAttempt ?? 0),
        comment: it.comment || it.notes || '',
        brandId: String(it.brand_id ?? it.brand?.id ?? ''),
        agencyId: String(it.agency_id ?? it.agency?.id ?? ''),
        leadNumericId: String(it.id ?? '').replace(/^#/, ''),
      } as AllLeadtype));

      setLeads(items);
      // Use total from API pagination
      const total = resp.meta?.pagination?.total ?? resp.meta?.total ?? items.length;
      setTotalItems(Number(total ?? items.length));
    } catch (err) {
      console.error('Failed to fetch leads', err);
      setLeads([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchQuery, activeFilters]);

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

  const columns: Column<AllLeadtype>[] = [
    {
      key: 'chat',
      header: 'Chat',
      minWidth: 72,
      allowOverflow: true,
      className: 'text-center whitespace-nowrap',
      headerClassName: 'text-center',
      render: (it: AllLeadtype) => (
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
    { key: 'sr', header: 'Id', render: (it: AllLeadtype) => it.id, className: 'text-left whitespace-nowrap' },
    { key: 'agencyName', header: 'Agency Name', render: (it: AllLeadtype) => it.agencyName || '-', className: 'max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap' },
    { key: 'brandName', header: 'Brand Name', render: (it: AllLeadtype) => it.brandName || '-', className: 'max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap' },
    { key: 'contactPerson', header: 'Contact Person', render: (it: AllLeadtype) => it.contactPerson || '-', className: 'max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap' },
    { key: 'phoneNumber', header: 'Phone Number', render: (it: AllLeadtype) => it.phoneNumber || '-', className: 'whitespace-nowrap' },
    { key: 'subSource', header: 'Sub-Source', render: (it: AllLeadtype) => it.subSource || '-', className: 'whitespace-nowrap' },
    { key: 'organisation', header: 'Organisation', render: (it: AllLeadtype) => it.organisation || '-', className: 'whitespace-nowrap' },
    { key: 'assignBy', header: 'Created By', render: (it: AllLeadtype) => it.assignBy || '-', className: 'whitespace-nowrap' },
    ...(hasPermission('all-lead.assign') ? [{
      key: 'assignTo',
      header: 'Assign To',
      render: (it: AllLeadtype) => {
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
      className: 'min-w-[140px]',
      allowOverflow: true,
    } as Column<AllLeadtype>] : []),
    { key: 'dateTime', header: 'Date & Time', render: (it: AllLeadtype) => it.dateTime || '-', className: 'whitespace-nowrap' },
    {
      key: 'status',
      header: 'Status',
      render: (it: AllLeadtype) => {
        const statusColors = {
          'Active': '#22c55e',
          'Inactive': '#ef4444',
          'Pending': '#f59e0b',
          'Converted': '#3b82f6',
          'In Progress': '#8b5cf6',
          'Rejected': '#dc2626',
          'Interested': '#22c55e',
          'Brief Pending': '#f97316',
          'Meeting Scheduled': '#3b82f6',
          'Meeting Done': '#8b5cf6',
          'Brief Received': '#06b6d4',
          'N/A': '#6b7280'
        };
        // Display lead_status from API (currently null for all, will show when populated)
        const displayStatus = it.leadStatus || 'N/A';
        return <StatusPill
          label={displayStatus}
          color={statusColors[displayStatus as keyof typeof statusColors] || '#6b7280'}
        />;
      },
      className: 'whitespace-nowrap'
    },
    {
      key: 'callStatus',
      header: 'Call Status',
      render: (it: AllLeadtype) => (
        <div className="min-w-[160px]">
          {hasPermission('all-lead-call-status.update') ? (
            <CallStatusDropdown
              value={(it.callStatus && it.callStatus !== 'N/A') ? it.callStatus : ''}
              options={callStatusOptions.map(opt => opt.name)}
              onChange={(newStatus) => handleCallStatusChange(it.id, newStatus)}
              onConfirm={handleCallStatusConfirm}
            />
          ) : (
            <span>{it.callStatus || 'N/A'}</span>
          )}
        </div>
      ),
      className: 'min-w-[160px]',
      allowOverflow: true,
    },
    { key: 'callAttempt', header: 'Call Attempt', render: (it: AllLeadtype) => it.callAttempt ? String(it.callAttempt) : '-', className: 'whitespace-nowrap' },
    {
      key: 'comment',
      header: 'Comment',
      minWidth: 140,
      maxWidth: 220,
      render: (it: AllLeadtype) => it.comment || '-',
    },
  ];

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title={`Delete lead "${confirmDeleteLabel}"?`}
        message="This action will permanently remove the lead. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={confirmLoading}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
      />

      <LeadChatModal
        isOpen={Boolean(chatLead)}
        lead={chatLead}
        callStatusOptions={callStatusOptions}
        onClose={() => setChatLead(null)}
        onSaved={async () => {
          setChatLead(null);
          await fetchLeads();
        }}
      />

      {hasPermission('leads.create') && (
        <MasterHeader
          onCreateClick={handleCreateLead}
          createButtonLabel="Create Lead"
          showSignInButton={true}
          signInIcon={<FaRegCalendarAlt className="cursor-pointer text-orange-500 hover:text-orange-500 w-4 h-4 sm:w-6 sm:h-6" />}
          onSignInClick={() => navigate(ROUTES.LEAD.MEETING_SCHEDULE)}
          createPermissionSlug="leads.create"
        />
      )}
      
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Table Header */}
        <TableHeader
          title="All Leads"
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
          appliedFilters={activeFilters}
        >
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

        <div className="pt-0 overflow-visible">
          <Table
            data={currentData}
            startIndex={startIndex}
            loading={loading}
            desktopOnMobile={true}
            keyExtractor={(it: AllLeadtype) => it.id}
            columns={columns}
            onEdit={(it: AllLeadtype) => handleEdit(it.id)}
            onView={(it: AllLeadtype) => handleView(it.id)}
            onDelete={(it: AllLeadtype) => handleDelete(it.id)}
            onCreateMeeting={(it: AllLeadtype) => handleCreateMeeting(it)}
            onBriefCreation={(it: AllLeadtype) => handleBriefCreation(it)}
            onChat={(it: AllLeadtype) => handleChat(it)}
            editPermissionSlug="leads.edit"
            viewPermissionSlug="leads.view"
            deletePermissionSlug="leads.delete"
          />
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={(p: number) => setCurrentPage(p)}
      />

    </div>
  );
};

export default AllLeads;
