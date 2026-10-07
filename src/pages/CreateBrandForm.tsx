/**
 * @file CreateBrandForm.tsx
 * @description Form to create or update a brand master record.
 * @author Sanjay Jangid <sanjay.jangid@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { MasterFormHeader, SelectField, MultiSelectDropdown } from '../components/ui';
import { listZones, listStates, listCountries, listBrandTypes, listCities } from '../services/CreateBrandForm';
import type { Zone, State, Country, BrandType } from '../services/CreateBrandForm';
import { listAgencies } from '../services/AgencyMaster';
import type { Agency } from '../services/AgencyMaster';
import { fetchIndustries } from '../services/CreateIndustryForm';
import type { Industry } from '../services/CreateIndustryForm';
// Notifications replaced by centralized SweetAlert helper
import { apiClient } from '../utils/apiClient';
import { updateBrand } from '../services/BrandMaster';
import SweetAlert from '../utils/SweetAlert';
import type { CitySelectProps, MasterInlineFormProps } from '../types/pages/forms.types';

const CitySelect: React.FC<CitySelectProps> = ({ state, value, onChange, preselectedCityName }) => {
  const [cities, setCities] = useState<{ id: string | number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const numericState = state && String(state).match(/^\d+$/) ? Number(state) : undefined;

    // Only fetch cities if a valid state_id is provided; otherwise clear the list
    if (!numericState) {
      if (mounted) {
        setCities([]);
        setLoading(false);
      }
      return () => { mounted = false; };
    }

    listCities({ state_id: numericState })
      .then((data) => {
        if (!mounted) return;
        const normalized = (data || []).map((c: any) => ({ id: String(c.id), name: c.name }));
        // If parent provided a preselected city name that's not in the list, inject it so it appears
        if (preselectedCityName) {
          const pre = String(preselectedCityName || '').trim();
          if (pre) {
            // Check if preselectedCityName is an id or a name
            const existsById = normalized.find((it: any) => String(it.id) === pre);
            const existsByName = normalized.find((it: any) => String(it.name).toLowerCase() === pre.toLowerCase());
            if (!existsById && !existsByName) {
              // If preselectedCityName is a number, treat as id, else as name
              if (/^\d+$/.test(pre)) {
                normalized.unshift({ id: pre, name: pre });
              } else {
                normalized.unshift({ id: pre, name: pre });
              }
            }
          }
        }
        setCities(normalized);
      })
      .catch(() => { /* ui store handles show error */ })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [state, preselectedCityName]);

  // Find the label for the selected value (id)
  // ...existing code...

  return (
    <div>
      <SelectField
        name="city"
        value={value}
        onChange={(v) => onChange(typeof v === 'string' ? v : v[0] ?? '')}
        options={cities.map(c => ({ value: String(c.id), label: c.name }))}
        placeholder={loading ? 'Loading cities...' : (cities.length ? 'Select City' : 'Select State first')}
        disabled={loading}
      />
    </div>
  );
};

const CreateBrandForm: React.FC<MasterInlineFormProps> = ({ onClose, initialData, mode = 'create' }) => {
  // ...existing code...
  // ...existing code...
  const [form, setForm] = useState({
    brandName: '',
    brandType: '',
    website: '',
    address: '',
    gstNumbers: [''],
    agency: [] as string[],
    industry: '',
    country: 'Please Select Country',
    postalCode: '',
    state: '',
    city: '',
    zone: '',
  });
  // Fetch states when country changes
  useEffect(() => {
    if (!form.country || form.country === 'Please Select Country') {
      setStates([]);
      setForm(prev => ({ ...prev, state: '', city: '' }));
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const statesData = await listStates({ country_id: form.country });
        if (mounted) setStates(statesData || []);
      } catch {
        if (mounted) setStates([]);
      }
    })();
    return () => { mounted = false; };
  }, [form.country]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [zones, setZones] = useState<Zone[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [brandTypes, setBrandTypes] = useState<BrandType[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [postalLoading, setPostalLoading] = useState(false);
  const [postalError, setPostalError] = useState<string>('');
  const editBrandId = String(
    initialData?.id ??
    initialData?.brand_id ??
    initialData?._raw?.id ??
    ''
  ).trim();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'postalCode') {
      // Only allow up to 6 digits in postal code input.
      const sanitized = String(value || '').replace(/\D/g, '').slice(0, 6);
      setForm(prev => ({ ...prev, [name]: sanitized }));
      setErrors(prev => ({ ...prev, [name]: '' }));
      return;
    }
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.brandName.trim()) next.brandName = 'Brand Name Is Required';
    if (!form.brandType) next.brandType = 'Brand Type Is Required';
    if (!form.industry) next.industry = 'Please Select An Industry';
    if (!form.country || form.country === 'Please Select Country') next.country = 'Please Select A Country';
    if (!form.state) next.state = 'Please Select A State';
    if (!form.city) next.city = 'Please Select A City';
    if (!form.zone) next.zone = 'Please Select A Zone';
    // Postal code: optional, but if provided must be 6 numeric digits
    const postalCodeTrimmed = String(form.postalCode || '').trim();
    if (postalCodeTrimmed && !/^[0-9]{6}$/.test(postalCodeTrimmed)) {
      next.postalCode = 'Postal code must be 6 digits';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const payload = {
        name: form.brandName,
        website: form.website,
        address: form.address,
        gst_numbers: form.gstNumbers.map((gstNumber) => gstNumber.trim()).filter(Boolean),
        // Ensure we send the brand type id when possible. The SelectField shows the name
        // as label but the form value may be either an id or a free-text name. Try to
        // resolve to an id using the loaded `brandTypes` list.
        brand_type_id: (() => {
          const asString = String(form.brandType || '');
          // prefer exact id match
          const byId = brandTypes.find(b => String(b.id) === asString);
          if (byId) return byId.id;
          // fallback: try match by name (case-insensitive)
          const byName = brandTypes.find(b => String(b.name).toLowerCase() === asString.toLowerCase());
          if (byName) return byName.id;
          // otherwise return whatever value the form has (server may accept name)
          return form.brandType;
        })(),
        industry_id: form.industry,
        country_id: form.country,
        state_id: form.state,
        city_id: form.city,
        zone_id: form.zone,
        postal_code: form.postalCode,
        agency_ids: form.agency.length > 0 ? form.agency.map(id => parseInt(id, 10)) : [],
      };

      let res;
      if (mode === 'edit' && editBrandId) {
        // Update existing brand
        res = await updateBrand(editBrandId, payload);
        if (res) {
          SweetAlert.showUpdateSuccess();
          onClose();
          // Auto-reload Brand Master page after successful update
          window.location.reload();
        }
      } else {
        // Create new brand
        res = await apiClient.post('/brands', payload);

        if (res && res.success) {
          SweetAlert.showCreateSuccess();
          onClose();
          // Auto-reload Brand Master page after successful creation
          window.location.reload();
        } else {
          throw new Error(res?.message || 'Failed to create brand');
        }
      }
    } catch (err: any) {
      // Handle server-side validation errors
      const responseData = err?.responseData;
      if (responseData?.errors && typeof responseData.errors === 'object') {
        // Map server field names to form field names
        const fieldErrorMap: Record<string, string> = {
          'name': 'brandName',
          'brand_type_id': 'brandType',
          'industry_id': 'industry',
          'country_id': 'country',
          'state_id': 'state',
          'city_id': 'city',
          'zone_id': 'zone',
          'postal_code': 'postalCode',
          'agency_id': 'agency',
          'agency_ids': 'agency',
          'website': 'website',
          'gst_numbers': 'gstNumbers',
          'gst_number': 'gstNumbers',
          'gst_no': 'gstNumbers',
        };

        const newErrors: Record<string, string> = {};
        // Process each error from the server response
        Object.entries(responseData.errors).forEach(([serverField, messages]: [string, any]) => {
          const formField = fieldErrorMap[serverField] || serverField;
          // Get the first error message if it's an array
          const errorMessage = Array.isArray(messages) ? messages[0] : String(messages);
          newErrors[formField] = errorMessage;
        });
        setErrors(newErrors);
        // Do NOT show popup for website errors, only show below the field
        // For other errors, show popup except for "already been taken"
        const firstError = Object.values(newErrors)[0];
        // Only show popup for errors except city id integer error
        if (
          firstError &&
          !firstError.toLowerCase().includes('already been taken') &&
          !newErrors.website &&
          !(newErrors.city && newErrors.city.toLowerCase().includes('must be an integer'))
        ) {
          SweetAlert.showError(firstError);
        }
      } else {
        // Show general error if not a validation error
        SweetAlert.showError(err?.message || `Failed to ${mode === 'edit' ? 'update' : 'save'} brand`);
      }
    }
  };

  // Lookup postal pincode and auto-fill country/state/city when possible
  const lookupPostalCode = async (pincode: string) => {
    const code = String(pincode || '').trim();
    if (!/^[0-9]{6}$/.test(code)) {
      setPostalError('Please enter a valid 6-digit pincode');
      return;
    }
    setPostalError('');
    setPostalLoading(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(code)}`);
      const arr = await res.json();
      if (!Array.isArray(arr) || arr.length === 0) throw new Error('Invalid response from postal API');
      const first = arr[0] || {};
      if (first.Status !== 'Success' || !first.PostOffice || !first.PostOffice.length) {
        throw new Error(first.Message || 'No data found for this pincode');
      }
      const po = first.PostOffice[0];
      const countryName = po.Country || '';
      const stateName = po.State || '';
      const districtOrName = po.District || po.Name || '';

      // Map or inject Country
      let countryId: string = '';
      let stateId: string = '';
      let cityValue: string = '';

      // Refresh countries
      let newCountries = countries;
      const foundCountry = countries.find(c => String(c.name).toLowerCase() === String(countryName).toLowerCase());
      if (foundCountry) {
        countryId = String(foundCountry.id);
      } else if (countryName) {
        const newC = { id: countryName, name: countryName } as Country;
        newCountries = [newC, ...countries];
        setCountries(newCountries);
        countryId = countryName;
      }

      // Refresh states
      let newStates: State[] = [];
      try {
        const statesData = await listStates({ country_id: countryId });
        newStates = statesData || [];
        setStates(newStates);
      } catch {
        newStates = [];
        setStates([]);
      }
      const foundState = newStates.find(s => String(s.name).toLowerCase() === String(stateName).toLowerCase());
      if (foundState) {
        stateId = String(foundState.id);
      } else if (stateName) {
        const newS = { id: stateName, name: stateName, country_id: countryId } as any as State;
        newStates = [newS, ...newStates];
        setStates(newStates);
        stateId = stateName;
      }

      // Refresh cities
      let newCities: { id: string | number; name: string }[] = [];
      try {
        const citiesList = await listCities(stateId ? { state_id: stateId } : undefined);
        newCities = (citiesList || []).map((c: any) => ({ id: String(c.id), name: c.name }));
        const matched = newCities.find((c: any) => {
          const nm = String(c.name || '').toLowerCase();
          return nm === String(districtOrName).toLowerCase() || nm === String(po.Name || '').toLowerCase();
        });
        if (matched) {
          cityValue = String(matched.id);
        } else {
          cityValue = districtOrName;
          newCities = [{ id: districtOrName, name: districtOrName }, ...newCities];
        }
        // Optionally, you can set a state for cities if you want to use it elsewhere
        // setCities(newCities); // Uncomment if you want to keep cities in state
      } catch {
        cityValue = districtOrName;
        // setCities([{ id: districtOrName, name: districtOrName }]); // Uncomment if you want to keep cities in state
      }

      // Update form with refreshed country, state, city
      setForm(prev => ({ ...prev, country: countryId, state: stateId, city: cityValue, postalCode: code }));
      setPostalError('');
    } catch (err: any) {
      setPostalError(err?.message || 'Failed to fetch pincode data');
    } finally {
      setPostalLoading(false);
    }
  };

  const hasInitializedForm = React.useRef(false);
  useEffect(() => {
    // If initialData provided (edit mode) prefill the form only once
    if (initialData && !hasInitializedForm.current) {
      setForm(prev => ({
        ...prev,
        brandName: initialData.name ?? initialData.brandName ?? prev.brandName,
        brandType: String(initialData.brand_type?.id ?? initialData.brand_type_id ?? initialData.brandType ?? initialData.brand_type ?? ''),
        website: initialData.website ?? prev.website,
        address: initialData.address ?? prev.address,
        gstNumbers: (() => {
          const gstNumbers =
            initialData.gst_numbers ??
            initialData.gstNumbers ??
            initialData.gst_number ??
            initialData.gst_no ??
            initialData.gstNumber ??
            initialData.gstNo;
          const values = Array.isArray(gstNumbers) ? gstNumbers : [gstNumbers];
          const normalized = values
            .filter((value) => value !== undefined && value !== null)
            .map((value) => String(value));
          return normalized.length ? normalized : prev.gstNumbers;
        })(),
        // agency will be set after agencies are loaded
        industry: String(initialData.industry?.id ?? initialData.industry_id ?? initialData.industry ?? ''),
        country: String(initialData.country?.id ?? initialData.country_id ?? initialData.country ?? ''),
        postalCode: initialData.postal_code ?? initialData.postalCode ?? initialData.pinCode ?? prev.postalCode,
        state: String(initialData.state?.id ?? initialData.state_id ?? initialData.state ?? ''),
        city: String(initialData.city?.id ?? initialData.city_id ?? initialData.city ?? ''),
        zone: String(initialData.zone?.id ?? initialData.zone_id ?? initialData.zone ?? ''),
      }));
      hasInitializedForm.current = true;
    }
  }, [initialData]);

  const hasFetchedData = React.useRef(false);
  useEffect(() => {
    if (hasFetchedData.current) return;
    hasFetchedData.current = true;

    let mounted = true;
    Promise.all([
      listZones(),
      listCountries(),
      listBrandTypes(),
      // fetch a large page so SelectDropdown can client-side search
      listAgencies(1, 1000)
    ]).then(([zonesData, countriesData, brandTypesData, agenciesResp]) => {
      if (!mounted) return;
      setZones(zonesData || []);
      setCountries(countriesData || []);
      setBrandTypes(brandTypesData || []);
      // agenciesResp is AgencyListResponse { data, meta }
      try {
        const items = (agenciesResp && agenciesResp.data) ? agenciesResp.data : [];
        setAgencies(items);

        // If initialData provided and contains agency name/id, try to preselect the matching id(s)
        if (mounted && initialData) {
          const rawAgency =
            initialData.agency_ids ??
            initialData.agency_id ??
            initialData.agency ??
            initialData.agencies ??
            initialData.agencyName ??
            null;
          if (rawAgency) {
            const agencyIds: string[] = [];

            if (Array.isArray(rawAgency)) {
              rawAgency.forEach(a => {
                const rawVal = String(typeof a === 'object' ? (a.id ?? a.name ?? '') : a);
                if (rawVal) {
                  // Try to find by id first
                  const byId = items.find(ag => String(ag.id) === rawVal);
                  if (byId) {
                    agencyIds.push(String(byId.id));
                  } else {
                    // Try to find by name (case-insensitive)
                    const byName = items.find(ag => String(ag.name).toLowerCase() === String(rawVal).toLowerCase());
                    if (byName) agencyIds.push(String(byName.id));
                    else agencyIds.push(rawVal);
                  }
                }
              });
            } else {
              let rawVal = '';
              if (typeof rawAgency === 'object' && rawAgency !== null) rawVal = String((rawAgency as any).id ?? (rawAgency as any).name ?? '');
              else rawVal = String(rawAgency);

              // Try to find by id first
              const byId = items.find(a => String(a.id) === rawVal);
              if (byId) {
                agencyIds.push(String(byId.id));
              } else {
                // Try to find by name (case-insensitive)
                const byName = items.find(a => String(a.name).toLowerCase() === String(rawVal).toLowerCase());
                if (byName) agencyIds.push(String(byName.id));
                else agencyIds.push(rawVal);
              }
            }

            if (agencyIds.length > 0) {
              setForm(prev => ({ ...prev, agency: agencyIds }));
            }
          }
        }
      } catch {
        setAgencies([]);
      }
    }).catch(() => {
      // Errors are handled by UI store
    });

    // Fallback/debug: if brand types didn't populate (empty array), try fetching directly
    // from the API via `apiClient` so we can recover from any service-wrapper mismatch.
    (async () => {
      try {
        // wait a tick to allow the Promise.all to complete first
        await new Promise(r => setTimeout(r, 50));
        if ((brandTypes || []).length === 0) {
          const raw = await apiClient.get<any>('/brand-types');
          const items = raw && raw.data ? raw.data : [];
          if (items && items.length) {
            const normalized = (items || []).map((it: any) => ({ id: it.id ?? it._id ?? String(it.name || ''), name: it.name ?? it.title ?? it.label ?? '' }));
            setBrandTypes(prev => prev.length ? prev : normalized);

            console.warn('Brand types loaded via fallback apiClient.get', normalized);
          } else {

            console.warn('Brand types: no items returned from fallback');
          }
        }
      } catch (e) {

        console.error('Brand types fallback fetch failed', e);
      }
    })();

    // Fallback/debug for agencies: if agencies array is empty, try fetching a large page directly
    (async () => {
      try {
        await new Promise(r => setTimeout(r, 50));
        if ((agencies || []).length === 0) {
          // Request many items so the dropdown can search client-side
          const raw = await apiClient.get<any>(`/agencies?page=1&per_page=1000`);
          const items = raw && raw.data ? raw.data : [];
          if (items && items.length) {
            const normalized = (items || []).map((it: any) => ({ id: it.id ?? it._id ?? String(it.slug || ''), name: it.name ?? it.title ?? it.label ?? '' }));
            setAgencies(prev => prev.length ? prev : (normalized as Agency[]));

            console.warn('Agencies loaded via fallback apiClient.get', normalized);
          } else {

            console.warn('Agencies: no items returned from fallback');
          }
        }
      } catch (e) {

        console.error('Agencies fallback fetch failed', e);
      }
    })();

    // Fallback/debug for countries: if countries didn't populate (empty array), try fetching
    // directly from the API via `apiClient.get('/countries/list')` and normalize results.
    (async () => {
      try {
        await new Promise(r => setTimeout(r, 50));
        if ((countries || []).length === 0) {
          const raw = await apiClient.get<any>('/countries/list');
          const items = raw && raw.data ? raw.data : [];
          if (items && items.length) {
            const normalized = (items || []).map((it: any) => ({ id: it.id ?? it._id ?? String(it.slug || ''), name: it.name ?? it.title ?? it.label ?? '' }));
            setCountries(prev => prev.length ? prev : normalized);

            console.warn('Countries loaded via fallback apiClient.get', normalized);
          } else {

            console.warn('Countries: no items returned from fallback');
          }
        }
      } catch (e) {

        console.error('Countries fallback fetch failed', e);
      }
    })();

    // Fetch industries for the Industry dropdown. Request many per page to get a full list.
    fetchIndustries(1, 1000).then((resp) => {
      if (!mounted) return;
      setIndustries((resp && resp.data) ? resp.data : []);
    }).catch(() => {
      // UI store handles showing errors
    });

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-800 mb-1">Brand Name <span className="text-[#FF0000]">*</span></label>
          <input
            name="brandName"
            value={form.brandName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-black"
            placeholder="Please Enter Brand Name"
          />
          {errors.brandName && (
            <div className="text-xs text-red-500 mt-1">{errors.brandName}</div>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-800 mb-1">Brand Type <span className="text-red-500">*</span></label>
          <div>
            <SelectField
              name="brandType"
              value={form.brandType}
              onChange={(v) => setForm(prev => ({ ...prev, brandType: typeof v === 'string' ? v : v[0] ?? '' }))}
              options={brandTypes.map(t => ({ value: String(t.id), label: t.name }))}
              placeholder="Search or select option"
            />
          </div>
          {errors.brandType && !form.brandType && (
            <div className="text-xs text-red-500 mt-1">{errors.brandType}</div>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-800 mb-1">Website</label>
          <input
            name="website"
            value={form.website}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-black"
            placeholder="https://"
          />
          {errors.website && (
            <div className="text-xs text-red-500 mt-1">
              {errors.website}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-800 mb-1">Address</label>
          <input
            name="address"
            value={form.address}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-black"
            placeholder="Please Enter Address"
          />
          {errors.address && (
            <div className="text-xs text-red-500 mt-1">{errors.address}</div>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-800 mb-1">GST No.</label>
          <div className="space-y-2">
            {form.gstNumbers.map((gstNumber, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={gstNumber}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      gstNumbers: prev.gstNumbers.map((current, currentIndex) =>
                        currentIndex === index ? value : current
                      ),
                    }));
                    setErrors((prev) => ({ ...prev, gstNumbers: '' }));
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="Please Enter GST No."
                />
                {index === form.gstNumbers.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, gstNumbers: [...prev.gstNumbers, ''] }))}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    aria-label="Add GST number"
                    title="Add GST number"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({
                      ...prev,
                      gstNumbers: prev.gstNumbers.filter((_, currentIndex) => currentIndex !== index),
                    }))}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    aria-label={`Remove GST number ${index + 1}`}
                    title="Remove GST number"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {errors.gstNumbers && (
            <div className="text-xs text-red-500 mt-1">{errors.gstNumbers}</div>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-800 mb-1">Select Existing Agency</label>
          <MultiSelectDropdown
            name="agency"
            value={form.agency}
            onChange={(v) => setForm(prev => ({ ...prev, agency: v }))}
            options={agencies.map(a => ({ value: String(a.id), label: a.name }))}
            placeholder={agencies.length ? 'Search or select options' : 'Loading agencies...'}
            multi={true}
            horizontalScroll={true}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-800 mb-1">Industry <span className="text-[#FF0000]">*</span></label>
          <div>
            <SelectField
              name="industry"
              value={form.industry}
              onChange={(v) => setForm(prev => ({ ...prev, industry: typeof v === 'string' ? v : v[0] ?? '' }))}
              options={industries.length ? industries.map(it => ({ value: String(it.id), label: it.name })) : []}
              placeholder={industries.length ? 'Search or select option' : 'No industries available'}
            />
          </div>
          {errors.industry && !form.industry && (
            <div className="text-xs text-red-500 mt-1">{errors.industry}</div>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-800 mb-1">Country <span className="text-[#FF0000]">*</span></label>
          <div>
            <SelectField
              name="country"
              value={form.country}
              onChange={(v) => {
                const newCountry = typeof v === 'string' ? v : v[0] ?? '';
                setForm(prev => ({ ...prev, country: newCountry, state: '', city: '' }));
              }}
              options={countries.map(c => ({ value: String(c.id), label: c.name }))}
              placeholder="Search or select option"
            />
          </div>
          {errors.country && (!form.country || form.country === 'Please Select Country') && (
            <div className="text-xs text-red-500 mt-1">{errors.country}</div>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-800 mb-1">Postal Code</label>
          <input
            name="postalCode"
            value={form.postalCode}
            inputMode="numeric"
            maxLength={6}
            onChange={(e) => {
              handleChange(e as any);
              const raw = String(e.target.value || '').replace(/\D/g, '').slice(0, 6);
              if (/^[0-9]{6}$/.test(raw)) {
                lookupPostalCode(raw);
              }
            }}
            onBlur={() => {
              const raw = String(form.postalCode || '').trim();
              if (/^[0-9]{6}$/.test(raw)) {
                lookupPostalCode(raw);
              } else {
                // Invalid postal is still handled by existing submit-time validation.
              }
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-black"
            placeholder="Please Enter Postal Code"
          />
          {errors.postalCode && <div className="text-xs text-red-500 mt-1">{errors.postalCode}</div>}
          {postalLoading && <div className="text-xs text-gray-500 mt-1">Looking up pincode...</div>}
          {!postalLoading && postalError && <div className="text-xs text-red-500 mt-1">{postalError}</div>}
        </div>

        <div>
          <label className="block text-sm text-gray-800 mb-1">State <span className="text-[#FF0000]">*</span></label>
          <div>
            <SelectField
              name="state"
              value={form.state}
              onChange={(v) => setForm(prev => ({ ...prev, state: typeof v === 'string' ? v : v[0] ?? '' }))}
              options={states.map(s => ({ value: String(s.id), label: s.name }))}
              placeholder="Search or select option"
            />
          </div>
          {errors.state && !form.state && (
            <div className="text-xs text-red-500 mt-1">{errors.state}</div>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-800 mb-1">City <span className="text-[#FF0000]">*</span></label>
          <CitySelect
            state={form.state}
            value={form.city}
            preselectedCityName={form.city}
            onChange={(val) => setForm(prev => ({ ...prev, city: val }))}
          />
          {(errors.city && (!form.city || (errors.city.toLowerCase().includes('must be an integer') && isNaN(Number(form.city))))) && (
            <div className="text-xs text-red-500 mt-1">{errors.city}</div>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-800 mb-1">Zone <span className="text-[#FF0000]">*</span></label>
          <div>
            <SelectField
              name="zone"
              value={form.zone}
              onChange={(v) => setForm(prev => ({ ...prev, zone: typeof v === 'string' ? v : v[0] ?? '' }))}
              options={zones.map(z => ({ value: String(z.id), label: z.name }))}
              placeholder="Search or select option"
            />
          </div>
          {errors.zone && !form.zone && (
            <div className="text-xs text-red-500 mt-1">{errors.zone}</div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="submit"
          className="px-4 py-2 rounded-lg btn-primary text-white shadow-sm"
        >
          {mode === 'edit' ? 'Update' : 'Save'}
        </button>
      </div>
    </form>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }} 
      className="space-y-6"
    >
      <MasterFormHeader onBack={onClose} title={mode === 'edit' ? 'Edit Brand' : 'Create Brand'} />
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50">
          {formContent}
        </div>
      </div>
    </motion.div>
  );
};

export default CreateBrandForm;