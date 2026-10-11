export type DashboardTabItem<T extends string> = {
  id: T;
  label: string;
  count?: number;
};

type DashboardTabNavProps<T extends string> = {
  tabs: DashboardTabItem<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
  ariaLabel?: string;
  className?: string;
};

function DashboardTabNav<T extends string>({
  tabs,
  activeTab,
  onChange,
  ariaLabel = 'Dashboard tabs',
  className = '',
}: DashboardTabNavProps<T>) {
  return (
    <nav className={`dashboard-tabs ${className}`} aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`dashboard-tab ${activeTab === tab.id ? 'is-active' : ''}`}
        >
          <span>{tab.label}</span>
          {typeof tab.count === 'number' ? (
            <span className="dashboard-tab__count">{tab.count}</span>
          ) : null}
        </button>
      ))}
    </nav>
  );
}

export default DashboardTabNav;
