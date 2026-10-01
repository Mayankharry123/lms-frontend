import { useSidebarMenu } from '../../hooks/SidebarMenuHooks';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import LogoutIcon from '../../assets/icons/LogoutIcon';
import { BrandLogo } from '../brand';
import type { NavigationItem } from '../../services/Side';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch, RootState } from '../../redux/store';
import { toggleExpandedItem, setExpandedItems } from '../../redux/slices/sidebarSlice';
import { logoutUser } from '../../redux/slices/authSlice';

interface SidebarProps {
  isMobile?: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobile = false, mobileOpen = false, onCloseMobile }) => {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const navigate = useNavigate();
  const isCollapsed = useSelector((state: RootState) => state.sidebar.isCollapsed);
  const expandedItems = useSelector((state: RootState) => state.sidebar.expandedItems);
  const { sidebarMenu: navigationItems } = useSidebarMenu();
  const [showMobilePopup, setShowMobilePopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowMobilePopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCloseMobile) onCloseMobile();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isMobile, onCloseMobile]);

  const routeAliases = useMemo<Record<string, string>>(
    () => ({
      '/lead-management/create': '/lead-management/all-leads',
      '/user-management/permission/create': '/user-management/permission',
      '/user-management/role/create': '/user-management/role',
      '/user-management/user/create': '/user-management/user',
      '/brief/plan-submission': '/brief/log',
    }),
    []
  );

  const getEffectivePath = useCallback(
    (pathname: string) => {
      if (pathname.match(/^\/user-management\/(permission|role|user)\/edit\//)) {
        const match = pathname.match(/^\/user-management\/(\w+)\/edit\//);
        if (match) return `/user-management/${match[1]}`;
      }
      if (pathname.match(/^\/lead-management\/edit\//)) return '/lead-management/all-leads';
      if (pathname.match(/^\/lead-management\/chat\//)) return '/lead-management/all-leads';
      if (pathname.match(/^\/lead-management\/\d+$/)) return '/lead-management/all-leads';
      if (pathname.match(/^\/brief\/edit-submitted-plan\//)) return '/brief/log';
      if (pathname.match(/^\/brief\/plan-history\//)) return '/brief/log';
      if (pathname.match(/^\/brief\/plan-submission\//)) return '/brief/log';
      if (
        pathname.match(
          /^\/brief\/(?!create|log|Brief_Pipeline|plan-history|plan-submission|edit-submitted-plan)[^/]+$/
        )
      ) {
        return '/brief/Brief_Pipeline';
      }
      return routeAliases[pathname] ?? pathname;
    },
    [routeAliases]
  );

  const isActive = (path: string) => {
    const effective = getEffectivePath(location.pathname);
    return effective === path || effective.startsWith(path + '/');
  };

  const isParentActive = (item: NavigationItem) => {
    if (item.path) return isActive(item.path);
    if (item.children) return item.children.some((child) => child.path && isActive(child.path));
    return false;
  };

  useEffect(() => {
    const effectivePath = getEffectivePath(location.pathname);
    const activeParents = navigationItems
      .filter(
        (item) =>
          item.children &&
          item.children.some((child) => {
            if (!child.path) return false;
            return effectivePath === child.path || effectivePath.startsWith(child.path + '/');
          })
      )
      .map((item) => item.name.toLowerCase().replace(/\s+/g, '-'));

    if (location.pathname === '/pre-lead/create') {
      const missCampaignSlug = navigationItems
        .find((item) => item.name === 'Pre Lead')
        ?.name.toLowerCase()
        .replace(/\s+/g, '-');
      if (missCampaignSlug && !activeParents.includes(missCampaignSlug)) {
        activeParents.push(missCampaignSlug);
      }
    }
    dispatch(setExpandedItems(activeParents));
  }, [location.pathname, navigationItems, dispatch, getEffectivePath]);

  const toggleExpanded = (itemName: string) => {
    dispatch(toggleExpandedItem(itemName));
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const slug = item.name.toLowerCase().replace(/\s+/g, '-');
    const isExpanded = expandedItems.includes(slug);
    const isItemActive = isParentActive(item);
    const IconComponent = item.icon;

    const isMissCampaignRoute = location.pathname === '/pre-lead/create';
    const isMissCampaign = item.name === 'Pre Lead';
    const isLiveCampaign = item.name === 'Live Campaign';
    const isBriefCreateRoute = location.pathname === '/brief/create';
    const isBriefRoute = location.pathname.startsWith('/brief');
    const isBrief = item.name.trim() === 'Brief' || item.name.trim() === 'Brief ';

    const active =
      (isMissCampaignRoute && (isMissCampaign || isLiveCampaign)) ||
      ((isBriefRoute || isBriefCreateRoute) && isBrief) ||
      isItemActive;

    const navClass = [
      'app-nav-item',
      level > 0 ? 'app-nav-item--child' : '',
      active ? 'app-nav-item--active' : '',
      isCollapsed && !isMobile ? 'justify-center px-2' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const handleCardClick = () => {
      if (hasChildren) {
        if (isCollapsed && item.name === 'Master Data') {
          setShowMobilePopup(!showMobilePopup);
        } else {
          toggleExpanded(slug);
        }
      } else if (item.path) {
        navigate(item.path);
        if (isMobile && onCloseMobile) onCloseMobile();
      }
    };

    return (
      <div key={item.name}>
        <div className={navClass} onClick={handleCardClick} title={isCollapsed ? item.name : undefined}>
          <div className={`flex min-w-0 flex-1 items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-2.5'}`}>
            {item.icon_file ? (
              <img
                src={item.icon_file}
                alt=""
                className="h-4 w-4 shrink-0 object-contain opacity-80"
              />
            ) : (
              IconComponent && <IconComponent className="h-4 w-4 shrink-0 opacity-80" />
            )}
            {(!isCollapsed || isMobile) && <span className="truncate">{item.name}</span>}
          </div>

          {hasChildren && (!isCollapsed || isMobile) && (
            <ChevronRight
              className={`h-4 w-4 shrink-0 text-[var(--text-nav-muted)] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            />
          )}
        </div>

        {hasChildren && isCollapsed && showMobilePopup && item.name === 'Master Data' && (
          <div
            ref={popupRef}
            className="app-dropdown fixed left-[4.25rem] top-14 z-50 min-w-[200px] py-1"
          >
            {item.children?.map((child) => (
              <Link
                key={child.name}
                to={child.path || ''}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-nav)] hover:bg-[var(--nav-hover)]"
                onClick={() => setShowMobilePopup(false)}
              >
                {child.icon_file ? (
                  <img src={child.icon_file} alt="" className="h-4 w-4 object-contain" />
                ) : (
                  child.icon && <child.icon className="h-4 w-4" />
                )}
                {child.name}
              </Link>
            ))}
          </div>
        )}

        {hasChildren && (!isCollapsed || isMobile) && (
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
          >
            <div className="mt-0.5 space-y-0.5">{item.children?.map((child) => renderNavigationItem(child, level + 1))}</div>
          </div>
        )}
      </div>
    );
  };

  const sidebarWidth = isCollapsed && !isMobile ? 'w-[4rem]' : 'w-64';
  const sidebarClasses = `app-sidebar sidebar-wrapper flex flex-col fixed left-0 top-0 z-40 h-full transition-all duration-300 ease-in-out ${sidebarWidth}`;

  if (isMobile) {
    return (
      <aside
        aria-hidden={!mobileOpen}
        className={`${sidebarClasses} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        ref={popupRef}
      >
        <div className="app-sidebar-topbar">
          <BrandLogo variant="sidebar" />
        </div>
        <nav className="app-sidebar-nav">{navigationItems.map((item) => renderNavigationItem(item))}</nav>
        <div className="app-sidebar-footer">
          <button
            type="button"
            onClick={() => {
              handleLogout();
              onCloseMobile?.();
            }}
            className="app-nav-item w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <LogoutIcon className="h-4 w-4 shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    );
  }

  return (
      <aside className={sidebarClasses}>
      <div className="app-sidebar-topbar">
        <BrandLogo variant="sidebar" collapsed={isCollapsed} />
      </div>

      <nav className="app-sidebar-nav hide-scrollbar">
        <div className="space-y-0.5">{navigationItems.map((item) => renderNavigationItem(item))}</div>
      </nav>

      <div className="app-sidebar-footer">
        <button
          type="button"
          onClick={handleLogout}
          className={`app-nav-item w-full text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 ${isCollapsed ? 'justify-center px-2' : ''}`}
          title={isCollapsed ? 'Log out' : undefined}
        >
          <LogoutIcon className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
