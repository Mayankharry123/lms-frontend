import React from 'react';
import { ChevronRight, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';
import type { SalesZoneLeadPerformance } from '../../services/DashboardCharts';
import { formatCount } from './chartShared';

type ZoneLeadPerformanceCardsProps = {
  data: SalesZoneLeadPerformance[];
  loading: boolean;
  organisationIds: string[];
};

const ZONE_COLORS = [
  { accent: '#3b82f6', tint: '#eff6ff' },
  { accent: '#f97316', tint: '#fff7ed' },
  { accent: '#10b981', tint: '#ecfdf5' },
  { accent: '#8b5cf6', tint: '#f5f3ff' },
  { accent: '#14b8a6', tint: '#f0fdfa' },
];

export default function ZoneLeadPerformanceCards({ data, loading, organisationIds }: ZoneLeadPerformanceCardsProps) {
  const navigate = useNavigate();
  const zones = data;

  return (
    <section className="dashboard-zone-performance">
      <div className="dashboard-zone-performance__header">
        <div>
          <h2>Zone-wise Lead Performance</h2>
          <p>Assigned leads distribution across organisation zones.</p>
        </div>
      </div>

      {loading ? <div className="dashboard-zone-performance__empty">Loading zone performance...</div> : null}
      {!loading ? (
        <div className="dashboard-zone-performance__grid">
          {zones.map((zone, index) => {
            const color = ZONE_COLORS[index % ZONE_COLORS.length];
            const hasLeads = zone.assignedLeads > 0;
            return (
              <article
                className={`dashboard-zone-performance__card ${hasLeads ? 'has-leads' : ''}`}
                key={zone.zoneId || zone.zoneName}
                style={{ '--zone-accent': color.accent, '--zone-tint': color.tint } as React.CSSProperties}
              >
                <div className="dashboard-zone-performance__card-top">
                  <div className="dashboard-zone-performance__zone-name">
                    <span className="dashboard-zone-performance__dot" aria-hidden="true" />
                    <h3>{zone.zoneName}</h3>
                  </div>
                  <span className="dashboard-zone-performance__pin" aria-hidden="true"><MapPin /></span>
                </div>
                <div className="dashboard-zone-performance__label">ASSIGNED LEADS</div>
                <div className="dashboard-zone-performance__count">{formatCount(zone.assignedLeads)}</div>
                <button
                  type="button"
                  className="dashboard-zone-performance__card-footer"
                  onClick={() => {
                    const params = new URLSearchParams();
                    organisationIds.forEach((organisationId) => params.append('organisation_id[]', organisationId));
                    params.set('zone_name', zone.zoneName);
                    const query = params.toString();
                    navigate(`${ROUTES.DASHBOARD_ZONE_DETAIL(zone.zoneId)}${query ? `?${query}` : ''}`);
                  }}
                  aria-label={`View details for ${zone.zoneName}`}
                >
                  <span>{hasLeads ? `View ${formatCount(zone.assignedLeads)} ${zone.assignedLeads === 1 ? 'lead' : 'leads'}` : 'View details'}</span>
                  <ChevronRight aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}