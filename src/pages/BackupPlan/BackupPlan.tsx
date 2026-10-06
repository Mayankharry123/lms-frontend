/**
 * @file BackupPlan.tsx
 * @description Backup Plan list. Rows come from GET /operations.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import MasterHeader from '../../components/ui/MasterHeader';
import TableHeader from '../../components/ui/TableHeader';
import SearchBar from '../../components/ui/SearchBar';
import ExportExcelButton from '../../components/ui/ExportExcelButton';
import Table, { type Column } from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import FilePreviewModal from '../../components/ui/FilePreviewModal';
import StatusDropdown from '../../components/ui/StatusDropdown';
import AssignDropdown from '../../components/ui/AssignDropdown';
import PageBackHeader from '../../components/ui/PageBackHeader';
import Badge from '../../components/ui/Badge';
import { fetchOperationStatuses } from '../../services/OperationStatus';
import { downloadOperationBackupPlan, listOperations, type OperationRow } from '../../services/Operations';
import { defaultDatedXlsxFilename, downloadBlobFile } from '../../utils/downloadFile';
import SweetAlert from '../../utils/SweetAlert';

type BackupPlanRow = OperationRow;

type PreviewSource =
  | { kind: 'file'; file: File }
  | { kind: 'remote'; url: string; name?: string }
  | null;

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

const exportBackupPlansExcel = (rows: BackupPlanRow[]) => {
  const headers = [
    'ID',
    'Brief Name',
    'Product Name',
    'Campaign Start Date',
    'Campaign End Date',
    'Sales User Name',
    'Planner Name',
    'Assign User',
    'Status',
    'File',
  ];
  const body = rows.map((row) => [
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
  ]);
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Backup Plan');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlobFile(defaultDatedXlsxFilename('backup-plan'), blob);
};

const downloadPlanFile = async (row: BackupPlanRow) => {
  if (!row.fileUrl && !row.fileName) return;
  try {
    await downloadOperationBackupPlan(row);
  } catch (err) {
    SweetAlert.showError(err instanceof Error ? err.message : 'Failed to download file');
  }
};

const BackupPlan: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<BackupPlanRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewItem, setViewItem] = useState<BackupPlanRow | null>(null);
  const [previewSource, setPreviewSource] = useState<PreviewSource>(null);
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
    let mounted = true;
    (async () => {
      try {
        const rows = await listOperations();
        if (mounted) setPlans(rows);
      } catch (err) {
        console.error('Failed to load backup plans', err);
        if (mounted) {
          setPlans([]);
          SweetAlert.showError(err instanceof Error ? err.message : 'Failed to load backup plans');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
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
    if (row.fileUrl) {
      setPreviewSource({ kind: 'remote', url: row.fileUrl, name: row.fileName ?? undefined });
      return;
    }
    if (!row.fileName) return;
    const file = new File(
      [`Backup plan file for ${row.planId} — ${row.briefName}`],
      row.fileName,
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );
    setPreviewSource({ kind: 'file', file });
  };

  const columns: Column<BackupPlanRow>[] = [
    {
      key: 'planId',
      header: <span>ID</span>,
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
        { label: 'ID', value: viewItem.planId },
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
          isOpen={Boolean(previewSource)}
          source={previewSource}
          onClose={() => setPreviewSource(null)}
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
      />

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <TableHeader title="Backup Plan">
          <ExportExcelButton
            className="w-full sm:w-auto"
            buttonClassName="btn-primary !bg-gray-800 w-full sm:w-auto"
            label="Excel Export"
            fetchExport={async () => {
              exportBackupPlansExcel(filtered);
            }}
            disabled={loading || filtered.length === 0}
            aria-label="Export backup plans as Excel"
          />
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
        isOpen={Boolean(previewSource)}
        source={previewSource}
        onClose={() => setPreviewSource(null)}
        panelClassName="!w-[95%] md:!w-[600px]"
        closeButtonClassName="btn-secondary"
      />
    </div>
  );
};

export default BackupPlan;
