import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Receipt,
  Shield,
  Users,
} from 'lucide-react';
import { ROUTES } from '../../constants';
import type { PendingAssignmentCounts } from '../../services/Dashboard';

type PendingAssignmentItem = {
  key: keyof PendingAssignmentCounts;
  label: string;
  icon: React.ReactNode;
  tone: string;
  href: string;
};

const PENDING_ITEMS: PendingAssignmentItem[] = [
  { key: 'lead', label: 'Lead', icon: <Users />, tone: 'blue', href: ROUTES.LEAD.PENDING },
  { key: 'brief', label: 'Brief', icon: <FileText />, tone: 'orange', href: ROUTES.BRIEF.PIPELINE },
  { key: 'plan', label: 'Plan', icon: <ClipboardList />, tone: 'violet', href: ROUTES.BRIEF.LOG },
  { key: 'backupPlan', label: 'Backup Plan', icon: <Shield />, tone: 'teal', href: ROUTES.BACKUP_PLAN },
  { key: 'costSheets', label: 'Cost Sheets', icon: <FileSpreadsheet />, tone: 'amber', href: ROUTES.COST_SHEETS },
  { key: 'purchaseOrder', label: 'Purchase Order', icon: <Receipt />, tone: 'rose', href: ROUTES.PURCHASE_ORDER },
];

type PendingAssignmentsCardProps = {
  counts: PendingAssignmentCounts | null;
  loading?: boolean;
  embedded?: boolean;
};

const PendingAssignmentsCard: React.FC<PendingAssignmentsCardProps> = ({
  counts,
  loading = false,
  embedded = false,
}) => {
  const navigate = useNavigate();

  return (
    <section
      className={`dashboard-notifications-card ${embedded ? 'is-embedded' : ''}`}
      aria-label="Notifications"
    >
      <header className="dashboard-notifications-card__header">
        <div className="dashboard-notifications-card__icon" aria-hidden="true">
          <Bell />
        </div>
        <div>
          <h3 className="dashboard-notifications-card__title">Notifications</h3>
          <p className="dashboard-notifications-card__subtitle">Pending Assignment</p>
        </div>
      </header>

      <ul className="dashboard-notifications-list">
        {PENDING_ITEMS.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              className={`dashboard-notifications-item dashboard-notifications-item--${item.tone}`}
              onClick={() => navigate(item.href)}
            >
              <span className="dashboard-notifications-item__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="dashboard-notifications-item__label">{item.label}</span>
              <span className="dashboard-notifications-item__badge">
                {loading ? '—' : counts?.[item.key] ?? 0}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default PendingAssignmentsCard;
