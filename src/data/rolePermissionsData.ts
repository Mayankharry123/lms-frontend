export interface Permission {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  view?: boolean;
}

export interface Submodule {
  name: string;
  permissions: Permission;
}

export interface Module {
  name: string;
  submodules: Submodule[];
}

export const rolePermissionsData: Module[] = [
  {
    name: 'Dashboard',
    submodules: [
      {
        name: 'Admin Dash',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
      {
        name: 'Finance Dash',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
      {
        name: 'Operations Dash',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
      {
        name: 'Sales Dash',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
      {
        name: 'Planner Dash',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
    ],
  },
  {
    name: 'Master Data',
    submodules: [
      {
        name: 'Brand Master',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
      {
        name: 'Agency Master',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
      {
        name: 'Department Master',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
      {
        name: 'Designation Master',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
      {
        name: 'Industry Master',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
      {
        name: 'Lead Source',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
    ],
  },
  {
    name: 'Brief',
    submodules: [
      {
        name: 'Brief Pipeline',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
      {
        name: 'Create Brief Request',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
      {
        name: 'Planning Cycle',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
    ],
  },
  {
    name: 'Pre Lead',
    submodules: [
      {
        name: 'Create Pre Lead',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
          view: false,
        },
      },
    ],
  },
  {
    name: 'Campaign Management',
    submodules: [
      {
        name: 'All Campaign',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
    ],
  },
  {
    name: 'Finance',
    submodules: [
      {
        name: 'All Leads',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
      {
        name: 'Pending',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
      {
        name: 'Interested',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
      {
        name: 'Meeting Scheduled',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
      {
        name: 'Meeting',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
      {
        name: 'Brief Status',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
    ],
  },
  {
    name: 'User Management',
    submodules: [
      {
        name: 'Main Permissions',
        permissions: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
    ],
  },
];

export default rolePermissionsData;
