/**
 * @file EditMeeting.tsx
 * @description Edit an existing meeting record.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/ui/Breadcrumb';
import { showSuccess } from '../../utils/notifications';
import SelectField from '../../components/ui/SelectField';
import MultiSelectDropdown from '../../components/ui/MultiSelectDropdown';
import {
  fetchMeetingById,
  fetchLeadsDropdownOptions,
  fetchAttendeesDropdownOptions,
  updateMeeting
} from '../../services/EditMeeting';
import { IoIosArrowBack } from 'react-icons/io';


const EditMeeting: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<string>('');
  const [meetingType, setMeetingType] = useState<string>('');
  const [attendees, setAttendees] = useState<Array<{ id: string; name: string }>>([]);
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [startDateTime, setStartDateTime] = useState<string>('');
  const [endDateTime, setEndDateTime] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [agenda, setAgenda] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [leadOptions, setLeadOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [attendeesOptions, setAttendeesOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [attendeeNameMap, setAttendeeNameMap] = useState<Record<string, string>>({}); // Map ID to Name
  const [loading, setLoading] = useState<boolean>(true);
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

  useEffect(() => {
    // Fetch dropdown options
    const fetchOptions = async () => {
      try {
        const [leadsOpts, attendeesOpts] = await Promise.all([
          fetchLeadsDropdownOptions(),
          fetchAttendeesDropdownOptions(),
        ]);
        setLeadOptions(leadsOpts);
        setAttendeesOptions(attendeesOpts);
      } catch (error) {
        console.error('Error loading dropdown options:', error);
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    // Fetch meeting details by id and set form fields
    const fetchMeeting = async () => {
      try {
        setLoading(true);
        if (!id) return;

        const meetingFormData = await fetchMeetingById(String(id));
        const { lead: leadData, attendees: attendeesData, meetingData } = meetingFormData;

        // Validate lead data
        if (!leadData || !leadData.id) {
          console.warn('Lead data is missing or invalid:', leadData);
          showSuccess('Error: Lead information not found');
          return;
        }

        // Set lead
        setLead(String(leadData.id) || '');

        // Set attendees with id and name objects
        const attendeeObjects = (attendeesData || []).map((att) => ({
          id: String(att.id),
          name: att.name || `User ${att.id}`,
        })) || [];
        setAttendees(attendeeObjects);

        // Create name map from attendee objects
        const nameMap: Record<string, string> = {};
        attendeeObjects.forEach(att => {
          nameMap[att.id] = att.name;
        });
        setAttendeeNameMap(nameMap);

        // Create meeting attendee options with full details
        const meetingAttendeeOptions = attendeeObjects.map(att => ({
          value: att.id,
          label: att.name,
        }));

        // Update options with both existing and meeting attendees
        setAttendeesOptions(prev => {
          const existingMap = new Map(prev.map(opt => [opt.value, opt]));
          meetingAttendeeOptions.forEach(newOpt => {
            existingMap.set(newOpt.value, newOpt);
          });
          return Array.from(existingMap.values());
        });

        // Set attendee IDs synchronously with the options we just prepared
        setAttendeeIds(meetingAttendeeOptions.map(opt => opt.value));

        // Set meeting type
        setMeetingType(meetingData.type || '');

        // Handle both API field name variations (meetin_start_date vs meeting_start_date)
        const startDate = meetingData.meeting_start_date || meetingData.meetin_start_date || '';
        const endDate = meetingData.meeting_end_date || meetingData.meetin_end_date || '';

        setStartDateTime(String(startDate));
        setEndDateTime(String(endDate));
        setTitle(meetingData.title || '');
        setAgenda(meetingData.agenda || '');
        setLocation(meetingData.location || '');
      } catch (error) {
        console.error('Error fetching meeting:', error);
        showSuccess(`Error: Failed to load meeting details`);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMeeting();
    }
  }, [id]);

  const handleSave = async () => {
    const newErrors: typeof errors = {};
    if (!lead) newErrors.lead = 'Lead is required.';
    if (!meetingType) newErrors.meetingType = 'Meeting type is required.';
    if (!attendees.length) newErrors.attendees = 'At least one attendee is required.';
    if (!startDateTime) newErrors.startDateTime = 'Start date & time is required.';
    if (!endDateTime) newErrors.endDateTime = 'End date & time is required.';
    if (!title) newErrors.title = 'Title is required.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      const payload = {
        id,
        title,
        lead_id: String(lead),
        attendees_id: attendees.map((a) => Number(a.id)),
        type: meetingType,
        location,
        agenda,
        // API expects meetin_start_date and meetin_end_date (note the typo in field names)
        meetin_start_date: startDateTime,
        meetin_end_date: endDateTime,
        status: 1,
      };
      if (!id) return;
      await updateMeeting(String(id), payload as any);
      showSuccess('Meeting updated successfully!');
      navigate(-1);
    } catch (error: any) {
      showSuccess(`Error: ${error.message || 'Failed to update meeting'}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-800">Loading meeting details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 !animate-none !transition-none">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <Breadcrumb
          items={[
            { label: 'Lead Management', path: '/lead-management' },
            { label: 'Edit Meeting', isActive: true },
          ]}
        />

        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="font-semibold px-3 py-1 rounded-md flex items-center text-sm btn-primary text-white"
          >
            <IoIosArrowBack size={16} className="mr-1" />
            Go Back
          </button>
        </div>
      </div>

      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 bg-gray-50">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
            <div className="flex flex-wrap gap-4">
              <div className='w-full sm:w-[calc(50%-15px)]'>
                <label className="block text-sm text-gray-800 mb-1">Lead <span className="text-red-600">*</span></label>
                <SelectField
                  placeholder="Select Lead"
                  options={leadOptions}
                  value={lead}
                  onChange={(v) => {
                    setLead(String(v));
                    if (errors.lead && v) setErrors({ ...errors, lead: undefined });
                  }}
                  inputClassName="border border-gray-200 focus:ring-blue-500 w-full px-3 py-2 rounded-lg bg-white text-gray-600"
                />
                {errors.lead && <div className="text-red-500 text-xs mt-1">{errors.lead}</div>}
              </div>

              <div className='w-full sm:w-[calc(50%-15px)]'>
                <label className="block text-sm text-gray-800 mb-1">Meeting Type <span className="text-[#FF0000]">*</span></label>
                <SelectField
                  placeholder="Select Type"
                  options={meetingTypeOptions}
                  value={meetingType}
                  onChange={(v) => {
                    setMeetingType(String(v));
                    if (errors.meetingType && v) setErrors({ ...errors, meetingType: undefined });
                  }}
                  inputClassName="border border-gray-200 focus:ring-blue-500 w-full px-3 py-2 rounded-lg bg-white text-gray-600"
                />
                {errors.meetingType && <div className="text-red-500 text-xs mt-1">{errors.meetingType}</div>}
              </div>

              <div className='w-full sm:w-[calc(50%-15px)]'>
                <label className="block text-sm text-gray-800 mb-1">Attendees <span className="text-[#FF0000]">*</span></label>
                <MultiSelectDropdown
                  name="attendees"
                  value={attendeeIds}
                  onChange={(v) => {
                    const selectedAttendees = v.map((id) => {
                      const existing = attendees.find(att => att.id === id);
                      if (existing) return existing;
                      return {
                        id: String(id),
                        name: attendeeNameMap[id] || `User ${id}`,
                      };
                    });
                    setAttendees(selectedAttendees);
                    setAttendeeIds(v);
                    if (errors.attendees && v.length) setErrors({ ...errors, attendees: undefined });
                  }}
                  options={attendeesOptions}
                  labelMap={attendeeNameMap}
                  placeholder={attendeesOptions.length ? 'Please Search And Select Attendees' : 'Loading attendees...'}
                  multi={true}
                  horizontalScroll={true}
                />
                {errors.attendees && <div className="text-red-500 text-xs mt-1">{errors.attendees}</div>}
              </div>

              <div className='w-full sm:w-[calc(50%-15px)]'>
                <label className="block text-sm text-gray-800 mb-1">Agenda</label>
                <input
                  type="text"
                  placeholder="Please Fill Meeting Agenda "
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  className="border border-gray-200 focus:ring-blue-500 w-full px-3 py-2 rounded-lg bg-white text-gray-600"
                />
              </div>

              <div className='w-full sm:w-[calc(50%-15px)]'>
                <label className="block text-sm text-gray-800 mb-1">Start Date & Time <span className="text-[#FF0000]">*</span></label>
                <input
                  type="text"
                  placeholder="yyyy-mm-dd HH:mm"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  className="border border-gray-200 focus:ring-blue-500 w-full px-3 py-2 rounded-lg bg-white text-gray-600"
                />
                {errors.startDateTime && <div className="text-red-500 text-xs mt-1">{errors.startDateTime}</div>}
              </div>

              <div className='w-full sm:w-[calc(50%-15px)]'>
                <label className="block text-sm text-gray-800 mb-1">End Date & Time <span className="text-[#FF0000]">*</span></label>
                <input
                  type="text"
                  placeholder="yyyy-mm-dd HH:mm"
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                  className="border border-gray-200 focus:ring-blue-500 w-full px-3 py-2 rounded-lg bg-white text-gray-600"
                />
                {errors.endDateTime && <div className="text-red-500 text-xs mt-1">{errors.endDateTime}</div>}
              </div>



              <div className='w-full sm:w-[calc(50%-15px)]'>

                <label className="block text-sm text-gray-800 mb-1">Add Title <span className="text-[#FF0000]">*</span></label>
                <input
                  type="text"
                  placeholder="Please Fill Meeting Title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errors.title && e.target.value) setErrors({ ...errors, title: undefined });
                  }}
                  className="border border-gray-200 focus:ring-blue-500 w-full px-3 py-2 rounded-lg bg-white text-gray-600"
                />
                {errors.title && <div className="text-red-500 text-xs mt-1">{errors.title}</div>}
              </div>

              <div className='w-full sm:w-[calc(50%-15px)]'>
                <label className="block text-sm text-gray-800 mb-1">Meeting Location</label>
                <input
                  type="text"
                  placeholder="Please Fill Meeting Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="border border-gray-200 focus:ring-blue-500 w-full px-3 py-2 rounded-lg bg-white text-gray-600"
                />
              </div>
            </div>
            <div className="flex justify-end pt-6">
              <button
                type="submit"
                className="px-6 py-2 btn-primary text-white rounded-lg shadow-sm"
                data-btn-label="Save"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div >
    </div >
  );
};

export default EditMeeting;
