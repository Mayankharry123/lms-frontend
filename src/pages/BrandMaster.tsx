/**
 * @file BrandMaster.tsx
 * @description Brand master data list, create, view, and edit.
 * @author Sanjay Jangid <sanjay.jangid@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect, useRef } from 'react';
import CreateBrandForm from './CreateBrandForm';
import MasterView from '../components/ui/MasterView';
import Pagination from '../components/ui/Pagination';
import Table, { type Column } from '../components/ui/Table';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ROUTES } from '../constants';
import MasterHeader from '../components/ui/MasterHeader';
import SearchBar from '../components/ui/SearchBar';
import { matchesQuery } from '../utils/index.tsx';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import AgenciesModal from '../components/ui/AgenciesModal';
import { deleteBrand } from '../services/BrandMaster';
import { listBrands, getBrand } from '../services/BrandMaster';
import type { BrandItem } from '../types/master/master.types';
import { usePermissions } from '../hooks/SidebarMenuHooks';
import { BrandExcelActions } from '../components/brand';

import SweetAlert from '../utils/SweetAlert';
import TableHeader from '../components/ui/TableHeader.tsx';

type Brand = BrandItem;

import { formatDisplayDate } from '../utils/masterDate';

const BrandMaster: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewItem, setViewItem] = useState<Brand | null>(null);
  const [editItem, setEditItem] = useState<Brand | null>(null);

  const { hasPermission } = usePermissions();

  // We fetch paginated data from the API; currentData is the page currently loaded
  const startIndex = (currentPage - 1) * itemsPerPage;
  // If `searchQuery` is present we support a full client-side search by
  // filtering the currently loaded brands across all string fields.
  // Otherwise we show the server-provided page `brands`.
  const currentData = (() => {
    if (searchQuery && brands.length > 0) {
      const filtered = brands.filter((b: Brand) => {
        const fields = Object.keys(b).filter(k => typeof (b as any)[k] === 'string');
        return matchesQuery(b as unknown as Record<string, unknown>, searchQuery, { fields, useStartsWith: false });
      });
      return filtered.slice(startIndex, startIndex + itemsPerPage);
    }
    return brands;
  })();

  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const rawId = params.id;
  const routeId = rawId ? decodeURIComponent(rawId) : undefined;
  const isCreateRoute = location.pathname.endsWith('/create');
  const isEditRoute = location.pathname.endsWith('/edit') && Boolean(routeId);
  const isViewRoute = Boolean(routeId) && !location.pathname.endsWith('/edit');
  const isListRoute = !isCreateRoute && !isEditRoute && !isViewRoute;

  const handleEdit = (id: string) => navigate(`${ROUTES.BRAND_MASTER}/${encodeURIComponent(id)}/edit`);
  const handleView = (id: string) => navigate(`${ROUTES.BRAND_MASTER}/${encodeURIComponent(id)}`);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteLabel, setConfirmDeleteLabel] = useState<string>('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [showAgenciesModal, setShowAgenciesModal] = useState(false);
  const [modalAgencies, setModalAgencies] = useState<any[]>([]);

  const handleDelete = (id: string) => {
    const found = brands.find(b => b.id === id);
    setConfirmDeleteId(id);
    setConfirmDeleteLabel(found ? (found.name || String(found.id)) : id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setConfirmLoading(true);
    try {
      await deleteBrand(confirmDeleteId);
      // Refetch the brand list after delete
      const res = await listBrands(currentPage, itemsPerPage, searchQuery);
      setBrands(res.data as Brand[]);
      const total = res.meta?.pagination?.total ?? res.data.length;
      setTotalItems(total);
      SweetAlert.showDeleteSuccess();
    } catch (e: any) {
      SweetAlert.showError(e?.message || 'Failed to delete');
    } finally {
      setConfirmLoading(false);
      setConfirmDeleteId(null);
      setConfirmDeleteLabel('');
    }
  };

  const handleCreateBrand = () => navigate(`${ROUTES.BRAND_MASTER}/create`);

  const brandsRef = useRef<Brand[]>([]);
  brandsRef.current = brands;

  useEffect(() => {
    if (isCreateRoute) {
      setViewItem(null);
      setEditItem(null);
      return;
    }
    if (!routeId) {
      setViewItem(null);
      setEditItem(null);
    }
  }, [isCreateRoute, routeId]);

  useEffect(() => {
    if (!isEditRoute || !routeId) return;
    let cancelled = false;
    const id = routeId;
    getBrand(id)
      .then((data) => {
        if (cancelled) return;
        setEditItem(data);
        setViewItem(null);
      })
      .catch(() => {
        if (cancelled) return;
        const found = brandsRef.current.find((b) => b.id === id);
        setEditItem(found ?? { id, name: '' });
        setViewItem(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isEditRoute, routeId]);

  useEffect(() => {
    if (!isViewRoute || !routeId) return;
    let cancelled = false;
    const id = routeId;
    getBrand(id)
      .then((data) => {
        if (cancelled) return;
        setViewItem(data);
        setEditItem(null);
      })
      .catch(() => {
        if (cancelled) return;
        const found = brandsRef.current.find((b) => b.id === id);
        setViewItem(found ?? { id, name: '' });
        setEditItem(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isViewRoute, routeId]);

  // Fetch brands from API when page, itemsPerPage or search query changes
  useEffect(() => {
    if (!isListRoute) {
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await listBrands(currentPage, itemsPerPage, searchQuery);
        if (cancelled) return;
        setBrands(res.data as Brand[]);
        const total = res.meta?.pagination?.total ?? res.data.length;
        setTotalItems(total);
      } catch {
        // keep existing data on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [currentPage, itemsPerPage, searchQuery, isListRoute, listRefreshKey]);

  const refreshBrandList = () => {
    if (currentPage !== 1) {
      setCurrentPage(1);
      return;
    }
    setListRefreshKey((key) => key + 1);
  };

  const handlePageChange = (page: number) => setCurrentPage(page);
  console.log("isCreateRoute ",isCreateRoute);
  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title={`Delete brand "${confirmDeleteLabel}"?`}
        message="This action will permanently remove the brand. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={confirmLoading}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
      />

      <AgenciesModal
        isOpen={showAgenciesModal}
        agencies={modalAgencies}
        onClose={() => setShowAgenciesModal(false)}
        title="Agencies"
      />
      {isCreateRoute ? (
        <CreateBrandForm inline onClose={() => navigate(ROUTES.BRAND_MASTER)} />
      ) : viewItem ? (
        <MasterView
          item={viewItem}
          onClose={() => navigate(ROUTES.BRAND_MASTER)}
          excludeFields={['agency', 'industry_id', 'slug', 'brand_type_id', 'city_id', 'state_id', 'status', 'country_id', 'zone_id']}
        />
      ) : editItem ? (
        <CreateBrandForm
          inline
          mode="edit"
          initialData={editItem}
          onClose={() => navigate(ROUTES.BRAND_MASTER)}
        />
      ) : (
        <>
          <MasterHeader
            onCreateClick={handleCreateBrand}
            createButtonLabel="Create Brand"
            showBreadcrumb={true}
            showCreateButton={hasPermission('brand.create')}
            createPermissionSlug="brand.create"
            extraActions={<BrandExcelActions onImported={refreshBrandList} />}
          />

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4">
            <TableHeader title="Brand Master">
              <SearchBar
                delay={300}
                onSearch={(q: string) => {
                  setSearchQuery(q);
                  setCurrentPage(1);
                }}
              />
            </TableHeader>

            <div className="pt-0 overflow-x-auto overflow-y-hidden table-wrapper">
              <Table
                data={currentData}
                startIndex={startIndex}
                loading={loading}
                keyExtractor={(it: Brand, idx: number) => `${it.id}-${idx}`}
                columns={([
                  { key: 'sr', header: 'Sr. No.', render: (it: Brand) => String(startIndex + currentData.indexOf(it) + 1) },
                  { key: 'name', header: 'Brand Name', render: (it: Brand) => it.name || '-' },
                  {
                    key: 'agencyName', header: 'Agency Name', render: (it: Brand) => {
                      const raw = (it as any)._raw as Record<string, unknown> | undefined;
                      const agencies = raw?.['agencies'];
                      if (Array.isArray(agencies) && agencies.length > 0) {
                        const first = agencies[0] as any;
                        const name = first?.name || 'Unknown';
                        if (agencies.length === 1) {
                          return name;
                        } else {
                          return (
                            <span
                              className="inline-flex items-center gap-2 cursor-pointer text-black"
                              onClick={() => {
                                setModalAgencies(agencies);
                                setShowAgenciesModal(true);
                              }}
                            >
                              {name}
                              <span className="bg-blue-500 text-white px-1 py-0.5 rounded text-xs">
                                +{agencies.length - 1}
                              </span>
                            </span>
                          );
                        }
                      }
                      return it.agencyName || '-';
                    }
                  },
                  { key: 'brandType', header: 'Brand Type', render: (it: Brand) => it.brandType || '-' },
                  {
                    key: 'contactPerson',
                    header: 'Contact Person',
                    render: (it: Brand) => {
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
                            onClick={() => navigate(ROUTES.BRAND_CONTACTS(id))}
                            className="zoom-btn text-black underline cursor-pointer text-md bg-orange-100 px-4 py-1 rounded-lg font-semibold hover:bg-black hover:text-white">
                            {String(count)}
                          </span>
                        );
                      }

                      return String(count ?? '-');
                    }
                  },
                  { key: 'industry', header: 'Industry', render: (it: Brand) => it.industry || '-' },
                  { key: 'country', header: 'Country', render: (it: Brand) => it.country || '-' },
                  { key: 'state', header: 'State', render: (it: Brand) => it.state || '-' },
                  { key: 'city', header: 'City', render: (it: Brand) => it.city || '-' },
                  { key: 'zone', header: 'Zone', render: (it: Brand) => it.zone || '-' },
                  { key: 'pinCode', header: 'Pin Code', render: (it: Brand) => it.pinCode || '-' },
                  { key: 'dateTime', header: 'Date & Time', render: (it: Brand) => formatDisplayDate(it.dateTime) },
                ] as Column<Brand>[])}
                desktopOnMobile={true}
                onEdit={(it: Brand) => handleEdit(it.id)}
                onView={(it: Brand) => handleView(it.id)}
                onDelete={(it: Brand) => handleDelete(it.id)}
                editPermissionSlug="brand.edit"
                viewPermissionSlug="brand.view"
                deletePermissionSlug="brand.delete"
              />
            </div>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={typeof totalItems === 'number' ? totalItems : brands.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
};

export default BrandMaster;
