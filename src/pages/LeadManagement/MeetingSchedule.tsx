/**
 * @file MeetingSchedule.tsx
 * @description Schedule a meeting for a selected lead.
 * @author Sanjay Jangid <sanjay.jangid@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Breadcrumb from '../../components/ui/Breadcrumb';
import SweetAlert from '../../utils/SweetAlert';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import SelectField from '../../components/ui/SelectField';
import { createMeeting } from '../../services/MeetingSchedule';
import { listAttendees } from '../../services/AllUsers';
import { getLeadById, listLeads } from '../../services/AllLeads';
import { getCallStatuses, updateCallStatus } from '../../services/CallStatus';
import MultiSelectDropdown from '../../components/ui/MultiSelectDropdown';
import { IoIosArrowBack } from 'react-icons/io';

const MeetingSchedule: React.FC = () => {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [searchParams] = useSearchParams();
  const routeState = routerLocation.state as {
    prefillLeadId?: string;
    updateCallStatusId?: string | number;
  } | null;
  const prefillLeadId =
    searchParams.get('lead_id')?.replace(/^#/, '') ||
    searchParams.get('leadId')?.replace(/^#/, '') ||
    routeState?.prefillLeadId;
  const pendingCallStatusId =
    searchParams.get('call_status_id') ||
    (routeState?.updateCallStatusId != null ? String(routeState.updateCallStatusId) : '');

  // Disable datepicker animations on component mount
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .react-datepicker-popper {
        animation: none !important;
        transition: none !important;
      }
      .react-datepicker {
        animation: none !important;
      }
      /* Fix multi-select placeholder width */
      div[style*="gap: 6px"] input[placeholder] {
        min-width: 120px !important;
        flex: 1 !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [lead, setLead] = useState<string>('');
  const [meetingType, setMeetingType] = useState<string>('');
  const [attendees, setAttendees] = useState<string[]>([]);
  const [startDateTime, setStartDateTime] = useState<Date | null>(null);
  const [endDateTime, setEndDateTime] = useState<Date | null>(null);
  const [title, setTitle] = useState<string>('');
  const [agenda, setAgenda] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [meetLink] = useState<string>('');
  const [leadOptions, setLeadOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [attendeesOptions, setAttendeesOptions] = useState<Array<{ value: string; label: string }>>([]);
  // Error states for each required field
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    lead?: string;
    meetingType?: string;
    attendees?: string;
    startDateTime?: string;
    endDateTime?: string;
    title?: string;
  }>({});

  const meetingTypeOptions = [
    { value: 'face_to_face', label: 'Face-To-Face' },
    { value: 'online', label: 'Online' },
  ];

  // Validate meeting type is one of allowed values
  const isValidMeetingType = (type: string): boolean => {
    const validTypes = ['face_to_face', 'online'];
    return validTypes.includes(type);
  };

  // Fetch leads and attendees from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch leads
        const leadsResponse = await listLeads(1, 100);
        const leadOpts = leadsResponse.data.map((leadItem: any) => ({
          value: String(leadItem.id),
          label: `${leadItem.name || leadItem.contact_person || `Lead ${leadItem.id}`} #${leadItem.id}`,
        }));
        if (prefillLeadId && !leadOpts.some((option) => option.value === prefillLeadId)) {
          try {
            const detail = await getLeadById(prefillLeadId);
            const leadName = detail.name || detail.contact_person || detail.brand_name || `Lead ${prefillLeadId}`;
            leadOpts.unshift({
              value: String(detail.id ?? prefillLeadId),
              label: `${leadName} #${detail.id ?? prefillLeadId}`,
            });
          } catch {
            leadOpts.unshift({ value: prefillLeadId, label: `Lead #${prefillLeadId}` });
          }
        }
        setLeadOptions(leadOpts);

        if (prefillLeadId) {
          setLead(prefillLeadId);
        }

        // Fetch attendees
        const { data: usersData } = await listAttendees(1, 100);
        const attendeeOpts = usersData.map((user: any) => ({
          value: String(user.id),
          label: `${user.name || user.email || 'Unknown'} #${user.id}`,
        }));
        setAttendeesOptions(attendeeOpts);
      } catch (error) {
        console.error('Error fetching data:', error);
        if (prefillLeadId) {
          setLead(prefillLeadId);
          setLeadOptions([{ value: prefillLeadId, label: `Lead #${prefillLeadId}` }]);
        } else {
          setLeadOptions([]);
        }
        setAttendeesOptions([]);
      }
    };
    fetchData();
  }, [prefillLeadId]);

  const handleSave = async () => {
    // Validate required fields and set errors
    const newErrors: typeof errors = {};
    if (!lead) newErrors.lead = 'Lead is required.';
    if (!meetingType) newErrors.meetingType = 'Meeting type is required.';
    if (!attendees.length) newErrors.attendees = 'At least one attendee is required.';
    if (!startDateTime) newErrors.startDateTime = 'Start date & time is required.';
    if (!endDateTime) newErrors.endDateTime = 'End date & time is required.';
    if (startDateTime && endDateTime && endDateTime <= startDateTime) {
      newErrors.endDateTime = 'End time must be after start time.';
    }
    if (!title) newErrors.title = 'Title is required.';

    // Validate meeting type is one of allowed values
    if (meetingType && !isValidMeetingType(meetingType)) {
      newErrors.meetingType = 'Invalid meeting type. Please select either "Face-To-Face" or "Online".';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      // Do not proceed if there are errors
      return;
    }

    setSaving(true);
    try {
      // Parse attendees - convert all to integers
      const attendeeIds = attendees
        .map((id: any) => {
          // Handle format like #USR001 or #001 by extracting the numeric part
          if (typeof id === 'string' && id.startsWith('#')) {
            const numericPart = id.replace(/[^0-9]/g, '');
            return Number(numericPart);
          }
          return Number(id);
        })
        .filter((id) => Number.isInteger(id) && id > 0);

      console.log('Raw attendees state:', attendees);
      console.log('Converted attendee IDs:', attendeeIds);

      // Prepare payload for API
      // Helper to format date as 'YYYY-MM-DD HH:mm'
      const formatDateTime = (dt: Date | null) => {
        if (!dt) return '';
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        const hh = String(dt.getHours()).padStart(2, '0');
        const min = String(dt.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
      };

      const payload = {
        title,
        lead_id: String(lead),
        attendees_id: attendeeIds,  // Array of integer IDs
        type: meetingType,
        location,
        agenda,
        link: meetLink,
        meeting_start_date: formatDateTime(startDateTime),
        meeting_end_date: formatDateTime(endDateTime),
        status: 1,
      };

      console.log('Sending payload:', JSON.stringify(payload, null, 2));

      // Call the API service
      const response = await createMeeting(payload);
      console.log('Meeting created successfully', response);

      if (pendingCallStatusId) {
        try {
          let callStatusId: string | number = pendingCallStatusId;
          const statuses = await getCallStatuses();
          const matched = statuses.find((status) => String(status.id) === String(pendingCallStatusId))
            || statuses.find((status) => status.name.trim().toLowerCase() === 'meeting schedule');
          if (matched?.id != null) callStatusId = matched.id;
          await updateCallStatus(String(lead), callStatusId);
        } catch (statusError) {
          console.error('Meeting was created, but call status was not updated', statusError);
          SweetAlert.showError('Meeting was scheduled, but the lead status could not be updated.');
          return;
        }
      }

      SweetAlert.showCreateSuccess();
      setTimeout(() => {
        navigate('/lead-management/all-leads');
      }, 1800);
    } catch (error: any) {
      console.error('Error saving meeting:', error);
      try { SweetAlert.showError(error?.message || 'Failed to save meeting'); } catch {
        //  no need to action
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <Breadcrumb
          items={[
            { label: 'Lead Management', path: '/lead-management' },
            { label: 'Meeting Schedule', isActive: true },
          ]}
        />

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="font-semibold px-3 py-1 rounded-md flex items-center text-sm btn-primary text-white">
          
          <IoIosArrowBack size={16} className="mr-1" />
          Go Back
        </button>
      </div>


      <div className="w-full bg-white rounded-2xl shadow-sm border border-[var(--border-color)] overflow-hidden">
        <div className="px-4 py-5 sm:p-5 bg-gray-50">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Lead, Meeting Type, Attendees */}
              <div className="col-span-2 lg:col-span-1">
                <label className="block text-sm text-gray-800 mb-1">Lead <span className="text-[#FF0000]">*</span></label>
                <SelectField
                  placeholder="Select Lead"
                  options={leadOptions}
                  value={lead}
                  onChange={(v) => {
                    setLead(String(v));
                    if (errors.lead && v) setErrors({ ...errors, lead: undefined });
                  }}
                  inputClassName="border border-gray-200 focus:ring-blue-500 w-full px-3 py-2 rounded-lg bg-white text-gray-800"
                />
                {errors.lead && <div className="text-red-500 text-xs mt-1">{errors.lead}</div>}
              </div>
              <div className="col-span-2 lg:col-span-1">
                <label className="block text-sm text-gray-800 mb-1">Meeting Type <span className="text-[#FF0000]">*</span></label>
                <SelectField
                  placeholder="Select Type"
                  options={meetingTypeOptions}
                  value={meetingType}
                  onChange={(v) => {
                    setMeetingType(String(v));
                    if (errors.meetingType && v) setErrors({ ...errors, meetingType: undefined });
                  }}
                  inputClassName="border border-gray-200 focus:ring-blue-500 w-full px-3 py-2 rounded-lg bg-white text-gray-800"
                />
                {errors.meetingType && <div className="text-red-500 text-xs mt-1">{errors.meetingType}</div>}
              </div>
              <div className="col-span-2">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-800 mb-1">Attendees <span className="text-[#FF0000]">*</span></label>
                    <MultiSelectDropdown
                      name="attendees"
                      value={attendees}
                      onChange={(v) => {
                        setAttendees(v);
                        if (errors.attendees && v.length) setErrors({ ...errors, attendees: undefined });
                      }}
                      options={attendeesOptions}
                      placeholder={attendeesOptions.length ? 'Please Search And Select Attendees' : 'Loading attendees...'}
                      multi={true}
                      horizontalScroll={true}
                    />
                    {errors.attendees && <div className="text-red-500 text-xs mt-1">{errors.attendees}</div>}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-800 mb-1">Agenda</label>
                    <input
                      type="text"
                      placeholder="Please Fill Meeting Agenda "
                      value={agenda}
                      onChange={(e) => setAgenda(e.target.value)}
                      className="border border-gray-200 focus:ring-blue-500 w-full px-3 py-2 rounded-lg bg-white text-gray-800"
                    />
                  </div>
                </div>
              </div>
              {/* Start and End DateTime pickers */}
              <div className="col-span-2">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-800 mb-1">Start Date & Time <span className="text-[#FF0000]">*</span></label>
                    <DatePicker
                      selected={startDateTime}
                      onChange={(dt: Date | null) => {
                        setStartDateTime(dt);
                        if (errors.startDateTime && dt) setErrors({ ...errors, startDateTime: undefined });
                      }}
                      showTimeSelect
                      timeIntervals={15}
                      dateFormat="yyyy-MM-dd HH:mm"
                      timeFormat="HH:mm"
                      placeholderText="yyyy-mm-dd HH:mm"
                      className="border border-gray-200 focus:ring-blue-500 w-full px-3 py-2 rounded-lg bg-white text-gray-800 w-full"
                      wrapperClassName="w-full"
                      popperPlacement="bottom-start"
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      minDate={new Date()}
                    />
                    {errors.startDateTime && <div className="text-red-500 text-xs mt-1">{errors.startDateTime}</div>}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-800 mb-1">End Date & Time <span className="text-[#FF0000]">*</span></label>
                    <DatePicker
                      selected={endDateTime}
                      onChange={(dt: Date | null) => {
                        setEndDateTime(dt);
                        if (errors.endDateTime && dt) setErrors({ ...errors, endDateTime: undefined });
                      }}
                      showTimeSelect
                      timeIntervals={15}
                      dateFormat="yyyy-MM-dd HH:mm"
                      timeFormat="HH:mm"
                      placeholderText="yyyy-mm-dd HH:mm"
                      className="border border-gray-200 focus:ring-blue-500 w-full px-3 py-2 rounded-lg bg-white text-gray-800 w-full"
                      wrapperClassName="w-full"
                      popperPlacement="bottom-start"
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      minDate={startDateTime || new Date()}
                    />
                    {errors.endDateTime && <div className="text-red-500 text-xs mt-1">{errors.endDateTime}</div>}
                  </div>
                </div>
              </div>
              <div className="col-span-2 lg:col-span-1">
                <label className="block text-sm text-gray-800 mb-1">Add Title <span className="text-[#FF0000]">*</span></label>
                <input
                  type="text"
                  placeholder="Please Fill Meeting Title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errors.title && e.target.value) setErrors({ ...errors, title: undefined });
                  }}
                  className="border border-gray-200 focus:ring-blue-500 w-full px-3 py-2 rounded-lg bg-white text-gray-800"
                />
                {errors.title && <div className="text-red-500 text-xs mt-1">{errors.title}</div>}
              </div>
              {/* Meeting Location and Agenda side by side */}
              <div className="col-span-2 lg:col-span-1">
                <label className="block text-sm text-gray-800 mb-1">Meeting Location</label>
                <input
                  type="text"
                  placeholder="Please Fill Meeting Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="border border-gray-200 focus:ring-blue-500 w-full px-3 py-2 rounded-lg bg-white text-gray-800"
                />
              </div>

            </div>
            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 btn-primary text-white rounded-lg shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                data-btn-label="Save"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MeetingSchedule;
