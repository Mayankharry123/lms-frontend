import type { MeetingScheduleItem } from './MeetingSchedule';
import type { LeadItem } from './AllLeads';
import type { User as UserItem } from './AllUsers';
import { apiClient } from '../utils/apiClient';
import { listLeads } from './AllLeads';
import { getAllUsers } from './AllUsers';

export interface MeetingFormData {
  lead: LeadItem;
  attendees: UserItem[];
  meetingData: MeetingScheduleItem & {
    meetin_start_date?: string;
    meetin_end_date?: string;
  };
}

export const fetchMeetingById = async (id: string): Promise<MeetingFormData> => {
    try {
        const response = await apiClient.get(`/meetings/${id}`);
        const rawMeetingData = response.data as any;

        console.log('Raw meeting data:', rawMeetingData); // Debug log

        // Extract lead data
        const leadData: LeadItem = {
          id: rawMeetingData.lead?.id || rawMeetingData.lead_id || '',
          name: rawMeetingData.lead?.name || '',
          email: rawMeetingData.lead?.email || '',
        };

        // Extract attendees data - the API returns attendees_id as array of IDs
        // We need to fetch the attendee details separately if not included
        let attendeesData: UserItem[] = [];
        
        if (Array.isArray(rawMeetingData.attendees) && rawMeetingData.attendees.length > 0) {
          // If attendees array with details is returned
          attendeesData = rawMeetingData.attendees.map((att: any) => ({
            id: String(att.id),
            name: att.name || att.full_name || att.firstname || '',
            email: att.email || '',
          }));
        } else if (Array.isArray(rawMeetingData.attendees_id) && rawMeetingData.attendees_id.length > 0) {
          // If only attendees_id array is returned, fetch attendee details
          try {
            const allAttendees = await getAllUsers();
            const attendeeMap = new Map(
              allAttendees.map((user: any) => [String(user.id), user])
            );
            
            attendeesData = rawMeetingData.attendees_id.map((attendeeId: number | string) => {
              const attendeeInfo = attendeeMap.get(String(attendeeId));
              return {
                id: String(attendeeId),
                name: attendeeInfo?.name || `User ${attendeeId}`,
                email: '',
              };
            });
          } catch (err) {
            console.error('Error fetching attendee details:', err);
            // Fallback to just IDs if fetch fails
            attendeesData = (rawMeetingData.attendees_id || []).map((attendeeId: number | string) => ({
              id: String(attendeeId),
              name: `User ${attendeeId}`,
              email: '',
            }));
          }
        }

        // Extract meeting data with normalized field names
        const meetingData: any = {
          id: String(rawMeetingData.id),
          title: rawMeetingData.title || '',
          type: rawMeetingData.type || '',
          location: rawMeetingData.location || '',
          agenda: rawMeetingData.agenda || '',
          link: rawMeetingData.link || '',
          status: rawMeetingData.status || '1',
          created_at: rawMeetingData.created_at || '',
          updated_at: rawMeetingData.updated_at || '',
          // API returns meetin_start_date and meetin_end_date (note the typo in API field names)
          meetin_start_date: rawMeetingData.meetin_start_date || '',
          meetin_end_date: rawMeetingData.meetin_end_date || '',
          // Also expose normalized versions for component compatibility
          meeting_start_date: rawMeetingData.meetin_start_date || rawMeetingData.meeting_start_date || '',
          meeting_end_date: rawMeetingData.meetin_end_date || rawMeetingData.meeting_end_date || '',
          lead_id: String(rawMeetingData.lead?.id || rawMeetingData.lead_id || ''),
          attendees_id: Array.isArray(rawMeetingData.attendees_id) 
            ? rawMeetingData.attendees_id 
            : (attendeesData.map((att: any) => Number(att.id)) || []),
        };

        return {
          lead: leadData,
          attendees: attendeesData,
          meetingData,
        };
    } catch (error) {
        console.error('Error fetching meeting data:', error);
        throw error;
    }
};

export const fetchLeadsDropdownOptions = async () => {
    try {
        const response = await listLeads(1, 100);
        return (response.data || []).map((lead) => ({
          value: String(lead.id),
          label: lead.name || `Lead ${lead.id}`,
        }));
    } catch (error) {
        console.error('Error fetching leads:', error);
        return [];
    }
};

export const fetchAttendeesDropdownOptions = async () => {
    try {
        const allUsers = await getAllUsers();
        return allUsers.map((user) => ({
          value: String(user.id),
          label: user.name || `User ${user.id}`,
        }));
    } catch (error) {
        console.error('Error fetching attendees:', error);
        return [];
    }
};

export const getAttendeeNameMap = async () => {
    try {
        const allUsers = await getAllUsers();
        const nameMap: Record<string, string> = {};
        allUsers.forEach((user) => {
          nameMap[String(user.id)] = user.name || `User ${user.id}`;
        });
        return nameMap;
    } catch (error) {
        console.error('Error fetching attendee name map:', error);
        return {};
    }
};

export const updateMeeting = async (id: string, meetingData: MeetingScheduleItem): Promise<MeetingScheduleItem> => {
    try {
        const response = await apiClient.put(`/meetings/${id}`, meetingData);
        return response.data as MeetingScheduleItem;
    } catch (error) {
        console.error('Error updating meeting data:', error);
        throw error;
    }
};
