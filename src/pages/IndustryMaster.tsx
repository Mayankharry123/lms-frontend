/**
 * @file IndustryMaster.tsx
 * @description Industry master data list, create, view, and edit.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect, useRef } from 'react';
import Table, { type Column } from '../components/ui/Table';
import CreateIndustryForm from './CreateIndustryForm';
import MasterView from '../components/ui/MasterView';
import MasterEdit from '../components/ui/MasterEdit';
import Pagination from '../components/ui/Pagination';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ROUTES } from '../constants';
import { MasterHeader } from '../components/ui';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import SearchBar from '../components/ui/SearchBar';
import { listIndustries, getIndustry, deleteIndustry, updateIndustry, type Industry as ApiIndustry } from '../services/IndustryMaster';
import { usePermissions } from '../hooks/SidebarMenuHooks';

import SweetAlert from '../utils/SweetAlert';
import TableHeader from '../components/ui/TableHeader';

import type { IndustryTableRow } from '../types/master/master.types';

/** Normalise API `created_at` for table / MasterView (matches list mapping). */
const parseCreatedAt = (val?: string | null) => {
  if (!val) return '';
  const tryDate = new Date(val);
  if (!isNaN(tryDate.getTime())) return tryDate.toISOString();

  const m = /^([0-3]\d)-([0-1]\d)-(\d{4})\s+(\d{2}:\d{2}:\d{2})$/.exec(val.trim());
  if (m) {
    const [, dd, mm, yyyy, time] = m;
    const iso = `${yyyy}-${mm}-${dd}T${time}`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return val;
};

const IndustryMaster: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const itemsPerPage = 10;

  const [industries, setIndustries] = useState<IndustryTableRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { hasPermission } = usePermissions();

  // Backend pagination: no client-side filtering for now
  const currentData = industries;
  const startIndex = (currentPage - 1) * itemsPerPage;

  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  const handleCreateIndustry = () => navigate(`${ROUTES.INDUSTRY_MASTER}/create`);

  const handleSaveIndustry = (data?: any) => {
    // Optimistic prepend so UI shows newly created item immediately
    const newItem: IndustryTableRow = {
      id: String(data?.id || `I${String(industries.length + 1).padStart(3, '0')}`),
      name: data?.name || '',
      dateTime: new Date().toISOString(),
    };
    setIndustries(prev => [newItem, ...prev]);
    setCurrentPage(1);

    // Show SweetAlert success then navigate back to listing and reload
    SweetAlert.showCreateSuccess();
    setTimeout(() => {
      navigate(ROUTES.INDUSTRY_MASTER);
      // Force reload to ensure fresh data
      window.location.reload();
    }, 1800);
  };

  const handleEdit = (id: string) => {
    navigate(`${ROUTES.INDUSTRY_MASTER}/${encodeURIComponent(id)}/edit`);
  };
  const handleView = (id: string) => {
    navigate(`${ROUTES.INDUSTRY_MASTER}/${encodeURIComponent(id)}`);
  };
  // Trigger a confirmation modal (instead of browser confirm)
  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setConfirmLoading(true);
    try {
      await deleteIndustry(confirmDeleteId);
      setIndustries(prev => prev.filter(i => i.id !== confirmDeleteId));
      SweetAlert.showDeleteSuccess();
    } catch (e: any) {
      SweetAlert.showError(e?.message || 'Failed to delete');
    } finally {
      setConfirmLoading(false);
      setConfirmDeleteId(null);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const [viewItem, setViewItem] = useState<IndustryTableRow | null>(null);
  const [editItem, setEditItem] = useState<IndustryTableRow | null>(null);
  const [activeEditId, setActiveEditId] = useState<string>('');
  const updateInFlightRef = useRef(false);

  const industriesRef = useRef<IndustryTableRow[]>([]);
  industriesRef.current = industries;

  const refresh = async (page = currentPage, search = searchQuery) => {
    setLoading(true);
    setError(null);
    try {
      // When searching, fetch a large page so we can search across the full dataset
      const pageToFetch = search ? 1 : page;
      const perPageToFetch = search ? 1000 : itemsPerPage;

      const resp = await listIndustries(pageToFetch, perPageToFetch);

      let mapped: IndustryTableRow[] = (resp.data || []).map((it: ApiIndustry) => ({
        id: String(it.id),
        name: it.name,
        dateTime: parseCreatedAt(it.created_at),
      }));

      if (search) {
        const _q_ind = String(search).trim().toLowerCase();
        const filtered = mapped.filter(i => (i.name || '').toLowerCase().startsWith(_q_ind));
        setTotalItems(filtered.length);

        // Apply client-side pagination to filtered results
        const startIdx = (page - 1) * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        mapped = filtered.slice(startIdx, endIdx);
      } else {
        setTotalItems(resp.meta?.pagination?.total || mapped.length);
      }

      setIndustries(mapped);
    } catch (e: any) {
      setError(e?.message || 'Failed to load industries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh(currentPage, searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchQuery]);


  useEffect(() => {
    const rawId = params.id;
    const id = rawId ? decodeURIComponent(rawId) : undefined;

    if (location.pathname.endsWith('/create')) {
      setViewItem(null);
      setEditItem(null);
      return;
    }

    if (location.pathname.endsWith('/edit') && id) {
      return;
    }

    if (!id) {
      setViewItem(null);
      setEditItem(null);
      setActiveEditId('');
      return;
    }

    setEditItem(null);
    setActiveEditId('');
  }, [location.pathname, params.id]);

  useEffect(() => {
    const rawId = params.id;
    const id = rawId ? decodeURIComponent(rawId) : undefined;
    if (!location.pathname.endsWith('/edit') || !id) return;

    let cancelled = false;
    setActiveEditId(id);
    getIndustry(id)
      .then((data) => {
        if (cancelled) return;
        setEditItem({
          id: String(data.id),
          name: String(data.name ?? ''),
          dateTime: parseCreatedAt(data.created_at),
        });
        setViewItem(null);
      })
      .catch(() => {
        if (cancelled) return;
        const found = industriesRef.current.find(i => i.id === id) || null;
        setEditItem(found);
        setViewItem(null);
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
    getIndustry(id)
      .then(data => {
        if (cancelled) return;
        setViewItem({
          id: String(data.id),
          name: String(data.name ?? ''),
          dateTime: parseCreatedAt(data.created_at),
        });
      })
      .catch(() => {
        if (cancelled) return;
        const found = industriesRef.current.find((i: IndustryTableRow) => i.id === id) || null;
        setViewItem(found);
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, params.id]);

  const handleSaveEditedIndustry = async (updated: Record<string, any>) => {
    // Return a promise and allow caller (`MasterEdit`) to catch and display field errors inline.
    return (async () => {
      if (updateInFlightRef.current) return;
      try {
        updateInFlightRef.current = true;
        const idToUpdate = activeEditId || String(updated.id || '').trim();
        if (!idToUpdate) throw new Error('Industry id is missing');
        await updateIndustry(idToUpdate, { name: updated.name });
        // Refresh the list from server so table shows latest data
        await refresh();
        SweetAlert.showUpdateSuccess();
      } finally {
        updateInFlightRef.current = false;
      }
    })();
  };

  const renderPagination = () => {
    return (
      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
      />
    );
  };

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Delete this industry?"
        message="This action will permanently remove the industry. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={confirmLoading}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
      />
      {location.pathname.endsWith('/create') ? (
        <CreateIndustryForm onClose={() => navigate(ROUTES.INDUSTRY_MASTER)} onSave={handleSaveIndustry} />
      ) : viewItem ? (
        <MasterView item={viewItem} onClose={() => navigate(ROUTES.INDUSTRY_MASTER)} />
      ) : editItem ? (
        <MasterEdit item={editItem} onClose={() => navigate(ROUTES.INDUSTRY_MASTER)} onSave={handleSaveEditedIndustry} hideSource nameLabel="Industry" />
      ) : (
        <>
          <MasterHeader
            onCreateClick={handleCreateIndustry}
            createButtonLabel="Create Industry"
            showBreadcrumb={true}
            showCreateButton={hasPermission('industry.create')}
            createPermissionSlug="industry.create"
          />
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4">
            {/* Table Header */}
            <TableHeader title="Industry Master">
              <SearchBar
                placeholder="Search Industry"
                delay={300}
                onSearch={(q: string) => {
                  setSearchQuery(q);
                  setCurrentPage(1);
                  refresh(1, q);
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
                  { key: 'name', header: 'Industry Name', render: (it: any) => it.name || '-' },
                  {
                    key: 'dateTime', header: 'Date & Time', render: (it: any) => {
                      if (!it.dateTime) return '-';
                      const d = new Date(it.dateTime);
                      return isNaN(d.getTime()) ? String(it.dateTime) : d.toLocaleString();
                    }
                  },
                ] as Column<any>[])}
                onEdit={(it: any) => handleEdit(it.id)}
                onView={(it: any) => handleView(it.id)}
                onDelete={(it: any) => handleDelete(it.id)}
                editPermissionSlug="industry.edit"
                viewPermissionSlug="industry.view"
                deletePermissionSlug="industry.delete"
              />
            </div>
          </div>

          {/* Pagination */}
          {renderPagination()}
        </>
      )}
    </div>
  );
};

export default IndustryMaster;
