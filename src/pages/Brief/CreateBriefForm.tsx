/**
 * @file CreateBriefForm.tsx
 * @description Form to create a new brief record.
 * @author Sanjay Jangid <sanjay.jangid@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect, useRef } from 'react';
import Table from '../../components/ui/Table';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { listBrands } from '../../services/BrandMaster';
import { listAgencies } from '../../services/AgencyMaster';
import { listChildPlaningUsers } from '../../api/lookups';
import { listLeadContacts } from '../../services/AllLeads';
import { fetchBriefStatuses } from '../../services/BriefStatus';
import { getPriorities } from '../../services/Priority';
import { motion } from 'framer-motion';
import { MasterFormHeader, SelectField } from '../../components/ui';
import SweetAlert from '../../utils/SweetAlert';
import { apiClient } from '../../utils/apiClient';
import FilePreviewModal from '../../components/ui/FilePreviewModal';
import { Eye } from 'lucide-react';
import type { MasterFormWithSaveProps } from '../../types/pages/forms.types';

const CreateBriefForm: React.FC<MasterFormWithSaveProps> = ({ onClose, onSave, initialData, mode = 'create' }) => {
  useEffect(() => {
    
  }, [initialData]);
  const [form, setForm] = useState({
    briefId: '',
    briefName: '',
    brandName: '',
    productName: '',
    contactPerson: '',
    modeOfCampaign: '',
    mediaType: '',
    priority: '',
    budget: '',
    createdBy: '',
    assignTo: '',
    status: '',
    briefDetail: '',
    submissionDate: '', // will store date as string (DD-MM-YYYY)
    submissionTime: '', // will store time as string (HH:mm)
    // Campaign window
    campaignStartDate: '', // DD-MM-YYYY
    campaignEndDate: '', // DD-MM-YYYY
    campaignDuration: '', // read-only from backend
    attachmentFile: null as File | null,
    // store backend-friendly values: 'programmatic' | 'non_programmatic'
    programmatic: 'programmatic',
    type: '',
  });

  // State for calendar pickers
  const [calendarDate, setCalendarDate] = useState<Date | null>(null); // For date only
  const [calendarTime, setCalendarTime] = useState<Date | null>(null); // For time only
  const [calendarCampaignStartDate, setCalendarCampaignStartDate] = useState<Date | null>(null);
  const [calendarCampaignEndDate, setCalendarCampaignEndDate] = useState<Date | null>(null);

  // Contact person dropdown state (loaded from API - leads list)
  const [contactPersons, setContactPersons] = useState<Array<string | { value: string; label: string }>>([]);
  const [contactPersonsLoading, setContactPersonsLoading] = useState(false);
  const [contactPersonsError, setContactPersonsError] = useState<string | null>(null);

  // Brand Name dropdown state (will be loaded from API)
  const [brands, setBrands] = useState<Array<string | { value: string; label: string }>>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  // Agency Name dropdown state (will be loaded from API)
  const [agencies, setAgencies] = useState<Array<string | { value: string; label: string }>>([]);
  const [agenciesLoading, setAgenciesLoading] = useState(false);
  const [agenciesError, setAgenciesError] = useState<string | null>(null);
  // Assign To users dropdown state (will be loaded from API)
  const [users, setUsers] = useState<Array<string | { value: string; label: string }>>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  // Brief Status dropdown state (will be loaded from API)
  const [briefStatuses, setBriefStatuses] = useState<Array<string | { value: string; label: string }>>([]);
  const [briefStatusesLoading, setBriefStatusesLoading] = useState(false);
  const [briefStatusesError, setBriefStatusesError] = useState<string | null>(null);
  const [priorityOptions, setPriorityOptions] = useState<Array<{ value: string; label: string }>>([]);
  const assignHydratedRef = useRef<string | null>(null);
  const [priorityLoading, setPriorityLoading] = useState(false);
  const [priorityError, setPriorityError] = useState<string | null>(null);

  // dropdowns are handled by SelectField; it manages outside-click and blur

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [histories, setHistories] = useState<any[]>([]);
  const [historiesLoading, setHistoriesLoading] = useState(false);
  const [, setHistoriesError] = useState<string | null>(null);
  const [, setBrandAgencyLoading] = useState(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [attachmentModalSource, setAttachmentModalSource] = useState<{ kind: 'remote'; url: string; name?: string } | null>(null);

  const existingAttachmentUrl = String(
    initialData?.attachmentUrl ||
      initialData?.attachment_url ||
      initialData?.attachment ||
      initialData?.attachment_path ||
      initialData?.attachment_file_url ||
      initialData?.file_url ||
      initialData?.file_path ||
      initialData?.document_url ||
      ''
  ).trim();
  const existingAttachmentName =
    String(initialData?.attachmentName || initialData?.attachment_name || '').trim() ||
    (existingAttachmentUrl ? existingAttachmentUrl.split('/').pop() : '');

  // Track which field was manually changed to prevent both auto-fill conditions from running
  const lastChangedFieldRef = useRef<'brand' | 'agency' | 'status' | 'priority' | null>(null);
  const briefDetailRef = useRef<HTMLTextAreaElement | null>(null);

  const resizeBriefDetailTextarea = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 400)}px`;
  };

  useEffect(() => {
    resizeBriefDetailTextarea(briefDetailRef.current);
  }, [form.briefDetail]);

  useEffect(() => {
    if (initialData) {
      const patched = { ...initialData };
      // Autofill 'type' from mediaType or media_type
      if (!patched.type && (patched.mediaType || patched.media_type)) {
        let mediaTypeVal = patched.mediaType || patched.media_type;
        if (typeof mediaTypeVal === 'object' && mediaTypeVal !== null && 'value' in mediaTypeVal) {
          mediaTypeVal = mediaTypeVal.value;
        }
        if (typeof mediaTypeVal === 'string') {
          const upper = mediaTypeVal.toUpperCase();
          if (["DOOH", "OOH", "CTV"].includes(upper)) {
            patched.type = upper;
          } else if (upper === 'DOOH' || upper === 'OOH' || upper === 'CTV') {
            patched.type = upper;
          } else {
            patched.type = mediaTypeVal.charAt(0).toUpperCase() + mediaTypeVal.slice(1).toLowerCase();
          }
        }
      }
      // Autofill 'briefDetail' from comment if not already set
      if (!patched.briefDetail && patched.comment) {
        patched.briefDetail = patched.comment;
      }
      // Normalize priority when initial data provides an object or id
      // Store the ID, not the label - the SelectField will display the label
      if (patched.priority) {
        const pr = patched.priority as any;
        // If priority is an object with id, extract the id
        if (typeof pr === 'object' && pr !== null) {
          if ('id' in pr) {
            patched.priority = String(pr.id ?? '');
          } else if ('name' in pr) {
            // If only name is available, try to map it back to an id
            const nameToId: Record<string, string> = { 'High': '1', 'Medium': '2', 'Low': '3' };
            patched.priority = String(nameToId[pr.name] ?? pr.name ?? '');
          }
        } else {
          // If priority is already a string/number, keep it as is (should be an ID)
          patched.priority = String(pr);
        }
      }

      // Autofill Submission Date and Time from initialData.submission_date or initialData.submissionDate
      const isoDateStr = initialData.submission_date || initialData.submissionDate;
      if (isoDateStr && typeof isoDateStr === 'string') {
        // If the string contains both date and time (with a space)
        const [datePart, timePartRaw] = isoDateStr.split(' ');
        if (datePart && timePartRaw) {
          patched.submissionDate = datePart; // YYYY-MM-DD
          // Remove seconds and AM/PM from time
          const timePart = timePartRaw.slice(0, 5); // HH:mm
          patched.submissionTime = timePart;
        }
      }

      // Autofill Campaign Start/End if provided in initialData
      const cs = initialData.campaign_start_date || initialData.campaignStartDate || initialData.campaign_start || initialData.campaignStart;
      const ce = initialData.campaign_end_date || initialData.campaignEndDate || initialData.campaign_end || initialData.campaignEnd;
      if (cs && typeof cs === 'string') {
        // normalize to DD-MM-YYYY when possible
        const s = cs.trim();
        const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) patched.campaignStartDate = `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
        else if (/^\d{2}-\d{2}-\d{4}$/.test(s)) patched.campaignStartDate = s;
      }
      if (ce && typeof ce === 'string') {
        const s2 = ce.trim();
        const isoMatch2 = s2.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch2) patched.campaignEndDate = `${isoMatch2[3]}-${isoMatch2[2]}-${isoMatch2[1]}`;
        else if (/^\d{2}-\d{2}-\d{4}$/.test(s2)) patched.campaignEndDate = s2;
      }

      const duration = initialData.campaignDuration ?? initialData.campaign_duration;

      if (duration !== undefined && duration !== null) {
        patched.campaignDuration = String(duration);
      }

      setForm(prev => ({ ...prev, ...patched }));
      // Always update calendarDate and calendarTime from patched data
      if (patched.submissionDate && patched.submissionTime) {
        // Convert YYYY-MM-DD and HH:mm to Date object
        const dateParts = patched.submissionDate.split('-');
        const timeParts = patched.submissionTime.split(':');
        if (dateParts.length === 3 && timeParts.length === 2) {
          const [yyyy, mm, dd] = dateParts;
          const [hh, min] = timeParts;
          const dateObj2 = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
          if (!isNaN(dateObj2.getTime())) {
            setCalendarDate(dateObj2);
            setCalendarTime(dateObj2);
            console.log('Set calendarDate/calendarTime:', dateObj2);
          }
        }
      }
      // Also update campaign calendar pickers when provided
      if (patched.campaignStartDate) {
        const dateParts = patched.campaignStartDate.split('-');
        if (dateParts.length === 3) {
          const [dd, mm, yyyy] = dateParts;
          const dateObj = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
          if (!isNaN(dateObj.getTime())) {
            setCalendarCampaignStartDate(dateObj);
          }
        }
      }
      if (patched.campaignEndDate) {
        const dateParts2 = patched.campaignEndDate.split('-');
        if (dateParts2.length === 3) {
          const [dd, mm, yyyy] = dateParts2;
          const dateObj2 = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
          if (!isNaN(dateObj2.getTime())) {
            setCalendarCampaignEndDate(dateObj2);
          }
        }
      }
    }
  }, [initialData]);

  // Fetch assign histories for this brief when editing
  useEffect(() => {
    let mounted = true;
    const fetchHistories = async () => {
      if (mode !== 'edit') return;
      const briefId = initialData?.id ?? initialData?.briefId ?? initialData?.brief_id;
      if (!briefId) return;
      try {
        setHistoriesLoading(true);
        setHistoriesError(null);
        const res = await apiClient.get<any>(`/briefs/${briefId}/assign-histories`);
        const payload = res && (res.data || res.data?.data) ? (res.data || res.data.data) : (res.data ?? []);
        // API may return array directly or under data
        const items = Array.isArray(payload) ? payload : (payload.data || []);
        if (!mounted) return;
        setHistories(items || []);
      } catch (err: any) {
        if (!mounted) return;
        setHistoriesError(err?.message || 'Failed to load history');
        setHistories([]);
      } finally {
        if (mounted) setHistoriesLoading(false);
      }
    };

    fetchHistories();
    return () => { mounted = false; };
  }, [initialData, mode]);

  // When Brand Name changes, try to auto-fill Agency Name from brand-specific endpoint
  // Only auto-fill if agency wasn't the last manually changed field
  useEffect(() => {
    let mounted = true;
    const fillAgencyForBrand = async () => {
      const raw = form.brandName;
      if (!raw) return;
      // Skip auto-fill if agency was the last manually changed field
      if (lastChangedFieldRef.current === 'agency') return;
      // Keep agency from lead/edit prefill when already provided
      if (initialData?.agency_id || initialData?.createdBy) return;
      // If value looks like an id, call brand agencies endpoint
      const idMatch = String(raw).match(/^\d+$/);
      if (!idMatch) return;
      const brandId = idMatch[0];
      try {
        setBrandAgencyLoading(true);
        // endpoint example: /brands/51/agencies
        const res = await apiClient.get<any>(`/brands/${brandId}/agencies`);
        // API may return { success, data: {...} } or { success, data: [...] }
        const body = res && (res.data || res.data?.data) ? (res.data || res.data.data) : (res.data ?? res);
        let items: any[] = [];
        if (Array.isArray(body)) items = body;
        else if (Array.isArray(body.data)) items = body.data;
        else if (body && typeof body === 'object') items = [body];
        if (!mounted) return;
        if (items.length) {
          // Choose first agency returned and set as createdBy (agency id)
          const first = items[0];
          const agencyId = first.id ?? first.uuid ?? first.slug ?? first.name ?? '';
          setForm(prev => ({ ...prev, createdBy: String(agencyId) }));
          lastChangedFieldRef.current = 'brand'; // Mark brand as the last changed field
        }
      } catch {
        // noop — do not overwrite existing agency on failure
      } finally {
        if (mounted) setBrandAgencyLoading(false);
      }
    };

    fillAgencyForBrand();
    return () => { mounted = false; };
  }, [form.brandName]);

  // Load brand options on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setBrandsLoading(true);
        const res = await listBrands(1, 200); // fetch up to 200 brands; adjust if needed
        if (!mounted) return;
        const opts = (res.data || []).map(b => ({ value: String(b.id), label: String(b.name) }));
        setBrands(opts);

        // if initialData had a brand ID or name, try to match and set
        if (initialData && (initialData.brandName || initialData.brand_id)) {
          const brandId = String(initialData.brand_id ?? initialData.brandName ?? '').trim();
          const brandName = typeof initialData.brand === 'object' && initialData.brand?.name
            ? String(initialData.brand.name)
            : String(initialData.brandName ?? '');

          // Try to find by ID first (brand_id from API)
          const foundById = opts.find(o => o.value === brandId);
          // Then try by name
          const foundByName = opts.find(o => o.label === brandName);

          if (foundById) {
            setForm(prev => ({ ...prev, brandName: foundById.value }));
          } else if (foundByName) {
            setForm(prev => ({ ...prev, brandName: foundByName.value }));
          } else if (brandId && /^\d+$/.test(brandId)) {
            // If we have an ID that looks numeric, use it directly even if not found in dropdown yet
            setForm(prev => ({ ...prev, brandName: brandId }));
          }
        }
      } catch (err: any) {
        console.error('Failed to load brands', err);
        if (!mounted) return;
        setBrandsError(err?.message || 'Failed to load brands');
      } finally {
        if (mounted) setBrandsLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [initialData]);

  // Load agency options on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setAgenciesLoading(true);
        const res = await listAgencies(1, 200);
        if (!mounted) return;
        const opts = (res.data || []).map(a => ({ value: String(a.id), label: String(a.name) }));
        setAgencies(opts);

        // Autofill Agency Name field for edit mode
        // Handle both agency_id from API and the createdBy/agency object
        const agencyId = String(initialData?.agency_id ?? '').trim();
        const agencyObj = initialData?.createdBy || initialData?.agency;
        const agencyName = typeof agencyObj === 'object' && agencyObj?.name
          ? String(agencyObj.name)
          : String(agencyObj ?? '');

        if (agencyId || agencyObj) {
          // Try to find by ID first
          const foundById = opts.find(o => o.value === agencyId);
          // Then try by name
          const foundByName = opts.find(o => o.label === agencyName);

          if (foundById) {
            setForm(prev => ({ ...prev, createdBy: foundById.value }));
          } else if (foundByName) {
            setForm(prev => ({ ...prev, createdBy: foundByName.value }));
          } else if (agencyId && /^\d+$/.test(agencyId)) {
            // If we have an ID that looks numeric, use it directly
            setForm(prev => ({ ...prev, createdBy: agencyId }));
          }
        }
      } catch (err: any) {
        console.error('Failed to load agencies', err);
        if (!mounted) return;
        setAgenciesError(err?.message || 'Failed to load agencies');
      } finally {
        if (mounted) setAgenciesLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [initialData]);

  // When Agency changes, fetch brands belonging to that agency and populate Brand Name dropdown
  // Only auto-fill if brand wasn't the last manually changed field
  useEffect(() => {
    let mounted = true;

    const fetchBrandsForAgency = async () => {
      const raw = form.createdBy;
      if (!raw) return;

      // Skip auto-fill if brand was the last manually changed field
      if (lastChangedFieldRef.current === 'brand') return;

      const idMatch = String(raw).match(/^\d+$/);
      if (!idMatch) return;

      const agencyId = idMatch[0];

      try {
        setBrandsLoading(true);

        const res = await apiClient.get<any>(`/agencies/${agencyId}/brands`);
        const body = res && (res.data || res.data?.data)
          ? (res.data || res.data.data)
          : (res.data ?? res);

        let items: any[] = [];

        if (Array.isArray(body)) items = body;
        else if (Array.isArray(body.brands)) items = body.brands;
        else if (Array.isArray(body.data)) items = body.data;
        else if (Array.isArray(body.data?.brands)) items = body.data.brands;

        const opts = (items || []).map((b: any) => ({
          value: String(b.id),
          label: String(b.name)
        }));

        if (!mounted) return;

        setBrands(opts);

        if (!form.brandName && opts.length) {
          setForm(prev => ({ ...prev, brandName: opts[0].value }));
          lastChangedFieldRef.current = 'agency';
        } else if (form.brandName) {
          const found = opts.find(o => o.value === String(form.brandName));
          if (!found) setForm(prev => ({ ...prev, brandName: '' }));
        }

      } catch {
        // ignore errors
      } finally {
        if (mounted) setBrandsLoading(false);
      }
    };

    fetchBrandsForAgency();

    return () => {
      mounted = false;
    };

  }, [form.createdBy, form.brandName]);

  const resolveAssignToFromInitialData = (
    opts: Array<{ value: string; label: string }>
  ) => {
    const assignUserId = String(initialData?.assign_user_id ?? '').trim();
    const assignToVal = initialData?.assignTo || initialData?.assigned_user;
    const assignToName =
      typeof assignToVal === 'object' && assignToVal?.name
        ? String(assignToVal.name)
        : String(assignToVal ?? '');

    if (!assignUserId && !assignToVal) return;

    const foundById = opts.find((o) => o.value === assignUserId);
    const foundByName = opts.find((o) => o.label === assignToName);

    if (foundById) {
      setForm((prev) => ({ ...prev, assignTo: foundById.value }));
    } else if (foundByName) {
      setForm((prev) => ({ ...prev, assignTo: foundByName.value }));
    } else {
      setForm((prev) => ({ ...prev, assignTo: '' }));
    }
  };

  useEffect(() => {
    if (mode !== 'edit') {
      assignHydratedRef.current = null;
    }
  }, [mode]);

  // Load Assign To options from the child planning users hierarchy.
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setUsersLoading(true);
        setUsersError(null);

        const hierarchyUsers = await listChildPlaningUsers();
        const opts = hierarchyUsers.map((u) => ({
          value: String(u.id),
          label: String(u.name),
        }));

        if (!mounted) return;
        setUsers(opts);

        if (mode === 'edit' && initialData) {
          const recordId = String(initialData.id ?? initialData.uuid ?? '').trim();
          if (recordId && assignHydratedRef.current !== recordId) {
            resolveAssignToFromInitialData(opts);
            assignHydratedRef.current = recordId;
          }
        }
      } catch (err: any) {
        console.error('Failed to load users', err);
        if (!mounted) return;
        setUsersError(err?.message || 'Failed to load users');
        setUsers([]);
      } finally {
        if (mounted) setUsersLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [initialData, mode]);

  // Load contact persons (from leads) on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setContactPersonsLoading(true);
        setContactPersonsError(null);
        const leads = await listLeadContacts();
        if (!mounted) return;
        const opts = leads.length > 0
          ? leads.map((l) => {
            const id = String(l.id);
            return {
              value: id,
              label: `${String(l.name || '')} #${id}`
            };
          })
          : (() => {
            const fallback = initialData?.contact_person ?? initialData?.contactPerson;
            if (!fallback || typeof fallback !== 'object') return [];

            const id = String(fallback.id ?? '').trim();
            const name = String(fallback.name ?? '').trim();
            return id && name ? [{ value: id, label: `${name} #${id}` }] : [];
          })();
        setContactPersons(opts);

        // Autofill Contact Person field for edit mode
        // Handle both contact_person_id from API and the contactPerson object/ID
        const contactPersonId = String(initialData?.contact_person_id ?? '').trim();
        const contactVal = initialData?.contactPerson || initialData?.contact_person;
        const contactName = typeof contactVal === 'object' && contactVal?.name
          ? String(contactVal.name)
          : String(contactVal ?? '');

        if (contactPersonId || contactVal) {
          // Try to find by ID first
          const foundById = opts.find(o => o.value === contactPersonId);
          // Then try by label containing contact name or ID
          const foundByLabel = opts.find(o => o.label.includes(contactName) || o.label.endsWith(contactPersonId));

          if (foundById) {
            setForm(prev => ({ ...prev, contactPerson: foundById.value }));
          } else if (foundByLabel) {
            setForm(prev => ({ ...prev, contactPerson: foundByLabel.value }));
          } else if (contactPersonId && /^\d+$/.test(contactPersonId)) {
            // If we have an ID that looks numeric, use it directly
            setForm(prev => ({ ...prev, contactPerson: contactPersonId }));
          }
        }
      } catch (err: any) {
        console.error('Failed to load contact persons', err);
        if (!mounted) return;
        setContactPersonsError(err?.message || 'Failed to load contact persons');
      } finally {
        if (mounted) setContactPersonsLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [initialData]);

  // Load brief status options on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setBriefStatusesLoading(true);
        const res = await fetchBriefStatuses();
        if (!mounted) return;

        // Map brief statuses to SelectField options
        // fetchBriefStatuses now returns BriefStatusItem[] directly
        let opts: Array<string | { value: string; label: string }> = [];
        if (Array.isArray(res)) {
          opts = res.map((s: any) => {
            const id = String(s.id ?? s.status_id ?? '');
            const name = String(s.name ?? s.status ?? s.brief_status ?? '');
            return { value: id, label: name };
          });
        }
        setBriefStatuses(opts);

        // Autofill Brief Status field if initialData provides it
        if (initialData && (initialData.brief_status_id || initialData.status || initialData.brief_status)) {
          const statusId = String(initialData.brief_status_id ?? '').trim();
          const statusObj = initialData.brief_status;
          const statusName = typeof statusObj === 'object' && statusObj?.name
            ? String(statusObj.name)
            : String(initialData.status ?? '');

          // Try to find by ID first
          const foundById = opts.find((o: any) => o.value === statusId);
          // Then try by name
          const foundByName = opts.find((o: any) => o.label === statusName);

          if (foundById) {
            setForm(prev => ({ ...prev, status: (foundById as any).value }));
          } else if (foundByName) {
            setForm(prev => ({ ...prev, status: (foundByName as any).value }));
          } else if (statusId && /^\d+$/.test(statusId)) {
            // If we have an ID that looks numeric, use it directly
            setForm(prev => ({ ...prev, status: statusId }));
          }
        }
      } catch (err: any) {
        console.error('Failed to load brief statuses', err);
        if (!mounted) return;
        setBriefStatusesError(err?.message || 'Failed to load brief statuses');
      } finally {
        if (mounted) setBriefStatusesLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [initialData]);

  // Load priority options from API on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setPriorityLoading(true);
        const res = await getPriorities();
        if (!mounted) return;

        // Map priorities to SelectField options
        let opts: Array<{ value: string; label: string }> = [];
        if (Array.isArray(res)) {
          opts = res.map((p: any) => {
            const id = String(p.id ?? p.priority_id ?? '');
            const name = String(p.name ?? p.priority ?? p.label ?? '');
            return { value: id, label: name };
          });
        }
        setPriorityOptions(opts);

        // Autofill Priority field if initialData provides it
        if (initialData && (initialData.priority_id || initialData.priority)) {
          const priorityId = String(initialData.priority_id ?? '').trim();
          const priorityObj = initialData.priority;
          const priorityName = typeof priorityObj === 'object' && priorityObj?.name
            ? String(priorityObj.name)
            : String(priorityObj ?? '');

          // Try to find by ID first
          const foundById = opts.find(o => o.value === priorityId);
          // Then try by name
          const foundByName = opts.find(o => o.label === priorityName);

          if (foundById) {
            setForm(prev => ({ ...prev, priority: foundById.value }));
          } else if (foundByName) {
            setForm(prev => ({ ...prev, priority: foundByName.value }));
          } else if (priorityId && /^\d+$/.test(priorityId)) {
            // If we have an ID that looks numeric, use it directly
            setForm(prev => ({ ...prev, priority: priorityId }));
          }
        }

        // if (false) {
        //   console.error('Error loading priorities:');
        //   setPriorityError('Error loading priorities');
        // }
      } catch (err: any) {
        console.error('Failed to load priorities', err);
        if (!mounted) return;
        setPriorityError(err?.message || 'Failed to load priorities');
      } finally {
        if (mounted) setPriorityLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [initialData]);

  // When Priority changes, fetch brief statuses filtered by priority
  // useEffect(() => {
  //   let mounted = true;

  //   const fetchByPriority = async () => {
  //     const raw = form.priority;
  //     if (!raw) return;

  //     // If status was manually changed last, skip auto-fill
  //     if (lastChangedFieldRef.current === 'status') return;

  //     const priorityId = String(raw);
  //     if (!priorityId) return;

  //     try {
  //       setBriefStatusesLoading(true);
  //       setBriefStatusesError(null);

  //       const res = await apiClient.get<any>(
  //         `/brief-statuses/by-priority?priority_id=${encodeURIComponent(priorityId)}`
  //       );

  //       const body = res && res.data ? res.data : res;

  //       let items: any[] = [];
  //       if (Array.isArray(body)) items = body;
  //       else if (body && Array.isArray(body.data)) items = body.data;
  //       else if (body && Array.isArray(body.brief_statuses)) items = body.brief_statuses;

  //       const opts = (items || [])
  //         .map((s: any) => ({
  //           value: String(s.id ?? s.status_id ?? s.uuid ?? ''),
  //           label: String(s.name ?? s.status ?? s.brief_status ?? s.label ?? '')
  //         }))
  //         .filter(o => o.value && o.label);

  //       if (!mounted) return;

  //       setBriefStatuses(opts);

  //       if (!form.status && opts.length) {
  //         setForm(prev => ({ ...prev, status: opts[0].value }));
  //         lastChangedFieldRef.current = 'priority';

  //         setTimeout(() => {
  //           if (lastChangedFieldRef.current === 'priority')
  //             lastChangedFieldRef.current = null;
  //         }, 500);

  //       } else if (form.status) {
  //         const found = opts.find(o => o.value === String(form.status));
  //         if (!found) setForm(prev => ({ ...prev, status: '' }));
  //       }

  //     } catch (err: any) {
  //       if (!mounted) return;
  //       console.error('Failed to fetch brief statuses:', err);
  //       setBriefStatusesError(err?.message || 'Failed to load brief statuses');
  //     } finally {
  //       if (mounted) setBriefStatusesLoading(false);
  //     }
  //   };

  //   fetchByPriority();

  //   return () => {
  //     mounted = false;
  //   };

  // }, [form.priority, form.status]);

  // // When Brief Status changes, fetch Priority options related to that status
  // useEffect(() => {
  //   let mounted = true;
  //   const fetchPrioritiesForStatus = async () => {
  //     const raw = form.status;
  //     if (!raw) return;
  //     // If priority was manually changed last, skip auto-fill to avoid reciprocal update
  //     if (lastChangedFieldRef.current === 'priority') return;
  //     // try to determine brief_status_id
  //     let statusId: string | undefined;
  //     if (/^\d+$/.test(String(raw))) statusId = String(raw);
  //     else {
  //       const found = (briefStatuses || []).find((b: any) => String((b as any).value ?? b) === String(raw) || String((b as any).label ?? b).toLowerCase() === String(raw).toLowerCase());
  //       if (found) statusId = typeof found === 'string' ? String(found) : String((found as any).value ?? found);
  //     }
  //     if (!statusId) return;

  //     try {
  //       setPriorityLoading(true);
  //       setPriorityError(null);
  //       const res = await apiClient.get<any>(`/brief-statuses/priorities?brief_status_id=${encodeURIComponent(statusId)}`);
  //       console.log('Raw API response for priorities:', res);

  //       // API response structure: { success, message, meta, data: {id, name} OR [...] }
  //       let items: any[] = [];
  //       const responseData = res?.data || res;
  //       console.log('Response data:', responseData);

  //       // Check what type of data we have
  //       if (Array.isArray(responseData)) {
  //         // Data is already an array of priorities
  //         items = responseData;
  //       } else if (responseData && typeof responseData === 'object') {
  //         // Check if it's a single priority object (has id and name)
  //         if (responseData.id && responseData.name) {
  //           // Single priority object
  //           items = [responseData];
  //         } else if (Array.isArray(responseData.data)) {
  //           // Wrapped in .data array
  //           items = responseData.data;
  //         } else if (responseData.data && typeof responseData.data === 'object' && responseData.data.id) {
  //           // Single object wrapped in .data
  //           items = [responseData.data];
  //         }
  //       }

  //       console.log('Extracted priority items:', items);
  //       const opts = (items || []).map((p: any) => {
  //         const id = String(p.id ?? '').trim();
  //         const label = String(p.name ?? '').trim();
  //         console.log('Mapping priority:', { id, label, source: p });
  //         return { value: id, label };
  //       }).filter(o => o.value && o.label);

  //       console.log('Final filtered priority options:', opts);

  //       if (!mounted) return;
  //       setPriorityOptions(opts);

  //       if (opts.length) {
  //         // Auto-select first priority if none selected
  //         if (!form.priority) {
  //           console.log('Auto-selecting first priority:', opts[0]);
  //           setForm(prev => ({ ...prev, priority: opts[0].value }));
  //           // mark that status auto-filled the priority to prevent immediate reciprocal fetch
  //           lastChangedFieldRef.current = 'status';
  //           setTimeout(() => { if (lastChangedFieldRef.current === 'status') lastChangedFieldRef.current = null; }, 500);
  //         } else {
  //           const found = opts.find(o => o.value === String(form.priority));
  //           if (!found) setForm(prev => ({ ...prev, priority: '' }));
  //         }
  //       } else {
  //         console.warn('No priority options found for status:', statusId, 'responseData:', responseData);
  //         setForm(prev => ({ ...prev, priority: '' }));
  //       }
  //     } catch (err: any) {
  //       if (!mounted) return;
  //       console.error('Failed to fetch priorities:', err);
  //       setPriorityError(err?.message || 'Failed to load priorities');
  //     } finally {
  //       if (mounted) setPriorityLoading(false);
  //     }
  //   };

  //   fetchPrioritiesForStatus();
  //   return () => { mounted = false; };
  // }, [form.status, briefStatuses, form.priority]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Track which field was manually changed
    if (name === 'brandName') lastChangedFieldRef.current = 'brand';
    if (name === 'createdBy') lastChangedFieldRef.current = 'agency';

    // If programmatic mode changes, ensure the currently selected `type` is valid for the new mode.
    if (name === 'programmatic') {
      const newProgrammatic = value;
      const typeOptions = newProgrammatic === 'non_programmatic' ? ['DOOH', 'OOH'] : ['DOOH', 'CTV'];
      setForm(prev => ({ ...prev, programmatic: newProgrammatic, type: typeOptions.includes(prev.type) ? prev.type : '' }));
      return;
    }

    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.briefName || form.briefName.trim() === '') next.briefName = 'Please Enter Brief Name';
    if (!form.contactPerson || String(form.contactPerson).trim() === '') next.contactPerson = 'Please Select Contact Person';
    if (!form.submissionDate || String(form.submissionDate).trim() === '') next.submissionDate = 'Please Select Submission Date';
    if (!form.submissionTime || String(form.submissionTime).trim() === '') next.submissionTime = 'Please Select Submission Time';
    if (!form.campaignStartDate || String(form.campaignStartDate).trim() === '') next.campaignStartDate = 'The campaign start date field is required.';
    if (!form.campaignEndDate || String(form.campaignEndDate).trim() === '') next.campaignEndDate = 'The campaign end date field is required.';
    if (!form.productName || String(form.productName).trim() === '') next.productName = 'Please Enter Product Name';
    if (!form.budget || String(form.budget).trim() === '') next.budget = 'Please Enter Brief Budget';

    const parseDate = (dStr: string) => {
      const [dd, mm, yyyy] = String(dStr).split('-');
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    };

    if (form.submissionDate && form.campaignStartDate) {
      const sub = parseDate(form.submissionDate);
      const start = parseDate(form.campaignStartDate);
      if (!isNaN(sub.getTime()) && !isNaN(start.getTime()) && start.getTime() <= sub.getTime()) {
        next.campaignStartDate = 'Campaign start date must be after submission date.';
      }
    }

    if (form.campaignStartDate && form.campaignEndDate) {
      const start = parseDate(form.campaignStartDate);
      const end = parseDate(form.campaignEndDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end.getTime() < start.getTime()) {
        next.campaignEndDate = 'End date cannot be before start date.';
      }
    }

    if (form.attachmentFile) {
      const ext = form.attachmentFile.name.split('.').pop()?.toLowerCase() || '';
      if (!['pdf', 'jpg', 'jpeg', 'png', 'docx', 'doc'].includes(ext)) {
        next.attachmentFile = 'Only PDF, JPG, PNG, and DOCX files are allowed.';
      }
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      setSaving(true);
      // Debug: log form state before submission
      console.log('Form state before submit:', form);
      // Build payload matching backend expected field names
      const payload: Record<string, any> = {};
      // Basic fields
      payload.name = form.briefName;
      // IDs from select components (they may be strings or option objects). Convert to integers when possible.
      const toInt = (val: any) => {
        if (val === null || val === undefined) return undefined;
        const raw = typeof val === 'object' ? (val.value ?? val.id ?? '') : String(val);
        const rawStr = String(raw).trim();

        // Handle formatted IDs like #USR001, #AGN045, #LEAD010 - extract the numeric part
        const formatMatch = rawStr.match(/#[A-Z]+(\d+)/);
        if (formatMatch && formatMatch[1]) {
          const n = parseInt(formatMatch[1], 10);
          return Number.isNaN(n) ? undefined : n;
        }

        // Try to parse as regular integer
        const n = parseInt(rawStr, 10);
        return Number.isNaN(n) ? undefined : n;
      };

      const bid = toInt(form.brandName);
      if (bid !== undefined) payload.brand_id = bid;
      const aid = toInt(form.createdBy);
      if (aid !== undefined) payload.agency_id = aid;
      const cp = toInt(form.contactPerson);
      if (cp !== undefined) payload.contact_person_id = cp;
      const assignId = toInt(form.assignTo);
      console.log('assignTo value:', form.assignTo, 'converted to:', assignId);
      if (mode === 'edit') {
        payload.assign_user_id = assignId ?? null;
      } else if (assignId !== undefined) {
        payload.assign_user_id = assignId;
      }
      const statusId = toInt(form.status);
      if (mode === 'edit' && statusId !== undefined) payload.brief_status_id = statusId;

      // Product / mode / media / budget / comment
      if (form.productName) payload.product_name = form.productName;
      // programmatic value chosen by user uses backend-friendly values
      // ('programmatic' | 'non_programmatic') so send directly
      if (form.programmatic) payload.mode_of_campaign = String(form.programmatic);
      // Use `type` field from UI as media type (Select name="type")
      if (form.type) payload.media_type = String(form.type).toLowerCase();
      if (form.budget !== undefined && form.budget !== null && String(form.budget).trim() !== '') {
        const budgetValue = Number(String(form.budget).trim().replace(/,/g, ''));
        if (!Number.isNaN(budgetValue)) payload.budget = budgetValue;
      }
      if (form.briefDetail) payload.comment = form.briefDetail;

      // submission date/time - normalize to `YYYY-MM-DD HH:mm:ss` when possible
      const submissionDate = (form as any).submissionDate;
      const submissionTime = (form as any).submissionTime;
      if (submissionDate && submissionTime) {
        let dateStr = String(submissionDate).trim();
        // convert DD-MM-YYYY -> YYYY-MM-DD
        const dmy = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (dmy) dateStr = `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
        // if time is HH:mm, add seconds
        let timeStr = String(submissionTime).trim();
        if (/^\d{2}:\d{2}$/.test(timeStr)) timeStr = `${timeStr}:00`;
        payload.submission_date = `${dateStr} ${timeStr}`;
      } else if (submissionDate) {
        let dateStr = String(submissionDate).trim();
        const dmy = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (dmy) dateStr = `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
        payload.submission_date = dateStr;
      }

      // Campaign start / end - convert DD-MM-YYYY to YYYY-MM-DD
      const cs = (form as any).campaignStartDate;
      const ce = (form as any).campaignEndDate;
      if (cs) {
        let s = String(cs).trim();
        const dmyc = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (dmyc) s = `${dmyc[3]}-${dmyc[2]}-${dmyc[1]}`;
        payload.campaign_start_date = s;
      }
      if (ce) {
        let s2 = String(ce).trim();
        const dmyc2 = s2.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (dmyc2) s2 = `${dmyc2[3]}-${dmyc2[2]}-${dmyc2[1]}`;
        payload.campaign_end_date = s2;
      }

      if (form.attachmentFile) {
        // Backend typically expects `attachment` (and some endpoints accept `attachment_file`).
        // Send both keys to keep compatibility across environments.
        payload.attachment = form.attachmentFile;
        payload.attachment_file = form.attachmentFile;
      }

      // Priority: value is already priority_id from API
      if (form.priority) {
        payload.priority_id = toInt(form.priority) ?? form.priority;
      }

      if (initialData && initialData.id) payload.id = initialData.id;

      // Debug: log the final payload
      console.log('Final payload before submit:', payload);

      // If parent provided an onSave handler, use it. Otherwise use the
      // built-in API wiring available in services/CreateBriefForm.ts
      let res: any = null;
      if (onSave) {
        res = (onSave as any)(payload);
        if (res && typeof res.then === 'function') await res;
      } else {
        // Lazy import to avoid circular dependency issues and keep bundle small
        const svc = await import('../../services/CreateBriefForm');
        res = svc.submitCreateBrief ? svc.submitCreateBrief(payload) : null;
        if (res && typeof res.then === 'function') await res;
      }
      if (mode === 'edit') {
        SweetAlert.showUpdateSuccess();
      } else {
        SweetAlert.showCreateSuccess();
      }
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch {
      // noop - parent handles errors
    } finally {
      setSaving(false);
    }
  };

  // Calculate Campaign Duration dynamically
  const getCalculatedDuration = () => {
    if (form.campaignStartDate && form.campaignEndDate) {
      const parseDateUTC = (dStr: string) => {
        const [dd, mm, yyyy] = dStr.split('-');
        return Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd));
      };
      const start = parseDateUTC(form.campaignStartDate);
      const end = parseDateUTC(form.campaignEndDate);
      if (!isNaN(start) && !isNaN(end)) {
        const diffTime = end - start;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays > 0 ? diffDays : 0;
      }
    }
    const durVal = Number(form.campaignDuration);
    return form.campaignDuration && !isNaN(durVal) ? durVal : 0;
  };

  // Campaign Start Date must be after Submission Date
  const getMinCampaignStartDate = () => {
    if (calendarDate) {
      const nextDay = new Date(calendarDate);
      nextDay.setDate(nextDay.getDate() + 1);
      return nextDay;
    }
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="space-y-6"
    >
      <MasterFormHeader onBack={onClose} title={mode === 'edit' ? 'Edit Brief' : 'Create Brief'} />

      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-5 sm:p-6 bg-gray-50">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-800 mb-1">Brief Name <span className="text-[#FF0000]">*</span></label>
                  <input name="briefName" value={form.briefName} onChange={(e) => { handleChange(e); setErrors(prev => ({ ...prev, briefName: '' })); }}
                    placeholder="Please enter product name"
                    className={`w-full px-3 py-2 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 transition-colors ${errors.briefName ? 'border border-red-500 bg-red-50 focus:ring-red-500' : 'border border-gray-200 focus:ring-blue-500'}`}
                    aria-invalid={errors.briefName ? 'true' : 'false'}
                    aria-describedby={errors.briefName ? 'briefName-error' : undefined}
                  />
                  {errors.briefName && (
                    <div id="briefName-error" className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                      <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.briefName}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-800 mb-1">Brand Name</label>
                  <SelectField
                    name="brandName"
                    placeholder={brandsLoading ? 'Loading brands...' : 'Auto Select'}
                    options={brands}
                    value={form.brandName}
                    onChange={(v: any) => { const val = (typeof v === 'object') ? (v.value ?? v.id ?? v) : v; lastChangedFieldRef.current = 'brand'; setForm(prev => ({ ...prev, brandName: val })); }}
                    searchable
                    inputClassName="border border-gray-200 focus:ring-black"
                    disabled={brandsLoading}
                  />
                  {brandsError && <div className="text-xs text-red-600 mt-1">{brandsError}</div>}
                </div>
                <div>
                  <label className="block text-sm text-gray-800 mb-1">Product Name <span className="text-[#FF0000]">*</span></label>
                  <input name="productName" value={form.productName} onChange={(e) => { handleChange(e); setErrors(prev => ({ ...prev, productName: '' })); }}
                    placeholder="Please enter product name"
                    className={`w-full px-3 py-2 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 transition-colors ${errors.productName ? 'border border-red-500 bg-red-50 focus:ring-red-500' : 'border border-gray-200 focus:ring-blue-500'}`}
                    aria-invalid={errors.productName ? 'true' : 'false'}
                    aria-describedby={errors.productName ? 'productName-error' : undefined}
                  />
                  {errors.productName && (
                    <div id="productName-error" className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                      <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.productName}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-800 mb-1">Assign To</label>
                  <SelectField
                    name="assignTo"
                    placeholder={
                      !form.contactPerson
                        ? 'Select Contact Person first'
                        : usersLoading
                          ? 'Loading users...'
                          : 'Please Assign To Planner'
                    }
                    options={users}
                    value={String(form.assignTo || '')}
                    onChange={(v: any) => {
                      const val = String(v || '').trim();
                      setForm(prev => ({ ...prev, assignTo: val }));
                    }}
                    searchable
                    inputClassName={`border border-gray-200 focus:ring-black ${!form.contactPerson ? 'bg-gray-50 opacity-60 cursor-not-allowed' : ''}`}
                    disabled={usersLoading || !form.contactPerson}
                  />
                  {!form.contactPerson && (
                    <div className="text-xs text-amber-500 mt-1">Please select a contact person first.</div>
                  )}
                  {usersError && <div className="text-xs text-red-600 mt-1">{usersError}</div>}
                </div>
                <div>
                  <label className="block text-sm text-gray-800 mb-1">Brief Status</label>
                  <SelectField
                    name="status"
                    placeholder={briefStatusesLoading ? 'Loading statuses...' : 'Select Brief Status'}
                    options={briefStatuses}
                    value={form.status}
                    onChange={(v: any) => { const val = (typeof v === 'object') ? (v.value ?? v.id ?? v) : v; lastChangedFieldRef.current = 'status'; setForm(prev => ({ ...prev, status: val })); setTimeout(() => { if (lastChangedFieldRef.current === 'status') lastChangedFieldRef.current = null; }, 500); }}
                    searchable
                    inputClassName="border border-gray-200 focus:ring-black"
                    disabled={mode !== 'edit' || briefStatusesLoading}
                  />
                  {briefStatusesError && <div className="text-xs text-red-600 mt-1">{briefStatusesError}</div>}
                </div>
                <div>
                  <label className="block text-sm text-gray-800 mb-1">Mode Of Campaign</label>
                  <div className="flex gap-4 mt-1">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="programmatic"
                        value="programmatic"
                        checked={form.programmatic === 'programmatic'}
                        onChange={handleChange}
                        className="form-radio accent-blue-600"
                      />
                      <span className="ml-2 text-sm text-gray-800">Programmatic</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="programmatic"
                        value="non_programmatic"
                        checked={form.programmatic === 'non_programmatic'}
                        onChange={handleChange}
                        className="form-radio accent-blue-600"
                      />
                      <span className="ml-2 text-sm text-gray-800">Non-Programmatic</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-800 mb-1">Select Type</label>
                  <SelectField
                    name="type"
                    placeholder="Select Type"
                    options={form.programmatic === 'non_programmatic' ? ['DOOH', 'OOH'] : ['DOOH', 'CTV']}
                    value={form.type}
                    onChange={(v: any) => { const val = (typeof v === 'object') ? (v.value ?? v.id ?? v) : v; setForm(prev => ({ ...prev, type: val })); }}
                    inputClassName="border border-[var(--border-color)] focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-800 mb-1">Attach File</label>
                  <div className={`border rounded-lg bg-white p-3 transition-colors ${errors.attachmentFile ? 'border-red-500 bg-red-50' : 'border border-gray-200'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-gray-900">
                          {form.attachmentFile
                            ? form.attachmentFile.name
                            : existingAttachmentName
                              ? existingAttachmentName
                              : 'No file selected'}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {form.attachmentFile
                            ? `${Math.round((form.attachmentFile.size / 1024) * 10) / 10} KB`
                            : existingAttachmentUrl
                              ? 'Current file attached'
                              : 'PDF, JPG, PNG, DOCX'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {existingAttachmentUrl && !form.attachmentFile && (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-gray-300 bg-white text-blue-700 hover:bg-gray-50"
                            onClick={() => {
                              setAttachmentModalSource({ kind: 'remote', url: existingAttachmentUrl, name: existingAttachmentName || undefined });
                              setIsAttachmentModalOpen(true);
                            }}
                            aria-label="View current attachment"
                            title="View current attachment"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <label
                          htmlFor="attachmentFile"
                          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 cursor-pointer"
                        >
                          {existingAttachmentUrl ? 'Replace' : 'Choose file'}
                        </label>
                      </div>
                    </div>
                    <input
                      id="attachmentFile"
                      type="file"
                      name="attachmentFile"
                      accept=".pdf,.jpg,.jpeg,.png,.docx,.doc,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                      onChange={e => {
                        const file = e.target.files?.[0] ?? null;
                        if (file) {
                          const ext = file.name.split('.').pop()?.toLowerCase() || '';
                          if (!['pdf', 'jpg', 'jpeg', 'png', 'docx', 'doc'].includes(ext)) {
                            setErrors(prev => ({
                              ...prev,
                              attachmentFile: 'Only PDF, JPG, PNG, and DOCX files are allowed.'
                            }));
                            setForm(prev => ({ ...prev, attachmentFile: null }));
                            e.target.value = '';
                            return;
                          }
                          setErrors(prev => ({ ...prev, attachmentFile: '' }));
                          setForm(prev => ({ ...prev, attachmentFile: file }));
                        } else {
                          setForm(prev => ({ ...prev, attachmentFile: null }));
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                  {errors.attachmentFile && (
                    <div id="attachmentFile-error" className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                      <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.attachmentFile}
                    </div>
                  )}
                </div>

              </div>
              {/* Right column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-800 mb-1">Contact Person Name <span className="text-[#FF0000]">*</span></label>
                  <SelectField
                    name="contactPerson"
                    placeholder={contactPersonsLoading ? 'Loading contacts...' : 'Search or select contact person'}
                    options={contactPersons}
                    value={form.contactPerson}
                    onChange={(v: any) => {
                      const val = (typeof v === 'object') ? (v.value ?? v.id ?? v) : v;
                      setForm(prev => ({ ...prev, contactPerson: val, assignTo: '' }));
                      setErrors(prev => ({ ...prev, contactPerson: '' }));
                    }}
                    searchable
                    disabled={contactPersonsLoading}
                    inputClassName={errors.contactPerson ? 'border border-red-500 bg-red-50 focus:ring-red-500' : 'border border-gray-200 focus:ring-black'}
                    className=""
                  />
                  {errors.contactPerson && (
                    <div id="contactPerson-error" className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                      <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.contactPerson}
                    </div>
                  )}
                  {contactPersonsError && <div className="text-xs text-red-600 mt-1">{contactPersonsError}</div>}
                </div>
                <div>
                  <label className="block text-sm text-gray-800 mb-1">Agency Name</label>
                  <SelectField
                    name="createdBy"
                    placeholder={agenciesLoading ? 'Loading agencies...' : 'Search or select agency'}
                    options={agencies}
                    value={form.createdBy}
                    onChange={(v: any) => { const val = (typeof v === 'object') ? (v.value ?? v.id ?? v) : v; lastChangedFieldRef.current = 'agency'; setForm(prev => ({ ...prev, createdBy: val })); }}
                    searchable
                    disabled={agenciesLoading}
                  />
                  {agenciesError && <div className="text-xs text-red-600 mt-1">{agenciesError}</div>}
                </div>
                <div>
                  <label className="block text-sm text-gray-800 mb-1">Brief Budget <span className="text-[#FF0000]">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="budget"
                    value={form.budget}
                    onChange={(e) => { handleChange(e); setErrors(prev => ({ ...prev, budget: '' })); }}
                    placeholder="Please Enter Est. Budget"
                    className={`w-full px-3 py-2 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 transition-colors ${errors.budget ? 'border border-red-500 bg-red-50 focus:ring-red-500' : 'border border-gray-200 focus:ring-blue-500'}`}
                    aria-invalid={errors.budget ? 'true' : 'false'}
                    aria-describedby={errors.budget ? 'budget-error' : undefined}
                  />
                  {errors.budget && (
                    <div id="budget-error" className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                      <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.budget}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="w-full">
                    <label className="block text-sm text-gray-800 mb-1">Submission Date <span className="text-[#FF0000]">*</span></label>
                    <DatePicker
                      selected={calendarDate}
                      onChange={date => {
                        setCalendarDate(date);
                        setErrors(prev => ({ ...prev, submissionDate: '' }));
                        if (date) {
                          const d = date;
                          const dd = String(d.getDate()).padStart(2, '0');
                          const mm = String(d.getMonth() + 1).padStart(2, '0');
                          const yyyy = d.getFullYear();
                          const formattedSubDate = `${dd}-${mm}-${yyyy}`;

                          // If campaign start date is already selected and is <= new submission date, reset it
                          if (calendarCampaignStartDate && calendarCampaignStartDate <= date) {
                            setCalendarCampaignStartDate(null);
                            setCalendarCampaignEndDate(null);
                            setForm(prev => ({
                              ...prev,
                              submissionDate: formattedSubDate,
                              campaignStartDate: '',
                              campaignEndDate: '',
                            }));
                            setErrors(prev => ({ ...prev, campaignStartDate: '', campaignEndDate: '' }));
                          } else {
                            setForm(prev => ({
                              ...prev,
                              submissionDate: formattedSubDate,
                            }));
                          }
                        } else {
                          setForm(prev => ({
                            ...prev,
                            submissionDate: '',
                          }));
                        }
                      }}
                      minDate={new Date()}
                      dateFormat="dd-MM-yyyy"
                      placeholderText="DD-MM-YYYY"
                      className={`w-full px-3 py-2 rounded-lg bg-white transition-colors ${errors.submissionDate ? 'border border-red-500 bg-red-50 focus:ring-red-500' : 'border border-gray-200'}`}
                      popperClassName="!duration-0 !transition-none"
                      disabled={false}
                    />
                    {errors.submissionDate && (
                      <div id="submissionDate-error" className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.submissionDate}
                      </div>
                    )}
                  </div>
                  <div className="w-full">
                    <label className="block text-sm text-gray-800 mb-1">Submission Time <span className="text-[#FF0000]">*</span></label>
                    <DatePicker
                      selected={calendarTime}
                      onChange={date => {
                        setCalendarTime(date);
                        setErrors(prev => ({ ...prev, submissionTime: '' }));
                        if (date) {
                          const d = date;
                          const hh = String(d.getHours()).padStart(2, '0');
                          const min = String(d.getMinutes()).padStart(2, '0');
                          setForm(prev => ({
                            ...prev,
                            submissionTime: `${hh}:${min}`
                          }));
                        }
                      }}
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={15}
                      timeCaption="Time"
                      dateFormat="HH:mm"
                      placeholderText="HH:mm"
                      className={`w-full px-3 py-2 rounded-lg bg-white transition-colors ${errors.submissionTime ? 'border border-red-500 bg-red-50 focus:ring-red-500' : 'border border-gray-200'}`}
                      popperClassName="!duration-0 !transition-none"
                      disabled={false}
                    />
                    {errors.submissionTime && (
                      <div id="submissionTime-error" className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.submissionTime}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="w-full">
                    <label className="block text-sm text-gray-800 mb-1">Campaign Start Date <span className="text-[#FF0000]">*</span></label>
                    <DatePicker
                      selected={calendarCampaignStartDate}
                      onChange={date => {
                        setCalendarCampaignStartDate(date);
                        setErrors(prev => ({ ...prev, campaignStartDate: '' }));
                        if (date) {
                          const d = date;
                          const dd = String(d.getDate()).padStart(2, '0');
                          const mm = String(d.getMonth() + 1).padStart(2, '0');
                          const yyyy = d.getFullYear();
                          const formattedStartDate = `${dd}-${mm}-${yyyy}`;

                          // If campaign end date is already selected and is < new campaign start date, reset it
                          if (calendarCampaignEndDate && calendarCampaignEndDate < date) {
                            setCalendarCampaignEndDate(null);
                            setForm(prev => ({
                              ...prev,
                              campaignStartDate: formattedStartDate,
                              campaignEndDate: '',
                            }));
                            setErrors(prev => ({ ...prev, campaignEndDate: '' }));
                          } else {
                            setForm(prev => ({
                              ...prev,
                              campaignStartDate: formattedStartDate,
                            }));
                          }
                        } else {
                          setForm(prev => ({
                            ...prev,
                            campaignStartDate: '',
                          }));
                        }
                      }}
                      minDate={getMinCampaignStartDate()}
                      dateFormat="dd-MM-yyyy"
                      placeholderText="DD-MM-YYYY"
                      className={`w-full px-3 py-2 rounded-lg bg-white transition-colors ${errors.campaignStartDate ? 'border border-red-500 bg-red-50 focus:ring-red-500' : 'border border-gray-200'}`}
                      popperClassName="!duration-0 !transition-none"
                    />
                    {errors.campaignStartDate && (
                      <div id="campaignStartDate-error" className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.campaignStartDate}
                      </div>
                    )}
                  </div>
                  <div className="w-full">
                    <label className="block text-sm text-gray-800 mb-1">Campaign End Date <span className="text-[#FF0000]">*</span></label>
                    <DatePicker
                      selected={calendarCampaignEndDate}
                      onChange={date => {
                        setCalendarCampaignEndDate(date);
                        setErrors(prev => ({ ...prev, campaignEndDate: '' }));
                        if (date) {
                          const d = date;
                          const dd = String(d.getDate()).padStart(2, '0');
                          const mm = String(d.getMonth() + 1).padStart(2, '0');
                          const yyyy = d.getFullYear();
                          setForm(prev => ({ ...prev, campaignEndDate: `${dd}-${mm}-${yyyy}` }));
                        } else {
                          setForm(prev => ({ ...prev, campaignEndDate: '' }));
                        }
                      }}
                      minDate={calendarCampaignStartDate || getMinCampaignStartDate()}
                      dateFormat="dd-MM-yyyy"
                      placeholderText="DD-MM-YYYY"
                      className={`w-full px-3 py-2 rounded-lg bg-white transition-colors ${errors.campaignEndDate ? 'border border-red-500 bg-red-50 focus:ring-red-500' : 'border border-gray-200'}`}
                      popperClassName="!duration-0 !transition-none"
                    />
                    {errors.campaignEndDate && (
                      <div id="campaignEndDate-error" className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.campaignEndDate}
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-full">
                  <label className="block text-sm text-gray-800 mb-1">Campaign Duration</label>
                  <input
                    type="number"
                    value={getCalculatedDuration()}
                    disabled
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">Priority</label>
                  <SelectField
                    name="priority"
                    placeholder={priorityLoading ? 'Loading priorities...' : 'Select Priority'}
                    options={priorityOptions}
                    value={form.priority}
                    onChange={(v: any) => {
                      const val = (typeof v === 'object') ? (v.value ?? v.id ?? v) : v;
                      lastChangedFieldRef.current = 'priority';
                      setForm(prev => ({ ...prev, priority: val }));
                      setTimeout(() => { if (lastChangedFieldRef.current === 'priority') lastChangedFieldRef.current = null; }, 500);
                    }}
                    inputClassName={priorityLoading ? 'border border-gray-300 bg-gray-50' : 'border border-[var(--border-color)] focus:ring-blue-500'}
                    disabled={priorityLoading}
                  />
                  {priorityError && <div className="text-xs text-red-600 mt-1">{priorityError}</div>}
                </div>
                <div>
                  <label className="block text-sm text-gray-800 mb-1">Brief Detail</label>
                  <textarea
                    ref={briefDetailRef}
                    name="briefDetail"
                    value={form.briefDetail}
                    onChange={handleChange}
                    spellCheck={false}
                    data-gramm="false"
                    data-quillbot-element="false"
                    rows={4}
                    placeholder="Show all data regarding to Brief"
                    className="w-full px-3 py-2 border border-gray-200 text-gray-800 rounded-lg bg-white resize-none"
                    style={{ overflow: 'hidden' }}
                  />
                </div>


                {/* Brief Detail moved to pair with Select Type for aligned row */}
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button type="submit" className="px-4 py-2 rounded-lg btn-primary text-white shadow-sm disabled:opacity-60" disabled={saving}>
                {saving ? 'Saving...' : (mode === 'edit' ? 'Update' : 'Save')}
              </button>
            </div>
          </form>
        </div>
      </div>

      <FilePreviewModal
        isOpen={isAttachmentModalOpen}
        source={attachmentModalSource}
        onClose={() => {
          setIsAttachmentModalOpen(false);
          setAttachmentModalSource(null);
        }}
      />
      {/* When editing a brief, show call history / pipeline table similar to design */}
      {mode === 'edit' && (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-6">
          <div className="p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">History</h3>
            <div className="overflow-x-auto">
              {/* Use the Table component for consistent design */}
              <Table
                data={
                  historiesLoading ? [] : (histories || []).map((it: any) => {
                    const assignedTo = it.assigned_to?.name || it.assigned_to || '-';
                    const callStatus = it.brief_status?.name || it.brief_status || (it.status ? String(it.status) : '-');
                    const followUp = it.brief_status_time || it.brief_status_time || '-';
                    const lastCall = it.created_at || it.updated_at || '-';
                    const submissionRaw = it.submission_date || it.brief?.submission_date || '-';
                    const submission = (submissionRaw && submissionRaw !== '-') ? (
                      // normalize common formats to DD-MM-YYYY HH:mm when possible
                      ((): string => {
                        try {
                          const s = String(submissionRaw).trim();
                          // if already in DD-MM-YYYY or contains space with time
                          if (/^\d{2}-\d{2}-\d{4}/.test(s)) return s.replace(/T/, ' ');
                          // if ISO like 2025-12-17 18:45 or 2025-12-17T18:45:00
                          const iso = s.replace(/\s+/, 'T');
                          const d = new Date(iso);
                          if (!isNaN(d.getTime())) {
                            const dd = String(d.getDate()).padStart(2, '0');
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const yyyy = d.getFullYear();
                            const hh = String(d.getHours()).padStart(2, '0');
                            const min = String(d.getMinutes()).padStart(2, '0');
                            return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
                          }
                        } catch {
                          // no need to action
                        }
                        return String(submissionRaw);
                      })()
                    ) : '-';
                    const comment = it.comment || it.brief?.comment || '-';
                    return { assignedTo, callStatus, followUp, lastCall, submission, comment };
                  })
                }
                columns={[
                  { key: 'assignedTo', header: 'Assigned TO', className: 'whitespace-nowrap overflow-hidden truncate' },
                  { key: 'callStatus', header: 'Call Status', className: 'whitespace-nowrap overflow-hidden truncate' },
                  { key: 'followUp', header: 'FollowUp Date & Time', className: 'whitespace-nowrap overflow-hidden truncate' },
                  { key: 'lastCall', header: 'Last Call Status', className: 'whitespace-nowrap overflow-hidden truncate' },
                  { key: 'submission', header: 'Submission Date & Time', className: 'whitespace-nowrap overflow-hidden truncate' },
                  { key: 'comment', header: 'Comment', className: 'whitespace-nowrap overflow-hidden truncate' },
                ]}
                desktopOnMobile={true}
                keyExtractor={(row: any, idx: number) => `history-row-${row.assignedTo || idx}-${idx}`}
              />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default CreateBriefForm;
