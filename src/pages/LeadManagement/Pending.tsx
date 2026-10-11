/**
 * @file Pending.tsx
 * @description Pending-status leads pipeline view.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React from 'react';
import LeadList from './LeadList';

const Pending: React.FC = () => {
  return <LeadList title="Pending" filterStatus="Pending" />;
};

export default Pending;
