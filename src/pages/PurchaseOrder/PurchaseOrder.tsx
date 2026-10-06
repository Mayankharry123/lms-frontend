/**
 * @file PurchaseOrder.tsx
 * @description Purchase Order list. Same layout as Cost Sheets.
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
import PageBackHeader from '../../components/ui/PageBackHeader';
import Badge from '../../components/ui/Badge';
import AssignDropdown from '../../components/ui/AssignDropdown';
import { defaultDatedXlsxFilename, downloadBlobFile, downloadFileFromUrl } from '../../utils/downloadFile';
import { listChildFinanceByBrief } from '../../api/lookups';
import { listPurchaseOrders, type PurchaseOrderRow } from '../../services/PurchaseOrders';
import SweetAlert from '../../utils/SweetAlert';

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const ITEMS_PER_PAGE = 10;

const matchesQuery = (row: PurchaseOrderRow, query: string) => {
  const haystack = [
    row.purchaseOrderId,
    row.briefId,
    row.briefName,
    row.planId,
    row.plannerName,
    row.submittedDate,
    row.assignBy,
    row.assignTo,
    row.costSheetStatus,
    row.financeStatus,
    row.fileName ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
};

const SHEET_HEADERS = [
  'Purchase Order ID',
  'Brief ID',
  'Brief Name',
  'Plan ID',
  'Planner Name',
  'Submitted Date',
  'Assign By',
  'Finance User',
  'Cost Sheet Status',
  'Finance Status',
  'File',
];

const sheetRows = (row: PurchaseOrderRow) => [
  row.purchaseOrderId,
  row.briefId,
  row.briefName,
  row.planId,
  row.plannerName,
  row.submittedDate,
  row.assignBy,
  row.assignTo,
  row.costSheetStatus,
  row.financeStatus,
  row.fileName ?? '',
];

const exportPurchaseOrdersExcel = (rows: PurchaseOrderRow[]) => {
  const worksheet = XLSX.utils.aoa_to_sheet([SHEET_HEADERS, ...rows.map(sheetRows)]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Order');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const blob = new Blob([buffer], { type: EXCEL_MIME });
  downloadBlobFile(defaultDatedXlsxFilename('purchase-order'), blob);
};

const statusBadge = (status: string) =>
  status && status !== '-' ? <Badge status={status}>{status}</Badge> : '-';

const normalizeBriefId = (value?: string | null) => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const digits = text.replace(/\D+/g, '');
  return digits || text;
};

const PurchaseOrder: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PurchaseOrderRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewItem, setViewItem] = useState<PurchaseOrderRow | null>(null);
  const [assignOptionsByBriefId, setAssignOptionsByBriefId] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await listPurchaseOrders();
        if (mounted) setRows(data);
      } catch (err) {
        console.error('Failed to load purchase orders', err);
        if (mounted) {
          setRows([]);
          SweetAlert.showError(err instanceof Error ? err.message : 'Failed to load purchase orders');
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
        console.error('Failed to load finance users for purchase orders', err);
        if (mounted) setAssignOptionsByBriefId({});
      }
    })();

    return () => {
      mounted = false;
    };
  }, [rows]);

  const updateRow = (id: string, patch: Partial<PurchaseOrderRow>) => {
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

  const downloadFile = async (row: PurchaseOrderRow) => {
    if (!row.fileUrl) return;
    try {
      await downloadFileFromUrl(row.fileUrl, row.fileName || 'cost-sheet.xlsx');
    } catch (err) {
      SweetAlert.showError(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  const fileCell = (row: PurchaseOrderRow) => {
    if (!row.fileName || !row.fileUrl) {
      return <span className="inline-flex h-7 items-center text-sm leading-none text-gray-400">-</span>;
    }
    return (
      <button
        type="button"
        onClick={() => downloadFile(row)}
        title={row.fileName}
        className="inline-flex h-7 items-center gap-1.5 text-left text-sm leading-none text-gray-800 hover:text-orange-600"
      >
        <FileText className="h-4 w-4 shrink-0 text-orange-600" aria-hidden />
        <span className="whitespace-nowrap">{row.fileName}</span>
      </button>
    );
  };

  const columns: Column<PurchaseOrderRow>[] = [
    {
      key: 'purchaseOrderId',
      header: 'Purchase Order ID',
      className: 'whitespace-nowrap',
      render: (row) => row.purchaseOrderId,
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
              context="user"
              value={row.assignTo || 'Unassigned'}
              options={options.length ? options : ['Unassigned']}
              onChange={(nextUser) => {
                const nextValue = nextUser === 'Unassigned' ? '' : nextUser;
                updateRow(row.id, { assignTo: nextValue });
              }}
              onConfirm={async (nextUser) => {
                const nextValue = nextUser === 'Unassigned' ? '' : nextUser;
                updateRow(row.id, { assignTo: nextValue });
              }}
            />
          </div>
        );
      },
    },
    {
      key: 'costSheetStatus',
      header: 'Cost Sheet Status',
      className: 'whitespace-nowrap',
      render: (row) => statusBadge(row.costSheetStatus),
    },
    {
      key: 'financeStatus',
      header: 'Finance Status',
      className: 'whitespace-nowrap',
      render: (row) => statusBadge(row.financeStatus),
    },
    {
      key: 'file',
      header: 'File',
      minWidth: 280,
      headerClassName: 'text-left',
      className: 'whitespace-nowrap align-middle',
      render: (row) => fileCell(row),
    },
  ];

  const detailFields: { label: string; value: React.ReactNode }[] = viewItem
    ? [
        { label: 'Purchase Order ID', value: viewItem.purchaseOrderId },
        { label: 'Brief ID', value: viewItem.briefId },
        { label: 'Brief Name', value: viewItem.briefName },
        { label: 'Plan ID', value: viewItem.planId },
        { label: 'Planner Name', value: viewItem.plannerName },
        { label: 'Submitted Date', value: viewItem.submittedDate },
        { label: 'Assign By', value: viewItem.assignBy },
        { label: 'Finance User', value: viewItem.assignTo || '-' },
        { label: 'Cost Sheet Status', value: statusBadge(viewItem.costSheetStatus) },
        { label: 'Finance Status', value: statusBadge(viewItem.financeStatus) },
        { label: 'File', value: fileCell(viewItem) },
      ]
    : [];

  if (viewItem) {
    return (
      <div className="flex-1 w-full max-w-full overflow-x-hidden">
        <PageBackHeader onBack={() => setViewItem(null)} title="Purchase Order" />
        <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
            <h3 className="text-lg font-semibold text-gray-800">Purchase Order</h3>
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
        <TableHeader title="Purchase Order">
          <ExportExcelButton
            className="w-full sm:w-auto"
            buttonClassName="btn-primary !bg-gray-800 w-full sm:w-auto"
            label="Excel Export"
            fetchExport={async () => {
              exportPurchaseOrdersExcel(filtered);
            }}
            disabled={loading || filtered.length === 0}
            aria-label="Export purchase orders as Excel"
          />
          <SearchBar
            delay={0}
            placeholder="Please Search Purchase Order"
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
            emptyMessage="No Purchase Orders Found"
            keyExtractor={(row) => row.id}
            columns={columns}
            onView={(row) => setViewItem(row)}
            onDownload={(row) => {
              void downloadFile(row);
            }}
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
    </div>
  );
};

export default PurchaseOrder;
