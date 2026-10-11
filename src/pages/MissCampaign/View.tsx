/**
 * @file View.tsx
 * @description Pre-lead list, detail, and inline edit views.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Pagination from '../../components/ui/Pagination';
import Table, { type Column } from '../../components/ui/Table';
import MasterHeader from '../../components/ui/MasterHeader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SearchBar from '../../components/ui/SearchBar';
import Breadcrumb from '../../components/ui/Breadcrumb';
import AssignDropdown from '../../components/ui/AssignDropdown';
import SweetAlert from '../../utils/SweetAlert';
import Create from './Create';
import { updateMissCampaignWithForm } from '../../services/Create';
import {
  listMissCampaigns,
  deleteMissCampaign,
  getMissCampaign,
  mapMissCampaignApiToMissCampaign,
  exportMissCampaignsExcel,
  type MissCampaign
} from '../../services/View';
import { apiClient } from '../../utils/apiClient';
import { listChildUsers, listChildUsersByMissCampaign } from '../../api/lookups';
import { usePermissions } from '../../hooks/SidebarMenuHooks';
import { IoIosArrowBack } from 'react-icons/io';
import TableHeader from '../../components/ui/TableHeader';
import ExportExcelButton from '../../components/ui/ExportExcelButton';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux/store';
import { setUnreadCount, setNotifications } from '../../redux/slices/notificationSlice';
import { getUnreadNotificationCount, listNotifications } from '../../services/notifications';

const View: React.FC = () => {
  const { hasPermission } = usePermissions();
  const dispatch = useDispatch<AppDispatch>();
  // Previously `navigate`, `params`, `location` were declared after `currentData` (see comment there). Moved here so `viewDetailLoading` initializer can read `params` / `location` without TDZ errors.
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [campaigns, setCampaigns] = useState<MissCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [industryOptions, setIndustryOptions] = useState<{ value: string; label: string }[]>([]);
  const [mediaTypeOptions, setMediaTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [sourceOptions, setSourceOptions] = useState<{ value: string; label: string }[]>([]);
  const [assignOptionsByCampaignId, setAssignOptionsByCampaignId] = useState<
    Record<string, { id: string | number; name: string }[]>
  >({});
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [viewItem, setViewItem] = useState<MissCampaign | null>(null);
  const [editItem, setEditItem] = useState<MissCampaign | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteLabel, setConfirmDeleteLabel] = useState<string>('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  // Image modal (soft alert) state
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [viewDetailLoading, setViewDetailLoading] = useState(() =>
    Boolean(params.id && !location.pathname.endsWith('/edit'))
  );
  const campaignsRef = useRef<MissCampaign[]>([]);

  const openImageModal = (url: string) => {
    setModalImageUrl(url);
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setModalImageUrl(null);
  };

  // Close modal on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeImageModal();
    };
    if (imageModalOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [imageModalOpen]);

  const totalFilteredItems = totalItems;
  const shouldFetchAll = Boolean(searchQuery.trim()) || Object.keys(activeFilters).length > 0;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = useMemo(
    () => (shouldFetchAll ? campaigns.slice(startIndex, startIndex + itemsPerPage) : campaigns),
    [shouldFetchAll, campaigns, startIndex, itemsPerPage]
  );

  // [Previously] Router hooks were here:
  // const navigate = useNavigate();
  // const params = useParams();
  // const location = useLocation();

  useEffect(() => {
    campaignsRef.current = campaigns;
  }, [campaigns]);

  useLayoutEffect(() => {
    const rawId = params.id;
    const id = rawId ? decodeURIComponent(rawId) : undefined;
    if (!id || location.pathname.endsWith('/edit')) return;
    setViewDetailLoading(true);
  }, [location.pathname, params.id]);

  const normalizeString = (value?: string | null): string => String(value ?? '').trim().toLowerCase();

  const matchesFilters = useCallback((item: MissCampaign, filters?: Record<string, string>) => {
    if (!filters) return true;

    if (filters.industry_id) {
      const selected = normalizeString(filters.industry_id);
      const itemIndustry = normalizeString(item.industry);
      const itemIndustryId = normalizeString((item as any).industryId);
      if (itemIndustry !== selected && itemIndustryId !== selected) return false;
    }

    if (filters.lead_source_id) {
      const selected = normalizeString(filters.lead_source_id);
      const itemSource = normalizeString(item.source);
      const itemSourceId = normalizeString((item as any).sourceId);
      if (itemSource !== selected && itemSourceId !== selected) return false;
    }

    if (filters.media_type) {
      const selected = normalizeString(filters.media_type);
      const itemMediaType = normalizeString(item.mediaType);
      const itemMediaTypeId = normalizeString((item as any).mediaTypeId);
      if (itemMediaType !== selected && itemMediaTypeId !== selected) return false;
    }

    return true;
  }, []);

  // Fetch campaigns from API with search and filters
  const fetchCampaigns = useCallback(async (pageNum: number, search?: string, filters?: Record<string, string>) => {
    try {
      setLoading(true);
      const shouldFetchAll = Boolean(search?.trim()) || Boolean(filters && Object.keys(filters).length > 0);
      const fetchPerPage = shouldFetchAll ? 100 : itemsPerPage;
      const pageToFetch = shouldFetchAll ? 1 : pageNum;

      const firstResponse = await listMissCampaigns(pageToFetch, fetchPerPage, search, filters);
      let allItems = firstResponse.data || [];

      if (shouldFetchAll) {
        const lastPage = firstResponse.meta?.pagination?.last_page ?? 1;
        if (lastPage > 1) {
          const fetchPromises = [];
          for (let p = 2; p <= lastPage; p += 1) {
            fetchPromises.push(listMissCampaigns(p, fetchPerPage, search, filters));
          }
          const responses = await Promise.all(fetchPromises);
          responses.forEach((resp) => {
            allItems = allItems.concat(resp.data || []);
          });
        }

        if (filters && Object.keys(filters).length > 0) {
          allItems = allItems.filter((item) => matchesFilters(item, filters));
        }

        setCampaigns(allItems);
        setTotalItems(allItems.length);
      } else {
        setCampaigns(allItems);
        const totalCount = Number(firstResponse.meta?.pagination?.total ?? firstResponse.meta?.total ?? allItems.length ?? 0);
        setTotalItems(totalCount);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      setCampaigns([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [matchesFilters]);

  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        const response = await apiClient.get<any[]>('/industries/list');
        const industries = Array.isArray(response.data) ? response.data : [];
        const options = industries.map((industry: any) => {
          const rawId = industry.id ?? industry.value ?? industry.industry_id;
          const id = rawId !== undefined && rawId !== null ? String(rawId) : '';
          const name = String(industry.name ?? industry.label ?? industry.value ?? industry.industry ?? industry);
          return {
            value: id || name,
            label: name,
          };
        });
        setIndustryOptions(options);
      } catch (error) {
        console.error('Failed to fetch industries:', error);
        setIndustryOptions([]);
      }
    };
    fetchIndustries();
  }, []);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const response = await apiClient.get<any[]>('/lead-sources');
        const sources = Array.isArray(response.data) ? response.data : [];
        const options = sources.map((source: any) => {
          const rawId = source.id ?? source.value ?? source.source_id ?? source.lead_source_id;
          const id = rawId !== undefined && rawId !== null ? String(rawId) : '';
          const name = String(source.name ?? source.label ?? source.source ?? source.value ?? '');
          return {
            value: id || name,
            label: name,
          };
        });
        setSourceOptions(options);
      } catch (error) {
        console.error('Failed to fetch lead sources:', error);
        setSourceOptions([]);
      }
    };
    fetchSources();
  }, []);

  useEffect(() => {
    const fetchMediaTypes = async () => {
      try {
        const response = await apiClient.get<any[]>('/media-types');
        const mediaTypes = Array.isArray(response.data) ? response.data : [];
        const options = mediaTypes.map((item: any) => {
          const rawId = item.id ?? item.value;
          const id = rawId !== undefined && rawId !== null ? String(rawId) : '';
          const name = String(item.name ?? item.label ?? item.type ?? '');
          return {
            value: id || name,
            label: name,
          };
        });
        setMediaTypeOptions(options);
      } catch (error) {
        console.error('Failed to fetch media types:', error);
        setMediaTypeOptions([]);
      }
    };
    fetchMediaTypes();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get('/users/list');
        const users = Array.isArray((response as any).data) ? (response as any).data : [];
        const map: Record<string, string> = {};
        users.forEach((user: any) => {
          if (user.id && user.name) {
            map[String(user.id)] = user.name;
          }
        });
        setUserMap(map);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchAssignOptionsForPage = async () => {
      if (currentData.length === 0) {
        setAssignOptionsByCampaignId({});
        return;
      }

      const results = await Promise.all(
        currentData.map(async (campaign) => {
          try {
            const users = await listChildUsersByMissCampaign(campaign.id);
            return [campaign.id, users.map((u) => ({ id: u.id, name: u.name }))] as const;
          } catch (err) {
            console.error(`Failed to fetch assign to users for pre-lead ${campaign.id}:`, err);
            try {
              const users = await listChildUsers(1000);
              return [campaign.id, users.map((u) => ({ id: u.id, name: u.name }))] as const;
            } catch (fallbackErr) {
              console.error(`Failed fallback assign to users for pre-lead ${campaign.id}:`, fallbackErr);
              return [campaign.id, []] as const;
            }
          }
        })
      );

      if (cancelled) return;
      setAssignOptionsByCampaignId(Object.fromEntries(results));
    };

    fetchAssignOptionsForPage();

    return () => {
      cancelled = true;
    };
  }, [currentData]);

  const handleEdit = (id: string) => navigate(`/pre-lead/view/${encodeURIComponent(id)}/edit`);
  const handleView = (id: string) => navigate(`/pre-lead/view/${encodeURIComponent(id)}`);
  // open confirmation modal instead of immediate delete
  const handleDelete = (id: string, label?: string) => {
    setConfirmDeleteId(id);
    setConfirmDeleteLabel(label || id);
  };

  // const handleChat = (item: MissCampaign) => {
  //   // TODO: Implement chat functionality
  //   console.log('Chat clicked for item:', item);
  //   // You can navigate to a chat page or open a chat modal here
  //   // For now, just showing an alert
  //   SweetAlert.showInfo(`Chat with ${item.assignTo || 'user'}`, { title: 'Chat feature coming soon!' });
  // };

  const handleCreate = () => navigate('/pre-lead/create');

  const handleAssignToChange = (campaignId: string, newSalesMan: string) => {
    const previousCampaigns = [...campaigns];
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === campaignId ? { ...c, assignTo: newSalesMan } : c
      )
    );
    (async () => {
      try {
        const numericId = String(campaignId).replace(/\D/g, '');
        const found = (assignOptionsByCampaignId[campaignId] || []).find(u => u.name === newSalesMan);
        const fallbackAssignId = Object.entries(userMap).find(([, name]) => name === newSalesMan)?.[0];
        const assignToId = found?.id != null ? String(found.id) : fallbackAssignId;
        if (assignToId) {
          await updateMissCampaignWithForm(numericId, { assign_to: assignToId });
          SweetAlert.showUpdateSuccess();
        } else {
          try { SweetAlert.showError('User ID not found'); } catch {
            // no need to action
          }
          setCampaigns(previousCampaigns);
        }
      } catch (err) {
        console.warn('Failed to persist assign_to change', err);
        try { SweetAlert.showError('Failed to update assignment'); } catch {
          // no need to action
        }
        setCampaigns(previousCampaigns);
      }
    })();
  };

  const handleAssignConfirm = async (_newSalesMan: string) => {
    void _newSalesMan;
  };

  const handleSave = async () => {
    try {
      setCurrentPage(1);
      await fetchCampaigns(1, searchQuery, activeFilters);
      try { SweetAlert.showCreateSuccess(); } catch {
        //no need to action
      }
      // Refresh notifications in Redux after campaign create
      try {
        const [count, notificationsRes] = await Promise.all([
          getUnreadNotificationCount(),
          listNotifications(1, 10, 'all', [])
        ]);
        dispatch(setUnreadCount({ module: 'all', count }));
        dispatch(setNotifications({ module: 'all', notifications: notificationsRes.data || [], total: notificationsRes.meta?.pagination?.total || 0 }));
      } catch (notifErr) {
        console.error('Failed to refresh notifications:', notifErr);
      }
    } catch (error) {
      console.error('Failed to refresh campaigns:', error);
    }
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setConfirmLoading(true);
    try {
      await deleteMissCampaign(confirmDeleteId);
      try { SweetAlert.showDeleteSuccess(); } catch {
        //no need to action
      }
      await fetchCampaigns(currentPage, searchQuery, activeFilters); // Refresh table from server
      // Refresh notifications in Redux after campaign delete
      try {
        const [count, notificationsRes] = await Promise.all([
          getUnreadNotificationCount(),
          listNotifications(1, 10, 'all', [])
        ]);
        dispatch(setUnreadCount({ module: 'all', count }));
        dispatch(setNotifications({ module: 'all', notifications: notificationsRes.data || [], total: notificationsRes.meta?.pagination?.total || 0 }));
      } catch (notifErr) {
        console.error('Failed to refresh notifications:', notifErr);
      }
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      try { SweetAlert.showError((error as any)?.message || 'Failed to delete campaign'); } catch {
        // no need to action
      }
    } finally {
      setConfirmLoading(false);
      setConfirmDeleteId(null);
      setConfirmDeleteLabel('');
    }
  };

  useEffect(() => {
    const rawId = params.id;
    const id = rawId ? decodeURIComponent(rawId) : undefined;

    if (location.pathname.endsWith('/create')) {
      setShowCreate(true);
      setViewItem(null);
      setEditItem(null);
      return;
    }

    if (location.pathname.endsWith('/edit') && id) {
      // For edit mode, fetch raw data with IDs from API
      const fetchFullData = async () => {
        try {
          const fullData = await getMissCampaign(id);
          setEditItem(fullData);
        } catch (err) {
          console.error('Failed to fetch campaign for editing:', err);
          // Fallback to campaign from list
          const found = campaigns.find(c => c.id === id) || null;
          setEditItem(found);
        }
      };
      fetchFullData();
      setViewItem(null);
      setShowCreate(false);
      return;
    }

    if (id) {
      // Previously view-by-id only searched already-loaded table rows (often missed off-page / deep-linked ids):
      // const found = campaigns.find(c => c.id === id) || null;
      // setViewItem(found);
      // setShowCreate(false);
      // setEditItem(null);
      // return;
      setShowCreate(false);
      setEditItem(null);
      return;
    }

    setShowCreate(false);
    setViewItem(null);
    setEditItem(null);
  }, [location.pathname, params.id, campaigns]);

  // Previously there was no GET-by-id fetch for view mode; details relied on `campaigns.find` in the effect above.
  useEffect(() => {
    const rawId = params.id;
    const id = rawId ? decodeURIComponent(rawId) : undefined;

    if (!id || location.pathname.endsWith('/edit')) {
      setViewDetailLoading(false);
      return undefined;
    }

    let cancelled = false;
    setViewDetailLoading(true);

    getMissCampaign(id)
      .then((data) => {
        if (cancelled) return;
        setViewItem(mapMissCampaignApiToMissCampaign(data));
        setViewDetailLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch pre-lead by id:', err);
        if (cancelled) return;
        const found = campaignsRef.current.find((c) => c.id === id) || null;
        setViewItem(found);
        setViewDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, params.id]);

  // Tooltip helpers removed - tooltip functionality not currently in use

  const handleSaveEdited = async () => {
    try {
      await fetchCampaigns(1, searchQuery, activeFilters);
      try { SweetAlert.showUpdateSuccess(); } catch {
        // no need to action
      }
      // Refresh notifications in Redux after campaign update
      try {
        const [count, notificationsRes] = await Promise.all([
          getUnreadNotificationCount(),
          listNotifications(1, 10, 'all', [])
        ]);
        dispatch(setUnreadCount({ module: 'all', count }));
        dispatch(setNotifications({ module: 'all', notifications: notificationsRes.data || [], total: notificationsRes.meta?.pagination?.total || 0 }));
      } catch (notifErr) {
        console.error('Failed to refresh notifications:', notifErr);
      }
    } catch (error) {
      console.error('Failed to refresh campaigns:', error);
    }
  };

  // Fetch campaigns on mount and when search/filter changes in all-data mode
  useEffect(() => {
    if (shouldFetchAll) {
      fetchCampaigns(1, searchQuery, activeFilters);
    }
  }, [shouldFetchAll, searchQuery, activeFilters, fetchCampaigns]);

  // Fetch only non-filtered paginated pages when page changes
  useEffect(() => {
    if (!shouldFetchAll) {
      fetchCampaigns(currentPage, searchQuery, activeFilters);
    }
  }, [currentPage, shouldFetchAll, fetchCampaigns, searchQuery, activeFilters]);

  // Listen for external updates (create/edit from other routes) and refresh list
  useEffect(() => {
    const onExternalUpdate = () => {
      // go to first page and refresh from server
      setCurrentPage(1);
      fetchCampaigns(1, searchQuery, activeFilters);
    };

    window.addEventListener('missCampaigns:update', onExternalUpdate);
    return () => window.removeEventListener('missCampaigns:update', onExternalUpdate);
  }, [searchQuery, activeFilters, fetchCampaigns]);

  const handleFilterChange = (filters: Record<string, string>) => {
    setActiveFilters(filters);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleExportExcel = useCallback(
    () => exportMissCampaignsExcel(searchQuery, activeFilters),
    [searchQuery, activeFilters]
  );

  const filterOptions = [
    {
      key: 'industry_id',
      label: 'Industry',
      options: industryOptions
    },
    {
      key: 'lead_source_id',
      label: 'Source',
      options: sourceOptions
    },
    {
      key: 'media_type',
      label: 'Media Type',
      options: mediaTypeOptions
    }
  ].filter(option => option.options.length > 0); // Only show filters that have options

  // If navigated back with a refresh flag in location.state, refresh and clear state
  useEffect(() => {
    const s = (location.state as any) || {};
    if (s.refreshedAt) {
      setCurrentPage(1);
      fetchCampaigns(1, searchQuery, activeFilters);
      // clear the navigation state so this runs only once
      try {
        navigate(location.pathname, { replace: true, state: {} });
      } catch {
        // no need to action
      }
    }
  }, [location.state, location.pathname, navigate, searchQuery, activeFilters, fetchCampaigns]);

  const handlePageChange = (page: number) => setCurrentPage(page);

  const rawRouteId = params.id;
  const decodedRouteId = rawRouteId ? decodeURIComponent(rawRouteId) : undefined;
  const isPreLeadDetailRoute =
    Boolean(decodedRouteId) && !location.pathname.endsWith('/edit');

  // Previously there was no dedicated loading / not-found return for `/pre-lead/view/:id`; the main layout rendered immediately (table could flash before detail resolved).
  if (isPreLeadDetailRoute && viewDetailLoading) {
    return (
      <div className="flex-1 p-6 w-full">
        <div className="flex items-center justify-center min-h-[24rem]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
            <p className="mt-4 text-gray-600">Loading pre lead...</p>
          </div>
        </div>
      </div>
    );
  }

  if (
    isPreLeadDetailRoute &&
    !viewDetailLoading &&
    !viewItem &&
    !editItem
  ) {
    return (
      <div className="flex-1 p-6 w-full">
        <div className="flex flex-col items-center justify-center min-h-[24rem] gap-4">
          <p className="text-gray-600">Pre lead not found or failed to load.</p>
          <button
            type="button"
            onClick={() => navigate('/pre-lead/view')}
            className="flex items-center space-x-2 btn-primary text-white px-4 py-2 rounded-lg"
          >
            <IoIosArrowBack className="w-5 h-5" />
            <span className="text-sm">Back to list</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden h-full">
      {/* SweetAlert is used for inline success/error notifications */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title={`Delete campaign "${confirmDeleteLabel}"?`}
        message="This will permanently remove the campaign. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={confirmLoading}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
      />
      {showCreate ? (

        <Create inline onClose={() => navigate('/pre-lead/view')} onSave={handleSave} />
      ) : viewItem ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex flex-col">
              <Breadcrumb />
            </div>
            <button onClick={() => navigate('/pre-lead/view')} className="flex items-center space-x-2 btn-primary text-white px-3 py-1 rounded-lg">
              <IoIosArrowBack className="w-5 h-5" />
              <span className="text-sm">Go Back</span>
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Pre Lead Details</h3>
            </div>

            <div className="px-3 py-5 md:p-6">
              {/* Header Section */}
              <div className="mb-6">
                <h2 className="text-4xl font-bold text-gray-800 mb-2">{viewItem.brandName}</h2>
                <p className="text-lg text-gray-600">{viewItem.productName}</p>
              </div>



              <div className="grid md:grid-cols-2 gap-6">
                {/* Proof Image — section always visible; image only when URL exists */}
                {/* Previously: {viewItem.proof && ( ... entire card ... )} so nothing showed when no image */}
                <div className="mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-3">Proof Image</h4>
                    {viewItem.proof ? (
                      <img
                        src={viewItem.proof}
                        alt="Campaign Proof"
                        title="Click to view full image"
                        className="w-full max-h-96 object-contain rounded-lg border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => openImageModal(viewItem.proof)}
                      />
                    ) : (
                      <div className="flex min-h-[14rem] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400">
                        No proof image uploaded
                      </div>
                    )}
                  </div>
                </div>


                {/* Details Grid */}
                <div className="xl:grid xl:grid-cols-2 gap-4">
                  <div className='flex bg-gray-100 p-4 rounded-lg mb-3'>
                    <div className="text-sm text-gray-800 font-semibold min-w-[100px]">ID : </div>
                    <div className="text-sm text-gray-600">{viewItem.id}</div>
                  </div>

                  <div className='flex bg-gray-100 p-3 rounded-lg mb-3'>
                    <div className="text-sm text-gray-800 font-semibold min-w-[100px]">Source : </div>
                    <div className="text-sm text-gray-600">{viewItem.source || '-'}</div>
                  </div>
                  <div className='flex bg-gray-100 p-3 rounded-lg mb-3'>
                    <div className="text-sm text-gray-800 font-semibold min-w-[100px]">Sub Source : </div>
                    <div className="text-sm text-gray-600">{viewItem.subSource || '-'}</div>
                  </div>
                  <div className='flex bg-gray-100 p-3 rounded-lg mb-3'>
                    <div className="text-sm text-gray-800 font-semibold min-w-[100px]">Organisation : </div>
                    <div className="text-sm text-gray-600">{viewItem.organisation || '-'}</div>
                  </div>
                  <div className='flex bg-gray-100 p-3 rounded-lg mb-3'>
                    <div className="text-sm text-gray-800 font-semibold min-w-[100px]">Industry : </div>
                    <div className="text-sm text-gray-600">{viewItem.industry || '-'}</div>
                  </div>
                  <div className='flex bg-gray-100 p-3 rounded-lg mb-3'>
                    <div className="text-sm text-gray-800 font-semibold min-w-[100px]">Assign To : </div>
                    <div className="text-sm text-gray-600">{userMap[String(viewItem.assignTo).replace(/^#USR0*/, '')] || viewItem.assignTo || '-'}</div>
                  </div>
                  <div className='flex bg-gray-100 p-3 rounded-lg mb-3'>
                    <div className="text-sm text-gray-800 font-semibold min-w-[100px]">Media Type : </div>
                    <div className="text-sm text-gray-600">{viewItem.mediaType || '-'}</div>
                  </div>
                  <div className='flex bg-gray-100 p-3 rounded-lg mb-3'>
                    <div className="text-sm text-gray-800 font-semibold min-w-[100px]">City : </div>
                    <div className="text-sm text-gray-600">{viewItem.city || '-'}</div>
                  </div>
                  <div className='flex bg-gray-100 p-3 rounded-lg mb-3'>
                    <div className="text-sm text-gray-800 font-semibold min-w-[100px]">State : </div>
                    <div className="text-sm text-gray-600">{viewItem.state || '-'}</div>
                  </div>
                  <div className='flex bg-gray-100 p-3 rounded-lg mb-3'>
                    <div className="text-sm text-gray-800 font-semibold min-w-[100px]">Country : </div>
                    <div className="text-sm text-gray-600">{viewItem.country || '-'}</div>
                  </div>
                  <div className='flex bg-gray-100 p-3 rounded-lg mb-3 col-span-2'>
                    <div className="text-sm text-gray-800 font-semibold min-w-[100px]">Date & Time : </div>
                    <div className="text-sm text-gray-600">{viewItem.dateTime || '-'}</div>
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        </>
      ) : editItem ? (
        <Create
          inline
          mode="edit"
          initialData={editItem}
          onClose={() => navigate('/pre-lead/view')}
          onSave={handleSaveEdited}
        />
      ) : (
        <>
          {(hasPermission('miss-campaigns.create')) && (
            <MasterHeader onCreateClick={handleCreate} createButtonLabel="Create Pre Lead" createPermissionSlug="miss-campaigns.create" />
          )}

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            {/* Table Header */}
            <TableHeader
              title="Pre Lead"
              filterOptions={filterOptions}
              onFilterChange={handleFilterChange}
              appliedFilters={activeFilters}
            >
              <SearchBar
                className="w-full"
                delay={0}
                placeholder="Search Pre Lead"
                onSearch={(q: string) => {
                  setSearchQuery(q);
                  setCurrentPage(1);
                }}
              />
              <ExportExcelButton
                className="w-full sm:w-auto"
                buttonClassName="btn-primary !bg-gray-800 w-full sm:w-auto"
                fetchExport={handleExportExcel}
              />
            </TableHeader>


            <div className="pt-0 overflow-visible">
              <Table
                data={currentData}
                startIndex={startIndex}
                loading={loading}
                desktopOnMobile={true}
                keyExtractor={(it: MissCampaign, idx: number) => `${it.id}-${idx}`}
                columns={([
                  { key: 'sr', header: 'Id', render: (it: MissCampaign) => `#${it.id}` },
                  { key: 'brandName', header: 'Brand Name', render: (it: MissCampaign) => it.brandName },
                  { key: 'industry', header: 'Industry', render: (it: MissCampaign) => it.industry || '-' },
                  { key: 'productName', header: 'Product Name ', render: (it: MissCampaign) => it.productName },
                  { key: 'source', header: 'Source', render: (it: MissCampaign) => it.source },
                  { key: 'subSource', header: 'Sub Source', render: (it: MissCampaign) => it.subSource },
                  { key: 'city', header: 'City', render: (it: MissCampaign) => it.city },
                  { key: 'state', header: 'State', render: (it: MissCampaign) => it.state },
                  { key: 'country', header: 'Country', render: (it: MissCampaign) => it.country },
                  { key: 'organisation', header: 'Organisation', render: (it: MissCampaign) => it.organisation || '-' },
                  {
                    key: 'assignBy', header: 'Created By', render: (it: MissCampaign) => {
                      const cleanId = it.assignBy ? String(it.assignBy).replace(/^#USR0*/, '') : '';
                      return userMap[cleanId] || it.assignBy || '-';
                    }
                  },
                  {
                    key: 'assignTo', header: 'Assign To', render: (it: MissCampaign) => {
                      const cleanId = it.assignTo ? String(it.assignTo).replace(/^#USR0*/, '') : '';
                      const displayedName = userMap[cleanId] || it.assignTo || '';
                      const rowAssignOptions = assignOptionsByCampaignId[it.id] || [];
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
                  },
                  { key: 'mediaType', header: 'Media Type', render: (it: MissCampaign) => it.mediaType || '-' },
                  {
                    key: 'proof',
                    header: 'Proof',
                    render: (it: MissCampaign) => (
                      <div className="flex items-center justify-center">
                        {it.proof ? (
                          <img
                            src={it.proof}
                            alt="Proof"
                            className="h-16 w-16 object-cover rounded border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow !bg-white p-2"
                            onClick={() => openImageModal(it.proof)}
                          />
                        ) : (
                          <div
                            className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-400"
                            title="No proof image"
                          >
                            —
                          </div>
                        )}
                      </div>
                    ),
                  },
                  { key: 'dateTime', header: 'Date & Time', render: (it: MissCampaign) => it.dateTime },
                ] as Column<MissCampaign>[])}
                onEdit={(it: MissCampaign) => handleEdit(it.id)}
                onView={(it: MissCampaign) => handleView(it.id)}
                onDelete={(it: MissCampaign) => handleDelete(it.id)}
                editPermissionSlug="miss-campaigns.edit"
                viewPermissionSlug="miss-campaigns.view"
                deletePermissionSlug="miss-campaigns.delete"
                uploadPermissionSlug="miss-campaigns.upload"

              />
            </div>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={totalFilteredItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
          />
          {/* Tooltip popup for full proof text */}
        </>
      )}
      {/* Image modal — placed outside list/detail branches so Pre Lead view page can open proof fullscreen too */}
      {imageModalOpen && modalImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={closeImageModal}
        >
          <div
            className="relative bg-white rounded-lg shadow-lg p-4 max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={modalImageUrl}
              alt="Proof full"
              className="max-w-[84vw] max-h-[84vh] object-contain"
            />
            <div
              role="button"
              tabIndex={0}
              aria-label="Close"
              onClick={closeImageModal}
              onKeyDown={(e) => { if (e.key === 'Enter') closeImageModal(); }}
              className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full p-1 border z-50 cursor-pointer flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default View;