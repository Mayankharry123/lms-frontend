/**
 * @file CreateSourceForm.tsx
 * @description Form to create or update a lead source master record.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { MasterFormHeader, SelectField } from '../components/ui';
import { createLeadSubSource, fetchLeadSources, type LeadSource } from '../services/CreateSourceForm';
import SweetAlert from '../utils/SweetAlert';
import type { CreateSourceFormProps } from '../types/pages/forms.types';

const CreateSourceForm: React.FC<CreateSourceFormProps> = ({ onClose, onSave }) => {
  const location = useLocation();
  const [source, setSource] = useState('');
  const [subSource, setSubSource] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<LeadSource[]>([]);
  const [loadError, setLoadError] = useState<string>('');

  // Pre-select parent lead source from router state (e.g. navigate with state)
  useEffect(() => {
    if (options.length === 0) return;
    const navRaw = (location.state as { preselectLeadSourceId?: string } | null)?.preselectLeadSourceId;
    const id = navRaw != null && String(navRaw).trim() !== '' ? String(navRaw) : null;
    if (!id) return;
    if (options.some(o => String(o.id) === id)) {
      setSource(id);
    }
  }, [options, location.state]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchLeadSources()
      .then((list) => {
        if (!mounted) return;
        setOptions(list);
      })
      .catch((e: unknown) => {
        if (!mounted) return;
        const msg = e instanceof Error ? e.message : 'Failed to load sources';
        setLoadError(msg);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!source) next.source = 'Please Select Source';
    if (!subSource || subSource.trim() === '') next.subSource = 'Please Enter Sub Source';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    try {
      setSaving(true);
      const created = await createLeadSubSource({
        lead_source_id: source,
        name: subSource,
        status: 1,
      });

      // Find selected source name for parent callback
      const selectedSourceName = options.find(o => String(o.id) === String(source))?.name || String(source);

      const payload = {
        id: created?.id,
        lead_source_id: source,
        source: selectedSourceName,
        subSource: created?.name || subSource,
      };

      // If parent supplied onSave (inline mode), call it so parent can update listing and handle navigation/reload
      if (onSave) {
        try { onSave(payload); } catch { /* swallow parent errors */ }
      } else {
        // show local success and fallback to closing the form when not inline
        SweetAlert.showCreateSuccess();
        onClose();
      }
    } catch (err) {
      // Prefer field-specific validation messages when available and show inline errors when used inline
      let msg = err instanceof Error ? err.message : 'Failed to create sub-source';
      try {
        const resp = (err as any)?.responseData || (err as any)?.response || err;
        if (resp && resp.message) msg = String(resp.message);
        const errorsObj = resp && (resp.errors || resp.data?.errors || resp.errors);
        if (errorsObj && typeof errorsObj === 'object') {
          // map server field keys to our UI keys
          const fieldMap: Record<string, string> = { name: 'subSource', title: 'subSource', lead_source_id: 'source' };
          for (const [k, v] of Object.entries(errorsObj)) {
            const msgs = Array.isArray(v) ? v : [v];
            const text = String(msgs[0]);
            const target = fieldMap[k] ?? k;
            if (target === 'subSource' || target === 'source') {
              setErrors(prev => ({ ...prev, [target]: text }));
              msg = text;
              break;
            }
          }
        }
      } catch {
        // no need to action
      }
      // Show global popup only when not inline
      if (!onSave) SweetAlert.showError(msg);
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
      <MasterFormHeader onBack={onClose} title="Create Source" />
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="p-4 bg-gray-50 rounded-2xl h-[70dvh]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Source Name <span className="text-red-500">*</span>
                </label>
                <div>
                  <SelectField
                    name="source"
                    value={source}
                    onChange={(v) => { setSource(typeof v === 'string' ? v : v[0] ?? ''); setErrors(prev => ({ ...prev, source: '' })); }}
                    options={options.map(o => ({ value: String(o.id), label: o.name }))}
                    placeholder={loading ? 'Loading...' : 'Please Select Source Name'}
                    inputClassName={errors.source || loadError ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'}
                    disabled={loading}
                  />
                  {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                {(errors.source || loadError) && (
                  <div id="source-error" className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.source || loadError}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Sub Source <span className="text-red-500">*</span>
                </label>
                <input
                  value={subSource}
                  onChange={(e) => { setSubSource(e.target.value); setErrors(prev => ({ ...prev, subSource: '' })); }}
                  placeholder="Please Enter Sub Source"
                  className={`w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 transition-colors ${errors.subSource ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-black'
                    }`}
                  aria-invalid={errors.subSource ? 'true' : 'false'}
                  aria-describedby={errors.subSource ? 'subSource-error' : undefined}
                />
                {errors.subSource && (
                  <div id="subSource-error" className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.subSource}
                  </div>
                )}
              </div>
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

export default CreateSourceForm;
