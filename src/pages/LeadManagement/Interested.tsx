/**
 * @file Interested.tsx
 * @description Interested-status leads pipeline view.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React from 'react';
import LeadList from './LeadList';

const Interested: React.FC = () => {
  return <LeadList title=" Interested" filterStatus="Interested" />;
};

export default Interested;
