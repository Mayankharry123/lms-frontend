/**
 * @file AgencyMaster.tsx
 * @description Agency master data list, create, view, and edit.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect } from 'react';
import Table, { type Column } from '../components/ui/Table';

import CreateAgencyForm from './CreateAgencyForm';
import MasterView from '../components/ui/MasterView';
import type { Agency } from '../components/layout/MainContent';
import { listAgencies as fetchAgencies, deleteAgency, getAgency } from '../services/AgencyMaster';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ROUTES } from '../constants';
import { getItem } from '../data/masterData';
import { MasterHeader } from '../components/ui';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Pagination from '../components/ui/Pagination';
import SweetAlert from '../utils/SweetAlert';
import SearchBar from '../components/ui/SearchBar';
import { usePermissions } from '../hooks/SidebarMenuHooks';
import TableHeader from '../components/ui/TableHeader';


// Robust parser: normalize various API date formats into an ISO timestamp (returns empty string on failure)
const parseApiDateToISO = (s?: string): string => {
  if (!s) return '';
  const raw = String(s).trim();

  // Quick try: let Date parse it (handles many ISO-like cases)
  const tryDate = (str: string) => {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
    return null;
  };

  // Already ISO with T or timezone
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw) || /Z$/.test(raw)) {
    const res = tryDate(raw);
    return res ?? '';
  }

  // Pattern: YYYY-MM-DD HH:MM:SS [AM|PM]
  let m = raw.match(/^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?$/i);
  if (m) {
    const [, yyyy, mm, dd, hhRaw, min, sec, ampm] = m;
    let hh = parseInt(hhRaw, 10);
    if (ampm) {
      const upper = ampm.toUpperCase();
      if (upper === 'AM' && hh === 12) hh = 0;
      else if (upper === 'PM' && hh < 12) hh += 12;
    }
    const HH = String(hh).padStart(2, '0');
    const SS = sec || '00';
    return `${yyyy}-${mm}-${dd}T${HH}:${min}:${SS}`;
  }

  // Pattern: DD-MM-YYYY HH:MM:SS [AM|PM]
  m = raw.match(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-([0-9]{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?$/i);
  if (m) {
    const [, dd, mm, yyyy, hhRaw, min, sec, ampm] = m;
    let hh = parseInt(hhRaw, 10);
    if (ampm) {
      const upper = ampm.toUpperCase();
      if (upper === 'AM' && hh === 12) hh = 0;
      else if (upper === 'PM' && hh < 12) hh += 12;
    }
    const HH = String(hh).padStart(2, '0');
    const SS = sec || '00';
    return `${yyyy}-${mm}-${dd}T${HH}:${min}:${SS}`;
  }

  // Pattern: YYYY-MM-DD HH:MM:SS (no AM/PM) — replace space with T
  m = raw.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2})\s+(\d{2}:\d{2}(?::\d{2})?)$/);
  if (m) {
    const isoLike = `${m[1]}T${m[2]}`;
    const res = tryDate(isoLike);
    return res ?? '';
  }

  // Last resort: let Date try to parse original string
  const res = tryDate(raw) ?? tryDate(raw.replace(/\s+/, 'T'));
  return res ?? '';
};

/** Same mapping as list rows. */
function mapApiAgencyToUi(a: any): Agency {
  const parentObj = a.is_parent ?? a.agency_group ?? null;
  const agencyGroupName = parentObj ? (typeof parentObj === 'object' ? (parentObj.name || String(parentObj?.id || '')) : String(parentObj)) : a.name || '';
  const rawCount = a.contact_person_count ?? a.contactPersonCount;
  const contactPersonValue = (typeof rawCount === 'number') ? String(rawCount)
    : (typeof rawCount === 'string' && rawCount.trim() !== '') ? rawCount
      : (a.contact_person ?? '');
  const typeRaw = a.agency_type ?? a.type;
  const agencyTypeStr =
    typeRaw && typeof typeRaw === 'object' && typeRaw !== null && 'name' in typeRaw
      ? String((typeRaw as { name?: string }).name ?? '')
      : String(typeRaw ?? '');
  return {
    id: String(a.id),
    agencyGroup: agencyGroupName,
    agencyName: a.name || '',
    agencyType: agencyTypeStr,
    contactPerson: contactPersonValue || '',
    dateTime: parseApiDateToISO(a.created_at || a.updated_at || ''),
  };
}

const AgencyMaster: React.FC = () => {
  const [viewItem, setViewItem] = useState<Record<string, any> | null>(null);
  const [editItem, setEditItem] = useState<Agency | null>(null);
  const [agenciesList, setAgenciesList] = useState<Agency[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [totalItems, setTotalItems] = useState<number | undefined>(undefined);
  const [searchValue, setSearchValue] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteLabel, setConfirmDeleteLabel] = useState<string>('');
  const [confirmLoading, setConfirmLoading] = useState(false);

  const { hasPermission } = usePermissions();

  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  const handleCreateAgency = () => {
    navigate(`${ROUTES.AGENCY_MASTER}/create`);
  };

  const loadAgencies = async (p = 1, search?: string) => {
    setLoadingList(true);
    try {
      const res = await fetchAgencies(p, perPage, search);
      const mapped = (res.data || []).map((a: any) => mapApiAgencyToUi(a));
      setAgenciesList(mapped);
      // attempt to read pagination meta if present
      const total = res.meta?.pagination?.total;
      if (typeof total === 'number') setTotalItems(total);
    } catch (err) {
      // handled by service error handler
      console.error('Failed to load agencies', err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleSaveAgency = (data: { parent: { name: string; type: string; client: string[] }; children: Array<{ name: string; type: string; client: string[] }> }): void => {
    // For now just log the saved data. Integrate with API/store as needed.
    console.log('Saved agencies payload:', data);
  };

  const handleView = (item: Agency) => {
    navigate(`${ROUTES.AGENCY_MASTER}/${encodeURIComponent(item.id)}`);
  };

  const handleEdit = (item: Agency) => {
    navigate(`${ROUTES.AGENCY_MASTER}/${encodeURIComponent(item.id)}/edit`);
  };

  const handleSaveEdit = (updated: Record<string, unknown>): void => {
    // Update in API/store as needed
    console.log('Save edited agency:', updated);
    navigate(ROUTES.AGENCY_MASTER);
  };

  const handleDelete = (item: Agency): void => {
    if (!item.id) {
      SweetAlert.showError('Agency ID is missing');
      return;
    }
    setConfirmDeleteId(item.id);
    setConfirmDeleteLabel(item.agencyName || item.id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setConfirmLoading(true);
    try {
      await deleteAgency(confirmDeleteId);
      // Refresh the list
      loadAgencies(page, searchValue);
      SweetAlert.showDeleteSuccess();
    } catch (err) {
      console.error('Delete failed:', err);
      SweetAlert.showError((err as any)?.message || 'Failed to delete agency');
    } finally {
      setConfirmLoading(false);
      setConfirmDeleteId(null);
      setConfirmDeleteLabel('');
    }
  };

  // Sync UI state with route params
  useEffect(() => {
    const rawId = params.id;
    const id = rawId ? decodeURIComponent(rawId) : undefined;

    if (location.pathname.endsWith('/create')) {
      setViewItem(null);
      setEditItem(null);
      return;
    }

    if (location.pathname.endsWith('/edit') && id) {
      // Fetch full agency data from API for edit mode
      getAgency(id)
        .then(data => {
          setEditItem(data as any);
          setViewItem(null);
        })
        .catch(() => {
          // Fallback to locally stored data if API fails
          const fetched = getItem('agency', id);
          setEditItem((fetched || { id }) as any);
          setViewItem(null);
        });
      return;
    }


    if (id) {
      getAgency(id)
        .then(data => {
          // Full API payload for MasterView — all fields from GET /agencies/:id (same as before mapping trim)
          setViewItem(data as Record<string, any>);
          setEditItem(null);
        })
        .catch(() => {
          const fetched = getItem('agency', id);
          if (fetched) setViewItem(fetched as Agency);
          else setViewItem({ id, agencyGroup: '', agencyName: '', agencyType: '', contactPerson: '', dateTime: '' });
          setEditItem(null);
        });
      return;
    }

    setViewItem(null);
    setEditItem(null);
  }, [location.pathname, params.id]);

  // List route only — not create, edit, or view-by-id (avoids redundant GET /agencies while viewing one row)
  useEffect(() => {
    if (location.pathname.endsWith('/create') || location.pathname.endsWith('/edit')) return;
    if (params.id) return;
    loadAgencies(page, searchValue);
  }, [page, location.pathname, searchValue, params.id]);



  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
      {location.pathname.endsWith('/create') ? (
        <CreateAgencyForm onClose={() => navigate(ROUTES.AGENCY_MASTER)} onSave={handleSaveAgency} />
      ) : viewItem ? (
        <MasterView item={viewItem} onClose={() => navigate(ROUTES.AGENCY_MASTER)} />
      ) : editItem ? (
        <CreateAgencyForm
          mode="edit"
          initialData={editItem}
          onClose={() => navigate(ROUTES.AGENCY_MASTER)}
          onSave={handleSaveEdit}
        />
      ) : (
        <>
          <MasterHeader
            onCreateClick={handleCreateAgency}
            createButtonLabel="Create Agency"
            showBreadcrumb={true}
            showCreateButton={hasPermission('agency.create')}
            createPermissionSlug="agency.create"
          />

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4">
            {/* Table Header */}
            <TableHeader title="Agency Master">
              <SearchBar
                delay={300}
                placeholder="Please Search Agency"
                onSearch={(q: string) => {
                  setSearchValue(q);
                  setPage(1);
                  loadAgencies(1, q);
                }}
              />
            </TableHeader>

            <div className="pt-0 overflow-visible">
              <ConfirmDialog
                isOpen={!!confirmDeleteId}
                title={`Are you sure you want to delete agency "${confirmDeleteLabel}"?`}
                message="This action will permanently remove the agency. This cannot be undone."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                loading={confirmLoading}
                onCancel={() => setConfirmDeleteId(null)}
                onConfirm={confirmDelete}
              />
              <Table<Agency>
                data={agenciesList}
                loading={loadingList}
                columns={([
                  {
                    key: 'sr', header: 'Sr. No.', render: (it: Agency) => {
                      const startIndex = (page - 1) * perPage;
                      const currentData = agenciesList;
                      return String(startIndex + currentData.indexOf(it) + 1);
                    }
                  },
                  { key: 'agencyGroup', header: 'Agency Group', render: (it: Agency) => it.agencyGroup || '-' },
                  { key: 'agencyName', header: 'Agency Name', render: (it: Agency) => it.agencyName || '-' },
                  { key: 'agencyType', header: 'Agency Type', render: (it: Agency) => it.agencyType || '-' },
                  {
                    key: 'contactPerson',
                    header: 'Contact Person',
                    render: (it: Agency) => {
                      const raw = (it as any)._raw as Record<string, unknown> | undefined;
                      const rawCount = raw?.['contact_person_count'] ?? raw?.['contactPersonCount'];
                      let count: string | number | null = null;
                      if (typeof rawCount === 'number') count = rawCount;
                      else if (typeof rawCount === 'string' && rawCount.trim() !== '') count = rawCount;

                      const normCount = (it as any).contact_person_count ?? (it as any).contactPersonCount;
                      if (count === null && typeof normCount === 'number') count = normCount;

                      const cp = (it as any).contactPerson ?? (it as any).contact_person;
                      if (count === null) {
                        if (cp) count = String(cp);
                        else count = '-';
                      }

                      // If we have a numeric or non-hyphen count, render as clickable link to contacts page
                      if (count !== '-' && String(count).trim() !== '') {
                        const id = encodeURIComponent(String(it.id ?? ''));
                        return (
                          <span
                            onClick={() => navigate(ROUTES.AGENCY_CONTACTS(id))}
                            className="text-blue-600 underline cursor-pointer"
                          >
                            {String(count)}
                          </span>
                        );
                      }

                      return String(count ?? '-');
                    }
                  },
                  { key: 'dateTime', header: 'Date & Time', render: (it: Agency) => it.dateTime ? new Date(it.dateTime).toLocaleString() : '-' },
                ] as Column<Agency>[])}
                desktopOnMobile={true}
                onEdit={(it: Agency) => handleEdit(it)}
                onView={(it: Agency) => handleView(it)}
                onDelete={(it: Agency) => handleDelete(it)}
                editPermissionSlug="agency.edit"
                viewPermissionSlug="agency.view"
                deletePermissionSlug="agency.delete"
              />
            </div>
          </div>

          <Pagination
            currentPage={page}
            totalItems={typeof totalItems === 'number' ? totalItems : agenciesList.length}
            itemsPerPage={perPage}
            onPageChange={(p) => setPage(p)}
          />
        </>
      )}
    </div>
  );
};

export default AgencyMaster;
