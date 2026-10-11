/**
 * @file MeetingDone.tsx
 * @description Completed-meeting leads pipeline view.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useMemo, useState } from 'react';
import LeadList from './LeadList';
import {
  MEETING_PIPELINE_STATUS_OPTIONS,
  type MeetingPipelineStatus,
} from '../../types/lead/lead.types';

const MeetingDone: React.FC = () => {
  const [selectedStatuses, setSelectedStatuses] = useState<MeetingPipelineStatus[]>([]);

  const toggleStatus = (status: MeetingPipelineStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((item) => item !== status)
        : [...prev, status]
    );
  };

  const leadListFilters = useMemo(() => {
    // Default (none selected) and both selected: show all meeting data
    if (
      selectedStatuses.length === 0 ||
      selectedStatuses.length === MEETING_PIPELINE_STATUS_OPTIONS.length
    ) {
      return {
        filterStatus: 'Meeting Done',
        extraStatuses: ['Meeting Scheduled'],
      };
    }

    return {
      filterStatus: selectedStatuses[0],
      extraStatuses: [] as string[],
    };
  }, [selectedStatuses]);

  const extraFilterActive =
    selectedStatuses.length > 0 &&
    selectedStatuses.length < MEETING_PIPELINE_STATUS_OPTIONS.length;

  const filterExtras = (
    <>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Meeting status
      </p>
      <div className="space-y-2">
        {MEETING_PIPELINE_STATUS_OPTIONS.map((status) => (
          <label key={status} className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-orange-600"
              checked={selectedStatuses.includes(status)}
              onChange={() => toggleStatus(status)}
            />
            {status}
          </label>
        ))}
      </div>
    </>
  );

  return (
    <LeadList
      title="Meetings"
      filterStatus={leadListFilters.filterStatus}
      extraStatuses={leadListFilters.extraStatuses}
      permissionStatus="Meeting Done"
      filterExtras={filterExtras}
      extraFilterActive={extraFilterActive}
    />
  );
};

export default MeetingDone;
