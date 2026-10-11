/**
 * @file ViewRole.tsx
 * @description View role details and assigned permissions.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MasterFormHeader } from '../../../components/ui';
import { ROUTES } from '../../../constants';
import { getRoleById } from '../../../services/ViewRole';
import type { RoleDetailView } from '../../../types/user/rbac.types';

const ViewRole: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<RoleDetailView | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        setIsLoading(true);
        if (id) {
          // Ensure only the numeric ID is sent to the API
          const numericId = id.replace(/[^\d]/g, '');
          const data = await getRoleById(numericId);
          // Type assertion for data
          const roleData = data as { id: string; name: string; description?: string };
          setRole({
            id: roleData.id,
            name: roleData.name,
            description: roleData.description || '',
          });
        }
      } catch (error) {
        setRole(null);
        console.error('Error fetching role:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) {
      fetchRole();
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="flex items-center justify-center h-full">
          <div className="text-lg text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex-1 p-6">
        <div className="text-lg text-gray-500">Role not found</div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <MasterFormHeader
        onBack={() => navigate(ROUTES.ROLE.ROOT)}
        title="View Role"
      />

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-5 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className='flex gap-x-3 gap-y-1 items-center flex-wrap bg-gray-50 border border-gray-200 rounded-lg py-3 px-3'>
            <div className="text-sm text-gray-800 font-semibold">ID</div>
            <div className="text-sm text-gray-600">{role.id}</div>
          </div>

          <div className='flex gap-x-3 gap-y-1 items-center flex-wrap bg-gray-50 border border-gray-200 rounded-lg py-3 px-3'>
            <div className="text-sm text-gray-800 font-semibold">Role Name</div>
            <div className="text-sm text-gray-600">{role.name}</div>
          </div>

          <div className='flex gap-x-3 gap-y-1 items-center flex-wrap bg-gray-50 border border-gray-200 rounded-lg py-3 px-3'>
            <div className="text-sm text-gray-800 font-semibold">Description</div>
            <div className="text-sm text-gray-600 whitespace-pre-wrap">{role.description}</div>
          </div>

        </div>


      </div>
    </div>
  );
};

export default ViewRole;
