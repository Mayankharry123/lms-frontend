import React, { useState, useEffect, useRef } from 'react';
import { getDesignations, getZones, getCities, getStates, getCountries } from '../../../services/CreateLead';
import { quickCreateApi } from '../../../services/QuickCreate';
import { fetchLeadSubSources } from '../../../services/ContactPersonsCard';
import { Trash2, X as XIcon, Plus, UserRound } from 'lucide-react';
import SelectField from '../../ui/SelectField';
import ModalPopup from '../../ui/ModalPopup';
import CollapsibleFormCard from '../../ui/CollapsibleFormCard';
import { Button } from '../../ui';
import type { Contact, ContactPersonsCardProps } from '../../../types/LeadManagentForm';
import SweetAlert from '../../../utils/SweetAlert';

type QuickCreateKind = 'type' | 'department' | 'subSource';
type OptionItem = { value: string; label: string };

const QUICK_CREATE_LABELS: Record<
  QuickCreateKind,
  { title: string; fieldLabel: string; placeholder: string; cta: string }
> = {
  type: {
    title: 'Create Type',
    fieldLabel: 'Type name',
    placeholder: 'Enter type name',
    cta: 'Create Type',
  },
  department: {
    title: 'Create Department',
    fieldLabel: 'Department name',
    placeholder: 'Enter department name',
    cta: 'Create Department',
  },
  subSource: {
    title: 'Create Sub Source',
    fieldLabel: 'Sub-source name',
    placeholder: 'Enter sub-source name',
    cta: 'Create Sub Source',
  },
};

const emptyContact = (id = '1'): Contact => ({
  id,
  fullName: '',
  profileUrl: '',
  email: '',
  mobileNo: '',
  mobileNo2: '',
  showSecondMobile: false,
  type: '',
  designation: '',
  agencyBrand: '',
  subSource: '',
  department: '',
  country: '',
  state: '',
  city: '',
  zone: '',
  postalCode: '',
});

function pruneRecordByActiveIds<T>(prev: Record<string, T>, activeIds: Set<string>): Record<string, T> {
  const next: Record<string, T> = {};
  Object.keys(prev).forEach((id) => {
    if (activeIds.has(id)) next[id] = prev[id];
  });
  const pk = Object.keys(prev);
  const nk = Object.keys(next);
  if (pk.length === nk.length && nk.every((k) => prev[k] === next[k])) return prev;
  return next;
}

const ContactPersonsCard: React.FC<ContactPersonsCardProps> = ({
  initialContacts,
  onChange
  , errors,
  collapsible = false,
}) => {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts || [emptyContact('1')]);

  const [quickModalKind, setQuickModalKind] = useState<QuickCreateKind | null>(null);
  const quickModalContactIdRef = useRef<string | null>(null);
  const quickCreateSubmitLockRef = useRef(false);
  const [quickName, setQuickName] = useState('');
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [leadTypeOptions, setLeadTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [leadTypeLoading, setLeadTypeLoading] = useState(false);
  const [leadTypeError, setLeadTypeError] = useState<string | null>(null);

  const openQuickCreate = (kind: QuickCreateKind, contactId: string) => {
    setQuickModalKind(kind);
    quickModalContactIdRef.current = contactId;
    setQuickName('');
    setQuickError(null);
  };

  const closeQuickCreate = () => {
    setQuickModalKind(null);
    quickModalContactIdRef.current = null;
    setQuickName('');
    setQuickError(null);
  };

  const handleQuickCreateSubmit = async () => {
    const name = quickName.trim();
    if (!name) {
      setQuickError('Please enter a name.');
      return;
    }
    setQuickError(null);

    if (!quickModalKind) return;
    if (quickSubmitting || quickCreateSubmitLockRef.current) return;
    quickCreateSubmitLockRef.current = true;

    try {
      setQuickSubmitting(true);
      const contactId = quickModalContactIdRef.current;

      if (quickModalKind === 'department') {
        const createdDepartment = await quickCreateApi.createDepartment(name);
        const createdValue = String(createdDepartment?.id ?? '');

        if (!createdValue) {
          setQuickError('Department created but id was not returned.');
          return;
        }

        const createdOption = {
          value: createdValue,
          label: String(createdDepartment?.name || name),
        };

        setDepartmentOptions((prev) => {
          const hasExisting = prev.some((opt) => opt.value === createdOption.value);
          if (hasExisting) return prev;
          return [...prev, createdOption].sort((a, b) => a.label.localeCompare(b.label));
        });

        if (contactId) {
          updateContact(contactId, 'department', createdValue);
        }
      } else if (quickModalKind === 'type') {
        const createdType = await quickCreateApi.createLeadType(name);
        const createdTypeValue = String(createdType?.id ?? '');
        const createdTypeName = String(createdType?.name || name).trim();

        if (!createdTypeValue || !createdTypeName) {
          setQuickError('Type created but required data was not returned.');
          return;
        }

        setLeadTypeOptions((prev) => {
          const hasExisting = prev.some(
            (opt) =>
              opt.value === createdTypeValue ||
              opt.label.toLowerCase() === createdTypeName.toLowerCase()
          );
          if (hasExisting) return prev;
          return [...prev, { value: createdTypeValue, label: createdTypeName }];
        });

        if (contactId) {
          updateContact(contactId, 'type', createdTypeValue);
        }
      } else if (quickModalKind === 'subSource') {
        const createdSubSource = await quickCreateApi.createSubSourceStandalone(name);
        const createdSubSourceValue = String(createdSubSource?.id ?? '');
        const createdSubSourceName = String(createdSubSource?.name || name).trim();

        if (!createdSubSourceValue || !createdSubSourceName) {
          setQuickError('Sub source created but required data was not returned.');
          return;
        }

        setSubSourceOptions((prev) => {
          const hasExisting = prev.some(
            (opt) =>
              opt.value === createdSubSourceValue ||
              opt.label.toLowerCase() === createdSubSourceName.toLowerCase()
          );
          if (hasExisting) return prev;
          return [...prev, { value: createdSubSourceValue, label: createdSubSourceName }];
        });

        if (contactId) {
          updateContact(contactId, 'subSource', createdSubSourceValue);
        }
      } else {
        setQuickError('Create is not available for this field right now.');
        return;
      }

      SweetAlert.showCreateSuccess();
      closeQuickCreate();
    } catch (error: any) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Failed to create item.';
      setQuickError(String(apiMessage));
    } finally {
      quickCreateSubmitLockRef.current = false;
      setQuickSubmitting(false);
    }
  };

  // Designation dropdown state
  const [designationOptions, setDesignationOptions] = useState<{ value: string; label: string }[]>([]);
  const [designationLoading, setDesignationLoading] = useState(false);
  const [designationError, setDesignationError] = useState<string | null>(null);

  // Department dropdown state
  const [departmentOptions, setDepartmentOptions] = useState<{ value: string; label: string }[]>([]);
  const [departmentLoading, setDepartmentLoading] = useState(false);
  const [departmentError, setDepartmentError] = useState<string | null>(null);

  // Zone dropdown state
  const [zoneOptions, setZoneOptions] = useState<{ value: string; label: string }[]>([]);
  const [zoneLoading, setZoneLoading] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);

  // Sub-source dropdown state
  const [subSourceOptions, setSubSourceOptions] = useState<{ value: string; label: string }[]>([]);
  const [subSourceLoading, setSubSourceLoading] = useState(false);
  const [subSourceError, setSubSourceError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLeadTypeLoading(true);
    setLeadTypeError(null);
    quickCreateApi.listLeadTypes().then((data: any) => {
      if (!isMounted) return;
      try {
        const mapped = Array.isArray(data)
          ? data
            .filter((item: any) => item && item.id !== undefined && item.id !== null && item.name)
            .map((item: any) => ({ value: String(item.id), label: String(item.name) }))
          : [];

        setLeadTypeOptions(mapped);
      } catch (error: any) {
        setLeadTypeError(error?.message || 'Failed to load lead types');
      }
      setLeadTypeLoading(false);
    }).catch((error: any) => {
      if (isMounted) {
        setLeadTypeError(error?.message || 'Failed to load lead types');
        setLeadTypeLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setSubSourceLoading(true);
    setSubSourceError(null);
    fetchLeadSubSources().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        setSubSourceError(error);
        setSubSourceOptions([]);
      } else {
        setSubSourceOptions(
          Array.isArray(data)
            ? data.map((item: any) => ({ value: String(item.id), label: item.name }))
            : []
        );
      }
      setSubSourceLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setDesignationLoading(true);
    setDesignationError(null);
    getDesignations().then((data: any) => {
      if (!isMounted) return;
      try {
        setDesignationOptions(
          Array.isArray(data)
            ? data.map((item: any) => ({ value: String(item.id), label: item.name }))
            : []
        );
      } catch (error: any) {
        setDesignationError(error?.message || 'Failed to load designations');
        setDesignationOptions([]);
      }
      setDesignationLoading(false);
    }).catch((error: any) => {
      if (isMounted) {
        setDesignationError(error?.message || 'Failed to load designations');
        setDesignationOptions([]);
        setDesignationLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setDepartmentLoading(true);
    setDepartmentError(null);
    quickCreateApi.listDepartments().then((data: any) => {
      if (!isMounted) return;
      try {
        setDepartmentOptions(
          Array.isArray(data)
            ? data.map((item: any) => ({ value: String(item.id), label: item.name }))
            : []
        );
      } catch (error: any) {
        setDepartmentError(error?.message || 'Failed to load departments');
        setDepartmentOptions([]);
      }
      setDepartmentLoading(false);
    }).catch((error: any) => {
      if (isMounted) {
        setDepartmentError(error?.message || 'Failed to load departments');
        setDepartmentOptions([]);
        setDepartmentLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setZoneLoading(true);
    setZoneError(null);
    getZones().then((data: any) => {
      if (!isMounted) return;
      try {
        setZoneOptions(
          Array.isArray(data)
            ? data.map((item: any) => ({ value: String(item.id), label: item.name }))
            : []
        );
      } catch (error: any) {
        setZoneError(error?.message || 'Failed to load zones');
        setZoneOptions([]);
      }
      setZoneLoading(false);
    }).catch((error: any) => {
      if (isMounted) {
        setZoneError(error?.message || 'Failed to load zones');
        setZoneOptions([]);
        setZoneLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const updateContacts = (
    nextOrUpdater: Contact[] | ((prev: Contact[]) => Contact[])
  ) => {
    setContacts((prev) => {
      const next =
        typeof nextOrUpdater === 'function' ? nextOrUpdater(prev) : nextOrUpdater;
      onChange?.(next);
      return next;
    });
  };

  const removeContact = (id: string) => {
    updateContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const updateContact = (id: string, field: keyof Contact, value: string | boolean) => {
    updateContacts((prev) =>
      prev.map((c) => {
        const updated = { ...c, [field]: value };
        // Clear state when country changes
        if (field === 'country' && value !== c.country) {
          updated.state = '';
          updated.city = '';
        }
        // Clear city when state changes
        if (field === 'state' && value !== c.state) {
          updated.city = '';
        }
        return c.id === id ? updated : c;
      })
    );
  };

  // Country dropdown state
  const [countryOptions, setCountryOptions] = useState<{ value: string; label: string }[]>([]);
  const [countryLoading, setCountryLoading] = useState(false);
  const [countryError, setCountryError] = useState<string | null>(null);

  // Previously these were shared single states; now keyed by contact id to support multi-row form correctly.
  // const [stateOptions, setStateOptions] = useState<{ value: string; label: string }[]>([]);
  // const [stateLoading, setStateLoading] = useState(false);
  // const [stateError, setStateError] = useState<string | null>(null);
  // const [cityOptions, setCityOptions] = useState<{ value: string; label: string }[]>([]);
  // const [cityLoading, setCityLoading] = useState(false);
  // const [cityError, setCityError] = useState<string | null>(null);
  const [stateOptionsByContact, setStateOptionsByContact] = useState<Record<string, OptionItem[]>>({});
  const [stateLoadingByContact, setStateLoadingByContact] = useState<Record<string, boolean>>({});
  const [stateErrorByContact, setStateErrorByContact] = useState<Record<string, string | null>>({});
  const [cityOptionsByContact, setCityOptionsByContact] = useState<Record<string, OptionItem[]>>({});
  const [cityLoadingByContact, setCityLoadingByContact] = useState<Record<string, boolean>>({});
  const [cityErrorByContact, setCityErrorByContact] = useState<Record<string, string | null>>({});
  const stateRequestCounterRef = useRef<Record<string, number>>({});
  const cityRequestCounterRef = useRef<Record<string, number>>({});
  const countryFetchedForRef = useRef<Record<string, string>>({});
  const stateFetchedForRef = useRef<Record<string, string>>({});
  /** Ref (not state) avoids effect↔state feedback loops when recording PIN lookups. */
  const lastPinLookupByContactRef = useRef<Record<string, string>>({});
  useEffect(() => {
    let isMounted = true;
    setCountryLoading(true);
    setCountryError(null);
    getCountries().then((data: any) => {
      if (!isMounted) return;
      try {
        setCountryOptions(
          Array.isArray(data)
            ? data.map((item: any) => ({ value: String(item.id), label: item.name }))
            : []
        );
      } catch (error: any) {
        setCountryError(error?.message || 'Failed to load countries');
        setCountryOptions([]);
      }
      setCountryLoading(false);
    }).catch((error: any) => {
      if (isMounted) {
        setCountryError(error?.message || 'Failed to load countries');
        setCountryOptions([]);
        setCountryLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  // Fetch states per contact when that contact's country changes
  useEffect(() => {
    const activeIds = new Set(contacts.map((c) => c.id));

    setStateOptionsByContact((prev) => pruneRecordByActiveIds(prev, activeIds));
    setStateLoadingByContact((prev) => pruneRecordByActiveIds(prev, activeIds));
    setStateErrorByContact((prev) => pruneRecordByActiveIds(prev, activeIds));

    contacts.forEach((contact) => {
      const id = contact.id;
      const countryId = String(contact.country || '').trim();

      if (!countryId) {
        countryFetchedForRef.current[id] = '';
        setStateOptionsByContact((prev) => ({ ...prev, [id]: [] }));
        setStateErrorByContact((prev) => ({ ...prev, [id]: null }));
        setStateLoadingByContact((prev) => ({ ...prev, [id]: false }));
        return;
      }

      if (countryFetchedForRef.current[id] === countryId) return;
      countryFetchedForRef.current[id] = countryId;

      const requestId = (stateRequestCounterRef.current[id] || 0) + 1;
      stateRequestCounterRef.current[id] = requestId;
      setStateLoadingByContact((prev) => ({ ...prev, [id]: true }));
      setStateErrorByContact((prev) => ({ ...prev, [id]: null }));

      getStates({ country_id: countryId }).then((data: any) => {
        if (stateRequestCounterRef.current[id] !== requestId) return;
        try {
          const mapped = Array.isArray(data)
            ? data.map((item: any) => ({ value: String(item.id), label: item.name }))
            : [];
          setStateOptionsByContact((prev) => ({ ...prev, [id]: mapped }));
          setStateErrorByContact((prev) => ({ ...prev, [id]: null }));
        } catch (error: any) {
          setStateErrorByContact((prev) => ({ ...prev, [id]: error?.message || 'Failed to load states' }));
          setStateOptionsByContact((prev) => ({ ...prev, [id]: [] }));
        }
        setStateLoadingByContact((prev) => ({ ...prev, [id]: false }));
      }).catch((error: any) => {
        if (stateRequestCounterRef.current[id] !== requestId) return;
        setStateErrorByContact((prev) => ({ ...prev, [id]: error?.message || 'Failed to load states' }));
        setStateOptionsByContact((prev) => ({ ...prev, [id]: [] }));
        setStateLoadingByContact((prev) => ({ ...prev, [id]: false }));
      });
    });
  }, [contacts]);

  // Helper: lookup PIN code using api.postalpincode.in
  const lookupPinCode = async (pin: string): Promise<{ countryName: string; stateName: string; cityName: string } | null> => {
    try {
      const resp = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      if (!resp.ok) return null;
      const json = await resp.json();
      if (!Array.isArray(json) || json.length === 0) return null;
      const first = json[0];
      if (first.Status !== 'Success' || !Array.isArray(first.PostOffice) || first.PostOffice.length === 0) return null;
      const po = first.PostOffice[0];
      return {
        countryName: po.Country || '',
        stateName: po.State || '',
        cityName: po.District || po.Block || po.Name || '',
      };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const activeIds = new Set(contacts.map((c) => c.id));
    Object.keys(lastPinLookupByContactRef.current).forEach((id) => {
      if (!activeIds.has(id)) delete lastPinLookupByContactRef.current[id];
    });

    contacts.forEach((contact) => {
      if (!contact.postalCode) return;
      const pin = contact.postalCode.trim();
      if (!/^\d{6}$/.test(pin)) return;
      if (pin === (lastPinLookupByContactRef.current[contact.id] || '')) return;

      (async () => {
        try {
          const pinRes = await lookupPinCode(pin);
          if (!pinRes) return;

          const { countryName, stateName, cityName } = pinRes;
          const countryOpt = countryOptions.find(
            (o) => o.label.toLowerCase() === countryName.toLowerCase()
          );
          if (!countryOpt) return;

          let resolvedStateId = '';
          const statesData = await getStates({ country_id: countryOpt.value });
          if (Array.isArray(statesData)) {
            const matchedState = statesData.find(
              (s: any) => String(s.name).toLowerCase() === String(stateName).toLowerCase()
            );
            if (matchedState) resolvedStateId = String(matchedState.id);
          }

          let resolvedCityId = '';
          if (resolvedStateId) {
            const citiesData = await getCities({ state_id: resolvedStateId });
            if (Array.isArray(citiesData)) {
              const target = String(cityName || '').toLowerCase();
              const matchedCity = citiesData.find((ct: any) => {
                const nm = String(ct.name || '').toLowerCase();
                const districtField = String(ct.district || ct.District || '').toLowerCase();
                const cityField = String(ct.city || '').toLowerCase();
                return nm === target || districtField === target || cityField === target;
              });
              if (matchedCity) resolvedCityId = String(matchedCity.id);
            }
          }

          let applied = false;
          updateContacts((prev) => {
            let changed = false;
            const next = prev.map((c) => {
              if (c.id !== contact.id) return c;
              const updated = { ...c };
              if (countryOpt.value && updated.country !== countryOpt.value) {
                updated.country = countryOpt.value;
                changed = true;
              }
              if (resolvedStateId && updated.state !== resolvedStateId) {
                updated.state = resolvedStateId;
                changed = true;
              }
              if (resolvedCityId && updated.city !== resolvedCityId) {
                updated.city = resolvedCityId;
                changed = true;
              }
              return updated;
            });
            if (changed) applied = true;
            return changed ? next : prev;
          });
          if (applied) {
            lastPinLookupByContactRef.current[contact.id] = pin;
          }
        } catch {
          // ignore errors
        }
      })();
    });
  }, [contacts, countryOptions]);

  // Fetch cities per contact when that contact's state changes
  useEffect(() => {
    const activeIds = new Set(contacts.map((c) => c.id));

    setCityOptionsByContact((prev) => pruneRecordByActiveIds(prev, activeIds));
    setCityLoadingByContact((prev) => pruneRecordByActiveIds(prev, activeIds));
    setCityErrorByContact((prev) => pruneRecordByActiveIds(prev, activeIds));

    contacts.forEach((contact) => {
      const id = contact.id;
      const stateId = String(contact.state || '').trim();

      if (!stateId) {
        stateFetchedForRef.current[id] = '';
        setCityOptionsByContact((prev) => ({ ...prev, [id]: [] }));
        setCityErrorByContact((prev) => ({ ...prev, [id]: null }));
        setCityLoadingByContact((prev) => ({ ...prev, [id]: false }));
        return;
      }

      if (stateFetchedForRef.current[id] === stateId) return;
      stateFetchedForRef.current[id] = stateId;

      const requestId = (cityRequestCounterRef.current[id] || 0) + 1;
      cityRequestCounterRef.current[id] = requestId;
      setCityLoadingByContact((prev) => ({ ...prev, [id]: true }));
      setCityErrorByContact((prev) => ({ ...prev, [id]: null }));

      getCities({ state_id: stateId }).then((data: any) => {
        if (cityRequestCounterRef.current[id] !== requestId) return;
        try {
          const mapped = Array.isArray(data)
            ? data.map((item: any) => ({ value: String(item.id), label: item.name }))
            : [];
          setCityOptionsByContact((prev) => ({ ...prev, [id]: mapped }));
          setCityErrorByContact((prev) => ({ ...prev, [id]: null }));
        } catch (error: any) {
          setCityErrorByContact((prev) => ({ ...prev, [id]: error?.message || 'Failed to load cities' }));
          setCityOptionsByContact((prev) => ({ ...prev, [id]: [] }));
        }
        setCityLoadingByContact((prev) => ({ ...prev, [id]: false }));
      }).catch((error: any) => {
        if (cityRequestCounterRef.current[id] !== requestId) return;
        setCityErrorByContact((prev) => ({ ...prev, [id]: error?.message || 'Failed to load cities' }));
        setCityOptionsByContact((prev) => ({ ...prev, [id]: [] }));
        setCityLoadingByContact((prev) => ({ ...prev, [id]: false }));
      });
    });
  }, [contacts]);

  return (
    <>
      <div className={collapsible ? 'space-y-3 sm:space-y-4' : 'space-y-6 mb-6'}>
        {contacts.map((c) => (
          <CollapsibleFormCard
            key={c.id}
            title="Contact Person"
            collapsible={collapsible}
            defaultOpen={!collapsible}
            innerClassName="px-4 py-5 p-5 bg-gray-50"
            icon={<UserRound className="h-5 w-5" strokeWidth={2} />}
            headerRight={
              contacts.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeContact(c.id)}
                  className="text-sm px-4 py-2 rounded-lg bg-[#F5F0F0] text-[#D92D20] font-medium flex items-center justify-center hover:bg-[#FFD7D7] transition-colors duration-200"
                  style={{ backgroundColor: '#F5F0F0' }}
                >
                  <Trash2 strokeWidth={2.5} className="w-4 h-4 mr-1" /> Delete
                </button>
              ) : undefined
            }
          >
              <div className="space-y-4">
                {/* Row 1: Full Name, Profile URL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-800 mb-1">Full Name <span className="text-[#FF0000]">*</span></label>
                    <input
                      type="text"
                      placeholder="Enter full name"
                      value={c.fullName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateContact(c.id, 'fullName', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white text-gray-800 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    />
                    {errors?.[c.id]?.fullName && (
                      <div className="text-xs text-red-500 mt-1">{errors[c.id].fullName}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-800 mb-1">Profile URL</label>
                    <input
                      type="text"
                      placeholder="Enter profile URL"
                      value={c.profileUrl}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateContact(c.id, 'profileUrl', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white text-gray-800 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Row 2: Email, Mobile No. */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-800 mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="Enter email address"
                      value={c.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateContact(c.id, 'email', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white text-gray-800 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-sm text-gray-800 mb-1">Mobile No. <span className="text-[#FF0000]">*</span></label>
                          <input
                            type="tel"
                            placeholder="Enter mobile number"
                            value={c.mobileNo}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateContact(c.id, 'mobileNo', e.target.value)}
                            maxLength={10}
                            className="w-full px-3 py-2 rounded-lg bg-white text-gray-800 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                          />
                          {errors?.[c.id]?.mobileNo && (
                            <div className="text-xs text-red-500 mt-1">{errors[c.id].mobileNo}</div>
                          )}
                        </div>
                        {!c.showSecondMobile && (
                          <button
                            type="button"
                            onClick={() => updateContact(c.id, 'showSecondMobile', true)}
                            className="px-3 py-2 flex items-center justify-center rounded-lg !text-white font-medium transition-colors mt-6 !bg-orange-500 hover:!bg-orange-600 text-sm gap-1 cursor-pointer"
                            title="Add another mobile number"
                          >
                            <Plus strokeWidth={2.5} className="w-4 h-4" />

                          </button>
                        )}
                      </div>
                      {c.showSecondMobile && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <input
                              type="tel"
                              placeholder="Enter second mobile number"
                              value={c.mobileNo2}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateContact(c.id, 'mobileNo2', e.target.value)}
                              maxLength={10}
                              className="w-full px-3 py-2 rounded-lg bg-white text-gray-800 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            />
                            {errors?.[c.id]?.mobileNo2 && (
                              <div className="text-xs text-red-500 mt-1">{errors[c.id].mobileNo2}</div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              updateContacts((prev) =>
                                prev.map((contact) =>
                                  contact.id === c.id
                                    ? {
                                      ...contact,
                                      showSecondMobile: false,
                                      mobileNo2: '',
                                    }
                                    : contact
                                )
                              );
                            }}
                            className="px-3 py-2 flex items-center justify-center rounded-lg text-white font-medium transition-colors duration-200 hover:bg-red-700 text-sm gap-1"
                            style={{ backgroundColor: '#D92D20' }}
                          >
                            <XIcon strokeWidth={2.5} className="w-4 h-4" />

                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 3: Type, Designation, Department */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm text-gray-800">Type <span className="text-[#FF0000]">*</span></label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="!text-sm !py-0 !px-0 underline !outline-none whitespace-nowrap hover:!text-orange-500 "
                        onClick={() => openQuickCreate('type', c.id)}
                      >
                        Create Type
                      </Button>
                    </div>

                    <SelectField
                      name="type"
                      placeholder={leadTypeLoading ? 'Loading...' : 'Select type'}
                      options={leadTypeOptions}
                      value={c.type}
                      onChange={(v) => updateContact(c.id, 'type', typeof v === 'string' ? v : v[0] ?? '')}
                      inputClassName="border border-gray-200 focus:ring-blue-500"
                      disabled={leadTypeLoading}
                    />

                    {errors?.[c.id]?.type && <div className="text-xs text-red-500 mt-1">{errors[c.id].type}</div>}
                    {leadTypeLoading && <div className="text-xs text-gray-400 mt-1">Loading...</div>}
                    {leadTypeError && <div className="text-xs text-red-500 mt-1">{leadTypeError}</div>}
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-800 mb-1">Designation <span className="text-[#FF0000]">*</span></label>
                    <SelectField
                      name="designation"
                      placeholder="Select designation"
                      options={designationOptions}
                      value={c.designation}
                      onChange={(v) => updateContact(c.id, 'designation', typeof v === 'string' ? v : v[0] ?? '')}
                      inputClassName="border border-gray-200 focus:ring-blue-500"
                      disabled={designationLoading}
                    />
                    {errors?.[c.id]?.designation && <div className="text-xs text-red-500 mt-1">{errors[c.id].designation}</div>}
                    {designationLoading && <div className="text-xs text-gray-400 mt-1">Loading...</div>}
                    {designationError && <div className="text-xs text-red-500 mt-1">{designationError}</div>}
                    {!designationLoading && !designationError && designationOptions.length === 0 && (
                      <div className="text-xs text-gray-400 mt-1">No designations found.</div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm text-gray-800">Department <span className="text-[#FF0000]">*</span></label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="!text-sm !py-0 !px-0 underline !outline-none whitespace-nowrap hover:!text-orange-500 "
                        onClick={() => openQuickCreate('department', c.id)}
                      >
                        Create Department
                      </Button>
                    </div>

                    <SelectField
                      name="department"
                      placeholder="Select department"
                      options={departmentOptions}
                      value={c.department}
                      onChange={(v) => updateContact(c.id, 'department', typeof v === 'string' ? v : v[0] ?? '')}
                      inputClassName="border border-gray-200 focus:ring-blue-500"
                      disabled={departmentLoading}
                    />

                    {errors?.[c.id]?.department && <div className="text-xs text-red-500 mt-1">{errors[c.id].department}</div>}
                    {departmentLoading && <div className="text-xs text-gray-400 mt-1">Loading...</div>}
                    {departmentError && <div className="text-xs text-red-500 mt-1">{departmentError}</div>}
                    {!departmentLoading && !departmentError && departmentOptions.length === 0 && (
                      <div className="text-xs text-gray-400 mt-1">No departments found.</div>
                    )}
                  </div>
                </div>

                {/* Row 4: Country, State, City */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-800 mb-1">Country <span className="text-[#FF0000]">*</span></label>
                    <SelectField
                      name="country"
                      placeholder="Select country"
                      options={countryOptions}
                      value={c.country}
                      onChange={(v) => updateContact(c.id, 'country', typeof v === 'string' ? v : v[0] ?? '')}
                      inputClassName="border border-gray-200 focus:ring-blue-500"
                      disabled={countryLoading}
                    />
                    {errors?.[c.id]?.country && <div className="text-xs text-red-500 mt-1">{errors[c.id].country}</div>}
                    {countryLoading && <div className="text-xs text-gray-400 mt-1">Loading...</div>}
                    {countryError && <div className="text-xs text-red-500 mt-1">{countryError}</div>}
                    {!countryLoading && !countryError && countryOptions.length === 0 && (
                      <div className="text-xs text-gray-400 mt-1">No countries found.</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-800 mb-1">State</label>
                    <SelectField
                      name="state"
                      placeholder="Select state"
                      options={stateOptionsByContact[c.id] || []}
                      value={c.state}
                      onChange={(v) => updateContact(c.id, 'state', typeof v === 'string' ? v : v[0] ?? '')}
                      inputClassName="border border-gray-200 focus:ring-blue-500"
                      disabled={!!stateLoadingByContact[c.id]}
                    />
                    {!!stateLoadingByContact[c.id] && <div className="text-xs text-gray-400 mt-1">Loading...</div>}
                    {!!stateErrorByContact[c.id] && <div className="text-xs text-red-500 mt-1">{stateErrorByContact[c.id]}</div>}
                    {!stateLoadingByContact[c.id] && !stateErrorByContact[c.id] && (stateOptionsByContact[c.id] || []).length === 0 && (
                      <div className="text-xs text-gray-400 mt-1">No states found.</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-800 mb-1">City</label>
                    <SelectField
                      name="city"
                      placeholder="Select city"
                      options={cityOptionsByContact[c.id] || []}
                      value={c.city}
                      onChange={(v) => updateContact(c.id, 'city', typeof v === 'string' ? v : v[0] ?? '')}
                      inputClassName="border border-gray-200 focus:ring-blue-500"
                      disabled={!!cityLoadingByContact[c.id]}
                    />
                    {!!cityLoadingByContact[c.id] && <div className="text-xs text-gray-400 mt-1">Loading...</div>}
                    {!!cityErrorByContact[c.id] && <div className="text-xs text-red-500 mt-1">{cityErrorByContact[c.id]}</div>}
                    {!cityLoadingByContact[c.id] && !cityErrorByContact[c.id] && (cityOptionsByContact[c.id] || []).length === 0 && (
                      <div className="text-xs text-gray-400 mt-1">No cities found.</div>
                    )}
                  </div>
                </div>

                {/* Row 5: Zone, Sub-Source, Postal Code */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-800 mb-1">Zone</label>
                    <SelectField
                      name="zone"
                      placeholder="Select zone"
                      options={zoneOptions}
                      value={c.zone}
                      onChange={(v) => updateContact(c.id, 'zone', typeof v === 'string' ? v : v[0] ?? '')}
                      inputClassName="border border-gray-200 focus:ring-blue-500"
                      disabled={zoneLoading}
                    />
                    {zoneLoading && <div className="text-xs text-gray-400 mt-1">Loading...</div>}
                    {zoneError && <div className="text-xs text-red-500 mt-1">{zoneError}</div>}
                    {!zoneLoading && !zoneError && zoneOptions.length === 0 && (
                      <div className="text-xs text-gray-400 mt-1">No zones found.</div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm text-gray-800">Sub-Source <span className="text-[#FF0000]">*</span></label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="!text-sm !py-0 !px-0 underline !outline-none whitespace-nowrap hover:!text-orange-500 "
                        onClick={() => openQuickCreate('subSource', c.id)}
                      >
                        Create Sub Source
                      </Button>
                    </div>

                    <SelectField
                      name="subSource"
                      placeholder={subSourceLoading ? "Loading..." : "Select sub-source"}
                      options={subSourceOptions}
                      value={c.subSource}
                      onChange={(v) => {
                        if (typeof v === 'string') {
                          updateContact(c.id, 'subSource', v);
                        } else if (Array.isArray(v) && v.length > 0) {
                          updateContact(c.id, 'subSource', v[0]);
                        } else {
                          updateContact(c.id, 'subSource', '');
                        }
                      }}
                      inputClassName="border border-gray-200 focus:ring-blue-500"
                      disabled={subSourceLoading}
                    />

                    {errors?.[c.id]?.subSource && <div className="text-xs text-red-500 mt-1">{errors[c.id].subSource}</div>}
                    {subSourceLoading && <div className="text-xs text-gray-400 mt-1">Loading...</div>}
                    {subSourceError && <div className="text-xs text-red-500 mt-1">{subSourceError}</div>}
                    {!subSourceLoading && !subSourceError && subSourceOptions.length === 0 && (
                      <div className="text-xs text-gray-400 mt-1">No sub-sources found.</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-800 mb-1">Postal Code</label>
                    <input
                      type="text"
                      placeholder="Enter postal code"
                      value={c.postalCode}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateContact(c.id, 'postalCode', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white text-gray-800 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
          </CollapsibleFormCard>
        ))}
      </div>

      <ModalPopup
        show={quickModalKind !== null}
        onClose={closeQuickCreate}
        title={quickModalKind ? QUICK_CREATE_LABELS[quickModalKind].title : ''}
      >
        {quickModalKind ? (
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="quick-create-name" className="mb-1 block text-sm font-medium text-gray-800">
                {QUICK_CREATE_LABELS[quickModalKind].fieldLabel}
              </label>
              <input
                id="quick-create-name"
                type="text"
                value={quickName}
                onChange={(e) => {
                  setQuickName(e.target.value);
                  if (quickError) setQuickError(null);
                }}
                placeholder={QUICK_CREATE_LABELS[quickModalKind].placeholder}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-200 focus:ring-1 focus:ring-gray-200"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleQuickCreateSubmit();
                  }
                }}
              />
              {quickError ? <p className="mt-1.5 text-xs text-red-600">{quickError}</p> : null}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
              <button type="button" className="btn-secondary" onClick={closeQuickCreate} disabled={quickSubmitting}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleQuickCreateSubmit} disabled={quickSubmitting}>
                {quickSubmitting ? 'Creating...' : QUICK_CREATE_LABELS[quickModalKind].cta}
              </button>
            </div>
          </div>
        ) : null}
      </ModalPopup>
    </>
  );
};

export default ContactPersonsCard;
