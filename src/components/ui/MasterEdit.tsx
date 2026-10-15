import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Breadcrumb from './Breadcrumb';
import SelectField from './SelectField';
import { fetchLeadSources, type LeadSource } from '../../services/CreateSourceForm';
import { IoIosArrowBack } from 'react-icons/io';

type Props = {
  item: Record<string, any> | null;
  onClose: () => void;
  onSave?: (updated: Record<string, any>) => void;
  hideSource?: boolean;
  sourceAsInput?: boolean;
  /** Optional label to use when the field key is `name` (useful when hideSource is true) */
  nameLabel?: string;
};

const MasterEdit: React.FC<Props> = ({ item, onClose, onSave, hideSource = false, sourceAsInput = false, nameLabel }) => {
  const [form, setForm] = useState<Record<string, any>>(item || {});
  const [options, setOptions] = useState<LeadSource[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const latestSourceRef = useRef<string>('');

  useEffect(() => {
    setForm(item || {});
    setErrors({});
    setSubmitting(false);
  }, [item]);

  useEffect(() => {
    latestSourceRef.current = String(form?.source ?? '').trim();
  }, [form?.source]);


  const handleChange = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    // clear per-field error when user edits
    setErrors(prev => ({ ...prev, [key]: '' }));
  };


  useEffect(() => {
    if (hideSource || sourceAsInput) {
      setOptions([]);
      setLoadingOptions(false);
      return;
    }
    let mounted = true;
    setLoadingOptions(true);
    fetchLeadSources()
      .then(list => {
        if (!mounted) return;
        setOptions(list);

        if (hideSource) return;

        // Determine a sensible value for `source` when opening edit form.
        // The incoming `item` may contain one of several keys:
        // - `source` (string name or id)
        // - `lead_source_id` (id)
        // - `lead_source` (object or name)
        const incoming = item || {};

        const incomingId = incoming.lead_source_id ?? incoming.leadSource ?? (incoming.lead_source && (incoming.lead_source.id ?? incoming.lead_source));
        const incomingName = incoming.source ?? (incoming.lead_source && (typeof incoming.lead_source === 'string' ? incoming.lead_source : incoming.lead_source.name));

        // If form already has source, keep it only when it is a valid option id.
        // Otherwise, remap from incoming payload so dropdown can display selected value.
        const currentFormSource = String(latestSourceRef.current || '').trim();
        if (currentFormSource !== '') {
          const isExistingId = list.some(o => String(o.id) === currentFormSource);
          if (isExistingId) return;
        }

        // If we have an id from the item, use that id (string) as the select value.
        if (incomingId) {
          setForm(prev => ({ ...prev, source: String(incomingId) }));
          return;
        }

        // If we have a name, try to map it to an id from fetched list.
        if (incomingName) {
          const match = list.find(o => String(o.name).toLowerCase() === String(incomingName).toLowerCase() || String(o.id) === String(incomingName));
          if (match) {
            setForm(prev => ({ ...prev, source: String(match.id) }));
            return;
          }
          // fallback to storing the raw name so text remains visible
          setForm(prev => ({ ...prev, source: String(incomingName) }));
          return;
        }

        // If nothing from item, default to first option id (if available)
        if (latestSourceRef.current === '' && list.length > 0) {
          setForm(prev => ({ ...prev, source: String(list[0].id) }));
        }
      })
      .catch(() => {
        if (!mounted) return;
        setOptions([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingOptions(false);
      });
    return () => { mounted = false; };
  }, [item, hideSource, sourceAsInput]);

  if (!item) return null; // ✅ Hooks ke baad safe


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Determine sub-source field key if present in the form
    const possibleSubKeys = ['subSource', 'sub_source', 'name'];
    const subKey = possibleSubKeys.find(k => Object.prototype.hasOwnProperty.call(form, k));

    // Validate source if present
    if (Object.prototype.hasOwnProperty.call(form, 'source')) {
      if (!form.source || String(form.source).trim() === '') {
        setErrors({ ...errors, source: 'Please Select Source' });
        return;
      }
    }

    // Validate sub-source/name field if present
    if (subKey) {
      const val = form[subKey];
      if (!val || String(val).trim() === '') {
        const fieldMessage = subKey === 'name'
          ? `Please Enter ${nameLabel ?? (hideSource ? 'Industry' : 'Sub Source')}`
          : 'Please Enter Sub Source';
        setErrors({ ...errors, [subKey]: fieldMessage });
        return;
      }
    }

    if (onSave) {
      try {
        setSubmitting(true);
        const res: any = (onSave as any)(form as Record<string, any>);
        if (res && typeof res.then === 'function') {
          await res;
        }
        onClose();
        return;
      } catch (err) {
        // Try to pick field-specific errors from API response if present
        const message = err instanceof Error ? err.message : 'Failed to update record';
        try {
          const resp = (err as any).original?.responseData || (err as any).responseData || err;
          const errorsObj = resp && (resp.errors || resp.data?.errors || resp.errors);
          if (errorsObj && typeof errorsObj === 'object') {
            // Map known server field keys to our form keys: title -> name, etc.
            const fieldMap: Record<string, string> = { title: 'name' };
            let handled = false;
            for (const [k, v] of Object.entries(errorsObj)) {
              const msgs = Array.isArray(v) ? v : [v];
              const text = String(msgs[0]);
              const targetKey = fieldMap[k] ?? k;
              // If our form has this key, set per-field error
              if (Object.prototype.hasOwnProperty.call(form, targetKey)) {
                setErrors(prev => ({ ...prev, [targetKey]: text }));
                handled = true;
                break;
              }
            }
            if (handled) return;
          }
        } catch {
          // ignore parsing errors
        }

        setErrors(prev => ({ ...prev, form: message }));
        return;
      } finally {
        setSubmitting(false);
      }
    }
    onClose();
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex flex-col">
          <Breadcrumb />
        </div>
        <button
          onClick={onClose}
          className="flex items-center space-x-2 btn-primary text-white px-3 py-1 rounded-lg"
        >
          <IoIosArrowBack className="w-5 h-5" />
          <span className="text-sm">Go Back</span>
        </button>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
      >
        <div className="p-6 bg-gray-50 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(() => {
              const visibleEntries = Object.entries(form).filter(
                ([k]) => k !== 'id' && k !== 'dateTime' && k !== 'date_time' && !(hideSource && k === 'source')
              );
              return visibleEntries.map(([k]) => {
                const label = (k === 'name' && nameLabel)
                  ? nameLabel
                  : k.replace(/([A-Z])/g, ' $1')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                const isSingleField = visibleEntries.length === 1;

                return (
                  <div key={k} className={isSingleField ? 'md:col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-800 mb-1.5">
                      {label} <span className="text-[#FF0000]">*</span>
                    </label>
                    {k === 'source' && !sourceAsInput ? (
                      <>
                        <SelectField
                          name={k}
                          value={String(form[k] ?? '')}
                          onChange={(value) => handleChange(k, typeof value === 'string' ? value : value[0] ?? '')}
                          options={options.map(o => ({ value: String(o.id), label: o.name }))}
                          placeholder={loadingOptions ? 'Loading...' : 'Search or select option'}
                          disabled={loadingOptions}
                          inputClassName={errors[k] ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-black'}
                        />
                        {errors[k] && (
                          <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {errors[k]}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <input
                          value={form[k] ?? ''}
                          onChange={(e) => handleChange(k, e.target.value)}
                          readOnly={k === 'source' && sourceAsInput}
                          placeholder={`Please Enter ${label}`}
                          className={`w-full px-3 py-2 border rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-1 transition-colors ${
                            errors[k] ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-black'
                          }`}
                        />
                        {errors[k] && (
                          <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {errors[k]}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              });
            })()}

            {errors.form && (
              <div className="md:col-span-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {errors.form}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg btn-primary text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>
      </motion.form>
    </>
  );
};

export default MasterEdit;
