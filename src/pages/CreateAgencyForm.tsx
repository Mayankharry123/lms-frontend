/**
 * @file CreateAgencyForm.tsx
 * @description Form to create or update an agency master record.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useEffect, useRef, useState } from 'react';
import { listAgencyTypes, listAgencyClients, createGroupAgency } from '../services';
import { motion } from 'framer-motion';
// ChevronDropdownIcon replaced by unified SelectDropdown; keep import removed
import { Plus, Trash2 } from 'lucide-react';
import { MasterFormHeader, SelectField, MultiSelectDropdown } from '../components/ui';
import { updateAgency } from '../services/AgencyMaster';
import SweetAlert from '../utils/SweetAlert';
import type {
  ChildAgencyFormValues,
  CreateAgencyFormProps,
  ParentAgencyFormValues,
} from '../types/pages/forms.types';

// helper to create a new blank child entry
const blankChild = (): ChildAgencyFormValues => ({
  id: `child-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  type: '',
  client: [],
});

const toIdArray = (raw: any): string[] => {
  if (raw == null) return [];

  if (typeof raw === 'number' || typeof raw === 'bigint') {
    const s = String(raw).trim();
    return s ? [s] : [];
  }

  const pickId = (v: any): string => {
    if (v == null) return '';
    if (typeof v === 'object') {
      const idVal =
        v.id ??
        v.brand_id ??
        v.client_id ??
        v.agency_client_id ??
        v.value;
      if (idVal != null && String(idVal).trim() !== '') return String(idVal);
      return '';
    }
    return String(v).trim();
  };

  if (Array.isArray(raw)) {
    return raw
      .map(pickId)
      .filter(Boolean);
  }

  if (typeof raw === 'string') {
    const val = raw.trim();
    if (!val) return [];
    // Supports "1,2,3" or single value "1"
    if (val.includes(',')) {
      return val.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [val];
  }

  if (typeof raw === 'object') {
    const single = pickId(raw);
    return single ? [single] : [];
  }

  return [];
};

/** First defined-but-empty (`''`, `[]`) must not block later keys that carry real IDs (edit payloads vary by API). */
function pickFirstUsableClientRaw(...candidates: any[]): any {
  for (const v of candidates) {
    if (v == null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    return v;
  }
  return [];
}

const CreateAgencyForm: React.FC<CreateAgencyFormProps> = ({ onClose, onSave, mode = 'create', initialData }) => {
  const [parent, setParent] = useState<ParentAgencyFormValues>({ name: '', type: '', client: [] });
  const [children, setChildren] = useState<ChildAgencyFormValues[]>([]);
  const childNameRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [parentErrors, setParentErrors] = useState<{ name?: string; type?: string; client?: string }>({});
  const [childErrors, setChildErrors] = useState<Record<string, { name?: string; type?: string; client?: string }>>({});
  // use global notification utility (showSuccess/showError) like other masters

  const [agencyTypes, setAgencyTypes] = useState<Array<{ value: string; label: string }>>([]);
  const [agencyClients, setAgencyClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState({ agencyTypes: true, agencyClients: true });

  // Confirmation modal removed
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const items = await listAgencyTypes();
        if (!mounted) return;
        // keep both id and label so SelectField provides id as value (server expects numeric id)
        const opts = items.map((it: any) => ({ value: String(it.id), label: it.name || String(it.id) }));
        setAgencyTypes(opts);
      } catch (err) {
        console.error('Failed to load agency types', err);
      } finally {
        if (mounted) setIsLoading(prev => ({ ...prev, agencyTypes: false }));
      }
    })();

    (async () => {
      try {
        const items = await listAgencyClients();
        if (!mounted) return;
        setAgencyClients(items.filter((i: any) => i.status !== '0'));
      } catch (err) {
        console.error('Failed to load agency clients:', err);
      } finally {
        if (mounted) setIsLoading(prev => ({ ...prev, agencyClients: false }));
      }
    })();

    // If initialData provided (edit mode), populate the form
    if (initialData && mode === 'edit') {
      const parentData = initialData.parent || initialData;

      // Extract agency type - could be nested object or string
      let parentTypeId = '';
      const rawParentType = parentData.type || parentData.agency_type;
      if (typeof rawParentType === 'object' && rawParentType?.id) {
        parentTypeId = String(rawParentType.id);
      } else if (rawParentType) {
        parentTypeId = String(rawParentType);
      }

      // Extract agency clients from multiple possible API keys/shapes.
      const rawParentClient = pickFirstUsableClientRaw(
        parentData.client,
        parentData.clients,
        parentData.client_ids,
        parentData.brand,
        parentData.brands,
        parentData.brand_ids,
        parentData.agency_client,
        parentData.agency_clients,
        []
      );
      const parentClientIds: string[] = toIdArray(rawParentClient);

      setParent({
        name: parentData.name || parentData.agencyName || '',
        type: parentTypeId,
        client: parentClientIds,
      });

      // Handle child agencies (support both 'children' and 'childs' keys)
      const childAgencies = Array.isArray(initialData.children)
        ? initialData.children
        : Array.isArray(initialData.childs)
          ? initialData.childs
          : [];

      if (childAgencies.length > 0) {
        setChildren(childAgencies.map((c: any, idx: number) => {
          // Extract child agency type
          let childTypeId = '';
          const rawChildType = c.type || c.agency_type;
          if (typeof rawChildType === 'object' && rawChildType?.id) {
            childTypeId = String(rawChildType.id);
          } else if (rawChildType) {
            childTypeId = String(rawChildType);
          }

          const rawChildClient = pickFirstUsableClientRaw(
            c.client,
            c.clients,
            c.client_ids,
            c.brand,
            c.brands,
            c.brand_ids,
            c.agency_client,
            c.agency_clients,
            []
          );
          const childClientIds: string[] = toIdArray(rawChildClient);

          return {
            id: `child-${idx}-${Date.now()}`,
            name: c.name || '',
            type: childTypeId,
            client: childClientIds,
          };
        }));
      }
    }

    return () => { mounted = false; };
  }, [mode, initialData]);

  // Confirmation modal removed
  // Remove unused modal-related functions
  const handleAddChild = () => {
    const nc = blankChild();
    setChildren(prev => [...prev, nc]);
    setLastAddedId(nc.id);
  };
  const handleUpdateChild = (id: string, key: keyof ChildAgencyFormValues, value: string | string[]) => {
    setChildren(prev => prev.map(c => c.id === id ? { ...c, [key]: value } : c));
  };
  // legacy remove (not used) -- removed to avoid unused variable lint
  // Remove a child agency (allow zero children so the form can start closed)
  const safeRemoveChild = (id: string) => {
    // remove the ref entry to avoid memory leak
    if (childNameRefs.current[id]) delete childNameRefs.current[id];
    setChildren(prev => prev.filter(c => c.id !== id));
  };

  // autofocus the newly added child's name input when added
  useEffect(() => {
    if (!lastAddedId) return;
    const tryFocus = () => {
      const el = childNameRefs.current[lastAddedId!];
      if (el) {
        try {
          el.focus();
        } catch (e) {
          // ignore
          console.error(e);
        }
        setLastAddedId(null);
        return true;
      }
      return false;
    };

    // first immediate attempt
    if (tryFocus()) return;

    // element may not be mounted yet; try again shortly
    const t = setTimeout(() => {
      tryFocus();
    }, 60);
    return () => clearTimeout(t);
  }, [lastAddedId]);

  const validate = (): { ok: boolean; message?: string } => {
    let valid = true;
    const newParentErrors: { name?: string; type?: string; client?: string } = {};
    const newChildErrors: Record<string, { name?: string; type?: string; client?: string }> = {};

    if (!parent.name.trim()) {
      newParentErrors.name = 'Please enter agency name';
      valid = false;
    }
    if (!parent.type.trim()) {
      newParentErrors.type = 'Please select agency type';
      valid = false;
    }
    children.forEach(c => {
      const childErr: { name?: string; type?: string; client?: string } = {};
      if (!c.name.trim()) {
        childErr.name = 'Please enter agency name';
        valid = false;
      }
      if (!c.type.trim()) {
        childErr.type = 'Please select agency type';
        valid = false;
      }
      if (Object.keys(childErr).length > 0) {
        newChildErrors[c.id] = childErr;
      }
    });
    setParentErrors(newParentErrors);
    setChildErrors(newChildErrors);
    return { ok: valid };
  };

  const submitAll = async () => {
    const v = validate();
    if (!v.ok) {
      return;
    }

    try {
      setSubmitting(true);

      // Build FormData arrays to match backend expectations.
      // Backend expects name[] and type[] arrays and nested client arrays like client[0][].
      const form = new FormData();

      const allNames = [parent.name.trim(), ...children.map(c => c.name.trim())];
      allNames.forEach(n => form.append('name[]', n));

      const allTypes = [parent.type, ...children.map(c => c.type)];
      allTypes.forEach(t => {
        const match = agencyTypes.find(a => String(a.value) === String(t) || String(a.label) === String(t));
        const typeVal = match ? String(match.value) : String(t);
        form.append('type[]', typeVal);
      });

      const allClients = [
        Array.isArray(parent.client) ? parent.client : (parent.client ? [parent.client] : []),
        ...children.map(c => Array.isArray(c.client) ? c.client : (c.client ? [c.client] : []))
      ];
      allClients.forEach((clientsForAgency, idx) => {
        (clientsForAgency || []).forEach((clientId) => {
          form.append(`client[${idx}][]`, clientId);
        });
      });

      // Call appropriate API based on mode
      if (mode === 'edit' && initialData?.id) {
        form.append('_method', 'PUT');
        await updateAgency(initialData.id, form);
      } else {
        await createGroupAgency(form);
      }

      if (onSave && typeof onSave === 'function') {
        const payload = {
          parent: { ...parent, name: parent.name.trim() },
          children: children.map(c => ({ name: c.name.trim(), type: c.type, client: c.client })),
        };
        const customRes = onSave(payload);
        if (customRes && typeof (customRes as Promise<unknown>).then === 'function') await customRes;
      }

      if (mode === 'edit') {
        SweetAlert.showUpdateSuccess();
      } else {
        SweetAlert.showCreateSuccess();
      }
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1800);
    } catch (err: any) {
      // Handle API validation errors for parent and child agency names (name.0, name.1, ...)
      const responseData = err?.responseData;
      if (responseData?.errors && typeof responseData.errors === 'object') {
        const newParentErrors: { name?: string; type?: string; client?: string } = {};
        const newChildErrors: Record<string, { name?: string; type?: string; client?: string }> = {};
        // Map 'name.0' to parent agency name error, 'name.1' to first child, etc.
        Object.keys(responseData.errors).forEach((key) => {
          const match = key.match(/^name\.(\d+)$/);
          if (match) {
            const idx = parseInt(match[1], 10);
            if (idx === 0) {
              newParentErrors.name = Array.isArray(responseData.errors[key]) ? responseData.errors[key].join(' ') : String(responseData.errors[key]);
            } else {
              // idx-1 because children array starts after parent
              const child = children[idx - 1];
              if (child) {
                newChildErrors[child.id] = {
                  ...(newChildErrors[child.id] || {}),
                  name: Array.isArray(responseData.errors[key]) ? responseData.errors[key].join(' ') : String(responseData.errors[key]),
                };
              }
            }
          }
        });
        setParentErrors(prev => ({ ...prev, ...newParentErrors }));
        setChildErrors(prev => ({ ...prev, ...newChildErrors }));
        // Do not show global error toast for this case
        return;
      }
      console.error('Submit failed', err);
      try {
        SweetAlert.showError((err as any)?.message || `Failed to ${mode === 'edit' ? 'update' : 'create'} agency`);
      } catch (e) {
        console.error(e);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="flex-1 overflow-hidden w-full overflow-x-hidden bg-gray-50 min-h-screen"
    >

      <div className="">
        <MasterFormHeader onBack={onClose} title={mode === 'edit' ? 'Edit Group Agency' : 'Create Group Agency'} />

        <div className="w-full max-w-full mx-auto sm:bg-white agency-edit-outer sm:rounded-2xl sm:border sm:border-gray-200 overflow-hidden">
          <div className="sm:p-5 sm:bg-gray-50 sm:space-y-8 agency-edit-wrapper">
            <div className="space-y-3">
              <div className="text-base font-semibold text-gray-900 mb-2">Group Agency Details</div>

              <div className="p-4 md:p-6 border border-gray-200 rounded-xl bg-white">

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                  <div>
                    <label className="block text-sm text-gray-800 mb-1">Agency Name <span className="text-red-500">*</span></label>
                    <input
                      value={parent.name}
                      onChange={e => {
                        setParent(prev => ({ ...prev, name: e.target.value }));
                        setParentErrors(prev => ({ ...prev, name: undefined }));
                      }}
                      placeholder="Please Enter Agency Name"
                      className={`w-full px-3 py-2 h-11 text-sm border rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-black ${parentErrors.name ? 'border-red-500' : 'border-gray-200'}`}
                    />
                    {parentErrors.name && (
                      <div className="text-xs text-red-500 mt-1">{parentErrors.name}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-800 mb-1">Agency Type <span className="text-red-500">*</span></label>
                    <SelectField
                      name="parentType"
                      value={parent.type}
                      options={agencyTypes}
                      onChange={(v) => { setParent(prev => ({ ...prev, type: typeof v === 'string' ? v : v[0] ?? '' })); setParentErrors(prev => ({ ...prev, type: undefined })); }}
                      placeholder="Please Select Agency Type"
                      inputClassName={`${parentErrors.type ? 'border-red-500' : 'border-gray-200'} px-3 py-2 h-11`}
                    />
                    {parentErrors.type && (
                      <div className="text-xs text-red-500 mt-1">{parentErrors.type}</div>
                    )}
                  </div>

                  <div className="mb-2">
                    <label className="block text-sm text-gray-800 mb-1">Agency Client</label>
                    <div className="w-full">
                      <MultiSelectDropdown
                        name="parentClient"
                        value={parent.client}
                        options={agencyClients.map((c: any) => ({ value: String(c.id), label: c.name }))}
                        onChange={(v) => { setParent(prev => ({ ...prev, client: Array.isArray(v) ? v : [v] })); setParentErrors(prev => ({ ...prev, client: undefined })); }}
                        placeholder={isLoading.agencyClients ? 'Loading clients...' : 'Search or select options'}
                        inputClassName={`border ${parentErrors.client ? 'border-red-500' : 'border-gray-200'} px-3 py-2 h-11`}
                        disabled={isLoading.agencyClients}
                        multi={true}
                        horizontalScroll={true}
                      />
                    </div>
                    {parentErrors.client && (
                      <div className="text-xs text-red-500 mt-1">{parentErrors.client}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8 mt-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-base font-semibold text-gray-900">Add child agency</div>
                <button
                  type="button"
                  onClick={handleAddChild}
                  className="btn-primary"
                  data-btn-label="Add">

                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Add Child Agency</span>
                </button>
              </div>
              <div className="space-y-6">
                {children.map((c, idx) => (
                  <div key={c.id} className="p-4 md:p-6 border border-gray-200 rounded-xl bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-medium text-gray-800">Child Agency {idx + 1}</div>
                      <button
                        type="button"
                        onClick={() => safeRemoveChild(c.id)}
                        className="btn-delete"
                        aria-label={`Delete child agency ${idx + 1}`}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-start">
                      <div>
                        <label className="block text-sm text-gray-800 mb-1">Agency Name <span className="text-red-500">*</span></label>
                        <input
                          value={c.name}
                          onChange={e => {
                            handleUpdateChild(c.id, 'name', e.target.value);
                            setChildErrors(prev => ({ ...prev, [c.id]: { ...prev[c.id], name: undefined } }));
                          }}
                          placeholder="Please Enter Agency Name"
                          ref={el => { childNameRefs.current[c.id] = el }}
                          className={`w-full px-3 py-2 h-11 text-sm border rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-black ${childErrors[c.id]?.name ? 'border-red-500' : 'border-[#D0D5DD]'}`}
                        />
                        {childErrors[c.id]?.name && (
                          <div className="text-xs text-red-500 mt-1">{childErrors[c.id].name}</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm text-gray-800 mb-1">Agency Type <span className="text-red-500">*</span></label>
                        <SelectField
                          name={`child-${c.id}-type`}
                          value={c.type}
                          options={agencyTypes}
                          onChange={(v) => { handleUpdateChild(c.id, 'type', typeof v === 'string' ? v : v[0] ?? ''); setChildErrors(prev => ({ ...prev, [c.id]: { ...prev[c.id], type: undefined } })); }}
                          placeholder="Please Select Agency Type"
                          inputClassName={`${childErrors[c.id]?.type ? 'border-red-500' : 'border-[#D0D5DD]'} px-3 py-2 h-11`}
                        />
                        {childErrors[c.id]?.type && (
                          <div className="text-xs text-red-500 mt-1">{childErrors[c.id].type}</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm text-gray-800 mb-1">Agency Client</label>
                        <div className="w-full">
                          <MultiSelectDropdown
                            name={`child-${c.id}-client`}
                            value={Array.isArray(c.client) ? c.client : (c.client ? [c.client] : [])}
                            options={agencyClients.map((cc: any) => ({ value: String(cc.id), label: cc.name }))}
                            onChange={(v) => { handleUpdateChild(c.id, 'client', Array.isArray(v) ? v : [v]); setChildErrors(prev => ({ ...prev, [c.id]: { ...prev[c.id], client: undefined } })); }}
                            placeholder={isLoading.agencyClients ? 'Loading clients...' : 'Search or select options'}
                            inputClassName={`border ${childErrors[c.id]?.client ? 'border-red-500' : 'border-[#D0D5DD]'} px-3 py-2 h-11`}
                            disabled={isLoading.agencyClients}
                            multi={true}
                            horizontalScroll={true}
                          />
                        </div>
                        {childErrors[c.id]?.client && (
                          <div className="text-xs text-red-500 mt-1">{childErrors[c.id].client}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end mt-8">
              <button
                type="button"
                onClick={submitAll}
                className="btn-primary"
                disabled={submitting}
                data-btn-label="Save"
              >
                {submitting ? (mode === 'edit' ? 'Updating...' : 'Saving...') : (mode === 'edit' ? 'Update' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation modal removed */}
    </motion.div>
  );
};

export default CreateAgencyForm;
