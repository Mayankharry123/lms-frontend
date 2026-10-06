/**
 * @file CostSheets.tsx
 * @description Cost Sheets list. Uses the listing API when it is available.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { defaultDatedXlsxFilename, downloadBlobFile } from '../../utils/downloadFile';
import { ROUTES } from '../../constants';
import { listChildFinanceByBrief } from '../../api/lookups';
import {
  listCostSheets,
  updateCostSheetFinanceStatus,
  type CostSheetRow,
  type FinanceStatus,
} from '../../services/CostSheets';

const FINANCE_STATUSES: Array<Exclude<FinanceStatus, null>> = ['Approved', 'Denied'];
const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const ITEMS_PER_PAGE = 10;

const SAMPLE_COST_SHEETS: CostSheetRow[] = [
  {
    id: 'CS-001',
    costSheetId: 'CS-001',
    briefId: '#312',
    briefName: 'Mayank Brief',
    planId: '#312',
    plannerName: 'Aryan Sharma',
    submittedDate: '04 Oct 2026',
    assignBy: 'Mayank Sharma',
    assignTo: 'Finance Team',
    costSheetStatus: 'Submitted',
    financeStatus: 'Approved',
    fileName: 'cost-sheet-312.xlsx',
    fileUrl: null,
  },
  {
    id: 'CS-002',
    costSheetId: 'CS-002',
    briefId: '#311',
    briefName: 'Mobiyoung Brief',
    planId: '#311',
    plannerName: 'Neha Verma',
    submittedDate: '04 Oct 2026',
    assignBy: 'Achal Sharma',
    assignTo: 'Finance Team',
    costSheetStatus: 'Pending',
    financeStatus: null,
    fileName: 'cost-sheet-311.xlsx',
    fileUrl: null,
  },
];

type PreviewSource =
  | { kind: 'file'; file: File }
  | { kind: 'remote'; url: string; name?: string }
  | null;

const displayFinanceStatus = (status: FinanceStatus) => status ?? '-';

const normalizeBriefId = (value?: string | null) => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const digits = text.replace(/\D+/g, '');
  return digits || text;
};

const matchesQuery = (row: CostSheetRow, query: string) => {
  const haystack = [
    row.costSheetId,
    row.briefId,
    row.briefName,
    row.planId,
    row.plannerName,
    row.submittedDate,
    row.assignBy,
    row.assignTo,
    displayFinanceStatus(row.financeStatus),
    row.fileName ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
};

const sheetRows = (row: CostSheetRow) => [
  row.costSheetId,
  row.briefId,
  row.briefName,
  row.planId,
  row.plannerName,
  row.submittedDate,
  row.assignBy,
  row.assignTo,
  displayFinanceStatus(row.financeStatus),
  row.fileName ?? '',
];

const SHEET_HEADERS = [
  'Cost Sheet ID',
  'Brief ID',
  'Brief Name',
  'Plan ID',
  'Planner Name',
  'Submitted Date',
  'Assign By',
  'Finance User',
  'Finance Status',
  'File',
];

const workbookBuffer = (rows: CostSheetRow[]) => {
  const worksheet = XLSX.utils.aoa_to_sheet([SHEET_HEADERS, ...rows.map(sheetRows)]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cost Sheets');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
};

const exportCostSheetsExcel = (rows: CostSheetRow[]) => {
  const blob = new Blob([workbookBuffer(rows)], { type: EXCEL_MIME });
  downloadBlobFile(defaultDatedXlsxFilename('cost-sheets'), blob);
};

const rowWorkbookFile = (row: CostSheetRow) => {
  const buffer = workbookBuffer([row]);
  return new File([buffer], row.fileName || 'cost-sheet.xlsx', { type: EXCEL_MIME });
};

const CostSheets: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CostSheetRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewItem, setViewItem] = useState<CostSheetRow | null>(null);
  const [previewSource, setPreviewSource] = useState<PreviewSource>(null);
  const [assignOptionsByBriefId, setAssignOptionsByBriefId] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await listCostSheets();
        if (!mounted) return;
        setRows(data);
      } catch (err) {
        console.error('Cost sheets listing is not available yet', err);
        if (mounted) setRows(SAMPLE_COST_SHEETS);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const briefIds = Array.from(
      new Set(
        rows
          .map((row) => normalizeBriefId(row.briefId))
          .filter((briefId) => Boolean(briefId))
      )
    );

    if (!briefIds.length) {
      setAssignOptionsByBriefId({});
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const nextOptions: Record<string, string[]> = {};
        await Promise.all(
          briefIds.map(async (briefId) => {
            try {
              const users = await listChildFinanceByBrief(briefId);
              nextOptions[briefId] = Array.from(new Set(users.map((user) => user.name).filter(Boolean)));
            } catch (err) {
              console.error(`Failed to load finance users for brief ${briefId}`, err);
              nextOptions[briefId] = [];
            }
          })
        );
        if (mounted) setAssignOptionsByBriefId(nextOptions);
      } catch (err) {
        console.error('Failed to load finance users for cost sheets', err);
        if (mounted) setAssignOptionsByBriefId({});
      }
    })();

    return () => {
      mounted = false;
    };
  }, [rows]);

  const updateRow = (id: string, patch: Partial<CostSheetRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setViewItem((current) => (current && current.id === id ? { ...current, ...patch } : current));
  };

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => matchesQuery(row, query));
  }, [rows, searchQuery]);

  const totalItems = filtered.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageRows = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const openFile = (row: CostSheetRow) => {
    if (row.fileUrl) {
      setPreviewSource({ kind: 'remote', url: row.fileUrl, name: row.fileName ?? undefined });
      return;
    }
    if (!row.fileName) return;
    setPreviewSource({ kind: 'file', file: rowWorkbookFile(row) });
  };

  const downloadFile = (row: CostSheetRow) => {
    if (row.fileUrl) {
      const link = document.createElement('a');
      link.href = row.fileUrl;
      link.download = row.fileName || '';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
      return;
    }
    if (!row.fileName) return;
    const blob = new Blob([workbookBuffer([row])], { type: EXCEL_MIME });
    downloadBlobFile(row.fileName, blob);
  };

  const fileButton = (row: CostSheetRow) => {
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
  };

  const columns: Column<CostSheetRow>[] = [
    {
      key: 'costSheetId',
      header: 'Cost Sheet ID',
      className: 'whitespace-nowrap',
      render: (row) => row.costSheetId,
    },
    {
      key: 'briefId',
      header: 'Brief ID',
      className: 'whitespace-nowrap',
      render: (row) => row.briefId,
    },
    {
      key: 'briefName',
      header: 'Brief Name',
      className: 'whitespace-nowrap overflow-hidden truncate',
      render: (row) => row.briefName,
    },
    {
      key: 'planId',
      header: 'Plan ID',
      className: 'whitespace-nowrap',
      render: (row) => row.planId,
    },
    {
      key: 'plannerName',
      header: 'Planner Name',
      className: 'whitespace-nowrap overflow-hidden truncate',
      render: (row) => row.plannerName,
    },
    {
      key: 'submittedDate',
      header: 'Submitted Date',
      className: 'whitespace-nowrap',
      render: (row) => row.submittedDate,
    },
    {
      key: 'assignBy',
      header: 'Assign By',
      className: 'whitespace-nowrap overflow-hidden truncate',
      render: (row) => row.assignBy,
    },
    {
      key: 'assignTo',
      header: 'Finance User',
      className: 'min-w-[140px]',
      allowOverflow: true,
      render: (row) => {
        const briefKey = normalizeBriefId(row.briefId);
        const optionsFromBrief = briefKey ? assignOptionsByBriefId[briefKey] ?? [] : [];
        const options = optionsFromBrief.length
          ? optionsFromBrief.includes(row.assignTo)
            ? optionsFromBrief
            : [row.assignTo, ...optionsFromBrief].filter(Boolean)
          : [row.assignTo].filter(Boolean);

        return (
          <div className="relative min-w-[140px]">
            <AssignDropdown
              value={row.assignTo || 'Unassigned'}
              options={options.length ? options : ['Unassigned']}
              onChange={(nextUser) => updateRow(row.id, { assignTo: nextUser === 'Unassigned' ? '' : nextUser })}
              onConfirm={async (nextUser) => {
                updateRow(row.id, { assignTo: nextUser === 'Unassigned' ? '' : nextUser });
              }}
            />
          </div>
        );
      },
    },
    {
      key: 'financeStatus',
      header: 'Finance Status',
      minWidth: 150,
      headerClassName: 'text-left',
      className: 'min-w-[150px] align-middle',
      allowOverflow: true,
      render: (row) => (
        <div className="relative min-w-[140px]">
          <StatusDropdown
            value={row.financeStatus ?? ''}
            appearance="link"
            options={FINANCE_STATUSES}
            onChange={(nextStatus) =>
              updateRow(row.id, { financeStatus: nextStatus === 'Denied' ? 'Denied' : 'Approved' })
            }
            onConfirm={async (nextStatus) => {
              const finalStatus = nextStatus === 'Denied' ? 'Denied' : 'Approved';
              updateRow(row.id, { financeStatus: finalStatus });
              await updateCostSheetFinanceStatus(row.id, finalStatus);
            }}
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
      render: (row) => fileButton(row),
    },
  ];

  const detailFields: { label: string; value: React.ReactNode }[] = viewItem
    ? [
        { label: 'Cost Sheet ID', value: viewItem.costSheetId },
        { label: 'Brief ID', value: viewItem.briefId },
        { label: 'Brief Name', value: viewItem.briefName },
        { label: 'Plan ID', value: viewItem.planId },
        { label: 'Planner Name', value: viewItem.plannerName },
        { label: 'Submitted Date', value: viewItem.submittedDate },
        { label: 'Assign By', value: viewItem.assignBy || '-' },
        { label: 'Finance User', value: viewItem.assignTo || '-' },
        {
          label: 'Finance Status',
          value: viewItem.financeStatus ? (
            <Badge status={viewItem.financeStatus}>{viewItem.financeStatus}</Badge>
          ) : (
            '-'
          ),
        },
        { label: 'File', value: fileButton(viewItem) },
      ]
    : [];

  const previewModal = (
    <FilePreviewModal
      isOpen={Boolean(previewSource)}
      source={previewSource}
      onClose={() => setPreviewSource(null)}
      panelClassName="!w-[95%] md:!w-[600px]"
      closeButtonClassName="btn-secondary"
    />
  );

  if (viewItem) {
    return (
      <div className="flex-1 w-full max-w-full overflow-x-hidden">
        <PageBackHeader onBack={() => setViewItem(null)} title="Cost Sheets" />
        <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
            <h3 className="text-lg font-semibold text-gray-800">Cost Sheets</h3>
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
        {previewModal}
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
        <TableHeader title="Cost Sheets">
          <ExportExcelButton
            className="w-full sm:w-auto"
            buttonClassName="btn-primary !bg-gray-800 w-full sm:w-auto"
            label="Excel Export"
            fetchExport={async () => {
              exportCostSheetsExcel(filtered);
            }}
            disabled={loading || filtered.length === 0}
            aria-label="Export cost sheets as Excel"
          />
          <SearchBar
            delay={0}
            placeholder="Please Search Cost Sheets"
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
            emptyMessage="No Cost Sheets Found"
            keyExtractor={(row) => row.id}
            columns={columns}
            onView={(row) => setViewItem(row)}
            onCreatePo={(row) => navigate(ROUTES.COST_SHEETS_CREATE_PO(row.costSheetId || row.id))}
            onDownload={downloadFile}
            onApprove={(row) => updateRow(row.id, { financeStatus: 'Approved' })}
            onDecline={(row) => updateRow(row.id, { financeStatus: 'Denied' })}
            canApprove={(row) => row.financeStatus !== 'Approved'}
            canDecline={(row) => row.financeStatus !== 'Denied'}
            showViewWithoutPermission
            approvePermissionSlug="cost-sheets.approve"
            declinePermissionSlug="cost-sheets.decline"
            createPoPermissionSlug="cost-sheets.create-po"
          />
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />

      {previewModal}
    </div>
  );
};

export default CostSheets;
