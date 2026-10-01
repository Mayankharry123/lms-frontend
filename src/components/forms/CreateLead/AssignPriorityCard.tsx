import React, { useEffect, useState, useRef, useMemo } from 'react';
import SelectField from '../../ui/SelectField';
import CollapsibleFormCard from '../../ui/CollapsibleFormCard';
import { ListChecks } from 'lucide-react';
import { getUsers } from '../../../services/CreateLead';
import { getPriorities, getPrioritiesByCallStatus } from '../../../services/Priority';
import { getCallStatuses } from '../../../services/CallStatus';
import { apiClient } from '../../../utils/apiClient';
import { fetchCurrentUser } from '../../../services/Header';
import { flattenChildUserHierarchy } from '../../../api/lookups';
import type { AssignPriorityCardProps } from '../../../types/LeadManagentForm';

const AssignPriorityCard: React.FC<AssignPriorityCardProps> = ({
  assignTo,
  assignedLabel,
  priority,
  callFeedback,
  organisation,
  organisationName,
  organisationError,
  mode = 'create',
  collapsible = false,
  onChange
}) => {
  const priorityRef = useRef(priority);
  const assignToRef = useRef(assignTo);
  const organisationRef = useRef(organisation);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    priorityRef.current = priority;
    assignToRef.current = assignTo;
    organisationRef.current = organisation;
    onChangeRef.current = onChange;
  }, [priority, assignTo, organisation, onChange]);

  // Assign To dropdown state
  const [userOptions, setUserOptions] = useState<{ value: string; label: string }[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  // Organisation dropdown state
  const [organisationOptions, setOrganisationOptions] = useState<{ id: string; name: string }[]>([]);
  const [organisationLoading, setOrganisationLoading] = useState(false);
  const [organisationErrorState, setOrganisationErrorState] = useState<string | null>(null);

  // Priority dropdown state
  const [priorityOptions, setPriorityOptions] = useState<{ value: string; label: string }[]>([]);
  const [priorityLoading, setPriorityLoading] = useState(false);
  const [priorityError, setPriorityError] = useState<string | null>(null);

  // Call Feedback dropdown state
  const [callStatusOptions, setCallStatusOptions] = useState<{ value: string; label: string }[]>([]);
  const [callStatusLoading, setCallStatusLoading] = useState(false);
  const [callStatusError, setCallStatusError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setCallStatusLoading(true);
    setCallStatusError(null);
    getCallStatuses()
      .then((data: any) => {
        if (!isMounted) return;
        setCallStatusOptions(
          Array.isArray(data)
            ? data.map((item: any) => ({ value: String(item.id), label: item.name }))
            : []
        );
        setCallStatusLoading(false);
      })
      .catch((error: any) => {
        if (!isMounted) return;
        setCallStatusError(error?.message || 'Failed to load call statuses');
        setCallStatusOptions([]);
        setCallStatusLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  // Fetch organisations on mount
  useEffect(() => {
    let isMounted = true;
    const fetchOrgs = async () => {
      try {
        setOrganisationLoading(true);
        const response = await apiClient.get<any[]>('/organisations/list');
        if (!isMounted) return;
        const orgs = Array.isArray(response.data) ? response.data : [];
        const options = orgs
          .map((org: any) => ({
            id: String(org.id ?? org.organisation_id ?? org.value ?? ''),
            name: String(org.name ?? org.organisation_name ?? org.label ?? ''),
          }))
          .filter((o) => o.id && o.name);

        setOrganisationOptions(options);

        // Create only: auto-preselect organisation; edit keeps lead's assigned organisation
        if (mode === 'edit') return;

        if (options.length === 1) {
          onChangeRef.current?.({ organisation: options[0].id, assignTo: assignToRef.current, priority: priorityRef.current, callFeedback });
        } else if (options.length > 1 && !organisationRef.current) {
          onChangeRef.current?.({ organisation: '', assignTo: assignToRef.current, priority: priorityRef.current, callFeedback });
        }
      } catch (err: any) {
        if (isMounted) {
          setOrganisationErrorState(err?.message || 'Failed to load organisations');
        }
      } finally {
        if (isMounted) {
          setOrganisationLoading(false);
        }
      }
    };
    fetchOrgs();

    return () => {
      isMounted = false;
    };
  }, [callFeedback, mode]);

  // Preselect organisation if current user profile is assigned to exactly one (create only)
  useEffect(() => {
    if (mode === 'edit') return undefined;

    let isMounted = true;
    const fetchUser = async () => {
      try {
        const user = await fetchCurrentUser();
        if (!isMounted) return;
        if (organisationRef.current) return;
        if (user && user.name) {
          const orgs = user.organisations || [];
          if (orgs.length === 1) {
            const singleOrgId = String(orgs[0].id ?? orgs[0].organisation_id ?? orgs[0].value ?? '');
            if (singleOrgId) {
              onChangeRef.current?.({ organisation: singleOrgId, assignTo: assignToRef.current, priority: priorityRef.current, callFeedback });
            }
          } else if (orgs.length > 1) {
            onChangeRef.current?.({ organisation: '', assignTo: assignToRef.current, priority: priorityRef.current, callFeedback });
          } else if (user.organisation_id) {
            onChangeRef.current?.({ organisation: String(user.organisation_id), assignTo: assignToRef.current, priority: priorityRef.current, callFeedback });
          }
        }
      } catch (err) {
        console.error('Failed to fetch current user in AssignPriorityCard:', err);
      }
    };
    fetchUser();
    return () => {
      isMounted = false;
    };
  }, [callFeedback, mode]);

  const organisationSelectOptions = useMemo(() => {
    const base = organisationOptions.map((o) => ({ value: String(o.id), label: o.name }));
    if (
      organisation &&
      organisationName &&
      !base.some((option) => option.value === String(organisation))
    ) {
      return [{ value: String(organisation), label: organisationName }, ...base];
    }
    return base;
  }, [organisationOptions, organisation, organisationName]);

  // Fetch child users matching selected organisation with fallback
  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      try {
        setUserLoading(true);
        setUserError(null);
        let fetched: { value: string; label: string }[] = [];
        if (organisation) {
          const res = await apiClient.get<any>(
            `/profile/child-users-by-organisation?organisation_id=${organisation}&organization_id=${organisation}`
          );
          const data = Array.isArray(res.data) ? res.data : [];
          fetched = flattenChildUserHierarchy(data).map((item) => ({
            value: String(item.id),
            label: item.name,
          }));
        } else {
          const data = await getUsers();
          fetched = data.map((item: any) => ({
            value: String(item.id),
            label: item.name,
          }));
        }

        if (!isMounted) return;

        // If assignTo prop exists but is not in fetched options, prepend it using assignedLabel if available
        if (assignTo) {
          const exists = fetched.find((o) => String(o.value) === String(assignTo));
          if (!exists) {
            fetched.unshift({
              value: String(assignTo),
              label: String(assignedLabel ? assignedLabel : assignTo),
            });
          }
        }
        setUserOptions(fetched);
      } catch (error: any) {
        console.error('Failed to load users for organisation, falling back to all:', error);
        try {
          const data = await getUsers();
          if (!isMounted) return;
          const fetched = data.map((item: any) => ({
            value: String(item.id),
            label: item.name,
          }));
          if (assignTo) {
            const exists = fetched.find((o: any) => String(o.value) === String(assignTo));
            if (!exists) {
              fetched.unshift({
                value: String(assignTo),
                label: String(assignedLabel ? assignedLabel : assignTo),
              });
            }
          }
          setUserOptions(fetched);
        } catch (fallbackErr: any) {
          if (isMounted) {
            setUserError(fallbackErr?.message || 'Failed to load users');
            setUserOptions([]);
          }
        }
      } finally {
        if (isMounted) {
          setUserLoading(false);
        }
      }
    };

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, [organisation, assignTo, assignedLabel]);

  useEffect(() => {
    let isMounted = true;
    setPriorityLoading(true);
    setPriorityError(null);

    const fetchFn = callFeedback ? getPrioritiesByCallStatus(callFeedback) : getPriorities();

    fetchFn
      .then((data: any) => {
        if (!isMounted) return;

        const fetched = Array.isArray(data)
          ? data.map((item: any) => ({ value: String(item.id), label: item.name }))
          : [];
        setPriorityOptions(fetched);

        // Check if current priority is still valid, if not, clear it
        const isCurrentPriorityValid = priorityRef.current && fetched.some((option: any) => option.value === priorityRef.current);
        if (priorityRef.current && !isCurrentPriorityValid) {
          onChangeRef.current?.({ organisation: organisationRef.current, assignTo: assignToRef.current, priority: undefined, callFeedback });
        }

        // Auto-select if only one priority and no priority is currently selected
        if (fetched.length === 1 && !priorityRef.current) {
          onChangeRef.current?.({ organisation: organisationRef.current, assignTo: assignToRef.current, priority: fetched[0].value, callFeedback });
        }

        setPriorityLoading(false);
      })
      .catch((error: any) => {
        if (!isMounted) return;
        setPriorityError(error?.message || 'Failed to load priorities');
        setPriorityOptions([]);
        setPriorityLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [callFeedback]); // Only fetch when callFeedback changes

  return (
    <CollapsibleFormCard
      title="Assignment & Priority"
      collapsible={collapsible}
      defaultOpen={!collapsible}
      titleWrapperClassName="mb-4"
      icon={<ListChecks className="h-5 w-5" strokeWidth={2} />}
    >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-800 mb-1">
              Organisation <span className="text-[#FF0000]">*</span>
            </label>
            <SelectField
              options={organisationSelectOptions}
              placeholder={organisationLoading ? 'Loading organisations...' : 'Select Organisation'}
              value={organisation}
              onChange={(value) => {
                const orgVal = typeof value === 'string' ? value : value[0] ?? '';
                onChange?.({ organisation: orgVal, assignTo: '', priority, callFeedback });
              }}
              inputClassName={`px-3 py-2 rounded-lg bg-white text-gray-800 border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                organisationError ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-200'
              }`}
              disabled={organisationLoading}
            />
            {organisationLoading && <div className="text-xs text-gray-400 mt-1">Loading...</div>}
            {organisationErrorState && <div className="text-xs text-red-500 mt-1">{organisationErrorState}</div>}
            {organisationError && (
              <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1" role="alert">
                <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {organisationError}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-800 mb-1">Assign To</label>
            <SelectField
              options={userOptions}
              placeholder={!organisation ? 'Select Organisation first' : 'Select Team Member'}
              value={assignTo}
              onChange={(value) => onChange?.({ organisation, assignTo: typeof value === 'string' ? value : value[0] ?? '', priority, callFeedback })}
              inputClassName={`px-3 py-2 rounded-lg bg-white text-gray-800 border focus:outline-none focus:ring-2 transition-colors ${
                !organisation ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' : 'border-gray-200 focus:ring-blue-500'
              }`}
              disabled={userLoading || !organisation}
            />
            {!organisation && (
              <div className="text-xs text-amber-500 mt-1">Please select an organisation first.</div>
            )}
            {organisation && userLoading && <div className="text-xs text-gray-400 mt-1">Loading...</div>}
            {organisation && userError && <div className="text-xs text-red-500 mt-1">{userError}</div>}
            {organisation && !userLoading && !userError && userOptions.length === 0 && (
              <div className="text-xs text-gray-400 mt-1">No users found.</div>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Priority</label>
            <SelectField
              options={priorityOptions}
              placeholder="Select Priority"
              value={priority}
              onChange={(value) => onChange?.({ organisation, assignTo, priority: typeof value === 'string' ? value : value[0] ?? '', callFeedback })}
              inputClassName="px-3 py-2 rounded-lg bg-white text-[var(--text-primary)] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              disabled={priorityLoading}
            />
            {priorityLoading && <div className="text-xs text-gray-400 mt-1">Loading...</div>}
            {priorityError && <div className="text-xs text-red-500 mt-1">{priorityError}</div>}
            {!priorityLoading && !priorityError && priorityOptions.length === 0 && (
              <div className="text-xs text-gray-400 mt-1">No priorities found.</div>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Call Feedback</label>
            <SelectField
              options={callStatusOptions}
              placeholder="Please Select Feedback"
              value={callFeedback}
              onChange={(value: any) => onChange?.({ organisation, assignTo, priority, callFeedback: value })}
              inputClassName="px-3 py-2 rounded-lg bg-white text-[var(--text-primary)] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              disabled={callStatusLoading}
            />
            {callStatusLoading && <div className="text-xs text-gray-400 mt-1">Loading...</div>}
            {callStatusError && <div className="text-xs text-red-500 mt-1">{callStatusError}</div>}
            {!callStatusLoading && !callStatusError && callStatusOptions.length === 0 && (
              <div className="text-xs text-gray-400 mt-1">No call statuses found.</div>
            )}
          </div>
        </div>
    </CollapsibleFormCard>
  );
};

export default AssignPriorityCard;
