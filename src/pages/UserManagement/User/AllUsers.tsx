/**
 * @file AllUsers.tsx
 * @description Users list and management.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import TableHeader from '../../../components/ui/TableHeader';
import React, { useEffect, useState } from 'react';
import Table, { type Column } from '../../../components/ui/Table';
import Pagination from '../../../components/ui/Pagination';
import SearchBar from '../../../components/ui/SearchBar';
import { MasterHeader } from '../../../components/ui';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants';
import { listUsers, deleteUser, type User } from '../../../services/AllUsers';
import SweetAlert from '../../../utils/SweetAlert';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import RolesModal from '../../../components/ui/RolesModal';
import ParentUserModal from '../../../components/ui/ParentUserModal';

const AllUsers: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 10;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  // ConfirmDialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // RolesModal state
  const [rolesModalOpen, setRolesModalOpen] = useState(false);
  const [selectedUserRoles, setSelectedUserRoles] = useState<any[]>([]);
  const [selectedUserName, setSelectedUserName] = useState('');

  // ParentUserModal state
  const [parentUserModalOpen, setParentUserModalOpen] = useState(false);
  const [selectedParentUser, setSelectedParentUser] = useState<any[] | null>(null);
  const [parentUserContextName, setParentUserContextName] = useState('');

  // Organisations modal state
  const [organisationsModalOpen, setOrganisationsModalOpen] = useState(false);
  const [selectedOrganisations, setSelectedOrganisations] = useState<Array<{ name: string }>>([]);
  const [organisationsContextName, setOrganisationsContextName] = useState('');

  // Departments modal state
  const [departmentsModalOpen, setDepartmentsModalOpen] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<Array<{ name: string }>>([]);
  const [departmentsContextName, setDepartmentsContextName] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await listUsers(currentPage, itemsPerPage, searchQuery);
      const data = (res.data || []).map((it: any, idx: number) => ({
        ...it,
        srNo: (currentPage - 1) * itemsPerPage + idx + 1,
      }));
      setUsers(data);
      const total = res.meta?.pagination?.total ?? res.meta?.total ?? data.length;
      setTotalItems(Number(total || 0));
    } catch (err) {

      console.error('Failed to fetch users', err);
      SweetAlert.showError('Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  };

  // Show confirm dialog instead of window.confirm
  const handleDeleteRequest = (user: User) => {
    setDeleteTarget(user);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteUser(deleteTarget.id);
      setConfirmOpen(false);
      setDeleteTarget(null);
      try { SweetAlert.showDeleteSuccess(); } catch {
        // no need to action
      }
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user', err);
      try { SweetAlert.showError('Failed to delete user.'); } catch {
        // no need to action
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setConfirmOpen(false);
    setDeleteTarget(null);
    setDeleteLoading(false);
  };

  const handleRolesClick = (user: User) => {
    if (Array.isArray(user.roles) && user.roles.length > 0) {
      setSelectedUserRoles(user.roles);
      setSelectedUserName(user.name);
      setRolesModalOpen(true);
    }
  };

  const handleRolesModalClose = () => {
    setRolesModalOpen(false);
    setSelectedUserRoles([]);
    setSelectedUserName('');
  };

  const handleParentUserClick = (user: User) => {
    const parents = (user as any).parents ?? ((user as any).parent ? [(user as any).parent] : undefined);
    if (Array.isArray(parents) && parents.length > 0) {
      setSelectedParentUser(parents);
      setParentUserContextName(user.name);
      setParentUserModalOpen(true);
    }
  };

  const handleParentUserModalClose = () => {
    setParentUserModalOpen(false);
    setSelectedParentUser(null);
    setParentUserContextName('');
  };

  const handleOrganisationsClick = (user: User) => {
    const rawOrganisations =
      user.organisations ?? (user.origination ? [{ name: user.origination }] : []);
    const organisations = rawOrganisations
      .map((org: any) => ({
        ...org,
        name: org?.name ?? org?.organisations_name ?? org?.organisation_name ?? String(org ?? ''),
      }))
      .filter((org: any) => Boolean(org.name));

    if (organisations.length > 0) {
      setSelectedOrganisations(organisations);
      setOrganisationsContextName(user.name);
      setOrganisationsModalOpen(true);
    }
  };

  const handleOrganisationsModalClose = () => {
    setOrganisationsModalOpen(false);
    setSelectedOrganisations([]);
    setOrganisationsContextName('');
  };

  const handleDepartmentsClick = (user: User) => {
    const rawDepartments =
      user.departments ?? (user.department ? [{ name: user.department }] : []);
    const departments = rawDepartments
      .map((d: any) => ({
        ...d,
        name: d?.name ?? d?.departments_name ?? d?.department_name ?? String(d ?? ''),
      }))
      .filter((d: any) => Boolean(d.name));

    if (departments.length > 0) {
      setSelectedDepartments(departments);
      setDepartmentsContextName(user.name);
      setDepartmentsModalOpen(true);
    }
  };

  const handleDepartmentsModalClose = () => {
    setDepartmentsModalOpen(false);
    setSelectedDepartments([]);
    setDepartmentsContextName('');
  };
  // ...existing code...

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchQuery]);

  const navigate = useNavigate();

  const handleCreateUser = () => navigate(ROUTES.USER.CREATE);

  const handleEdit = (id: string) => {
    const cleanId = id.replace('#', '');
    navigate(ROUTES.USER.EDIT(cleanId));
  };

  const handleView = (id: string) => {
    const cleanId = id.replace('#', '');
    navigate(ROUTES.USER.DETAIL(cleanId));
  };

  const getStatusBadgeColor = (status?: 'Active' | 'Inactive') => {
    return status === 'Active'
      ? 'bg-green-100 text-green-700'
      : 'bg-red-100 text-red-700';
  };

  // Map role name/display_name to color classes
  const getRoleBadgeColor = (roleName?: string) => {
    const roleColorMap: Record<string, string> = {
      'Manager': 'border-blue-300 text-blue-700 bg-blue-50',
      'Super Admin': 'border-purple-300 text-purple-700 bg-purple-50',
      'Admin': 'border-green-300 text-green-700 bg-green-50',
      'BDM': 'border-orange-300 text-orange-700 bg-orange-50',
      'S-BDM': 'border-yellow-300 text-yellow-700 bg-yellow-50',
      'Planner': 'border-pink-300 text-pink-700 bg-pink-50',
    };
    return (roleName && roleColorMap[roleName]) || 'border-gray-200 text-gray-700 bg-gray-50';
  };

  const columns = ([
    {
      key: 'srNo',
      header: 'S. No.',
      render: (it: User & { srNo: number }) => it.srNo,
      className: 'text-left whitespace-nowrap',
    },
    {
      key: 'name',
      header: 'User',
      render: (it: User) => it.name,
      className: 'max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap',
    },
    {
      key: 'parent',
      header: 'Parent User',
      render: (it: User) => {
        const parents = (it as any).parents ?? ((it as any).parent ? [(it as any).parent] : []);
        return (
          <div
            className="flex gap-2 justify-start items-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => parents && parents.length > 0 && handleParentUserClick(it)}
          >
            {Array.isArray(parents) && parents.length > 0 ? (
              <>
                <span
                  className="inline-flex items-center justify-center h-7 px-3 border border-blue-300 rounded-full text-xs font-medium leading-tight whitespace-nowrap bg-blue-50 text-blue-700"
                >
                  {parents[0].name || parents[0]}
                </span>
                {parents.length > 1 && (
                  <span className="inline-flex items-center justify-center h-7 px-2 border border-gray-200 rounded-full text-xs font-medium leading-tight whitespace-nowrap bg-gray-50 text-gray-700">
                    +{parents.length - 1}
                  </span>
                )}
              </>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        );
      },
      className: 'text-center',
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      render: (it: User) => it.lastLogin || '-',
      className: 'text-center whitespace-nowrap',
    },
    {
      key: 'created',
      header: 'Created',
      render: (it: User) => it.created || '-',
      className: 'text-center whitespace-nowrap',
    },
    {
      key: 'status',
      header: 'Status',
      render: (it: User) => (
        <div className="flex justify-center">
          <span
            className={`inline-flex items-center justify-center h-7 px-3 border border-transparent rounded-full text-xs font-medium leading-tight text-green-600 whitespace-nowrap ${getStatusBadgeColor(
              it.status
            )}`}
          >
            {it.status}
          </span>
        </div>
      ),
      className: 'text-center',
    },
    {
      key: 'role',
      header: 'Role',
      render: (it: User) => (
        <div
          className="flex gap-2 justify-start items-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => Array.isArray(it.roles) && it.roles.length > 0 && handleRolesClick(it)}
        >
          {Array.isArray(it.roles) && it.roles.length > 0 ? (
            <>
              <span
                className={`inline-flex items-center justify-center h-7 px-3 border rounded-full text-xs font-medium leading-tight whitespace-nowrap ${getRoleBadgeColor(it.roles[0].display_name || it.roles[0].name)}`}
              >
                {it.roles[0].display_name || it.roles[0].name}
              </span>
              {it.roles.length > 1 && (
                <span className="inline-flex items-center justify-center h-7 px-2 border border-gray-200 rounded-full text-xs font-medium leading-tight whitespace-nowrap bg-gray-50 text-gray-700">
                  +{it.roles.length - 1}
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
      className: 'text-center',
    },
    {
      key: 'email',
      header: 'Email',
      render: (it: User) => it.email,
      className: 'max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap',
    },
    {
      key: 'zone',
      header: 'Zone',
      render: (it: User) => it.zone || '-',
      className: 'max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap',
    },
    {
      key: 'origination',
      header: 'Organisation',
      render: (it: User) => {
        const rawOrganisations =
          it.organisations ?? (it.origination ? [{ name: it.origination }] : []);
        const organisations = rawOrganisations.filter(
          (org: any) => Boolean(org?.name ?? org?.organisations_name ?? org?.organisation_name)
        );
        const firstOrgName =
          organisations[0]?.name ||
          (organisations[0] as any)?.organisations_name ||
          (organisations[0] as any)?.organisation_name;

        return (
          <div
            className="flex gap-2 justify-start items-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => organisations.length > 0 && handleOrganisationsClick(it)}
          >
            {organisations.length > 0 && firstOrgName ? (
              <>
                <span className="inline-flex items-center justify-center h-7 px-3 border border-indigo-300 rounded-full text-xs font-medium leading-tight whitespace-nowrap bg-indigo-50 text-indigo-700 max-w-[140px] overflow-hidden text-ellipsis">
                  {firstOrgName}
                </span>
                {organisations.length > 1 && (
                  <span className="inline-flex items-center justify-center h-7 px-2 border border-gray-200 rounded-full text-xs font-medium leading-tight whitespace-nowrap bg-gray-50 text-gray-700">
                    +{organisations.length - 1}
                  </span>
                )}
              </>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        );
      },
      className: 'text-center max-w-[220px]',
    },
    {
      key: 'department',
      header: 'Department',
      render: (it: User) => {
        const rawDepartments =
          it.departments ?? (it.department ? [{ name: it.department }] : []);
        const departments = rawDepartments.filter(
          (dept: any) => Boolean(dept?.name ?? dept?.departments_name ?? dept?.department_name)
        );
        const firstDeptName =
          departments[0]?.name ||
          (departments[0] as any)?.departments_name ||
          (departments[0] as any)?.department_name;

        return (
          <div
            className="flex gap-2 justify-start items-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => departments.length > 0 && handleDepartmentsClick(it)}
          >
            {departments.length > 0 && firstDeptName ? (
              <>
                <span className="inline-flex items-center justify-center h-7 px-3 border border-teal-300 rounded-full text-xs font-medium leading-tight whitespace-nowrap bg-teal-50 text-teal-700 max-w-[140px] overflow-hidden text-ellipsis">
                  {firstDeptName}
                </span>
                {departments.length > 1 && (
                  <span className="inline-flex items-center justify-center h-7 px-2 border border-gray-200 rounded-full text-xs font-medium leading-tight whitespace-nowrap bg-gray-50 text-gray-700">
                    +{departments.length - 1}
                  </span>
                )}
              </>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        );
      },
      className: 'text-center max-w-[220px]',
    },
  ] as Column<User>[]);

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
      <MasterHeader
        onCreateClick={handleCreateUser}
        createButtonLabel="Add User"
        breadcrumbItems={[{ label: 'User Management', path: '/user-management' }]}
        currentPageTitle="User"
        createPermissionSlug="user.create"
      />
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <TableHeader title="Team Members">
          <SearchBar
            placeholder="Search users..."
            delay={0}
            onSearch={(q: string) => {
              setSearchQuery(q);
              setCurrentPage(1);
            }}
          />
        </TableHeader>

        <div className="pt-0 overflow-visible">
          <Table
            data={users}
            startIndex={(currentPage - 1) * itemsPerPage}
            loading={loading}
            desktopOnMobile={true}
            keyExtractor={(it: User) => it.id}
            columns={columns}
            onEdit={(it: User) => handleEdit(it.id)}
            onView={(it: User) => handleView(it.id)}
            onDelete={(it: User) => handleDeleteRequest(it)}
            editPermissionSlug="user.edit"
            viewPermissionSlug="user.view"
            deletePermissionSlug="users.delete"
          />
          {/* ConfirmDialog for delete */}
          <ConfirmDialog
            isOpen={confirmOpen}
            title="Delete User?"
            message={deleteTarget ? `Are you sure you want to delete user "${deleteTarget.name}"? This action cannot be undone.` : ''}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            loading={deleteLoading}
            onCancel={handleDeleteCancel}
            onConfirm={handleDeleteConfirm}
          />

          {/* RolesModal for viewing all roles */}
          <RolesModal
            isOpen={rolesModalOpen}
            roles={selectedUserRoles}
            userName={selectedUserName}
            onClose={handleRolesModalClose}
            title="User Roles"
          />

          {/* ParentUserModal for viewing parent user details */}
          <ParentUserModal
            isOpen={parentUserModalOpen}
            parentUser={selectedParentUser}
            userName={parentUserContextName}
            onClose={handleParentUserModalClose}
            title="Parent User"
          />

          <RolesModal
            isOpen={organisationsModalOpen}
            roles={selectedOrganisations}
            userName={organisationsContextName}
            onClose={handleOrganisationsModalClose}
            title="Organisations"
          />

          <RolesModal
            isOpen={departmentsModalOpen}
            roles={selectedDepartments}
            userName={departmentsContextName}
            onClose={handleDepartmentsModalClose}
            title="Departments"
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

export default AllUsers;  