/**
 * @file EditPermission.tsx
 * @description Edit an existing permission.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../../constants';
import { MasterFormHeader, SelectField } from '../../../components/ui';
import SweetAlert from '../../../utils/SweetAlert';
import { getPermissionForEdit, updatePermissionWithFile } from '../../../services/EditPermission';
import { fetchParentPermissions } from '../../../services/ParentPermissions';

const EditPermission: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    displayName: '',
    name: '',
    url: '',
    parentPermission: '',
    description: '',
    icon: null as File | null,
    iconText: '',
    order: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [parentOptions, setParentOptions] = useState<{ value: string; label: string }[]>([]);
  const [parentLoading, setParentLoading] = useState(false);
  const [parentError, setParentError] = useState<string | null>(null);

  // Fetch initial permission data
  useEffect(() => {
    const fetchPermission = async () => {
      try {
        setIsLoading(true);
        if (id) {
          console.log('Fetching permission with ID:', id);
          const permission = await getPermissionForEdit(id);
          console.log('Permission data received:', permission);
          setForm({
            displayName: permission.display_name || '',
            name: permission.name || '',
            url: permission.url || '',
            parentPermission: permission.is_parent ? String(permission.is_parent) : '',
            description: permission.description || '',
            icon: null,
            iconText: permission.icon_text || '',
            order: permission.order !== undefined && permission.order !== null ? String(permission.order) : '',
          });
        }
      } catch (error) {
        console.error('Error fetching permission:', error);
        setErrors({ submit: 'Failed to load permission data. Please try again.' });
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchPermission();
    }
  }, [id]);

  // Fetch parent permissions for the SelectField
  useEffect(() => {
    let isMounted = true;
    setParentLoading(true);
    setParentError(null);

    const fetchParents = async () => {
      try {
        const { data, error } = await fetchParentPermissions();
        if (!isMounted) return;

        if (error) {
          setParentError(error);
          setParentOptions([]);
        } else {
          const opts = Array.isArray(data)
            ? data.map((p: any) => ({ value: String(p.id), label: p.display_name || p.name || String(p.id) }))
            : [];
          setParentOptions(opts);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setParentError(err?.message || 'Failed to load parent permissions');
        setParentOptions([]);
      } finally {
        if (isMounted) {
          setParentLoading(false);
        }
      }
    };

    fetchParents();
    return () => { isMounted = false; };
  }, []);

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
    if (!form.displayName || form.displayName.trim() === '') next.displayName = 'Please Enter Display Name';
    if (!form.name || form.name.trim() === '') next.name = 'Please Enter Name';
    if (!form.description || form.description.trim() === '') next.description = 'Please Enter Description';
    if (!form.order || form.order.trim() === '') next.order = 'Please Enter Order';

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      setSaving(true);
      const payload = {
        display_name: form.displayName,
        name: form.name,
        url: form.url,
        is_parent: form.parentPermission ? Number(String(form.parentPermission).replace(/^#/, '')) : null,
        description: form.description,
        icon_text: form.iconText,
        order: form.order,
        status: '1',
        icon_file: form.icon,
      } as any;

      if (id) {
        await updatePermissionWithFile(id, payload);
      }

      SweetAlert.showUpdateSuccess();
      setTimeout(() => {
        navigate(ROUTES.PERMISSION.ROOT);
      }, 1800);
    } catch (err) {
      console.error('Error updating permission:', err);
      // Try to extract field-level validation errors from the API client
      const respData = (err as any)?.responseData || (err as any)?.response || ((err as any)?.data ?? null);
      if (respData && respData.errors && typeof respData.errors === 'object') {
        const fieldErrors: Record<string, string> = {};
        for (const key of Object.keys(respData.errors)) {
          const val = respData.errors[key];
          if (Array.isArray(val) && val.length > 0) {
            fieldErrors[key === 'display_name' ? 'displayName' : key] = String(val[0]);
          } else if (typeof val === 'string') {
            fieldErrors[key === 'display_name' ? 'displayName' : key] = val;
          }
        }
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      } else {
        setErrors({ submit: 'Failed to update permission. Please try again.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate(ROUTES.PERMISSION.ROOT);
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
        title="Edit Permission"
      />

      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-5 sm:p-6 bg-gray-50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: Display Name & Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Display Name */}
              <div>
                <label className="block text-sm text-gray-600 placeholder:text-gray-400 mb-1">
                  Display Name <span className="text-[#FF0000]">*</span>
                </label>
                <input
                  name="displayName"
                  value={form.displayName}
                  onChange={(e) => {
                    handleChange(e);
                    setErrors((prev) => ({ ...prev, displayName: '' }));
                  }}
                  placeholder="Please enter display name"
                  className={`w-full px-3 py-2 rounded-lg bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 transition-colors ${errors.displayName
                    ? 'border border-red-500 bg-red-50 focus:ring-red-500'
                    : 'border border-gray-200 focus:ring-black'
                    }`}
                  aria-invalid={errors.displayName ? 'true' : 'false'}
                  aria-describedby={errors.displayName ? 'displayName-error' : undefined}
                />
                {errors.displayName && (
                  <div id="displayName-error" className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errors.displayName}
                  </div>
                )}
              </div>

              {/* Name (Route Name) */}
              <div>
                <label className="block text-sm text-gray-600 placeholder:text-gray-400 mb-1">
                  Name (Route Name) <span className="text-[#FF0000]">*</span>
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={(e) => {
                    handleChange(e);
                    setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="Please enter name"
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
            </div>

            {/* Row 2: URL, Order & Icon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* URL */}
              <div>
                <label className="block text-sm text-gray-600 placeholder:text-gray-400 mb-1">
                  URL
                </label>
                <input
                  name="url"
                  value={form.url}
                  onChange={handleChange}
                  placeholder="Please enter URL"
                  className={`w-full px-3 py-2 rounded-lg bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 transition-colors border border-gray-200 focus:ring-bl500`}
                />
              </div>

              {/* Order */}
              <div>
                <label className="block text-sm text-gray-600 placeholder:text-gray-400 mb-1">
                  Order <span className="text-[#FF0000]">*</span>
                </label>
                <input
                  name="order"
                  type="number"
                  value={form.order}
                  onChange={handleChange}
                  placeholder="Please enter order"
                  className={`w-full px-3 py-2 rounded-lg bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 transition-colors ${errors.order
                    ? 'border border-red-500 bg-red-50 focus:ring-red-500'
                    : 'border border-gray-200 focus:ring-black'
                    }`}
                  aria-invalid={errors.order ? 'true' : 'false'}
                  aria-describedby={errors.order ? 'order-error' : undefined}
                />
                {errors.order && (
                  <div id="order-error" className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errors.order}
                  </div>
                )}
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm text-gray-600 placeholder:text-gray-400 mb-1">
                  Icon
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="icon-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setForm((prev) => ({ ...prev, icon: file }));
                        if (errors.icon) {
                          setErrors((prev) => ({ ...prev, icon: '' }));
                        }
                      }
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                  <label
                    htmlFor="icon-upload"
                    className="flex-1 px-3 py-2 rounded-lg bg-white text-gray-800 placeholder:text-gray-400 border border-gray-200 focus:ring-blue-50ursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-800 placeholder:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    <span className="text-gray-500">
                      {form.icon ? `${form.icon.name}` : 'Choose icon file'}
                    </span>
                  </label>
                  {form.icon && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, icon: null }));
                      }}
                      className="px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Row 3: Icon Text & Parent Permission */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Icon Text */}
              <div>
                <label className="block text-sm text-gray-600 placeholder:text-gray-400 mb-1">
                  Icon Text
                </label>
                <input
                  name="iconText"
                  value={form.iconText}
                  onChange={handleChange}
                  placeholder="Please enter icon text"
                  className="w-full px-3 py-2 rounded-lg bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 transition-colors border border-gray-200 focus:ring-black"
                />
              </div>

              {/* Select Parent Permission */}
              <div>
                <label className="block text-sm text-gray-600 placeholder:text-gray-400 mb-1">
                  Select Parent Permission
                </label>
                <SelectField
                  name="parentPermission"
                  placeholder="Please select parent permission"
                  options={parentOptions}
                  value={form.parentPermission}
                  onChange={(v) => {
                    setForm((prev) => ({ ...prev, parentPermission: typeof v === 'string' ? v : v[0] ?? '' }));
                    setErrors((prev) => ({ ...prev, parentPermission: '' }));
                  }}
                  searchable
                  inputClassName="border border-gray-200 focus:ring-black"
                  disabled={parentLoading}
                />
                {parentLoading && <div className="text-xs text-gray-800 placeholder:text-gray-400 mt-1">Loading parent permissions...</div>}
                {parentError && <div className="text-xs text-red-500 mt-1">{parentError}</div>}
                {!parentLoading && !parentError && parentOptions.length === 0 && (
                  <div className="text-xs text-gray-800 placeholder:text-gray-400 mt-1">No parent permissions available.</div>
                )}
              </div>
            </div>

            {/* Description - Full Width */}
            <div>
              <label className="block text-sm text-gray-600 placeholder:text-gray-400 mb-1">
                Description <span className="text-[#FF0000]">*</span>
              </label>
              <textarea
                name="description"
                placeholder="Please enter description"
                value={form.description}
                onChange={handleChange}
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

            {/* Form Actions */}
            <div className="flex items-center justify-end">
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

export default EditPermission;
