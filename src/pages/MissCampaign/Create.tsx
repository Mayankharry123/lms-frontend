/**
 * @file Create.tsx
 * @description Create pre-lead (miss campaign) record form.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MasterCreateHeader } from '../../components/ui/MasterCreateHeader';
import { Upload, Loader, Trash2 } from 'lucide-react';
import { SelectField, Button, Input } from '../../components/ui';
import ModalPopup from '../../components/ui/ModalPopup';
import { apiClient } from '../../utils/apiClient';
import { createMissCampaign, updateMissCampaignWithForm } from '../../services/Create';
import { listCountries, listStates, listCities } from '../../services/CreateBrandForm';
import { listAttendees } from '../../services/AllUsers';
import { fetchCurrentUser } from '../../services/Header';
import { flattenChildUserHierarchy } from '../../api/lookups';
import SweetAlert from '../../utils/SweetAlert';
import { quickCreateApi } from '../../services/QuickCreate';
import type { MissCampaignCreateProps } from '../../types/pages/forms.types';

function resolveAssignToId(data: any): string {
  const objectId =
    data?.assign_to?.id ??
    data?.current_assign_user?.id ??
    data?.assigned_user?.id;
  if (objectId != null && String(objectId).trim() !== '') {
    return String(objectId);
  }

  const raw =
    data?.assign_to_id ??
    data?.current_assign_user_id ??
    data?.assignTo ??
    data?.assign_to ??
    data?.current_assign_user ??
    '';

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(raw);
  }

  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
    return raw.trim();
  }

  return '';
}

function resolveAssignToLabel(data: any): string {
  return String(
    data?.assign_to_name ??
    data?.current_assign_user_name ??
    data?.assigned_user?.name ??
    (data?.current_assign_user && typeof data.current_assign_user === 'object'
      ? data.current_assign_user.name
      : '') ??
    (data?.assigned_user && typeof data.assigned_user === 'object'
      ? data.assigned_user.name
      : '') ??
    ''
  );
}

const Create: React.FC<MissCampaignCreateProps> = ({
  inline = false,
  mode = 'create',
  initialData,
  onClose,
  onSave,
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    brandName: '',
    source: '',
    subSource: '',
    organisation: '',
    industry: '',
    assignBy: '',
    assignTo: '',
    productName: '',
    country: '',
    state: '',
    city: '',
    mediaType: '',
    image: null as File | null,
    image_url: '', // for preview
    remove_image: false, // for delete flag
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brandOptions, setBrandOptions] = useState<{ id: string; name: string }[]>([]);
  const [brandLoading, setBrandLoading] = useState(false);
  const [sourceOptions, setSourceOptions] = useState<{ id: string; source: string }[]>([]);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [subSourceOptions, setSubSourceOptions] = useState<{ id: string; label: string }[]>([]);
  const [subSourceLoading, setSubSourceLoading] = useState(false);
  const [industryOptions, setIndustryOptions] = useState<{ id: string; name: string }[]>([]);
  const [industryLoading, setIndustryLoading] = useState(false);
  const [countryOptions, setCountryOptions] = useState<{ id: string; name: string }[]>([]);
  const [countryLoading, setCountryLoading] = useState(false);
  const [stateOptions, setStateOptions] = useState<{ id: string; name: string }[]>([]);
  const [stateLoading, setStateLoading] = useState(false);
  const [cityOptions, setCityOptions] = useState<{ id: string; name: string }[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(''); // for newly selected image preview
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);

  const [quickModal, setQuickModal] = useState<null | 'brand' | 'source' | 'subSource'>(null);
  const [quickBrandName, setQuickBrandName] = useState('');
  const [quickBrandError, setQuickBrandError] = useState<string | null>(null);
  const [quickBrandSaving, setQuickBrandSaving] = useState(false);
  const [quickSourceName, setQuickSourceName] = useState('');
  const [quickSourceError, setQuickSourceError] = useState<string | null>(null);
  const [quickSourceSaving, setQuickSourceSaving] = useState(false);
  const [quickSubSourceName, setQuickSubSourceName] = useState('');
  const [quickSubSourceError, setQuickSubSourceError] = useState<string | null>(null);
  const [quickSubSourceSaving, setQuickSubSourceSaving] = useState(false);

  // Assign To users dropdown state
  const [assignToOptions, setAssignToOptions] = useState<{ value: string; label: string }[]>([]);
  const [assignToLoading, setAssignToLoading] = useState(false);

  // Organisation dropdown state
  const [organisationOptions, setOrganisationOptions] = useState<{ id: string; name: string }[]>([]);
  const [organisationLoading, setOrganisationLoading] = useState(false);

  // Media Type dropdown state
  const [mediaTypeOptions, setMediaTypeOptions] = useState<{ id: string; name: string }[]>([]);
  const [mediaTypeLoading, setMediaTypeLoading] = useState(false);

  // Current user state
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);

  const openImageModal = (url: string) => {
    setModalImageUrl(url);
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setModalImageUrl(null);
  };

  // Close modal on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeImageModal();
    };
    if (imageModalOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [imageModalOpen]);

  // Fetch brands on component mount
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setBrandLoading(true);
        const response = await quickCreateApi.listBrands();
        const options = (response || []).map((brand) => ({
          id: brand.id,
          name: brand.name,
        }));
        setBrandOptions(options);
      } catch (err) {
        console.error('Failed to fetch brands:', err);
        setBrandOptions([]);
      } finally {
        setBrandLoading(false);
      }
    };
    fetchBrands();
  }, []);

  // Fetch lead sources on component mount
  useEffect(() => {
    const fetchSources = async () => {
      try {
        setSourceLoading(true);
        const response = await quickCreateApi.listSourcesForPreLead();
        const options = response.map((source) => ({
          id: source.id,
          source: source.name,
        }));
        setSourceOptions(options);
      } catch (err) {
        console.error('Failed to fetch lead sources:', err);
        setSourceOptions([]);
      } finally {
        setSourceLoading(false);
      }
    };
    fetchSources();
  }, []);

  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        setIndustryLoading(true);
        const response = await apiClient.get<any[]>('/industries/list');
        const industries = Array.isArray(response.data) ? response.data : [];
        const options = industries.map((industry) => ({
          id: String(industry.id ?? industry.value ?? industry),
          name: String(industry.name ?? industry.label ?? industry),
        }));
        setIndustryOptions(options);
      } catch (err) {
        console.error('Failed to fetch industries:', err);
        setIndustryOptions([]);
      } finally {
        setIndustryLoading(false);
      }
    };
    fetchIndustries();
  }, []);

  // Fetch organisations on component mount
  useEffect(() => {
    const fetchOrganisations = async () => {
      try {
        setOrganisationLoading(true);
        const response = await apiClient.get<any[]>('/organisations/list');
        const orgs = Array.isArray(response.data) ? response.data : [];
        const options = orgs.map((org: any) => ({
          id: String(org.id ?? org.organisation_id ?? org.value ?? ''),
          name: String(org.name ?? org.organisation_name ?? org.label ?? ''),
        })).filter(o => o.id && o.name);
        setOrganisationOptions(options);

        // Preselect organisation if only one is returned, otherwise ensure none is selected (on create mode)
        if (mode === 'create') {
          if (options.length === 1) {
            setFormData(prev => ({ ...prev, organisation: options[0].id }));
          } else if (options.length > 1) {
            setFormData(prev => ({ ...prev, organisation: '' }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch organisations:', err);
        setOrganisationOptions([]);
      } finally {
        setOrganisationLoading(false);
      }
    };
    fetchOrganisations();
  }, [mode]);

  // Fetch child users by organisation when organisation changes, fallback to all attendees
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setAssignToLoading(true);
        let response;
        if (formData.organisation) {
          response = await apiClient.get(`/profile/child-users-by-organisation?organisation_id=${formData.organisation}&organization_id=${formData.organisation}`);
        } else {
          response = await listAttendees(1, 200);
        }
        const users = formData.organisation
          ? flattenChildUserHierarchy(Array.isArray(response.data) ? response.data : [])
          : (Array.isArray(response.data) ? response.data : []);
        let options = users.map((user: any) => ({
          value: String(user.id),
          label: String(user.name),
        }));

        if (formData.assignTo) {
          const exists = options.some((option) => String(option.value) === String(formData.assignTo));
          if (!exists) {
            options = [{
              value: String(formData.assignTo),
              label: assignToLabelRef.current || String(formData.assignTo),
            }, ...options];
          }
        }

        setAssignToOptions(options);
      } catch (err) {
        console.error('Failed to fetch users matching organisation, falling back to all attendees:', err);
        try {
          const response = await listAttendees(1, 200);
          const options = (response.data || []).map((user: any) => ({
            value: String(user.id),
            label: String(user.name),
          }));
          setAssignToOptions(options);
        } catch (fallbackErr) {
          console.error('Failed fallback fetch of all attendees:', fallbackErr);
          setAssignToOptions([]);
        }
      } finally {
        setAssignToLoading(false);
      }
    };
    fetchUsers();
  }, [formData.organisation, formData.assignTo]);

  // Fetch media types on component mount
  useEffect(() => {
    const fetchMediaTypes = async () => {
      try {
        setMediaTypeLoading(true);
        const response = await apiClient.get('/media-types');
        const data = Array.isArray(response.data) ? response.data : [];
        const options = data.map((item: any) => {
          const rawId = item.id ?? item.value;
          const id = rawId !== undefined && rawId !== null ? String(rawId) : '';
          const name = String(item.name ?? item.label ?? item.type ?? '');
          return { id: id || name, name };
        });
        setMediaTypeOptions(options);
      } catch (err) {
        console.error('Failed to fetch media types:', err);
        setMediaTypeOptions([]);
      } finally {
        setMediaTypeLoading(false);
      }
    };
    fetchMediaTypes();
  }, []);

  // Fetch current user for assignBy
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await fetchCurrentUser();
        if (user && user.name) {
          setCurrentUser({ id: String(user.id), name: user.name });

          // Preselect organisation if current user profile is assigned to exactly one
          if (mode === 'create') {
            const orgs = user.organisations || [];
            if (orgs.length === 1) {
              const singleOrgId = String(orgs[0].id ?? orgs[0].organisation_id ?? orgs[0].value ?? '');
              if (singleOrgId) {
                setFormData(prev => ({ ...prev, organisation: singleOrgId }));
              }
            } else if (orgs.length > 1) {
              setFormData(prev => ({ ...prev, organisation: '' }));
            } else if (user.organisation_id) {
              setFormData(prev => ({ ...prev, organisation: String(user.organisation_id) }));
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch current user:', err);
      }
    };
    fetchUser();
  }, [mode]);


  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setCountryLoading(true);
        const response = await listCountries();
        const options = (response || []).map((country) => ({
          id: String(country.id),
          name: country.name,
        }));
        setCountryOptions(options);

        // Default country to India if not already set (e.g. in create mode)
        const india = options.find((c) => c.name?.trim().toLowerCase() === 'india');
        if (india) {
          setFormData((prev) => {
            if (prev.country) return prev;
            if (mode === 'edit' && (initialData?.country || initialData?.country_id)) return prev;
            return {
              ...prev,
              country: String(india.id),
            };
          });
        }
      } catch (err) {
        console.error('Failed to fetch countries:', err);
        setCountryOptions([]);
      } finally {
        setCountryLoading(false);
      }
    };
    fetchCountries();
  }, [mode, initialData]);

  useEffect(() => {
    if (!formData.country) {
      setStateOptions([]);
      setCityOptions([]);
      setFormData(prev => ({ ...prev, state: '', city: '' }));
      return;
    }

    const fetchStates = async () => {
      try {
        setStateLoading(true);
        const response = await listStates({ country_id: formData.country });
        const options = (response || []).map((state) => ({
          id: String(state.id),
          name: state.name,
        }));
        setStateOptions(options);
      } catch (err) {
        console.error('Failed to fetch states:', err);
        setStateOptions([]);
      } finally {
        setStateLoading(false);
      }
    };
    fetchStates();
  }, [formData.country]);

  useEffect(() => {
    if (!formData.state) {
      setCityOptions([]);
      setFormData(prev => ({ ...prev, city: '' }));
      return;
    }

    const fetchCities = async () => {
      try {
        setCityLoading(true);
        const response = await listCities({ state_id: formData.state });
        const options = (response || []).map((city) => ({
          id: String(city.id),
          name: city.name,
        }));
        setCityOptions(options);
      } catch (err) {
        console.error('Failed to fetch cities:', err);
        setCityOptions([]);
      } finally {
        setCityLoading(false);
      }
    };
    fetchCities();
  }, [formData.state]);

  // Store initial nested sub-source for reference during fetch cycles
  const initialSubSourceRef = useRef<{ id: string; label: string } | null>(null);
  const editRecordIdRef = useRef<string | null>(null);
  const assignToLabelRef = useRef<string>('');

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      const nestedSub = initialData.lead_sub_source ?? initialData.sub_source ?? initialData.subSource;
      if (nestedSub && typeof nestedSub === 'object') {
        const nid = String(nestedSub.id ?? nestedSub.lead_sub_source_id ?? nestedSub.sub_source_id ?? '');
        const nlabel = String(nestedSub.name ?? nestedSub.subSource ?? nestedSub.label ?? '');
        if (nid && nlabel) {
          initialSubSourceRef.current = { id: nid, label: nlabel };
        }
      }
    }

    // Clear image preview when mode changes
    setImagePreview('');
  }, [mode, initialData]);

  // Fetch lead sub-sources when source selection changes
  useEffect(() => {
    if (!formData.source) {
      setSubSourceOptions([]);
      return;
    }

    const fetchSubSources = async () => {
      try {
        setSubSourceLoading(true);
        const response = await quickCreateApi.listSubSourcesBySourceForPreLead(formData.source);
        const options = response.map((subSource) => ({
          id: subSource.id,
          label: subSource.name,
        }));
        setSubSourceOptions(options);
      } catch (err) {
        console.error('Failed to fetch lead sub-sources:', err);
        setSubSourceOptions([]);
      } finally {
        setSubSourceLoading(false);
      }
    };
    fetchSubSources();
  }, [formData.source]);

  useEffect(() => {
    if (mode !== 'edit') {
      editRecordIdRef.current = null;
      assignToLabelRef.current = '';
    }
  }, [mode]);

  useEffect(() => {
    const resolveLocationIds = async () => {
      if (mode === 'edit' && initialData) {
        const recordId = String(initialData.id ?? initialData.uuid ?? '');
        const isAlreadyHydrated = editRecordIdRef.current === recordId && recordId !== '';

        const brandId = initialData.brand_id || initialData.brand?.id || initialData.brandId || initialData.brandName;
        const sourceId = initialData.lead_source_id || initialData.lead_source?.id || initialData.source_id || initialData.source;
        const subSourceId = initialData.lead_sub_source_id || initialData.lead_sub_source?.id || initialData.sub_source_id || initialData.subSource;
        const industryId = initialData.industry?.id || initialData.industry_id || initialData.industry;

        let resolvedIndustryId = industryId;
        if (industryOptions.length > 0 && industryId && typeof industryId === 'string') {
          const found = industryOptions.find(opt => opt.name.toLowerCase() === industryId.toLowerCase() || opt.id === industryId);
          if (found) resolvedIndustryId = found.id;
        }

        if (isAlreadyHydrated) {
          if (resolvedIndustryId) {
            setFormData(prev => ({
              ...prev,
              industry: String(resolvedIndustryId),
            }));
          }
          return;
        }

        let countryId: any = initialData.country?.id || initialData.country_id || initialData.country;
        let stateId: any = initialData.state?.id || initialData.state_id || initialData.state;
        let cityId: any = initialData.city?.id || initialData.city_id || initialData.city;

        const isNumeric = (val: any) => !isNaN(Number(val));

        try {
          // ✅ Resolve Country (if name)
          if (countryId && !isNumeric(countryId)) {
            const countries = await listCountries();
            const foundCountry = countries?.find(
              (c: any) =>
                String(c.name).toLowerCase() === String(countryId).toLowerCase()
            );
            if (foundCountry) {
              countryId = String(foundCountry.id);
            }
          }

          // ✅ Resolve State (if name)
          if (countryId && stateId && !isNumeric(stateId)) {
            const states = await listStates({ country_id: countryId });

            const foundState = states?.find(
              (s: any) =>
                String(s.name).toLowerCase() === String(stateId).toLowerCase()
            );

            if (foundState) {
              stateId = String(foundState.id);
            }
          }

          // ✅ Resolve City (if name)
          if (stateId && cityId && !isNumeric(cityId)) {
            const cities = await listCities({ state_id: stateId });

            const foundCity = cities?.find(
              (c: any) =>
                String(c.name).toLowerCase() === String(cityId).toLowerCase()
            );

            if (foundCity) {
              cityId = String(foundCity.id);
            }
          }
        } catch (err) {
          console.error("Location resolve error:", err);
        }

        // ✅ FINAL setFormData (only after resolving IDs)
        const assignToId = resolveAssignToId(initialData);
        assignToLabelRef.current = resolveAssignToLabel(initialData);

        // Resolve media type robustly
        const rawMediaType = initialData.media_type ?? initialData.media_type_id ?? initialData.mediaType ?? initialData.media_type ?? '';
        const mediaTypeId =
          rawMediaType && typeof rawMediaType === 'object'
            ? String((rawMediaType as any).id ?? (rawMediaType as any).value ?? (rawMediaType as any).name ?? (rawMediaType as any).type ?? '')
            : String(rawMediaType ?? '');

        setFormData(prev => ({
          ...prev,
          brandName: String(brandId ?? prev.brandName ?? ''),
          source: String(sourceId ?? prev.source ?? ''),
          subSource: String(subSourceId ?? prev.subSource ?? ''),
          organisation: String(
            initialData.organisation_id ??
            initialData.organisation?.id ??
            initialData.organization_id ??
            initialData.organization?.id ??
            initialData.organisationId ??
            initialData.organizationId ??
            prev.organisation ??
            ''
          ),
          industry: String(resolvedIndustryId ?? prev.industry ?? ''),
          assignBy: mode === 'edit' ? (initialData.assign_by_name ?? initialData.created_by_user?.name ?? initialData.created_by ?? '') : (currentUser?.name ?? ''),
          assignTo: assignToId,
          productName: String(initialData.name ?? initialData.productName ?? prev.productName ?? ''),
          country: String(countryId ?? prev.country ?? ''),
          state: String(stateId ?? prev.state ?? ''),
          city: String(cityId ?? prev.city ?? ''),
          mediaType: mediaTypeId || prev.mediaType || '',
          image: null,
          image_url: initialData.image_url || initialData.image_path || '',
          remove_image: false,
        }));

        if (recordId) {
          editRecordIdRef.current = recordId;
        }

        // ✅ Sub-source injection (same as your code)
        const nestedSub =
          initialData.lead_sub_source ??
          initialData.sub_source ??
          initialData.subSource;

        if (nestedSub && typeof nestedSub === 'object') {
          const nid = String(
            nestedSub.id ??
            nestedSub.lead_sub_source_id ??
            nestedSub.sub_source_id ??
            ''
          );
          const nlabel = String(
            nestedSub.name ??
            nestedSub.subSource ??
            nestedSub.label ??
            ''
          );

          if (nid && nlabel) {
            setSubSourceOptions(prev => {
              const exists = prev.find(p => String(p.id) === nid);
              if (exists) return prev;
              return [{ id: nid, label: nlabel }, ...prev];
            });
          }
        }
      }
    };

    resolveLocationIds();
  }, [mode, initialData, industryOptions, currentUser]);

  useEffect(() => {
    // Do not blindly merge raw API `initialData` into form state.
    // The edit-mode normalization above handles mapping IDs (brand/source/subSource)
    // to `formData` correctly. Spreading `initialData` here can overwrite those
    // normalized string IDs with nested objects (e.g. `lead_sub_source` object),
    // causing select inputs to lose their selected label.
    // Intentionally leave this effect empty to avoid clobbering normalized values.
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const closeQuickBrandModal = () => {
    setQuickModal(null);
    setQuickBrandName('');
    setQuickBrandError(null);
  };

  const closeQuickSourceModal = () => {
    setQuickModal(null);
    setQuickSourceName('');
    setQuickSourceError(null);
  };

  const closeQuickSubSourceModal = () => {
    setQuickModal(null);
    setQuickSubSourceName('');
    setQuickSubSourceError(null);
  };

  const handleQuickBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = quickBrandName.trim();
    if (!name) {
      setQuickBrandError('Please enter brand name');
      return;
    }
    setQuickBrandError(null);
    setQuickBrandSaving(true);
    try {
      const created = await quickCreateApi.createBrand(name);
      const newId = created?.id != null ? String(created.id) : '';
      const newLabel = String(created?.name ?? name).trim();

      setBrandOptions((prev) => {
        if (!newId) return prev;
        if (prev.some((b) => String(b.id) === newId)) return prev;
        return [...prev, { id: newId, name: newLabel }];
      });

      if (newId) {
        setFormData(prev => ({ ...prev, brandName: newId }));
        setErrors(prev => ({ ...prev, brandName: '' }));
      }

      SweetAlert.showCreateSuccess();
      closeQuickBrandModal();

      try {
        const response = await quickCreateApi.listBrands();
        const options = (response || []).map((brand) => ({
          id: String(brand.id),
          name: brand.name,
        }));
        setBrandOptions(options);
      } catch {
        // Create succeeded; refresh list failed — keep optimistic options above
      }
    } catch (err: any) {
      setQuickBrandError(err?.message || 'Failed to create brand');
    } finally {
      setQuickBrandSaving(false);
    }
  };

  const handleQuickSourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = quickSourceName.trim();
    if (!name) {
      setQuickSourceError('Please enter source name');
      return;
    }
    setQuickSourceError(null);
    setQuickSourceSaving(true);
    try {
      const created = await quickCreateApi.createSource(name);
      const newId = created?.id != null ? String(created.id) : '';
      const newLabel = String(created?.name ?? name).trim();

      setSourceOptions((prev) => {
        if (!newId) return prev;
        if (prev.some((s) => String(s.id) === newId)) return prev;
        return [...prev, { id: newId, source: newLabel }];
      });

      if (newId) {
        setFormData(prev => ({ ...prev, source: newId, subSource: '' }));
        setErrors(prev => ({ ...prev, source: '', subSource: '' }));
      }

      SweetAlert.showCreateSuccess();
      closeQuickSourceModal();

      try {
        const response = await quickCreateApi.listSourcesForPreLead();
        const opts = response.map((s) => ({
          id: String(s.id),
          source: s.name,
        }));
        setSourceOptions(opts);
      } catch {
        // Create succeeded; refresh list failed — keep optimistic options above
      }
    } catch (err: any) {
      setQuickSourceError(err?.message || 'Failed to create source');
    } finally {
      setQuickSourceSaving(false);
    }
  };

  const handleQuickSubSourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = quickSubSourceName.trim();
    const selectedSourceId = String(formData.source || '').trim();
    if (!name) {
      setQuickSubSourceError('Please enter sub source name');
      return;
    }
    if (!selectedSourceId) {
      setQuickSubSourceError('Please select a source first');
      return;
    }
    setQuickSubSourceError(null);
    setQuickSubSourceSaving(true);
    try {
      const created = await quickCreateApi.createSubSourceForPreLead(selectedSourceId, name);
      const newId = created?.id != null ? String(created.id) : '';
      const newLabel = String(created?.name ?? name).trim();

      setSubSourceOptions((prev) => {
        if (!newId) return prev;
        if (prev.some((s) => String(s.id) === newId)) return prev;
        return [...prev, { id: newId, label: newLabel }];
      });

      if (newId) {
        setFormData(prev => ({ ...prev, source: selectedSourceId, subSource: newId }));
        setErrors(prev => ({ ...prev, subSource: '' }));
      }

      SweetAlert.showCreateSuccess();
      closeQuickSubSourceModal();

      try {
        const response = await quickCreateApi.listSubSourcesBySourceForPreLead(selectedSourceId);
        const options = response.map((sub) => ({
          id: sub.id,
          label: sub.name,
        }));
        setSubSourceOptions(options);
      } catch {
        // Create succeeded; refresh list failed — keep optimistic options above
      }
    } catch (err: any) {
      setQuickSubSourceError(err?.message || 'Failed to create sub source');
    } finally {
      setQuickSubSourceSaving(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData(prev => ({
        ...prev,
        image: file,
        image_url: '', // clear preview if uploading new
        remove_image: false,
      }));

      // Create a preview URL using FileReader
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const next: Record<string, string> = {};
    if (!formData.brandName) next.brandName = 'Please select a brand';
    if (!formData.source) next.source = 'Please select a source';
    if (!formData.subSource) next.subSource = 'Please select a sub source';
    if (!formData.organisation) next.organisation = 'Please select an organisation';
    // Industry optional — was mandatory: if (!formData.industry) next.industry = 'Please select an industry';
    if (!formData.productName || formData.productName.trim() === '') next.productName = 'Please enter product name';
    if (!formData.country) next.country = 'Please select a country';
    if (!formData.state) next.state = 'Please select a state';
    if (!formData.city) next.city = 'Please select a city';
    if (!formData.mediaType) next.mediaType = 'Please select a media type';

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setError(null);
    setSaving(true);

    const assignByVal = currentUser?.id && String(currentUser.id).replace(/\D/g, '') !== '' ? Number(String(currentUser.id).replace(/\D/g, '')) : undefined;
    const assignToVal = formData.assignTo && String(formData.assignTo).replace(/\D/g, '') !== '' ? Number(String(formData.assignTo).replace(/\D/g, '')) : undefined;

    const payload: Record<string, any> = {
      name: formData.productName,
      source: formData.source,
      subSource: formData.subSource,
      brand_id: formData.brandName,
      lead_source_id: formData.source,
      lead_sub_source_id: formData.subSource,
      country_id: formData.country,
      state_id: formData.state,
      city_id: formData.city,
      media_type: formData.mediaType,
    };

    if (formData.organisation) {
      payload.organisation_id = Number(String(formData.organisation).replace(/\D/g, ''));
    }

    if (formData.industry) {
      payload.industry_id = formData.industry;
    }

    if (formData.remove_image) {
      payload.remove_image = formData.remove_image;
    }

    if (assignByVal !== undefined) payload.assign_by = assignByVal;

    if (mode === 'edit') {
      payload.assign_to = assignToVal ?? null;
    } else if (assignToVal !== undefined) {
      payload.assign_to = assignToVal;
    }
    // Only include image if a new file is selected
    if (formData.image) {
      payload.image_path = formData.image;
    }

    try {
      let result: any;
      if (mode === 'edit' && initialData && (initialData.id || initialData.uuid)) {
        const id = String(initialData.id ?? initialData.uuid);
        result = await updateMissCampaignWithForm(id, payload);
        SweetAlert.showUpdateSuccess();
      } else {
        result = await createMissCampaign(payload);
        SweetAlert.showCreateSuccess();
      }

      if (onSave) onSave(result);

      // dispatch a global update so lists can refresh when user returns
      try {
        window.dispatchEvent(new CustomEvent('missCampaigns:update', { detail: { id: (result as any)?.id } }));
      } catch {
        // no need to action
      }

      // For inline mode or if no navigation available, just close
      if (inline || !navigate) {
        if (onClose) onClose();
      } else {
        // Navigate to view page after a short delay to show success message
        setTimeout(() => {
          navigate('/pre-lead/view', { state: { refreshedAt: Date.now() } });
        }, 1800);
      }
    } catch (err: any) {
      console.error('Create/Update failed', err);
      const errorMsg = err?.message || 'Failed to save campaign';
      setError(errorMsg);
      try { SweetAlert.showError(errorMsg); } catch {
        // no need to action
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={inline ? 'w-full' : 'p-0'}>
      <MasterCreateHeader
        title=""
        onClose={onClose ? onClose : () => navigate(-1)}
      />
      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 px-4 py-5 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error ? <p className="text-sm text-red-600 mb-4">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            {/* Brand Name */}
            <div className='w-full sm:w-[calc(50%-12px)]'>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-800">
                  Brand Name <span className="text-[#FF0000]">*</span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="!text-sm !py-1 !px-0 underline !outline-none whitespace-nowrap hover:!text-orange-500 shrink-0"
                  onClick={() => {
                    setQuickBrandError(null);
                    setQuickBrandName('');
                    setQuickModal('brand');
                  }}
                >
                  Create Brand
                </Button>
              </div>
              <div className='w-full'>
                <SelectField
                  name="brandName"
                  value={formData.brandName}
                  onChange={(v) => { setFormData(prev => ({ ...prev, brandName: typeof v === 'string' ? v : v[0] ?? '' })); setErrors(prev => ({ ...prev, brandName: '' })); }}
                  options={brandOptions.map(b => ({ value: String(b.id), label: b.name }))}
                  placeholder={brandLoading ? 'Loading brands...' : 'Search or select option'}
                  inputClassName={errors.brandName ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'}
                  disabled={brandLoading}
                />
              </div>
              {errors.brandName && (
                <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.brandName}
                </div>
              )}
            </div>

            {/* Source */}
            <div className='w-full sm:w-[calc(50%-12px)]'>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-800">
                  Source <span className="text-[#FF0000]">*</span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="!text-sm !py-0 !px-0 !outline-none underline whitespace-nowrap hover:!text-orange-500 shrink-0"
                  onClick={() => {
                    setQuickSourceName('');
                    setQuickSourceError(null);
                    setQuickModal('source');
                  }}
                >
                  Create Source
                </Button>
              </div>
              <div>
                <SelectField
                  name="source"
                  value={formData.source}
                  onChange={(v) => { setFormData(prev => ({ ...prev, source: typeof v === 'string' ? v : v[0] ?? '' })); setErrors(prev => ({ ...prev, source: '' })); }}
                  options={sourceOptions.map(s => ({ value: String(s.id), label: s.source }))}
                  placeholder={sourceLoading ? 'Loading sources...' : 'Search or select option'}
                  inputClassName={errors.source ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'}
                  disabled={sourceLoading}
                />
              </div>
              {errors.source && (
                <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.source}
                </div>
              )}
            </div>

            {/* Sub Source (dropdown) */}
            <div className='w-full sm:w-[calc(50%-12px)]'>
              <div className="flex items-center justify-between mb-1 flex-wrap">
                <label className="flex text-sm font-medium items-center gap-2 text-gray-800">
                  Sub Source <span className="text-[#FF0000]">*</span>
                  {subSourceLoading && <Loader className="w-4 h-4 animate-spin text-blue-500" />}
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="!text-sm !py-0 !px-0 underline !outline-none whitespace-nowrap hover:!text-orange-500 shrink-0"
                  disabled={!formData.source}
                  title={!formData.source ? 'Select a source first' : undefined}
                  onClick={() => {
                    setQuickSubSourceName('');
                    setQuickSubSourceError(null);
                    setQuickModal('subSource');
                  }}
                >
                  Create Sub Source
                </Button>
              </div>
              <div>
                <SelectField
                  name="subSource"
                  value={formData.subSource}
                  onChange={(v) => {
                    const selectedSubSource = typeof v === 'string' ? v : v[0] ?? '';
                    setFormData(prev => ({
                      ...prev,
                      source: prev.source,
                      subSource: selectedSubSource,
                    }));
                    setErrors(prev => ({ ...prev, source: '', subSource: '' }));
                  }}
                  options={subSourceOptions.map(s => ({ value: String(s.id), label: s.label }))}
                  placeholder={subSourceLoading ? 'Loading sub-sources...' : (formData.source ? 'Search or select option' : 'Select a source first')}
                  inputClassName={errors.subSource ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'}
                  disabled={subSourceLoading || !formData.source}
                />
              </div>
              {errors.subSource && (
                <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.subSource}
                </div>
              )}
            </div>

            {/* Organisation (dropdown) */}
            <div className='w-full sm:w-[calc(50%-12px)]'>
              <label className="block text-sm font-medium mb-2 text-gray-800">
                Organisation <span className="text-[#FF0000]">*</span>
                {organisationLoading && <Loader className="w-4 h-4 animate-spin text-blue-500 inline ml-2" />}
              </label>
              <div className='w-full'>
                <SelectField
                  name="organisation"
                  value={formData.organisation}
                  onChange={(v) => {
                    const organisation = typeof v === 'string' ? v : v[0] ?? '';
                    assignToLabelRef.current = '';
                    setFormData(prev => ({
                      ...prev,
                      organisation,
                      assignTo: '' // Reset assignTo when organisation changes
                    }));
                    setErrors(prev => ({
                      ...prev,
                      organisation: ''
                    }));
                  }}
                  options={organisationOptions.map(o => ({ value: String(o.id), label: o.name }))}
                  placeholder={organisationLoading ? 'Loading organisations...' : 'Search or select organisation'}
                  inputClassName={errors.organisation ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'}
                  disabled={organisationLoading}
                />
              </div>
              {errors.organisation && (
                <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.organisation}
                </div>
              )}
            </div>

            {/* Assign By (read-only) */}
            {/* <div className='w-full sm:w-[calc(50%-12px)]'>
              <label className="block text-sm font-medium mb-2 text-gray-800">
                Assign By
              </label>
              <input
                type="text"
                value={currentUser?.name || ''}
                readOnly
                className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-900 focus:outline-none"
                tabIndex={-1}
              />
            </div> */}

            {/* Assign To — disabled until an organisation is selected */}
            <div className='w-full sm:w-[calc(50%-12px)]'>
              <label className="block text-sm font-medium mb-2 text-gray-800">
                Assign To
              </label>
              <div>
                <SelectField
                  name="assignTo"
                  value={formData.assignTo || ''}
                  onChange={(v) => { setFormData(prev => ({ ...prev, assignTo: typeof v === 'string' ? v : v[0] ?? '' })); }}
                  options={assignToOptions}
                  placeholder={!formData.organisation ? 'Select Organisation first' : (assignToLoading ? 'Loading...' : 'Select Assign To')}
                  inputClassName={`focus:ring-blue-500 ${!formData.organisation ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' : 'border-gray-200'}`}
                  disabled={assignToLoading || !formData.organisation}
                />
              </div>
              {!formData.organisation && (
                <div className="text-xs text-amber-500 mt-1">Please select an organisation first.</div>
              )}
            </div>

            {/* Industry */}
            <div className='w-full sm:w-[calc(50%-12px)]'>
              <label className="block text-sm font-medium mb-2 text-gray-800">
                Industry
              </label>
              <div>
                <SelectField
                  name="industry"
                  value={formData.industry}
                  onChange={(v) => { setFormData(prev => ({ ...prev, industry: typeof v === 'string' ? v : v[0] ?? '' })); setErrors(prev => ({ ...prev, industry: '' })); }}
                  options={industryOptions.map(i => ({ value: String(i.id), label: i.name }))}
                  placeholder={industryLoading ? 'Loading industries...' : 'Search or select industry'}
                  inputClassName={errors.industry ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'}
                  disabled={industryLoading}
                />
              </div>
              {errors.industry && (
                <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.industry}
                </div>
              )}
            </div>

            {/* Product Name */}
            <div className='w-full sm:w-[calc(50%-12px)]'>
              <label className="block text-sm font-medium mb-1.5 text-gray-800">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="productName"
                value={formData.productName}
                onChange={(e) => { handleChange(e); setErrors(prev => ({ ...prev, productName: '' })); }}
                placeholder="Please Enter Product Name"
                className={`w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 transition-colors ${errors.productName ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'
                  }`}
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

            {/* Country */}
            <div className='w-full sm:w-[calc(50%-12px)]'>
              <label className="block text-sm font-medium mb-2 text-gray-800">
                Country <span className="text-[#FF0000]">*</span>
              </label>
              <div className='w-full'>
                <SelectField
                  name="country"
                  value={formData.country}
                  onChange={(v) => {
                    const country = typeof v === 'string' ? v : v[0] ?? '';
                    setFormData(prev => ({
                      ...prev,
                      country,
                      state: '',
                      city: ''
                    }));
                    setErrors(prev => ({
                      ...prev,
                      country: '',
                      state: '',
                      city: ''
                    }));
                  }}
                  options={countryOptions.map(c => ({ value: String(c.id), label: c.name }))}
                  placeholder={countryLoading ? 'Loading countries...' : 'Search or select country'}
                  inputClassName={errors.country ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'}
                  disabled={countryLoading}
                />
              </div>
              {errors.country && (
                <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.country}
                </div>
              )}
            </div>

            {/* State */}
            <div className='w-full sm:w-[calc(50%-12px)]'>
              <label className="block text-sm font-medium mb-2 text-gray-800">
                State <span className="text-[#FF0000]">*</span>
              </label>
              <div className='w-full'>
                <SelectField
                  name="state"
                  value={formData.state}
                  onChange={(v) => {
                    const state = typeof v === 'string' ? v : v[0] ?? '';
                    setFormData(prev => ({
                      ...prev,
                      state,
                      city: ''
                    }));
                    setErrors(prev => ({
                      ...prev,
                      state: '',
                      city: ''
                    }));
                  }}
                  options={stateOptions.map(s => ({ value: String(s.id), label: s.name }))}
                  placeholder={stateLoading ? 'Loading states...' : (formData.country ? 'Search or select state' : 'Select a country first')}
                  inputClassName={errors.state ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'}
                  disabled={stateLoading || !formData.country}
                />
              </div>
              {errors.state && (
                <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.state}
                </div>
              )}
            </div>

            {/* City */}
            <div className='w-full sm:w-[calc(50%-12px)]'>
              <label className="block text-sm font-medium mb-2 text-gray-800">
                City <span className="text-[#FF0000]">*</span>
              </label>
              <div className='w-full'>
                <SelectField
                  name="city"
                  value={formData.city}
                  onChange={(v) => { setFormData(prev => ({ ...prev, city: typeof v === 'string' ? v : v[0] ?? '' })); setErrors(prev => ({ ...prev, city: '' })); }}
                  options={cityOptions.map(c => ({ value: String(c.id), label: c.name }))}
                  placeholder={cityLoading ? 'Loading cities...' : (formData.state ? 'Search or select city' : 'Select a state first')}
                  inputClassName={errors.city ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'}
                  disabled={cityLoading || !formData.state}
                />
              </div>
              {errors.city && (
                <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.city}
                </div>
              )}
            </div>

            {/* Media Type */}
            <div className='w-full sm:w-[calc(50%-12px)]'>
              <label className="block text-sm font-medium mb-2 text-gray-800">
                Media Type <span className="text-[#FF0000]">*</span>
              </label>
              <div>
                <SelectField
                  name="mediaType"
                  value={formData.mediaType}
                  onChange={(v) => { setFormData(prev => ({ ...prev, mediaType: typeof v === 'string' ? v : v[0] ?? '' })); setErrors(prev => ({ ...prev, mediaType: '' })); }}
                  options={mediaTypeOptions.map(m => ({ value: String(m.id), label: m.name }))}
                  placeholder={mediaTypeLoading ? 'Loading media types...' : 'Search or select media type'}
                  inputClassName={errors.mediaType ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'}
                  disabled={mediaTypeLoading}
                />
              </div>
              {errors.mediaType && (
                <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.mediaType}
                </div>
              )}
            </div>

            {/* Image Upload & Preview */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {(formData.image_url && !formData.remove_image) || imagePreview ? 'Uploaded Image' : 'Upload Image'}
              </label>

              <div>
                {/* Uploaded image card (existing image_url preview) */}
                {formData.image_url && !formData.remove_image && !imagePreview && (
                  <div className="flex flex-col items-start mb-4">
                    <div className="border border-gray-200 rounded-xl p-6 shadow-md bg-white flex flex-col items-center w-full max-w-md">
                      <div className="flex items-center justify-center w-full mb-4" style={{ height: 200 }}>
                        <img
                          src={formData.image_url}
                          alt="Preview"
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', cursor: 'pointer' }}
                          onClick={() => openImageModal(formData.image_url)}
                          title="Click to view full image"
                        />
                      </div>
                      <div className="w-full border-t border-gray-100 pt-4">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 font-medium mb-1">File Name</p>
                            <p className="text-sm text-gray-900 font-semibold truncate">{formData.image?.name || initialData?.image_path?.split('/').pop() || 'image.jpg'}</p>
                          </div>
                          <div
                            className="flex-shrink-0 cursor-pointer"
                            title="Delete"
                            onClick={() => setFormData(prev => ({ ...prev, image_url: '', remove_image: true, image: null }))}
                          >
                            <Trash2 className="w-5 h-5 text-red-600" />
                          </div>
                        </div>
                        {initialData?.image_path && (
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-1">Path</p>
                            <p className="text-xs text-gray-600 break-all bg-gray-50 p-2 rounded border border-gray-100">{initialData.image_path}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Newly uploaded image preview */}
                {imagePreview && (
                  <div className="flex flex-col items-start mb-4">
                    <div className="border border-gray-200 rounded-xl p-6 shadow-md bg-white flex flex-col items-center w-full max-w-md">
                      <div className="flex items-center justify-center w-full mb-4" style={{ height: 200 }}>
                        <img
                          src={imagePreview}
                          alt="Preview"
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', cursor: 'pointer' }}
                          onClick={() => openImageModal(imagePreview)}
                          title="Click to view full image"
                        />
                      </div>
                      <div className="w-full border-t border-gray-100 pt-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 font-medium mb-1">File Name</p>
                            <p className="text-sm text-gray-900 font-semibold truncate">{formData.image?.name || 'image.jpg'}</p>
                          </div>
                          <div
                            className="flex-shrink-0 cursor-pointer"
                            title="Delete"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, image: null }));
                              setImagePreview('');
                            }}
                          >
                            <Trash2 className="w-5 h-5 text-red-600" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload UI if no preview */}
                {!imagePreview && (!formData.image_url || formData.remove_image) && (
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={saving}
                      className="hidden"
                    />
                    <label
                      htmlFor="image-upload"
                      className={`cursor-pointer flex flex-col items-center ${saving ? 'pointer-events-none opacity-60' : ''}`}
                    >
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">
                        Supported format: JPEG, PNG, SVG
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className={`px-6 py-2 btn-primary text-white rounded-lg transition-colors ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={saving}
            >
              {saving ? (mode === 'edit' ? 'Updating...' : 'Saving...') : (mode === 'edit' ? 'Update' : 'Save')}
            </button>
          </div>
        </form>
      </div>

      <ModalPopup
        show={quickModal === 'brand'}
        onClose={quickBrandSaving ? () => { } : closeQuickBrandModal}
        title="Create Brand"
      >
        <form onSubmit={handleQuickBrandSubmit} className="flex flex-col gap-3">
          <div>
            <label htmlFor="miss-quick-brand-name" className="mb-1 block text-sm font-medium text-gray-800">
              Brand name <span className="text-red-500">*</span>
            </label>
            <Input
              name="miss-quick-brand-name"
              type="text"
              value={quickBrandName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setQuickBrandName(e.target.value);
                if (quickBrandError) setQuickBrandError(null);
              }}
              placeholder="Enter brand name"
              autoComplete="off"
              error={quickBrandError || undefined}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={closeQuickBrandModal} disabled={quickBrandSaving}>
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={quickBrandSaving}
            >
              {quickBrandSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Create
                </>
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>
      </ModalPopup>

      <ModalPopup
        show={quickModal === 'source'}
        onClose={quickSourceSaving ? () => { } : closeQuickSourceModal}
        title="Create Source"
      >
        <form onSubmit={handleQuickSourceSubmit} className="flex flex-col gap-3">
          <div>
            <label htmlFor="miss-quick-source-name" className="mb-1 block text-sm font-medium text-gray-800">
              Source name <span className="text-red-500">*</span>
            </label>
            <Input
              name="miss-quick-source-name"
              type="text"
              value={quickSourceName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setQuickSourceName(e.target.value);
                if (quickSourceError) setQuickSourceError(null);
              }}
              placeholder="Enter source name"
              autoComplete="off"
              error={quickSourceError || undefined}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={closeQuickSourceModal} disabled={quickSourceSaving}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={quickSourceSaving}
            >
              {quickSourceSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Create
                </>
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>
      </ModalPopup>

      <ModalPopup
        show={quickModal === 'subSource'}
        onClose={quickSubSourceSaving ? () => { } : closeQuickSubSourceModal}
        title="Create Sub Source"
      >
        <form onSubmit={handleQuickSubSourceSubmit} className="flex flex-col gap-3">
          <div>
            <label htmlFor="miss-quick-subsource-name" className="mb-1 block text-sm font-medium text-gray-800">
              Sub source name <span className="text-red-500">*</span>
            </label>
            <Input
              name="miss-quick-subsource-name"
              type="text"
              value={quickSubSourceName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setQuickSubSourceName(e.target.value);
                if (quickSubSourceError) setQuickSubSourceError(null);
              }}
              placeholder="Enter sub source name"
              autoComplete="off"
              error={quickSubSourceError || undefined}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={closeQuickSubSourceModal} disabled={quickSubSourceSaving}>
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={quickSubSourceSaving}
            >
              {quickSubSourceSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Create
                </>
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>
      </ModalPopup>

      {/* Image modal (soft alert) */}
      {imageModalOpen && modalImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={closeImageModal}
        >
          <div
            className="relative bg-white rounded-lg shadow-lg p-4 max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={modalImageUrl}
              alt="Full preview"
              className="max-w-[84vw] max-h-[84vh] object-contain"
            />
            <div
              role="button"
              tabIndex={0}
              aria-label="Close"
              onClick={closeImageModal}
              onKeyDown={(e) => { if (e.key === 'Enter') closeImageModal(); }}
              className="absolute top-3 right-3 bg-white rounded-full p-1 border z-50 cursor-pointer flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Create;