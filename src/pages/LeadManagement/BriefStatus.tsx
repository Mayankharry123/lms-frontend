/**
 * @file BriefStatus.tsx
 * @description Brief-status leads pipeline view.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React from 'react';
import LeadList from './LeadList';

// Render a single table containing both 'Brief Received' and 'Brief Pending' leads.
const BriefStatus: React.FC = () => {
  return <LeadList title="Brief Leads" filterStatus="Brief" />;
};

export default BriefStatus;
