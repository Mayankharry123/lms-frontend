import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  showHome?: boolean;
  currentPageTitle?: string;
}

const segmentNameMap: Record<string, string> = {
  'dashboard': 'Dashboard',
  'organisation-planner': 'Organisation Planner',
  'master': 'Master Data',
  'agency': 'Agency Master',
  'brand': 'Brand Master',
  'department': 'Department Master',
  'designation': 'Designation Master',
  'industry': 'Industry Master',
  'source': 'Lead Source',
  'lead-source': 'Lead Source',
  'sources': 'Lead Sources',
  'profile': 'My Profile',
  'login': 'Login',
  'courses': 'Course Management',
  'brief': 'Brief',
  'lead-management': 'Lead Management',
  'miss-campaign': 'Miss Campaign',
  'create': 'Create',
  'edit': 'Edit',
  'chat': 'Chat',
  'view': 'View',
};

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  showHome = true,
  currentPageTitle
}) => {
  const location = useLocation();
  const { pathname } = location;

  // If items are provided, use them directly
  if (items && items.length > 0) {
    return (
      <nav className="flex items-center space-x-2 text-sm breadcrumb-wrapper" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          {showHome && (
            <>
              <li>
                <Link
                className='text-gray-800 font-semibold'
                  to="/dashboard">
                  <Home className="w-4 h-4" />
                </Link>
              </li>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </>
          )}
          {items.map((item, index) => (
            <li key={index} className="flex items-center space-x-2">
              {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
              {item.path && !item.isActive ? (
                <Link
                  to={item.path}
                  className='text-gray-800 font-semibold'
                >
                  {item.label}
                </Link>
              ) : (
                <span className='text-orange-600' style={{ fontWeight: item.isActive ? 600 : 500 }}>
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  }

  // Auto-generate breadcrumbs from pathname
  const parts = pathname.split('/').filter(Boolean);

  const getCrumbs = (): BreadcrumbItem[] => {
    const crumbs: BreadcrumbItem[] = [];

    // Handle master routes
    if (pathname.startsWith('/master/')) {
      const masterType = parts[1]; // agency, brand, etc.
      const masterLabel = segmentNameMap[masterType] || masterType.charAt(0).toUpperCase() + masterType.slice(1);

      crumbs.push({
        label: 'Master Data',
        path: '/master',
      });

      crumbs.push({
        label: masterLabel,
        path: `/master/${masterType}`,
      });

      // Handle create/edit/view with ID
      if (parts.length > 2) {
        if (parts[2] === 'create') {
          crumbs.push({
            label: 'Create',
            isActive: true,
          });
        } else if (parts[3] === 'edit') {
          const id = decodeURIComponent(parts[2]);
          // For Lead Source, don't show raw id in breadcrumb.
          if (masterType !== 'source') {
            crumbs.push({
              label: `ID: ${id}`,
              path: `/master/${masterType}/${id}`,
            });
          }
          crumbs.push({
            label: 'Edit',
            isActive: true,
          });
        } else {
          // View mode
          if (masterType === 'source') {
            crumbs.push({
              label: 'View',
              isActive: true,
            });
          } else {
            const id = decodeURIComponent(parts[2]);
            crumbs.push({
              label: `ID: ${id}`,
              isActive: true,
            });
          }
        }
      }
      return crumbs;
    }

    // Handle lead-management routes
    if (pathname.startsWith('/lead-management')) {
      crumbs.push({
        label: 'Lead Management',
        path: '/lead-management',
      });
      // Determine specific lead-management subpage (all-leads, pending, interested, etc.)
      const sub = parts[1] || '';
      const subLabelMap: Record<string, string> = {
        'all-leads': 'All Leads',
        'pending': 'Pending',
        'interested': 'Interested',
        'meeting-scheduled': 'Meeting Scheduled',
        'meeting-done': 'Meeting Done',
      };

      if (pathname.includes('/create')) {
        crumbs.push({ label: 'Create', isActive: true });
      } else if (pathname.includes('/chat/')) {
        const id = pathname.split('/chat/')[1];
        crumbs.push({ label: 'All Leads', path: '/lead-management/all-leads' });
        crumbs.push({ label: id ? `Chat #${id}` : 'Chat', isActive: true });
      } else if (pathname.includes('/edit/')) {
        const id = pathname.split('/edit/')[1];
        crumbs.push({ label: `ID: ${id}`, path: `/lead-management/${id}` });
        crumbs.push({ label: 'Edit', isActive: true });
      } else if (sub && subLabelMap[sub]) {
        crumbs.push({ label: subLabelMap[sub], isActive: true });
      } else if (parts.length === 1 || sub === 'all-leads' || sub === '') {
        crumbs.push({ label: 'All Leads', isActive: true });
      } else if (parts.length > 1 && !subLabelMap[sub]) {
        // If it's a detail route like /lead-management/:id, show ID as active
        const id = parts[1];
        crumbs.push({ label: `ID: ${id}`, isActive: true });
      }
      return crumbs;
    }

    // Handle brief routes
    if (pathname.startsWith('/brief')) {
      crumbs.push({
        label: 'Brief',
        path: '/brief',
      });

      if (pathname.includes('/create')) {
        crumbs.push({
          label: 'Create',
          isActive: true,
        });
      } else if (pathname.includes('/edit')) {
        const id = parts[1];
        crumbs.push({
          label: `ID: ${id}`,
          path: `/brief/${id}`,
        });
        crumbs.push({
          label: 'Edit',
          isActive: true,
        });
      } else if (parts.length > 1 && parts[1] !== 'create') {
        const id = parts[1];
        crumbs.push({
          label: `ID: ${id}`,
          isActive: true,
        });
      }
      return crumbs;
    }

    // Handle pre-lead routes
    if (pathname.startsWith('/pre-lead')) {
      crumbs.push({
        label: 'Pre Lead',
        path: '/pre-lead/view',
      });

      if (pathname.includes('/create')) {
        crumbs.push({
          label: 'Create',
          isActive: true,
        });
      } else if (pathname.includes('/edit')) {
        const id = parts[2];
        crumbs.push({
          label: `ID: ${id}`,
          path: `/pre-lead/view/${id}`,
        });
        crumbs.push({
          label: 'Edit',
          isActive: true,
        });
      } else if (parts.length > 2) {
        const id = parts[2];
        crumbs.push({
          label: `ID: ${id}`,
          isActive: true,
        });
      }
      return crumbs;
    }

    // Handle user-management routes
    if (pathname.startsWith('/user-management')) {
      crumbs.push({
        label: 'User Management',
        path: '/user-management',
      });

      if (pathname.includes('/permission')) {
        crumbs.push({
          label: 'Permission',
          path: '/user-management/permission',
        });

        if (pathname.includes('/create')) {
          crumbs.push({
            label: 'Create',
            isActive: true,
          });
        } else if (pathname.includes('/edit/')) {
          const id = pathname.split('/edit/')[1];
          crumbs.push({
            label: `ID: ${id}`,
            path: `/user-management/permission`,
          });
          crumbs.push({
            label: 'Edit',
            isActive: true,
          });
        } else if (parts.length > 2) {
          const id = parts[2];
          crumbs.push({
            label: `ID: ${id}`,
            isActive: true,
          });
        } else {
          // Default to Permission as active
          crumbs[crumbs.length - 1] = {
            ...crumbs[crumbs.length - 1],
            isActive: true,
          };
        }
      } else if (pathname.includes('/role')) {
        crumbs.push({
          label: 'Role',
          path: '/user-management/role',
        });

        if (pathname.includes('/create')) {
          crumbs.push({
            label: 'Create',
            isActive: true,
          });
        } else if (pathname.includes('/edit/')) {
          const id = pathname.split('/edit/')[1];
          crumbs.push({
            label: `ID: ${id}`,
            path: `/user-management/role`,
          });
          crumbs.push({
            label: 'Edit',
            isActive: true,
          });
        } else if (parts.length > 2) {
          const id = parts[2];
          crumbs.push({
            label: `ID: ${id}`,
            isActive: true,
          });
        } else {
          // Default to Role as active
          crumbs[crumbs.length - 1] = {
            ...crumbs[crumbs.length - 1],
            isActive: true,
          };
        }
      } else if (pathname.includes('/user')) {
        crumbs.push({
          label: 'User',
          path: '/user-management/user',
        });

        if (pathname.includes('/create')) {
          crumbs.push({
            label: 'Create',
            isActive: true,
          });
        } else if (pathname.includes('/edit/')) {
          const id = pathname.split('/edit/')[1];
          crumbs.push({
            label: `ID: ${id}`,
            path: `/user-management/user`,
          });
          crumbs.push({
            label: 'Edit',
            isActive: true,
          });
        } else if (parts.length > 2) {
          const id = parts[2];
          crumbs.push({
            label: `ID: ${id}`,
            isActive: true,
          });
        } else {
          // Default to User as active
          crumbs[crumbs.length - 1] = {
            ...crumbs[crumbs.length - 1],
            isActive: true,
          };
        }
      }
      return crumbs;
    }

    // Default behavior for other paths
    const defaultCrumbs: BreadcrumbItem[] = [];
    parts.forEach((part, idx) => {
      const to = '/' + parts.slice(0, idx + 1).join('/');
      const name = segmentNameMap[part.toLowerCase()] ||
        part.replace(/[-_]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());

      defaultCrumbs.push({
        label: name,
        path: idx < parts.length - 1 ? to : undefined,
        isActive: idx === parts.length - 1,
      });
    });

    return defaultCrumbs;
  };

  const crumbs = getCrumbs();

  // If currentPageTitle is provided, replace the last crumb
  if (currentPageTitle && crumbs.length > 0) {
    crumbs[crumbs.length - 1] = {
      ...crumbs[crumbs.length - 1],
      label: currentPageTitle,
      isActive: true,
    };
  }

  // If no crumbs, show dashboard
  if (crumbs.length === 0) {
    return (
      <nav className="flex items-center space-x-2 text-sm breadcrumb-wrapper" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <Link
              to="/dashboard"
              className="text-orange-500 font-semibold" // active style
              aria-current="page"
            >
              Dashboard
            </Link>
          </li>
        </ol>
      </nav>
    );
  }

  return (
    <nav className="flex items-center space-x-2 text-sm breadcrumb-wrapper" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2 flex-wrap">
        {showHome && (
          <>
            <li>
              <Link
                to="/dashboard"
                className="text-orange-400 font-semibold"
                aria-label="Home"
              >
                <Home className="w-4 h-4" />
              </Link>
            </li>
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </>
        )}

        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1; // check if it's the last crumb
          const isActive = crumb.isActive || isLast;  // last item OR explicit active

          return (
            <li key={index} className="flex items-center space-x-2">
              {index > 0 && <ChevronRight className="w-4 h-4 text-black flex-shrink-0" />}

              {crumb.path && !isActive ? (
                <Link
                  to={crumb.path}
                  className="text-orange-400 font-medium hover:underline"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className={isActive ? "text-orange-500 font-semibold" : "text-orange-400 font-medium"}>
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
