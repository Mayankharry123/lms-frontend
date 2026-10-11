/**
 * @file CreateIndustryForm.tsx
 * @description Form to create or update an industry master record.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MasterFormHeader } from '../components/ui';
import { createIndustry } from '../services/IndustryMaster';
import { showSuccess, showError } from '../utils/notifications';
import type { CreateIndustryFormProps } from '../types/pages/forms.types';

const CreateIndustryForm: React.FC<CreateIndustryFormProps> = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);


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
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Please Enter Industry Name';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      setSaving(true);
      const created = await createIndustry({ name });

      // If parent provided onSave (inline mode), let it handle updates/navigation
      if (onSave) {
        try {
          onSave({ name: created?.name || name, dateTime: formatDateTime(new Date()), id: created?.id });
        } catch {
          // swallow parent errors
        }
      } else {
        // Use global notification (same behaviour as Lead Source)
        showSuccess('Industry created successfully');
        onClose();
      }
    } catch (err: any) {

      let msg = err instanceof Error ? err.message : 'Failed to create industry';
      try {
        const resp = err?.responseData || err?.response || err;

        if (resp && resp.message) msg = String(resp.message);
        const errorsObj = resp && (resp.errors || resp.data?.errors || resp.errors);
        if (errorsObj && typeof errorsObj === 'object') {

          const fieldMap: Record<string, string> = { title: 'name', name: 'name' };
          for (const [k, v] of Object.entries(errorsObj)) {
            const msgs = Array.isArray(v) ? v : [v];
            const text = String(msgs[0]);
            const target = fieldMap[k] ?? k;
            if (target === 'name') {
              setErrors(prev => ({ ...prev, name: text }));
              msg = text;
              break;
            }
          }
        }
      } catch {
        // no need to action
      }
      // Show global popup only when not inline
      if (!onSave) showError(msg);
    } finally {
      setSaving(false);
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
      <MasterFormHeader onBack={onClose} title="Create Industry" />
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 bg-gray-50 rounded-2xl ">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm text-gray-800 mb-1">Industry Name <span className="text-red-500">*</span></label>
              <input
                name="industryName"
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: '' })); }}
                className={`w-full px-3 py-2 border rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-1 transition-colors ${errors.name ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-black'
                  }`}
                placeholder="Please Enter Industry Name"
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <div id="name-error" className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.name}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg btn-primary text-white shadow-sm disabled:opacity-60"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

export default CreateIndustryForm;
