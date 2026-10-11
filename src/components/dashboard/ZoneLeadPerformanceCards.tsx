import React, { useMemo } from 'react';
import { ChevronRight, MapPin, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';
import type { SalesZoneLeadPerformance } from '../../services/DashboardCharts';
import { formatCount } from '../../utils/dashboardFormat';

type ZoneLeadPerformanceCardsProps = {
  data: SalesZoneLeadPerformance[];
  loading: boolean;
  organisationIds: string[];
};

const ZONE_COLORS = [
  {
    accent: '#2563eb', // Blue
    tint: '#eff6ff',
    border: '#bfdbfe',
    darkTint: 'rgba(37, 99, 235, 0.15)',
    darkBorder: 'rgba(37, 99, 235, 0.3)',
  },
  {
    accent: '#ea580c', // Orange
    tint: '#fff7ed',
    border: '#fed7aa',
    darkTint: 'rgba(234, 88, 12, 0.15)',
    darkBorder: 'rgba(234, 88, 12, 0.3)',
  },
  {
    accent: '#059669', // Emerald
    tint: '#ecfdf5',
    border: '#a7f3d0',
    darkTint: 'rgba(5, 150, 105, 0.15)',
    darkBorder: 'rgba(5, 150, 105, 0.3)',
  },
  {
    accent: '#7c3aed', // Violet
    tint: '#f5f3ff',
    border: '#ddd6fe',
    darkTint: 'rgba(124, 58, 237, 0.15)',
    darkBorder: 'rgba(124, 58, 237, 0.3)',
  },
  {
    accent: '#0891b2', // Cyan
    tint: '#ecfeff',
    border: '#a5f3fc',
    darkTint: 'rgba(8, 145, 178, 0.15)',
    darkBorder: 'rgba(8, 145, 178, 0.3)',
  },
];

export default function ZoneLeadPerformanceCards({
  data,
  loading,
  organisationIds,
}: ZoneLeadPerformanceCardsProps) {
  const navigate = useNavigate();
  const zones = useMemo(() => data ?? [], [data]);

  const { totalLeads, maxLeads, activeZonesCount } = useMemo(() => {
    let total = 0;
    let max = 0;
    let active = 0;
    for (const zone of zones) {
      const count = Number(zone.assignedLeads) || 0;
      total += count;
      if (count > max) max = count;
      if (count > 0) active += 1;
    }
    return { totalLeads: total, maxLeads: max, activeZonesCount: active };
  }, [zones]);

  const handleZoneClick = (zone: SalesZoneLeadPerformance) => {
    const params = new URLSearchParams();
    organisationIds.forEach((organisationId) => params.append('organisation_id[]', organisationId));
    params.set('zone_name', zone.zoneName);
    const query = params.toString();
    navigate(`${ROUTES.DASHBOARD_ZONE_DETAIL(zone.zoneId)}${query ? `?${query}` : ''}`);
  };

  return (
    <section className="dashboard-zone-performance" aria-label="Zone-wise Lead Performance">
      <div className="dashboard-zone-performance__header">
        <div className="dashboard-zone-performance__header-title-wrap">
          <div className="dashboard-zone-performance__header-icon" aria-hidden="true">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2>Zone-wise Assigned Leads</h2>
            <p>Assigned leads distribution across organisation zones.</p>
          </div>
        </div>

        {!loading && zones.length > 0 ? (
          <div className="dashboard-zone-performance__header-stats">
            <span className="dashboard-zone-performance__header-chip">
              <strong>{formatCount(totalLeads)}</strong> Total Assigned Leads
            </span>
            <span className="dashboard-zone-performance__header-chip">
              <strong>{activeZonesCount}</strong> of {zones.length} Zones Active
            </span>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="dashboard-zone-performance__grid" aria-busy="true">
          {[1, 2, 3, 4, 5].map((key) => (
            <div key={key} className="dashboard-zone-performance__skeleton" />
          ))}
        </div>
      ) : zones.length === 0 ? (
        <div className="dashboard-zone-performance__empty">
          <MapPin className="dashboard-zone-performance__empty-icon" aria-hidden="true" />
          <p className="font-semibold text-slate-700 dark:text-slate-300">No zone data available</p>
          <span className="text-sm">No zones or assigned leads found for the selected organisation filters.</span>
        </div>
      ) : (
        <div className="dashboard-zone-performance__grid">
          {zones.map((zone, index) => {
            const color = ZONE_COLORS[index % ZONE_COLORS.length];
            const hasLeads = zone.assignedLeads > 0;
            const isTopZone = hasLeads && zone.assignedLeads === maxLeads && zones.length > 1;
            const sharePercent = totalLeads > 0 ? Math.round((zone.assignedLeads / totalLeads) * 100) : 0;
            const barFillWidth = hasLeads ? Math.max(sharePercent, 6) : 0;

            return (
              <article
                className={`dashboard-zone-performance__card ${hasLeads ? 'has-leads' : ''} ${isTopZone ? 'is-top-zone' : ''}`}
                key={zone.zoneId || zone.zoneName}
                style={
                  {
                    '--zone-accent': color.accent,
                    '--zone-tint': color.tint,
                    '--zone-border': color.border,
                    '--zone-dark-tint': color.darkTint,
                    '--zone-dark-border': color.darkBorder,
                  } as React.CSSProperties
                }
              >
                <div className="dashboard-zone-performance__card-top">
                  <span className="dashboard-zone-performance__pin" aria-hidden="true">
                    <MapPin />
                  </span>

                  {isTopZone ? (
                    <span className="dashboard-zone-performance__badge dashboard-zone-performance__badge--top" title="Highest lead volume">
                      <TrendingUp className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      Top Zone
                    </span>
                  ) : hasLeads ? (
                    <span className="dashboard-zone-performance__badge dashboard-zone-performance__badge--share">
                      {sharePercent}%
                    </span>
                  ) : (
                    <span className="dashboard-zone-performance__badge dashboard-zone-performance__badge--empty">
                      No Leads
                    </span>
                  )}
                </div>

                <div className="dashboard-zone-performance__zone-name">
                  <h3 title={zone.zoneName}>{zone.zoneName}</h3>
                </div>

                <div className="dashboard-zone-performance__metrics">
                  <span className="dashboard-zone-performance__label">Assigned Leads</span>
                  <div className="dashboard-zone-performance__count-row">
                    <span className="dashboard-zone-performance__count">
                      {formatCount(zone.assignedLeads)}
                    </span>
                    {hasLeads ? (
                      <span className="dashboard-zone-performance__share-text">
                        {sharePercent}% of total
                      </span>
                    ) : (
                      <span className="dashboard-zone-performance__share-text text-slate-400 dark:text-slate-600">
                        0% of total
                      </span>
                    )}
                  </div>

                  <div className="dashboard-zone-performance__bar-track" aria-hidden="true">
                    <div
                      className="dashboard-zone-performance__bar-fill"
                      style={{ width: `${barFillWidth}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="dashboard-zone-performance__card-footer"
                  onClick={() => handleZoneClick(zone)}
                  aria-label={`View details for ${zone.zoneName}`}
                >
                  <span>
                    {hasLeads
                      ? `View ${formatCount(zone.assignedLeads)} ${zone.assignedLeads === 1 ? 'Lead' : 'Leads'}`
                      : 'View Zone Details'}
                  </span>
                  <ChevronRight aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}