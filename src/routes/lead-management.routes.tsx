import { Route } from 'react-router-dom';
import {
  AllLeads,
  CreateLead,
  EditLead,
  ViewLead,
  Pending,
  Interested,
  MeetingScheduled,
  MeetingDone,
  BriefStatus,
} from '../pages/LeadManagement';
import MeetingSchedule from '../pages/LeadManagement/MeetingSchedule';
import LeadChat from '../pages/LeadManagement/LeadChat';
import { ROUTE_SEGMENTS } from '../constants/routes';
import { permissionElement } from './PermissionElement';

export const leadManagementRoutes = (
  <>
    <Route path={ROUTE_SEGMENTS.LEAD_MANAGEMENT}>
      <Route index element={permissionElement(<AllLeads />)} />
      <Route path="all-leads" element={permissionElement(<AllLeads />)} />
      <Route path="brief-leads" element={permissionElement(<BriefStatus />)} />
      <Route path="pending" element={permissionElement(<Pending />)} />
      <Route path="interested" element={permissionElement(<Interested />)} />
      <Route path="meeting-scheduled" element={permissionElement(<MeetingScheduled />)} />
      <Route path="meetings" element={permissionElement(<MeetingDone />)} />
      <Route path="create" element={permissionElement(<CreateLead />)} />
      <Route path="chat/:id" element={permissionElement(<LeadChat />)} />
      <Route path="edit/:id" element={permissionElement(<EditLead />)} />
      <Route path=":id" element={permissionElement(<ViewLead />)} />
    </Route>
    <Route path={ROUTE_SEGMENTS.MEETING_SCHEDULE} element={permissionElement(<MeetingSchedule />)} />
  </>
);
