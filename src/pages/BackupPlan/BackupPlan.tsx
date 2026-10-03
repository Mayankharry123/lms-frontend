/**
 * @file BackupPlan.tsx
 * @description Backup Plan list UI. Sample rows only — no API.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import MasterHeader from '../../components/ui/MasterHeader';
import TableHeader from '../../components/ui/TableHeader';
import SearchBar from '../../components/ui/SearchBar';
import Table, { type Column } from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import FilePreviewModal from '../../components/ui/FilePreviewModal';
import StatusDropdown from '../../components/ui/StatusDropdown';
import AssignDropdown from '../../components/ui/AssignDropdown';
import PageBackHeader from '../../components/ui/PageBackHeader';
import Badge from '../../components/ui/Badge';
import { fetchOperationStatuses } from '../../services/OperationStatus';

type BackupPlanStatus = string;

type BackupPlanRow = {
  id: string;
  planId: string;
  briefName: string;
  productName: string;
  campaignStartDate: string;
  campaignEndDate: string;
  salesUserName: string;
  plannerName: string;
  assignUser: string;
  status: BackupPlanStatus;
  fileName: string | null;
};

const SAMPLE_PLANS: BackupPlanRow[] = [
  {
    id: '312',
    planId: '#312',
    briefName: 'Mayank Brief',
    productName: 'XYZ',
    campaignStartDate: '03 Oct 2026',
    campaignEndDate: '15 Oct 2026',
    salesUserName: 'Mayank Sharma',
    plannerName: 'Aryan Sharma',
    assignUser: 'Aryan Sharma',
    status: 'Live',
    fileName: 'backup-plan-312.xlsx',
  },
  {
    id: '311',
    planId: '#311',
    briefName: 'Mobiyoung Brief',
    productName: 'LAVA',
    campaignStartDate: '05 Oct 2026',
    campaignEndDate: '20 Oct 2026',
    salesUserName: 'Riya Kapoor',
    plannerName: 'Neha Verma',
    assignUser: 'Neha Verma',
    status: 'Pending',
    fileName: 'backup-plan-311.xlsx',
  },
  {
    id: '310',
    planId: '#310',
    briefName: 'Festival Launch',
    productName: 'AURA',
    campaignStartDate: '08 Oct 2026',
    campaignEndDate: '28 Oct 2026',
    salesUserName: 'Karan Mehta',
    plannerName: 'Aryan Sharma',
    assignUser: 'Priyanka',
    status: 'Pending',
    fileName: null,
  },
];

const ITEMS_PER_PAGE = 10;
const ASSIGN_USER_OPTIONS = [
  'Mayank Sharma',
  'Aryan Sharma',
  'Neha Verma',
  'Riya Kapoor',
  'Priyanka',
  'Atul',
  'Achal Sharma',
];

const matchesQuery = (row: BackupPlanRow, query: string) => {
  const haystack = [
    row.planId,
    row.briefName,
    row.productName,
    row.campaignStartDate,
    row.campaignEndDate,
    row.salesUserName,
    row.plannerName,
    row.assignUser,
    row.status,
    row.fileName ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
};

const downloadPlanFile = (row: BackupPlanRow) => {
  if (!row.fileName) return;
  const contents = [
    'Plan ID,Brief Name,Product Name,Campaign Start Date,Campaign End Date,Sales User Name,Planner Name,Assign User,Status',
    [
      row.planId,
      row.briefName,
      row.productName,
      row.campaignStartDate,
      row.campaignEndDate,
      row.salesUserName,
      row.plannerName,
      row.assignUser,
      row.status,
    ].join(','),
  ].join('\n');
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = row.fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const BackupPlan: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<BackupPlanRow[]>(SAMPLE_PLANS);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewItem, setViewItem] = useState<BackupPlanRow | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

  const handleStatusChange = (id: string, status: string) => {
    const nextStatus = status.trim();
    if (!nextStatus) return;
    setPlans((current) =>
      current.map((row) => (row.id === id ? { ...row, status: nextStatus } : row))
    );
    setViewItem((current) =>
      current && current.id === id ? { ...current, status: nextStatus } : current
    );
  };

  const handleAssignUserChange = (id: string, assignUser: string) => {
    setPlans((current) =>
      current.map((row) => (row.id === id ? { ...row, assignUser } : row))
    );
    setViewItem((current) =>
      current && current.id === id ? { ...current, assignUser } : current
    );
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const statuses = await fetchOperationStatuses();
        if (!mounted) return;
        setStatusOptions(statuses.map((item) => item.name));
      } catch (err) {
        console.error('Failed to load operation statuses', err);
        if (mounted) setStatusOptions([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return plans;
    return plans.filter((row) => matchesQuery(row, query));
  }, [plans, searchQuery]);

  const totalItems = filtered.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageRows = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const openFile = (row: BackupPlanRow) => {
    if (!row.fileName) return;
    const file = new File(
      [`Backup plan file for ${row.planId} — ${row.briefName}`],
      row.fileName,
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );
    setPreviewFile(file);
  };

  const columns: Column<BackupPlanRow>[] = [
    {
      key: 'planId',
      header: <span>Plan ID</span>,
      className: 'whitespace-nowrap',
      render: (row) => row.planId,
    },
    {
      key: 'briefName',
      header: 'Brief Name',
      className: 'whitespace-nowrap overflow-hidden truncate',
      render: (row) => row.briefName,
    },
    {
      key: 'productName',
      header: 'Product Name',
      className: 'whitespace-nowrap overflow-hidden truncate',
      render: (row) => row.productName,
    },
    {
      key: 'campaignStartDate',
      header: 'Campaign Start Date',
      className: 'whitespace-nowrap',
      render: (row) => row.campaignStartDate,
    },
    {
      key: 'campaignEndDate',
      header: 'Campaign End Date',
      className: 'whitespace-nowrap',
      render: (row) => row.campaignEndDate,
    },
    {
      key: 'salesUserName',
      header: 'Sales User Name',
      className: 'whitespace-nowrap overflow-hidden truncate',
      render: (row) => row.salesUserName,
    },
    {
      key: 'plannerName',
      header: 'Planner Name',
      className: 'whitespace-nowrap overflow-hidden truncate',
      render: (row) => row.plannerName,
    },
    {
      key: 'assignUser',
      header: 'Assign User',
      className: 'min-w-[140px]',
      allowOverflow: true,
      render: (row) => {
        const options = ASSIGN_USER_OPTIONS.includes(row.assignUser)
          ? ASSIGN_USER_OPTIONS
          : [row.assignUser, ...ASSIGN_USER_OPTIONS].filter(Boolean);
        return (
          <div className="relative min-w-[140px]">
            <AssignDropdown
              value={row.assignUser}
              options={options}
              onChange={(nextUser) => handleAssignUserChange(row.id, nextUser)}
              onConfirm={async () => undefined}
            />
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      minWidth: 140,
      headerClassName: 'text-left',
      className: 'min-w-[140px] align-middle',
      allowOverflow: true,
      render: (row) => (
        <div className="relative min-w-[140px]">
          <StatusDropdown
            value={row.status}
            appearance="link"
            options={
              statusOptions.includes(row.status) || !row.status
                ? statusOptions
                : [row.status, ...statusOptions]
            }
            onChange={(nextStatus) => handleStatusChange(row.id, nextStatus)}
            onConfirm={async () => undefined}
          />
        </div>
      ),
    },
    {
      key: 'file',
      header: 'File',
      minWidth: 220,
      headerClassName: 'text-left',
      className: 'whitespace-nowrap align-middle',
      render: (row) => {
        if (!row.fileName) {
          return <span className="inline-flex h-7 items-center text-sm leading-none text-gray-400">-</span>;
        }
        return (
          <button
            type="button"
            onClick={() => openFile(row)}
            title={row.fileName}
            className="inline-flex h-7 items-center gap-1.5 text-left text-sm leading-none text-gray-800 hover:text-orange-600"
          >
            <FileText className="h-4 w-4 shrink-0 text-orange-600" aria-hidden />
            <span className="whitespace-nowrap">{row.fileName}</span>
          </button>
        );
      },
    },
  ];

  const detailFields: { label: string; value: React.ReactNode }[] = viewItem
    ? [
        { label: 'Plan ID', value: viewItem.planId },
        { label: 'Brief Name', value: viewItem.briefName },
        { label: 'Product Name', value: viewItem.productName },
        { label: 'Campaign Start Date', value: viewItem.campaignStartDate },
        { label: 'Campaign End Date', value: viewItem.campaignEndDate },
        { label: 'Sales User Name', value: viewItem.salesUserName },
        { label: 'Planner Name', value: viewItem.plannerName },
        { label: 'Assign User', value: viewItem.assignUser || '-' },
        {
          label: 'Status',
          value: <Badge status={viewItem.status}>{viewItem.status}</Badge>,
        },
        {
          label: 'File',
          value: viewItem.fileName ? (
            <button
              type="button"
              onClick={() => openFile(viewItem)}
              title={viewItem.fileName}
              className="inline-flex max-w-full items-center gap-1.5 text-left text-sm text-gray-800 hover:text-orange-600"
            >
              <FileText className="h-4 w-4 shrink-0 text-orange-600" aria-hidden />
              <span className="truncate">{viewItem.fileName}</span>
            </button>
          ) : (
            '-'
          ),
        },
      ]
    : [];

  if (viewItem) {
    return (
      <div className="flex-1 w-full max-w-full overflow-x-hidden">
        <PageBackHeader onBack={() => setViewItem(null)} title="Backup Plan" />

        <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
            <h3 className="text-lg font-semibold text-gray-800">Backup Plan</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 bg-gray-50 p-4 sm:grid-cols-2 sm:p-5">
            {detailFields.map((field) => (
              <div
                key={field.label}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-gray-200 bg-gray-100 px-4 py-3"
              >
                <div className="min-w-[140px] text-sm font-semibold text-black">{field.label} :</div>
                <div className="text-sm text-gray-600">{field.value}</div>
              </div>
            ))}
          </div>
        </div>

        <FilePreviewModal
          isOpen={Boolean(previewFile)}
          source={previewFile ? { kind: 'file', file: previewFile } : null}
          onClose={() => setPreviewFile(null)}
          panelClassName="!w-[95%] md:!w-[600px]"
          closeButtonClassName="btn-secondary"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
      <MasterHeader
        onCreateClick={() => undefined}
        showBreadcrumb
        showCreateButton={false}
        breadcrumbItems={[{ label: 'Backup Plan', isActive: true }]}
      />

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <TableHeader title="Backup Plan">
          <SearchBar
            delay={0}
            placeholder="Please Search Backup Plan"
            onSearch={(query: string) => {
              setSearchQuery(query);
              setCurrentPage(1);
            }}
          />
        </TableHeader>

        <div className="pt-0 overflow-visible">
          <Table
            data={pageRows}
            startIndex={startIndex}
            loading={loading}
            desktopOnMobile
            emptyMessage="No Backup Plans Found"
            keyExtractor={(row) => row.id}
            columns={columns}
            onView={(row) => setViewItem(row)}
            onDownload={downloadPlanFile}
            showViewWithoutPermission
          />
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />

      <FilePreviewModal
        isOpen={Boolean(previewFile)}
        source={previewFile ? { kind: 'file', file: previewFile } : null}
        onClose={() => setPreviewFile(null)}
        panelClassName="!w-[95%] md:!w-[600px]"
        closeButtonClassName="btn-secondary"
      />
    </div>
  );
};

export default BackupPlan;
