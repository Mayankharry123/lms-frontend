/**
 * @file AllRoles.tsx
 * @description Roles list and management.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useEffect, useState } from 'react';
import Table, { type Column } from '../../../components/ui/Table';
import Pagination from '../../../components/ui/Pagination';
import SearchBar from '../../../components/ui/SearchBar';
import { MasterHeader } from '../../../components/ui';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants';
import { listRoles, deleteRole } from '../../../services/AllRoles';
import SweetAlert from '../../../utils/SweetAlert';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import TableHeader from '../../../components/ui/TableHeader';
import type { RoleTableRow } from '../../../types/user/rbac.types';

const AllRoles: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 10;
  const [roles, setRoles] = useState<RoleTableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteLabel, setConfirmDeleteLabel] = useState<string>('');
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await listRoles(currentPage, itemsPerPage, searchQuery);
      const data = (res.data || []).map((it: any, idx: number) => ({
        ...it,
        srNo: (currentPage - 1) * itemsPerPage + idx + 1,
      }));
      setRoles(data);
      const total = res.meta?.pagination?.total ?? res.meta?.total ?? data.length;
      setTotalItems(Number(total || 0));
    } catch (err) {

      console.error('Failed to fetch roles', err);
      setRoles([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchQuery]);

  const navigate = useNavigate();

  const handleCreateRole = () => navigate(ROUTES.ROLE.CREATE);

  const handleEdit = (id: string) => {
    const cleanId = id.replace('#', '');
    navigate(ROUTES.ROLE.EDIT(cleanId));
  };

  const handleView = (id: string) => {
    const cleanId = id.replace('#', '');
    navigate(ROUTES.ROLE.DETAIL(cleanId));
  };

  const handleDelete = async (id: string) => {
    const found = roles.find(r => r.id === id);
    // Use _realId only if it exists, otherwise use id
    setConfirmDeleteId(found && found._realId ? found._realId : id);
    setConfirmDeleteLabel(found ? (found.name || String(found.id)) : id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setConfirmLoading(true);
    try {
      await deleteRole(confirmDeleteId);
      setCurrentPage(1);
      // Reload the table from API
      await fetchRoles();
      try { SweetAlert.showDeleteSuccess(); } catch {
        // no need to action
      }
    } catch (err: any) {

      console.error('Failed to delete role', err);
      try { SweetAlert.showError(err?.message || 'Failed to delete role'); } catch {
        // no need to action
      }
    } finally {
      setConfirmLoading(false);
      setConfirmDeleteId(null);
      setConfirmDeleteLabel('');
    }
  };

  const columns = ([
    {
      key: 'srNo',
      header: 'S. No.',
      render: (it: RoleTableRow & { srNo: number }) => it.srNo,
      className: 'text-left whitespace-nowrap'
    },
    { key: 'name', header: 'Name', render: (it: RoleTableRow) => it.name, className: 'max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap' },
    { key: 'description', header: 'Description', render: (it: RoleTableRow) => it.description, className: 'max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap' },
  ] as Column<RoleTableRow>[]);

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title={`Delete role "${confirmDeleteLabel}"?`}
        message="This action will permanently remove the role. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={confirmLoading}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
      />
      <MasterHeader
        onCreateClick={handleCreateRole}
        createButtonLabel="Create Role"
        createPermissionSlug="roles.create"
      />
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Table Header */}
        <TableHeader title="All Roles">
          <SearchBar
            placeholder="Search roles..."
            delay={0}
            onSearch={(q: string) => {
              setSearchQuery(q);
              setCurrentPage(1);
            }}
          />
        </TableHeader>

        <div className="pt-0 overflow-visible">
          <Table
            data={roles}
            startIndex={(currentPage - 1) * itemsPerPage}
            loading={loading}
            desktopOnMobile={true}
            keyExtractor={(it: RoleTableRow) => it.id}
            columns={columns}
            onEdit={(it: RoleTableRow) => handleEdit(it.id)}
            onView={(it: RoleTableRow) => handleView(it.id)}
            onDelete={(it: RoleTableRow) => handleDelete(it.id)}
            editPermissionSlug="roles.edit"
            viewPermissionSlug="roles.view"
            deletePermissionSlug="roles.delete"
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

export default AllRoles;
