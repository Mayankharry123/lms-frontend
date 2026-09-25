import React from 'react';
import Breadcrumb, { type BreadcrumbItem } from './Breadcrumb';
import { Plus } from 'lucide-react';
// import { usePermissions } from '../../hooks/SidebarMenuHooks';
import { usePermissions } from '../../hooks/SidebarMenuHooks';



interface MasterHeaderProps {
  onCreateClick: () => void;
  createButtonLabel?: string;
  breadcrumbItems?: BreadcrumbItem[];
  currentPageTitle?: string;
  showBreadcrumb?: boolean;
  onSignInClick?: () => void;
  signInButtonLabel?: string;
  showSignInButton?: boolean;
  signInIcon?: React.ReactNode;
  showCreateButton?: boolean;
  createPermissionSlug?: string;
  extraActions?: React.ReactNode;
}

const MasterHeader: React.FC<MasterHeaderProps> = ({ 
  onCreateClick, 
  createButtonLabel = 'Create New',
  breadcrumbItems,
  currentPageTitle,
  showBreadcrumb = true,
  onSignInClick,
  signInButtonLabel = 'Sign In',
  showSignInButton = false,
  signInIcon,
  showCreateButton = true,
  createPermissionSlug,
  extraActions,
}) => {
  const { hasPermission } = usePermissions();
  const canCreate = !createPermissionSlug ? false : hasPermission(createPermissionSlug);
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      {/* Left Side - Breadcrumb */}
      <div className="flex-1 min-w-0 flex items-center">
        {showBreadcrumb && (
          <Breadcrumb 
            items={breadcrumbItems}
            currentPageTitle={currentPageTitle}
          />
        )}
        {/* Show mobile-only icon inline with breadcrumb so breadcrumb+icon are in one row */}
        {showSignInButton && onSignInClick && signInIcon && (
          <span
            onClick={onSignInClick}
            role="button"
            aria-label="Meeting Schedule"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSignInClick(); }}
            className="inline-flex items-center ml-auto sm:hidden cursor-pointer"
          >
            {signInIcon}
          </span>
        )}
      </div>

      {/* Right Side - Extra actions, Sign In, and Create Buttons */}
      <div className="flex-1 w-full sm:w-auto flex flex-wrap justify-end gap-3">
        {extraActions}
        {showSignInButton && onSignInClick && (
          signInIcon ? (
            <span
              onClick={onSignInClick}
              role="button"
              aria-label="Meeting Schedule"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSignInClick(); }}
              className="flex-1 whitespace-nowrap sm:flex-0 hidden sm:inline-flex items-center justify-center cursor-pointer"
            >
              {signInIcon}
            </span>
          ) : (
            <button
              onClick={onSignInClick}
              className="flex-1 sm:flex-0 whitespace-nowrap flex items-center justify-center w-full sm:w-auto px-4 py-2.5 btn-primary text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              {signInButtonLabel}
            </button>
          )
        )}
        {showCreateButton && canCreate && (
          <button
            onClick={onCreateClick}
            className="btn-primary flex-1 sm:flex-0 whitespace-nowrap">
            <Plus className="w-5 h-5 text-white" />
            <span>{createButtonLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default MasterHeader;
