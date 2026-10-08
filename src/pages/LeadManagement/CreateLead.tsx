/**
 * @file CreateLead.tsx
 * @description Create new lead form and submission flow.
 * @author Sanjay Jangid <sanjay.jangid@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect } from 'react';
import LeadManagementSection from '../../components/forms/CreateLead/LeadManagementSection';
import ContactPersonsCard from '../../components/forms/CreateLead/ContactPersonsCard';
import AssignPriorityCard from '../../components/forms/CreateLead/AssignPriorityCard';
import CommentSection from '../../components/forms/CreateLead/CommentSection';
import { MasterCreateHeader, Button } from '../../components/ui';
import { useNavigate } from 'react-router-dom';
import { createLead, getBrandLists, getAgenciesLists, getLeadTypes } from '../../services/CreateLead';
import SweetAlert from '../../utils/SweetAlert';
import { apiClient } from '../../utils/apiClient';

const DUPLICATE_MOBILE_MSG =
  'This mobile number already exists in the system. Please enter a different mobile number.';

function normalizeMobileNumber(value: unknown): string {
  return String(value || '').replace(/\D/g, '');
}

function hasMobileMatch(rows: any[], targetMobile: string): boolean {
  return rows.some((leadRow: any) => {
    const raw = leadRow?.mobile_number;
    const list = Array.isArray(raw) ? raw : [leadRow?.number || leadRow?.phone || raw];
    return list.some(
      (entry: any) =>
        normalizeMobileNumber(typeof entry === 'string' ? entry : entry?.number) === targetMobile
    );
  });
}

function unwrapListRows(resp: any): any[] {
  const d = resp?.data;
  if (Array.isArray(d)) return d;
  if (d && typeof d === 'object' && Array.isArray((d as any).data)) return (d as any).data;
  return [];
}

async function checkDuplicateMobileInSystem(targetMobile: string): Promise<boolean> {
  try {
    const direct = await apiClient.get<any>(
      `/leads?mobile_number=${encodeURIComponent(targetMobile)}&per_page=50`
    );
    const directRows = unwrapListRows(direct);
    if (hasMobileMatch(directRows, targetMobile)) return true;
  } catch {
    // Fall through to paged scan if filtered request fails.
  }

  for (let page = 1; page <= 5; page += 1) {
    const res = await apiClient.get<any>(`/leads?page=${page}&per_page=50`);
    const rows = unwrapListRows(res);
    if (hasMobileMatch(rows, targetMobile)) return true;
    if (!rows.length) break;
  }
  return false;
}

const CreateLead: React.FC = () => {
  const [selectedOption, setSelectedOption] = useState<'brand' | 'agency'>('brand');
  const [dropdownValue, setDropdownValue] = useState<string>('');
  const [brandOptions, setBrandOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Helper to clear error for dropdownValue (brand/agency)
  const clearDropdownError = (val: string) => {
    setError(prev => (prev && val ? null : prev));
  };

  // Priority state
  const [priority, setPriority] = useState<string | undefined>(undefined);
  const [assignTo, setAssignTo] = useState<string | undefined>(undefined);
  const [callFeedback, setCallFeedback] = useState<string | undefined>(undefined);
  const [organisation, setOrganisation] = useState<string | undefined>(undefined);
  const [organisationError, setOrganisationError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<any[]>([{ id: '1', fullName: '', profileUrl: '', email: '', mobileNo: '', mobileNo2: '', showSecondMobile: false, type: '', designation: '', agencyBrand: '', source: '', subSource: '', department: '', country: '', state: '', city: '', zone: '', postalCode: '' }]);
  const [contactErrors, setContactErrors] = useState<Record<string, Partial<Record<string, string>>>>({});

  // Helper to clear error for a field as soon as it is valid
  const clearContactFieldError = (contactId: string, field: string, value: any) => {
    setContactErrors(prev => {
      if (!prev[contactId] || !prev[contactId][field]) return prev;
      let valid = true;
      if (field === 'mobileNo' || field === 'mobileNo2') {
        const str = String(value);
        valid = !!str && /^[0-9]+$/.test(str) && str.length === 10;
      } else {
        valid = !!value;
      }
      if (valid) {
        const { [field]: omit, ...restFields } = prev[contactId] || {};
        void omit; // mark as intentionally unused
        const updated = { ...prev, [contactId]: restFields };

        if (Object.keys(updated[contactId] || {}).length === 0) {
          const { [contactId]: omitId, ...rest } = updated;
          void omitId; // mark as intentionally unused
          return rest;
        }
        return updated;
      }
      return prev;
    });
  };
  const [comment, setComment] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [leadTypeNameById, setLeadTypeNameById] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  // Fetch dropdown data when selectedOption changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setBrandOptions([]);
    setDropdownValue('');
    const fetchData = async () => {
      try {
        const fetchFn = selectedOption === 'brand' ? getBrandLists : getAgenciesLists;
        const data = await fetchFn();
        if (!isMounted) return;
        setBrandOptions(
          Array.isArray(data)
            ? data.map((item: any) => ({ value: String(item.id), label: item.name }))
            : []
        );
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load options');
          setBrandOptions([]);
        }
      }
      setLoading(false);
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [selectedOption]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const types = await getLeadTypes();
        if (!isMounted) return;
        const map: Record<string, string> = {};
        (Array.isArray(types) ? types : []).forEach((t: any) => {
          const id = String(t?.id ?? '').trim();
          const name = String(t?.name ?? '').trim();
          if (id && name) map[id] = name;
        });
        setLeadTypeNameById(map);
      } catch {
        if (isMounted) setLeadTypeNameById({});
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const primaryLead = contacts?.[0];
  const primaryContactId = primaryLead?.id || '1';
  const primaryMobileNo = String(primaryLead?.mobileNo || '').trim();
  const primaryMobileNo2 = String(primaryLead?.mobileNo2 || '').trim();
  const setMobileDuplicateError = (contactId: string, field: 'mobileNo' | 'mobileNo2', hasDuplicate: boolean) => {
    setContactErrors(prev => {
      if (hasDuplicate) {
        return { ...prev, [contactId]: { ...(prev[contactId] || {}), [field]: DUPLICATE_MOBILE_MSG } };
      }
      if (prev?.[contactId]?.[field] !== DUPLICATE_MOBILE_MSG) return prev;
      const { [field]: omitted, ...restFields } = prev[contactId] || {};
      void omitted;
      if (Object.keys(restFields).length === 0) {
        const { [contactId]: removedId, ...rest } = prev;
        void removedId;
        return rest;
      }
      return { ...prev, [contactId]: restFields };
    });
  };

  useEffect(() => {
    const contactId = primaryContactId;
    const mobileNo = primaryMobileNo;
    const normalized = normalizeMobileNumber(mobileNo);

    if (!normalized || normalized.length !== 10) {
      setMobileDuplicateError(contactId, 'mobileNo', false);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      try {
        const exists = await checkDuplicateMobileInSystem(normalized);
        if (isCancelled) return;
        setMobileDuplicateError(contactId, 'mobileNo', exists);
      } catch {
        if (!isCancelled) setMobileDuplicateError(contactId, 'mobileNo', false);
      }
    }, 400);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [primaryContactId, primaryMobileNo]);

  useEffect(() => {
    const contactId = primaryContactId;
    const mobileNo2 = primaryMobileNo2;
    const normalized = normalizeMobileNumber(mobileNo2);

    if (!normalized || normalized.length !== 10) {
      setMobileDuplicateError(contactId, 'mobileNo2', false);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      try {
        const exists = await checkDuplicateMobileInSystem(normalized);
        if (isCancelled) return;
        setMobileDuplicateError(contactId, 'mobileNo2', exists);
      } catch {
        if (!isCancelled) setMobileDuplicateError(contactId, 'mobileNo2', false);
      }
    }, 400);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [primaryContactId, primaryMobileNo2]);

  const handleSave = () => {
    // Validate minimal required fields and submit to API
    (async () => {
      // clear previous errors
      setContactErrors({});

      if (!contacts || contacts.length === 0) {
        // Show error under Full Name of the (first) contact card
        setContactErrors({ '1': { fullName: 'Please add at least one contact person.' } });
        return;
      }

      const lead = contacts[0];
      const firstContactId = lead.id || '1';

      const newContactErrors: Record<string, Partial<Record<string, string>>> = {};
      // Required fields validation for all * fields
      if (!lead.fullName) {
        newContactErrors[firstContactId] = { ...(newContactErrors[firstContactId] || {}), fullName: 'Please provide contact name.' };
      }
      // Mobile number validation: only numbers, exactly 10 digits, no alphabets or special characters
      if (!lead.mobileNo) {
        newContactErrors[firstContactId] = { ...(newContactErrors[firstContactId] || {}), mobileNo: 'Please provide mobile number.' };
      } else {
        const mobileNoStr = String(lead.mobileNo);
        if (!/^[0-9]+$/.test(mobileNoStr)) {
          newContactErrors[firstContactId] = { ...(newContactErrors[firstContactId] || {}), mobileNo: 'Mobile number must contain only digits.' };
        } else if (mobileNoStr.length !== 10) {
          newContactErrors[firstContactId] = { ...(newContactErrors[firstContactId] || {}), mobileNo: 'Mobile number must be exactly 10 digits.' };
        }
      }
      if (!lead.type) {
        newContactErrors[firstContactId] = { ...(newContactErrors[firstContactId] || {}), type: 'Please select type.' };
      }
      if (!lead.designation) {
        newContactErrors[firstContactId] = { ...(newContactErrors[firstContactId] || {}), designation: 'Please select designation.' };
      }
      if (!lead.department) {
        newContactErrors[firstContactId] = { ...(newContactErrors[firstContactId] || {}), department: 'Please select department.' };
      }
      if (!lead.country) {
        newContactErrors[firstContactId] = { ...(newContactErrors[firstContactId] || {}), country: 'Please select country.' };
      }
      if (!lead.source) {
        newContactErrors[firstContactId] = { ...(newContactErrors[firstContactId] || {}), source: 'Please select source.' };
      }
      if (!lead.subSource) {
        newContactErrors[firstContactId] = { ...(newContactErrors[firstContactId] || {}), subSource: 'Please select sub-source.' };
      }
      // Validate dropdownValue (brand/agency)
      if (!dropdownValue) {
        setError(selectedOption === 'brand' ? 'Please select a brand.' : 'Please select an agency.');
        setContactErrors(newContactErrors);
        return;
      } else {
        setError(null);
      }

      // Validate organisation
      setOrganisationError(null);
      if (!organisation) {
        setOrganisationError('Please select an organisation.');
        setContactErrors(newContactErrors);
        return;
      }

      if (Object.keys(newContactErrors).length > 0) {
        setContactErrors(newContactErrors);
        return;
      }
      const normalizedMobile = normalizeMobileNumber(lead.mobileNo);
      if (normalizedMobile.length === 10) {
        try {
          const isDuplicateMobile = await checkDuplicateMobileInSystem(normalizedMobile);
          if (isDuplicateMobile) {
            setContactErrors(prev => ({
              ...prev,
              [firstContactId]: { ...(prev[firstContactId] || {}), mobileNo: DUPLICATE_MOBILE_MSG }
            }));
            return;
          }
        } catch {
          // fallback to backend validation on submit
        }
      }
      const normalizedMobile2 = normalizeMobileNumber(lead.mobileNo2);
      if (normalizedMobile2.length === 10) {
        try {
          const isDuplicateMobile2 = await checkDuplicateMobileInSystem(normalizedMobile2);
          if (isDuplicateMobile2) {
            setContactErrors(prev => ({
              ...prev,
              [firstContactId]: { ...(prev[firstContactId] || {}), mobileNo2: DUPLICATE_MOBILE_MSG }
            }));
            return;
          }
        } catch {
          // fallback to backend validation on submit
        }
      }

      const mobile_number = [lead.mobileNo].filter(Boolean);
      if (lead.mobileNo2) mobile_number.push(lead.mobileNo2);

      // Helper: extract numeric id from possibly-formatted id strings like "#USR001"
      const extractNumericId = (val?: string | number) => {
        if (val === undefined || val === null) return undefined;
        const s = String(val);
        const digits = s.replace(/\D+/g, '');
        return digits ? Number(digits) : undefined;
      };

      const payload: any = {
        name: lead.fullName,
        email: lead.email || null,
        profile_url: lead.profileUrl || null,
        mobile_number,
        // current_assign_user must be numeric id — extract digits from formatted id if needed
        current_assign_user: extractNumericId(assignTo),
        priority_id: priority ? Number(priority) : undefined,
        designation_id: lead.designation ? Number(lead.designation) : undefined,
        department_id: lead.department ? Number(lead.department) : undefined,
        lead_source_id: lead.source ? Number(lead.source) : undefined,
        source_id: lead.source ? Number(lead.source) : undefined,
        sub_source_id: lead.subSource ? Number(lead.subSource) : undefined,
        country_id: lead.country ? Number(lead.country) : undefined,
        state_id: lead.state ? Number(lead.state) : undefined,
        city_id: lead.city ? Number(lead.city) : undefined,
        zone_id: lead.zone ? Number(lead.zone) : undefined,
        postal_code: lead.postalCode || undefined,
        comment: comment || undefined,
        call_status_id: callFeedback ? Number(callFeedback) : undefined,
        organisation_id: organisation ? Number(String(organisation).replace(/\D/g, '')) || undefined : undefined,
      };

      const typeValue = String(lead.type || '').trim();
      if (typeValue) {
        const numericTypeId = Number(typeValue);
        const isNumericTypeValue =
          !Number.isNaN(numericTypeId) && Number.isFinite(numericTypeId) && numericTypeId > 0;
        // Keep backward compatibility: backend still validates "type" as required.
        // Never send numeric ID in `type`; send label or omit if unresolved.
        payload.type = leadTypeNameById[typeValue] || (isNumericTypeValue ? undefined : typeValue);
        if (isNumericTypeValue) {
          payload.lead_type_id = numericTypeId;
        }
      }

      if (selectedOption === 'brand') payload.brand_id = dropdownValue || undefined;
      else payload.agency_id = dropdownValue || undefined;

      try {
        setSaving(true);
        const res = await createLead(payload);
        if (res.error) {
          // If server returned field errors, map them to contact fields to show inline
          if (res.errors && typeof res.errors === 'object') {
            const serverErrors = res.errors as Record<string, any>;
            const mapped: Record<string, Partial<Record<string, string>>> = {};
            const contactId = firstContactId;
            Object.keys(serverErrors).forEach((k) => {
              const messages = Array.isArray(serverErrors[k]) ? serverErrors[k] : [serverErrors[k]];
              // map backend keys to contact field keys
              const keyMap: Record<string, string> = {
                name: 'fullName',
                mobile_number: 'mobileNo',
                type: 'type',
                lead_type_id: 'type',
                designation_id: 'designation',
                department_id: 'department',
                lead_source_id: 'source',
                source_id: 'source',
                sub_source_id: 'subSource',
                country_id: 'country',
              };
              const target = keyMap[k] || k;
              mapped[contactId] = { ...(mapped[contactId] || {}), [target]: String(messages[0]) };
            });
            setContactErrors(mapped);
            return;
          }
          return;
        }
        SweetAlert.showCreateSuccess();
        // Force canonical list URL to avoid malformed slug/path redirects.
        window.location.replace(`${window.location.origin}/lead-management/all-leads`);
        return;
      } catch (err: any) {
        const msg = err?.message || 'Failed to create lead';
        setError(msg);
        try { SweetAlert.showError(msg); } catch {
          // no need to action
        }
      } finally {
        setSaving(false);
      }
    })();
  };

  // Custom render for LeadManagementSection to pass dropdown data
  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
      <MasterCreateHeader
        onClose={() => navigate('/lead-management/all-leads')}
      />

      <div className="space-y-3 sm:space-y-4">
        <LeadManagementSection
          selectedOption={selectedOption}
          onSelectOption={setSelectedOption}
          value={dropdownValue}
          onChange={(val) => {
            setDropdownValue(val);
            clearDropdownError(val);
          }}
          options={brandOptions}
          loading={loading}
          error={error}
          collapsible
        />

        <ContactPersonsCard
          initialContacts={contacts}
          onChange={(c) => {
            const updated = c && c.length > 0 ? c : [{ id: '1', fullName: '', profileUrl: '', email: '', mobileNo: '', mobileNo2: '', showSecondMobile: false, type: '', designation: '', agencyBrand: '', source: '', subSource: '', department: '', country: '', state: '', city: '', zone: '', postalCode: '' }];
            setContacts(updated);
            const lead = updated[0];
            const id = lead.id || '1';
            clearContactFieldError(id, 'fullName', lead.fullName);
            clearContactFieldError(id, 'mobileNo', lead.mobileNo);
            clearContactFieldError(id, 'mobileNo2', lead.mobileNo2);
            clearContactFieldError(id, 'type', lead.type);
            clearContactFieldError(id, 'designation', lead.designation);
            clearContactFieldError(id, 'department', lead.department);
            clearContactFieldError(id, 'country', lead.country);
            clearContactFieldError(id, 'source', lead.source);
            clearContactFieldError(id, 'subSource', lead.subSource);
          }}
          errors={contactErrors}
          collapsible
          defaultOpen
        />

        <AssignPriorityCard
          organisation={organisation}
          organisationError={organisationError}
          assignTo={assignTo}
          priority={priority}
          callFeedback={callFeedback}
          onChange={({ organisation: newOrganisation, assignTo: newAssignTo, priority: newPriority, callFeedback: newCallFeedback }) => {
            if (newOrganisation !== undefined) {
              setOrganisation(newOrganisation);
              setOrganisationError(null);
            }
            if (newAssignTo !== undefined) setAssignTo(newAssignTo);
            if (newPriority !== undefined) setPriority(newPriority);
            if (newCallFeedback !== undefined) setCallFeedback(newCallFeedback);
          }}
          collapsible
          defaultOpen
        />

        <CommentSection value={comment} onChange={setComment} collapsible defaultOpen />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:space-x-4 pt-1">
          <Button onClick={() => navigate('/lead-management/all-leads')}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateLead;
