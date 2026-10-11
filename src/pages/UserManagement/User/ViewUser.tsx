/**
 * @file ViewUser.tsx
 * @description View user account details.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MasterFormHeader } from '../../../components/ui';
import { ROUTES } from '../../../constants';
import { getUserForEdit } from '../../../services/EditUser';
import type { EditUserDetail } from '../../../services/EditUser';

const ViewUser: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<EditUserDetail | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        if (id) {
          const userData = await getUserForEdit(id);
          setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  // ...existing code...

  const getRoleBadgeColor = (role?: string) => {
    const roleColorMap: Record<string, string> = {
      'S-Admin': 'border-purple-300 text-purple-700 bg-purple-50',
      'Admin': 'border-blue-300 text-blue-700 bg-blue-50',
      'BDM': 'border-orange-300 text-orange-700 bg-orange-50',
      'S-BDM': 'border-yellow-300 text-yellow-700 bg-yellow-50',
      'Planner': 'border-pink-300 text-pink-700 bg-pink-50',
    };
    return roleColorMap[role || ''] || 'border-gray-200 text-gray-700 bg-gray-50';
  };
  const zoneLabel = String(
    (user as any)?.zone_name ??
    (user as any)?.zone?.name ??
    (user as any)?.zone?.zone ??
    (user as any)?.zone ??
    '-'
  ) || '-';
  const organisationLabel = String(
    (user as any)?.organisation_name ??
    (user as any)?.origination?.name ??
    (user as any)?.orientation?.name ??
    (user as any)?.origination ??
    (user as any)?.orientation ??
    '-'
  ) || '-';
  const departmentLabel = (() => {
    const departments = (user as any)?.departments;
    if (Array.isArray(departments) && departments.length > 0) {
      return departments.map((d: any) => d?.name ?? d).filter(Boolean).join(', ');
    }
    return String(
      (user as any)?.department_name ??
      (user as any)?.department?.name ??
      (user as any)?.department ??
      '-'
    ) || '-';
  })();

  if (isLoading) {
    return (
      <div className="flex-1">
        <div className="flex items-center justify-center h-full">
          <div className="text-lg text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1">
        <div className="text-lg text-gray-500">User not found</div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <MasterFormHeader
        onBack={() => navigate(ROUTES.USER.ROOT)}
        title="View User"
      />
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className='flex gap-x-3 gap-y-1 items-center flex-wrap bg-gray-50 border border-gray-200 rounded-lg py-3 px-3'>
              <div className="text-base text-gray-800 font-semibold"> User Name : </div>
              <div className="text-sm text-black">{user.name}</div>
            </div>

            <div className='flex gap-x-3 gap-y-1 items-center flex-wrap bg-gray-50 border border-gray-200 rounded-lg py-3 px-3'>
              <div className="text-base text-gray-800 font-semibold">Email :</div>
              <div className="text-sm text-black">{user.email}</div>
            </div>

            <div className='flex gap-x-3 gap-y-1 items-center flex-wrap bg-gray-50 border border-gray-200 rounded-lg py-3 px-3'>
              <div className="text-base text-gray-800 font-semibold">Phone Number :</div>
              <div className="text-sm text-black">{user.phone || '-'}</div>
            </div>

            <div className='flex gap-x-3 gap-y-1 items-center flex-wrap bg-gray-50 border border-gray-200 rounded-lg py-3 px-3'>
              <div className="text-base text-gray-800 font-semibold">Zone :</div>
              <div className="text-sm text-black">{zoneLabel}</div>
            </div>

            <div className='flex gap-x-3 gap-y-1 items-center flex-wrap bg-gray-50 border border-gray-200 rounded-lg py-3 px-3'>
              <div className="text-base text-gray-800 font-semibold">Created Date :</div>
              <div className="text-sm text-black]">
                {user.created_at_formatted || (user.created_at ? new Date(user.created_at).toLocaleString() : '-') || '-'}
              </div>
            </div>

            <div className='flex gap-x-3 gap-y-1 flex-wrap flex-col bg-gray-50 border border-gray-200 rounded-lg py-3 px-3 flex-col'>
              <div className="text-base text-gray-800 font-semibold">Role Description :</div>
              {user.roles && user.roles.length > 0 ? (
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  {user.roles.map((r: any, i: number) => (
                    <li key={r.id ?? i} className="text-sm text-black]">
                      {r.description || '-'}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="text-sm texblacky)] mt-1">-</div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className='flex gap-x-3 gap-y-1 items-center flex-wrap bg-gray-50 border border-gray-200 rounded-lg py-3 px-3'>
              <div className="text-base text-gray-800 font-semibold">Role :</div>
              <div className="mt-1 flex flex-wrap gap-2">
                {user.roles && user.roles.length > 0 ? (
                  user.roles.map((r: any, idx: number) => (
                    <span
                      key={r.id ?? idx}
                      className={`inline-flex items-center h-7 px-3 border rounded-full text-xs font-medium leading-tight whitespace-nowrap ${getRoleBadgeColor(
                        r.name
                      )}`}
                    >
                      {r.name}
                    </span>
                  ))
                ) : (
                  <span
                    className={`inline-flex items-center justify-center h-7 px-3 border rounded-full text-xs font-medium leading-tight whitespace-nowrap ${getRoleBadgeColor(
                      user.role?.name || ''
                    )}`}
                  >
                    {user.role?.name || '-'}
                  </span>
                )}
              </div>
            </div>

            <div className='flex gap-x-3 gap-y-1 items-center flex-wrap bg-gray-50 border border-gray-200 rounded-lg py-3 px-3'>
              <div className="text-base text-gray-800 font-semibold">Last Login :</div>
              <div className="text-sm text-black">{user.last_login_at || '-'}</div>
            </div>

            <div className='flex gap-x-3 gap-y-1 items-center flex-wrap bg-gray-50 border border-gray-200 rounded-lg py-3 px-3'>
              <div className="text-base text-gray-800 font-semibold">Organisations :</div>
              <div className="text-sm text-black">{organisationLabel}</div>
            </div>

            <div className='flex gap-x-3 gap-y-1 items-center flex-wrap bg-gray-50 border border-gray-200 rounded-lg py-3 px-3'>
              <div className="text-base text-gray-800 font-semibold">Departments :</div>
              <div className="text-sm text-black">{departmentLabel}</div>
            </div>

            <div className='flex gap-x-3 gap-y-1 flex-wrap bg-gray-50 border border-gray-200 rounded-lg py-3 px-3 flex-col'>
              <div className="text-base text-gray-800 font-semibold">Parent Users :</div>
              {user.parents && user.parents.length > 0 ? (
                <div className="mt-2 space-y-3">
                  {user.parents.map((p: any) => (
                    <div key={p.id} className="w-full bg-white border border-gray-200 rounded-md p-3">
                      <div className="text-sm text-black">{p.name}</div>
                      <div className="text-base text-gray-800 font-semibold">{p.email}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm texblacky)] mt-1">-</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewUser;
