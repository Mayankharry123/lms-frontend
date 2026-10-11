/**
 * @file DesignationMaster.tsx
 * @description Designation master data list, create, view, and edit.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect, useRef } from 'react';
import Pagination from '../components/ui/Pagination';
import { motion } from 'framer-motion';
import MasterView from '../components/ui/MasterView';
import MasterEdit from '../components/ui/MasterEdit';
import Table, { type Column } from '../components/ui/Table';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ROUTES } from '../constants';
import { MasterHeader, MasterFormHeader } from '../components/ui';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import SearchBar from '../components/ui/SearchBar';
import {
  listDesignations,
  getDesignation,
  deleteDesignation,
  updateDesignation,
  createDesignation,
  type Designation as ApiDesignation,
} from '../services/DesignationMaster';
import SweetAlert from '../utils/SweetAlert';
import { usePermissions } from '../hooks/SidebarMenuHooks';
import TableHeader from '../components/ui/TableHeader';
import type { DesignationTableRow } from '../types/master/master.types';

import { formatDisplayDate } from '../utils/masterDate';

// Inline CreateDesignationForm component
const CreateDesignationForm: React.FC<{
  onClose: () => void;
  onSave?: (data: any) => void;
}> = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const formatDateTime = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Designation Name is required');
      return;
    }
    try {
      const res: any = onSave ? (onSave as any)({ name, dateTime: formatDateTime(new Date()) }) : null;
      if (res && typeof res.then === 'function') await res;
      // If parent provided onSave (inline mode) let parent show success and handle navigation/reload.
      if (!onSave) {
        SweetAlert.showCreateSuccess();
        onClose();
      }
    } catch (err) {
      const message = (err as any)?.message || 'Failed to create designation';
      setError(message);
      // If parent provided `onSave` (inline mode) we only show inline field error.
      if (!onSave) SweetAlert.showError(message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="space-y-6"
    >
      <MasterFormHeader onBack={onClose} title="Create Designation" />
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 bg-gray-50 rounded-2xl ">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Designation Name <span className="text-red-500">*</span>
              </label>
              <input
                name="designationName"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                className={`w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 transition-colors ${error ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-black'
                  }`}
                placeholder="Please Enter Designation Name"
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? 'designationName-error' : undefined}
              />
              {error && (
                <div id="designationName-error" className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg btn-primary text-white shadow-sm"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

const DesignationMaster: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const { hasPermission } = usePermissions();

  // Store designations in state fetched from API
  const [designations, setDesignations] = useState<DesignationTableRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Backend pagination data
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = designations;

  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  const handleCreateDesignation = () => {
    navigate(`${ROUTES.DESIGNATION_MASTER}/create`);
  };

  const handleSaveDesignation = (data: any) => {
    // create on server then refresh list
    return (async () => {
      try {
        // API expects `title` for designation payload (see Postman traces)
        await createDesignation({ title: data.name } as any);
        await refresh();
        setCurrentPage(1);

        // Show SweetAlert success then navigate back to listing and reload
        SweetAlert.showCreateSuccess();
        setTimeout(() => {
          navigate(ROUTES.DESIGNATION_MASTER);
          window.location.reload();
        }, 1800);
      } catch (e: any) {
        // Try to extract field-specific validation messages from the API error
        let message = 'Failed to create designation';
        try {
          if (e) {
            // Axios-like error with server payload on `responseData` (from our apiClient)
            const resp = e.responseData || e.response || e;
            // Prefer response message
            if (resp && resp.message) message = String(resp.message);

            // Look for structured `errors` object (e.g. { title: ["..."] })
            const errorsObj = resp && (resp.errors || resp.data?.errors || resp.errors);
            if (errorsObj && typeof errorsObj === 'object') {
              const vals = Object.values(errorsObj)
                .flatMap((v: any) => (Array.isArray(v) ? v : [v]))
                .map((v: any) => String(v));
              if (vals.length) message = vals[0];
            }
          }
        } catch {
          // fallback to generic message on any extraction error
          message = e?.message || 'Failed to create designation';
        }

        // Rethrow an Error containing the friendly message so the inline form can display it
        const thrown = new Error(message);
        (thrown as any).original = e;
        throw thrown;
      }
    })();
  };

  const handleEdit = (id: string) => {
    navigate(`${ROUTES.DESIGNATION_MASTER}/${encodeURIComponent(id)}/edit`);
  };

  const handleView = (id: string) => {
    navigate(`${ROUTES.DESIGNATION_MASTER}/${encodeURIComponent(id)}`);
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setConfirmLoading(true);
    try {
      await deleteDesignation(confirmDeleteId);
      setDesignations(prev => prev.filter(d => d.id !== confirmDeleteId));
      SweetAlert.showDeleteSuccess();
    } catch (e: any) {
      SweetAlert.showError(e?.message || 'Failed to delete designation');
    } finally {
      setConfirmLoading(false);
      setConfirmDeleteId(null);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const [viewItem, setViewItem] = useState<DesignationTableRow | null>(null);
  const [editItem, setEditItem] = useState<DesignationTableRow | null>(null);
  const [activeEditId, setActiveEditId] = useState<string>('');
  const updateInFlightRef = useRef(false);

  const designationsRef = useRef<DesignationTableRow[]>([]);
  designationsRef.current = designations;

  const refresh = async (page = currentPage, search = searchQuery) => {
    setLoading(true);
    setError(null);
    try {
      // When searching, fetch a large page to allow searching across whole dataset
      const pageToFetch = search ? 1 : page;
      const perPageToFetch = search ? 1000 : itemsPerPage;

      const resp = await listDesignations(pageToFetch, perPageToFetch);
      let mapped: DesignationTableRow[] = resp.data.map((it: ApiDesignation) => ({
        id: String(it.id),
        name: String(it.name ?? it.title ?? ''),
        dateTime: it.created_at || '',
      }));

      if (search) {
        const _q_des = String(search).trim().toLowerCase();
        const filtered = mapped.filter(d => (d.name || '').toLowerCase().startsWith(_q_des));
        setTotalItems(filtered.length);

        // Apply client-side pagination to filtered results
        const startIdx = (page - 1) * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        mapped = filtered.slice(startIdx, endIdx);
      } else {
        setTotalItems(resp.meta?.pagination?.total || mapped.length);
      }

      setDesignations(mapped);
    } catch (e: any) {
      setError(e?.message || 'Failed to load designations');
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
    getDesignation(id)
      .then((data) => {
        if (cancelled) return;
        setEditItem({
          id: String(data.id),
          name: String(data.name ?? data.title ?? ''),
          dateTime: data.created_at || '',
        });
        setViewItem(null);
      })
      .catch(() => {
        if (cancelled) return;
        const found = designationsRef.current.find(d => d.id === id) || null;
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
    getDesignation(id)
      .then(data => {
        if (cancelled) return;
        setViewItem({
          id: String(data.id),
          name: String(data.name ?? data.title ?? ''),
          dateTime: data.created_at || '',
        });
      })
      .catch(() => {
        if (cancelled) return;
        const found = designationsRef.current.find((d: DesignationTableRow) => d.id === id) || null;
        setViewItem(found);
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, params.id]);

  const handleSaveEditedDesignation = (updated: Record<string, any>) => {
    return (async () => {
      if (updateInFlightRef.current) return;
      try {
        updateInFlightRef.current = true;
        // API expects `title` for update payload
        const idToUpdate = activeEditId || String(updated.id || '').trim();
        if (!idToUpdate) throw new Error('Designation id is missing');
        await updateDesignation(idToUpdate, { title: updated.name } as any);
        // Refresh list from server so table shows latest data
        await refresh();
        SweetAlert.showUpdateSuccess();
        // Navigate back to listing immediately
        navigate(ROUTES.DESIGNATION_MASTER);
      } catch (e: any) {
        // Extract field-specific validation message if available
        let message = 'Failed to update designation';
        try {
          if (e) {
            const resp = e.responseData || e.response || e;
            if (resp && resp.message) message = String(resp.message);
            const errorsObj = resp && (resp.errors || resp.data?.errors || resp.errors);
            if (errorsObj && typeof errorsObj === 'object') {
              const vals = Object.values(errorsObj)
                .flatMap((v: any) => (Array.isArray(v) ? v : [v]))
                .map((v: any) => String(v));
              if (vals.length) message = vals[0];
            }
          }
        } catch {
          message = e?.message || message;
        }

        const thrown = new Error(message);
        (thrown as any).original = e;
        throw thrown;
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
        title="Delete this designation?"
        message="This action will permanently remove the designation. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={confirmLoading}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
      />
      {location.pathname.endsWith('/create') ? (
        <CreateDesignationForm onClose={() => navigate(ROUTES.DESIGNATION_MASTER)} onSave={handleSaveDesignation} />
      ) : viewItem ? (
        <MasterView item={viewItem} onClose={() => navigate(ROUTES.DESIGNATION_MASTER)} />
      ) : editItem ? (
        <MasterEdit item={editItem} onClose={() => navigate(ROUTES.DESIGNATION_MASTER)} onSave={handleSaveEditedDesignation} hideSource nameLabel="Designation" />
      ) : (
        <>
          <MasterHeader
            onCreateClick={handleCreateDesignation}
            createButtonLabel="Create Designation"
            showBreadcrumb={true}
            showCreateButton={hasPermission('designation.create')}
            createPermissionSlug="designation.create"
          />

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4">
            <TableHeader title="Designation Master">
              <SearchBar
                placeholder="Search Designation"
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
                  { key: 'name', header: 'Designation Name', render: (it: any) => it.name || '-' },
                  { key: 'dateTime', header: 'Date & Time', render: (it: any) => it.dateTime ? formatDisplayDate(it.dateTime) : '-' },
                ] as Column<any>[])}
                onEdit={(it: any) => handleEdit(it.id)}
                onView={(it: any) => handleView(it.id)}
                onDelete={(it: any) => handleDelete(it.id)}
                editPermissionSlug="designation.edit"
                viewPermissionSlug="designation.view"
                deletePermissionSlug="designation.delete"
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

export default DesignationMaster;