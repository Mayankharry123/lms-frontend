/**
 * @file LeadSource.tsx
 * @description Lead source master data list, create, view, and edit.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Pagination from '../components/ui/Pagination';
import CreateSourceForm from './CreateSourceForm';
import MasterView from '../components/ui/MasterView';
import MasterEdit from '../components/ui/MasterEdit';
import { MasterHeader } from '../components/ui';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import SearchBar from '../components/ui/SearchBar';
import Table, { type Column } from '../components/ui/Table';
import { listLeadSources, getLeadSource, deleteLeadSubSource, updateLeadSubSource, type LeadSourceItem } from '../services/LeadSource';
import { ROUTES } from '../constants';
import { usePermissions } from '../hooks/SidebarMenuHooks';

import SweetAlert from '../utils/SweetAlert';
import TableHeader from '../components/ui/TableHeader';

const LeadSource: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LeadSourceItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewItem, setViewItem] = useState<LeadSourceItem | null>(null);
  const [editItem, setEditItem] = useState<LeadSourceItem | null>(null);
  const [activeEditId, setActiveEditId] = useState<string>('');
  const [activeLeadSourceId, setActiveLeadSourceId] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteLabel, setConfirmDeleteLabel] = useState<string>('');
  const [confirmLoading, setConfirmLoading] = useState(false);

  const itemsRef = useRef<LeadSourceItem[]>([]);
  itemsRef.current = items;
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  const { hasPermission } = usePermissions();
  const rawId = params.id;
  const routeId = rawId ? decodeURIComponent(rawId) : undefined;
  const isCreateRoute = location.pathname.endsWith('/create');
  const isEditRoute = location.pathname.endsWith('/edit') && Boolean(routeId);
  const isViewRoute = Boolean(routeId) && !location.pathname.endsWith('/edit');
  const isListRoute = !isCreateRoute && !isEditRoute && !isViewRoute;

  useEffect(() => {
    if (!isListRoute) return;
    let isMounted = true;

    const fetchData = async (page = currentPage, search = searchQuery) => {
      setLoading(true);
      setError(null);
      try {
        const resp = await listLeadSources(page, itemsPerPage); // uses itemsPerPage
        if (!isMounted) return;
        let mapped = resp.data;

        if (search) {
          const _q_ls = String(search).trim().toLowerCase();
          mapped = mapped.filter((it) => (
            (String(it.id || '').toLowerCase().startsWith(_q_ls)) ||
            (String(it.source || '').toLowerCase().startsWith(_q_ls)) ||
            (String(it.subSource || '').toLowerCase().startsWith(_q_ls))
          ));
        }

        setItems(mapped);

        if (search) {
          setTotalItems(mapped.length);
        } else {
          setTotalItems(resp.meta?.pagination?.total || mapped.length);
        }
      } catch (e: any) {
        if (isMounted) setError(e?.message || 'Failed to load lead sources');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    (async () => { await fetchData(); })();

    return () => { isMounted = false; };
  }, [currentPage, searchQuery, itemsPerPage, isListRoute]); // ✅ added itemsPerPage

  // Helper so other handlers can reload the list after actions
  const refresh = async (page = currentPage, search = searchQuery) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await listLeadSources(page, itemsPerPage);
      let mapped = resp.data;
      if (search) {
        const _q_ls = String(search).trim().toLowerCase();
        mapped = mapped.filter((it) => (
          (String(it.id || '').toLowerCase().startsWith(_q_ls)) ||
          (String(it.source || '').toLowerCase().startsWith(_q_ls)) ||
          (String(it.subSource || '').toLowerCase().startsWith(_q_ls))
        ));
        setTotalItems(mapped.length);
      } else {
        setTotalItems(resp.meta?.pagination?.total || mapped.length);
      }
      setItems(mapped);
    } catch (e: any) {
      setError(e?.message || 'Failed to load lead sources');
    } finally {
      setLoading(false);
    }
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = items;

  const handleCreate = () => {
    navigate(`${ROUTES.SOURCE_MASTER}/create`);
  };

  const handlePageChange = (page: number) => setCurrentPage(page);

  const handleSaveSource = (data: any) => {
    // Optimistic prepend (API create can be wired later)
    const newItem: LeadSourceItem = {
      id: `LS${String(items.length + 1).padStart(3, '0')}`,
      source: data.source,
      subSource: data.subSource,
      dateTime: new Date().toISOString(),
    };
    setItems(prev => [newItem, ...prev]);
    setCurrentPage(1);
    // Show SweetAlert success then navigate back to listing and reload
    SweetAlert.showCreateSuccess();
    setTimeout(() => {
      navigate(ROUTES.SOURCE_MASTER);
      // Force reload to ensure fresh data
      window.location.reload();
    }, 1800);
  };

  const handleView = (item: LeadSourceItem) => {
    navigate(`${ROUTES.SOURCE_MASTER}/${encodeURIComponent(item.id)}`);
  };

  const handleEdit = (item: LeadSourceItem) => {
    navigate(`${ROUTES.SOURCE_MASTER}/${encodeURIComponent(item.id)}/edit`);
  };

  const handleSaveEdit = async (updated: Record<string, any>) => {
    // Let MasterEdit handle errors inline by returning a promise
    return (async () => {
      // Map UI fields to API payload
      const name = updated.subSource ?? updated.name ?? '';
      const leadSourceId = activeLeadSourceId || updated.source;
      if (!leadSourceId) {
        throw new Error('Lead source id is missing');
      }
      const idToUpdate = activeEditId || String(updated.id || '').trim();
      if (!idToUpdate) {
        throw new Error('Lead sub-source id is missing');
      }
      await updateLeadSubSource(idToUpdate, {
        name,
        lead_source_id: leadSourceId,
        status: 1,
      });
      // Show SweetAlert update success
      SweetAlert.showUpdateSuccess();
    })();
  };

  // open confirmation modal instead of browser confirm
  const handleDelete = (item: LeadSourceItem) => {
    setConfirmDeleteId(item.id);
    setConfirmDeleteLabel(item.subSource || item.id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setConfirmLoading(true);
    try {
      await deleteLeadSubSource(confirmDeleteId);
      // Refetch the lead sources list after delete
      await refresh();
      SweetAlert.showDeleteSuccess();
    } catch (e: any) {
      SweetAlert.showError(e?.message || 'Failed to delete');
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
      setViewItem(null);
      setEditItem(null);
      setActiveEditId('');
      setActiveLeadSourceId('');
      return;
    }

    if (location.pathname.endsWith('/edit') && id) {
      return;
    }

    if (!id) {
      setViewItem(null);
      setEditItem(null);
      setActiveEditId('');
      setActiveLeadSourceId('');
      return;
    }

    setEditItem(null);
    setActiveEditId('');
    setActiveLeadSourceId('');
  }, [location.pathname, params.id]);

  useEffect(() => {
    const rawId = params.id;
    const id = rawId ? decodeURIComponent(rawId) : undefined;
    if (!location.pathname.endsWith('/edit') || !id) return;

    let cancelled = false;
    setActiveEditId(id);
    setActiveLeadSourceId('');
    getLeadSource(id)
      .then((data) => {
        if (cancelled) return;
        const mappedSourceId = String(data.leadSourceId || '');
        setActiveLeadSourceId(mappedSourceId);
        setEditItem({
          id: data.id,
          source: mappedSourceId || data.source,
          subSource: data.subSource,
          dateTime: data.dateTime,
        });
        setViewItem(null);
      })
      .catch(() => {
        if (cancelled) return;
        const found = itemsRef.current.find(i => i.id === id) || null;
        setEditItem(found);
        setViewItem(null);
        setActiveLeadSourceId(found?.leadSourceId ?? '');
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, params.id]);

  useEffect(() => {
    const rawId = params.id;
    const id = rawId ? decodeURIComponent(rawId) : undefined;

    if (!id || location.pathname.endsWith('/create') || location.pathname.endsWith('/edit')) {
      return;
    }

    let cancelled = false;
    getLeadSource(id)
      .then(data => {
        if (cancelled) return;
        setViewItem({
          id: data.id,
          source: data.source,
          subSource: data.subSource,
          dateTime: data.dateTime,
        });
      })
      .catch(() => {
        if (cancelled) return;
        const found = itemsRef.current.find(i => i.id === id) || null;
        setViewItem(found);
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, params.id]);

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title={`Delete sub-source "${confirmDeleteLabel}"?`}
        message="This will permanently remove the sub-source. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={confirmLoading}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
      />
      {isCreateRoute ? (
        <CreateSourceForm
          inline
          onClose={() => {
            navigate(ROUTES.SOURCE_MASTER);
            window.location.reload();
          }}
          onSave={(data: any) => {
            handleSaveSource(data);
          }}
        />
      ) : viewItem ? (
        <MasterView item={viewItem} onClose={() => navigate(ROUTES.SOURCE_MASTER)} />
      ) : editItem ? (
        <MasterEdit
          item={editItem}
          onClose={() => navigate(ROUTES.SOURCE_MASTER, { replace: true })}
          onSave={handleSaveEdit}
        />
      ) : (
        <>
          <MasterHeader
            onCreateClick={handleCreate}
            createButtonLabel="Create Source"
            showBreadcrumb={true}
            showCreateButton={hasPermission('source.create')}
            createPermissionSlug="source.create"
          />
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4">
            {/* Table Header */}
            <TableHeader title="Lead Sources">
              <SearchBar
                placeholder="Search Lead Source"
                delay={300}
                onSearch={(q: string) => {
                  setSearchQuery(q);
                  setCurrentPage(1);
                }}
              />
            </TableHeader>

            {error && (
              <div className="px-6 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <div className="pt-0 overflow-visible">
              <Table
                data={currentData}
                startIndex={startIndex}
                loading={loading}
                desktopOnMobile={true}
                keyExtractor={(it: any, idx: number) => `${it.id}-${idx}`}
                columns={([
                  { key: 'sr', header: 'Sr. No.', render: (it: any) => String(startIndex + currentData.indexOf(it) + 1) },
                  { key: 'source', header: 'Source', render: (it: any) => it.source || '-' },
                  { key: 'subSource', header: 'Sub-Source', render: (it: any) => it.subSource || '-' },
                  {
                    key: 'dateTime', header: 'Date & Time', render: (it: any) => {
                      if (!it.dateTime) return '-';
                      const d = new Date(it.dateTime);
                      return isNaN(d.getTime()) ? String(it.dateTime) : d.toLocaleString();
                    }
                  },
                ] as Column<any>[])}
                onEdit={(it: any) => handleEdit(it)}
                onView={(it: any) => handleView(it)}
                onDelete={(it: any) => handleDelete(it)}
                editPermissionSlug="source.edit"
                viewPermissionSlug="source.view"
                deletePermissionSlug="source.delete"
              />
            </div>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
};

export default LeadSource;
