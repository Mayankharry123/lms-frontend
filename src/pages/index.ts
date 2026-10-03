/**
 * @file index.ts
 * @description Barrel exports for top-level application pages.
 * @author Sanjay Jangid <sanjay.jangid@dgtoohl.com>
 * @date 2026-05-25
 */

export { default as LoginCard } from './Auth/LoginCard';
export { default as Dashboard } from './Dashboard';
export { default as SalesDashboard } from './Dashboard/SalesDashboard';
export { default as PlannerDashboard } from './Dashboard/PlannerDashboard';
export { default as Courses } from './Courses';
export { default as Profile } from './Profile';
export { default as LeadSource } from './LeadSource';
export { default as AgencyMaster } from './AgencyMaster';
export { default as BrandMaster } from './BrandMaster';
export { default as IndustryMaster } from './IndustryMaster';
export { default as DesignationMaster } from './DesignationMaster';
export { default as DepartmentMaster } from './DepartmentMaster';
export { default as BriefLog } from './Brief/BriefLog';
export { default as PlanHistory } from './Brief/PlanHistory';
export { default as PlanSubmission } from './Brief/PlanSubmission';
export { default as EditSubmittedPlan } from './Brief/EditSubmittedPlan';
export { default as Notifications } from './Notifications';
export { default as BackupPlan } from './BackupPlan/BackupPlan';
export { MissCampaignView, MissCampaignCreate } from './MissCampaign';
