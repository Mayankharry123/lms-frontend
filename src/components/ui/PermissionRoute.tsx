import { useSidebarMenu } from '../../hooks/SidebarMenuHooks';
import React from 'react';
import { PermissionDenied } from './index';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface PermissionRouteProps {
  children: React.ReactNode;
}

const PermissionRoute: React.FC<PermissionRouteProps> = ({ children }) => {
  const { allPermittedPaths, loading } = useSidebarMenu();
  const location = useLocation();
  const path = location.pathname;

  if (path === 'login' || path === '/login') return <>{children}</>;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-sm text-gray-500">Loading permissions...</p>
        </div>
      </div>
    );
  }

  function normalizePath(p: string): string {
    if (!p.startsWith('/')) p = '/' + p;
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p;
  }

  function matchPath(permittedPath: string, currentPath: string): boolean {
    const normPermitted = normalizePath(permittedPath);
    const normCurrent = normalizePath(currentPath);

    if (normPermitted === normCurrent) return true;

    const permittedSegments = normPermitted.split('/').filter(Boolean);
    const currentSegments = normCurrent.split('/').filter(Boolean);

    if (permittedSegments.length !== currentSegments.length) {
      return false;
    }

    const routeKeywords = new Set([
      'create', 'edit', 'view', 'delete', 'remove', 'update',
      'new', 'all', 'all-leads', 'list', 'pending', 'interested',
      'meeting-scheduled', 'meeting-done', 'brief-leads',
      'Brief_Pipeline', 'view'
    ]);

    for (let i = 0; i < permittedSegments.length; i++) {
      const permSegment = permittedSegments[i];
      const currSegment = currentSegments[i];

      if (permSegment.startsWith(':')) {
        if (routeKeywords.has(currSegment.toLowerCase())) {
          return false;
        }
      } else if (permSegment !== currSegment) {
        return false;
      }
    }

    return true;
  }

  const permissionPath =
    normalizePath(path) === '/dashboard/organisation-planner' ? '/dashboard' : path;

  const hasPermission = allPermittedPaths.some((permittedPath) =>
    matchPath(permittedPath, permissionPath)
  );

  if (!hasPermission && allPermittedPaths.length !== 0) {
    const safePath = allPermittedPaths.find((p) => !p.includes(':'));
    if (safePath) {
      return <Navigate to={safePath} replace />;
    }
  }

  if (hasPermission) {
    return <>{children}</>;
  }

  return <PermissionDenied />;
};

export default PermissionRoute;
