/**
 * @file EditRole.tsx
 * @description Edit role details and permissions.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect } from 'react';
import { updateRoleById } from '../../../services/EditRole';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../../constants';
import { MasterFormHeader } from '../../../components/ui';
import SweetAlert from '../../../utils/SweetAlert';
import { extractNumericId } from '../../../api/client';
import { getRole, listPermissionTreeNodes } from '../../../api/rbac';
import PermissionTree from '../../../components/ui/PermissionTree';



const EditRole: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    description: '',
    parentPermission: '',
  });


  // Permission tree data from API
  const [permissionTreeData, setPermissionTreeData] = useState<any[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [permissionError, setPermissionError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Fetch permission tree and role data from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setPermissionError('');
      try {
        // Fetch permission tree
        const nodes = await listPermissionTreeNodes();
        if (nodes.length > 0) {
          setPermissionTreeData(nodes);
        } else {
          setPermissionError('Failed to load permissions');
        }

        if (id) {
          const roleId = parseInt(extractNumericId(id), 10);
          const roleData = (await getRole(String(roleId))) as unknown as Record<string, unknown>;
          setForm({
            name: String(roleData.name ?? ''),
            description: String(roleData.description ?? ''),
            parentPermission: String(roleData.parentPermission ?? ''),
          });
          if (Array.isArray(roleData.permissions)) {
            setSelectedPermissionIds(roleData.permissions as number[]);
          }
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
        const errorMsg = error?.response?.data?.message || 'Failed to load role data. Please try again.';
        setPermissionError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const next: Record<string, string> = {};
    if (!form.name || form.name.trim() === '') next.name = 'Please Enter Role Name';
    if (!form.description || form.description.trim() === '') next.description = 'Please Enter Description';

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      setSaving(true);
      // Use 'permission' as the key to match backend API
      const payload = {
        ...form,
        permission: selectedPermissionIds, // key must be 'permission' (not 'permissions')
      } as Record<string, any>;
      if (id) {
        const roleId = parseInt(extractNumericId(id), 10);
        payload.id = roleId;
        await updateRoleById(roleId, payload);
      }
      SweetAlert.showUpdateSuccess();
      setTimeout(() => {
        navigate(ROUTES.ROLE.ROOT);
      }, 1800);
    } catch (err) {
      console.error('Error updating role:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate(ROUTES.ROLE.ROOT);
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="flex items-center justify-center h-full">
          <div className="text-lg text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="space-y-6"
    >
      <MasterFormHeader
        onBack={handleBack}
        title="Edit Role"
      />

      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-5 sm:p-6 bg-gray-50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Role Name <span className="text-[#FF0000]">*</span>
              </label>

              <input
                name="name"
                value={form.name}
                onChange={(e) => {
                  handleChange(e);
                  setErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="Please enter role name"
                className={`w-full px-3 py-2 rounded-lg bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 transition-colors ${errors.name
                    ? 'border border-red-500 bg-red-50 focus:ring-red-500'
                    : 'border border-gray-200 focus:ring-black'
                  }`}
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <div id="name-error" className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.name}
                </div>
              )}
            </div>

            {/* Description - Textarea */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Description <span className="text-[#FF0000]">*</span>
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Please enter role description"
                rows={4}
                className={`w-full px-3 py-2 rounded-lg bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 transition-colors resize-none ${errors.description
                    ? 'border border-red-500 bg-red-50 focus:ring-red-500'
                    : 'border border-gray-200 focus:ring-black'
                  }`}
                aria-invalid={errors.description ? 'true' : 'false'}
                aria-describedby={errors.description ? 'description-error' : undefined}
              />
              {errors.description && (
                <div id="description-error" className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.description}
                </div>
              )}
            </div>

            {/* Role Permission Section - Tree Style */}
            <div className="mt-8">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Role Permission <span className="text-[#FF0000]">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">Update permissions for this role</p>
              {permissionError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{permissionError}</span>
                </div>
              )}
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                {isLoading ? (
                  <div className="p-6 flex items-center justify-center min-h-[250px]">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-sm text-gray-600 font-medium">Loading permissions...</p>
                    </div>
                  </div>
                ) : (
                  <PermissionTree
                    data={permissionTreeData}
                    selectedPermissionIds={selectedPermissionIds}
                    onChange={setSelectedPermissionIds}
                  />
                )}
              </div>
              {selectedPermissionIds.length > 0 && !isLoading && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {selectedPermissionIds.length} permission(s) selected
                </p>
              )}
              {selectedPermissionIds.length === 0 && !isLoading && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Select at least one permission
                </p>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-800 placeholder:text-gray-400 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg btn-primary text-white shadow-sm disabled:opacity-60"
                disabled={saving}
              >
                {saving ? 'Updating...' : 'Update'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

export default EditRole;
