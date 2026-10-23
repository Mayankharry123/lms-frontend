import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Download,
  Eye,
  FileText,
  Plus,
  Trash2,
  Upload,
  Building,
  FileCheck,
  Tag,
  Receipt,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MasterHeader from '../../components/ui/MasterHeader';
import ModalPopup from '../../components/ui/ModalPopup';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import Table, { type Column } from '../../components/ui/Table';
import TableHeader from '../../components/ui/TableHeader';
import Badge from '../../components/ui/Badge';
import FilePreviewModal from '../../components/ui/FilePreviewModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { ROUTES } from '../../constants';
import {
  listClientPurchaseOrders,
  deleteClientPurchaseOrder,
  uploadClientPurchaseOrderFile,
  type ClientPurchaseOrderRow,
  type PaginationMeta,
  type OrderLineItem,
} from '../../services/ClientPurchaseOrders';
import { downloadFileFromUrl } from '../../utils/downloadFile';
import SweetAlert from '../../utils/SweetAlert';

const ITEMS_PER_PAGE = 10;
const MAX_UPLOAD_FILE_SIZE = 50 * 1024 * 1024; // 50MB (matches backend limit)
const ACCEPTED_FILE_TYPES = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx';

type PreviewSource = { kind: 'remote'; url: string; name?: string } | null;

const formatCurrency = (val: number | string | null | undefined): string => {
  if (val == null || val === '') return '—';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const matchesClientQuery = (row: ClientPurchaseOrderRow, query: string): boolean => {
  if (!query) return true;
  const haystack = [
    row.purchaseOrderId,
    row.briefId,
    row.briefName,
    row.planId,
    row.plannerName,
    row.submittedDate,
    row.assignBy,
    row.financeUser,
    row.costSheetStatus,
    row.financeStatus,
    row.companyName ?? '',
    row.clientName ?? '',
    row.gstNumber ?? '',
    row.fileName ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
};

const ClientPurchaseOrder: React.FC = () => {
  const navigate = useNavigate();

  // Data state
  const [rows, setRows] = useState<ClientPurchaseOrderRow[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    current_page: 1,
    per_page: ITEMS_PER_PAGE,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
  });
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & interaction state
  const [viewItem, setViewItem] = useState<ClientPurchaseOrderRow | null>(null);
  const [previewSource, setPreviewSource] = useState<PreviewSource>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Upload modal state
  const [uploadTargetItem, setUploadTargetItem] = useState<ClientPurchaseOrderRow | null>(null);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);

  // Delete dialog state
  const [deleteTargetItem, setDeleteTargetItem] = useState<ClientPurchaseOrderRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Request race condition prevention
  const activeFetchIdRef = useRef(0);

  const loadData = useCallback(() => {
    const fetchId = ++activeFetchIdRef.current;
    setLoading(true);
    setListError('');

    listClientPurchaseOrders({
      page: currentPage,
      per_page: ITEMS_PER_PAGE,
      search: searchQuery.trim(),
    })
      .then((res) => {
        if (fetchId !== activeFetchIdRef.current) return;
        setRows(res.rows);
        setPaginationMeta(res.pagination);
      })
      .catch((error: unknown) => {
        if (fetchId !== activeFetchIdRef.current) return;
        console.error('Failed to load client purchase orders:', error);
        setRows([]);
        setPaginationMeta({
          current_page: 1,
          per_page: ITEMS_PER_PAGE,
          total: 0,
          last_page: 1,
          from: 0,
          to: 0,
        });
        setListError(
          error instanceof Error && error.message
            ? error.message
            : 'Failed to load Client Purchase Orders. Please try again later.'
        );
      })
      .finally(() => {
        if (fetchId === activeFetchIdRef.current) {
          setLoading(false);
        }
      });
  }, [currentPage, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Client-side fallback filter for instant local responsiveness
  const displayedRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => matchesClientQuery(row, query));
  }, [rows, searchQuery]);

  // Handle Download PO File
  const handleDownloadFile = async (row: ClientPurchaseOrderRow) => {
    const fileUrl = row.poFileUrl || row.fileUrl;
    if (!fileUrl) {
      SweetAlert.showError('No downloadable file is available for this purchase order.');
      return;
    }
    if (downloadingId) return;

    setDownloadingId(row.id);
    try {
      const safePoName = row.purchaseOrderId.replace(/[^A-Za-z0-9._-]+/g, '_');
      const filename = row.fileName || `PO_${safePoName}.pdf`;
      await downloadFileFromUrl(fileUrl, filename);
    } catch (err) {
      SweetAlert.showError(err instanceof Error ? err.message : 'Failed to download file');
    } finally {
      setDownloadingId(null);
    }
  };

  // Handle Preview File
  const handlePreviewFile = (row: ClientPurchaseOrderRow) => {
    const fileUrl = row.poFileUrl || row.fileUrl;
    if (!fileUrl) {
      SweetAlert.showError('No file attachment is available to preview.');
      return;
    }
    setPreviewSource({
      kind: 'remote',
      url: fileUrl,
      name: row.fileName ?? undefined,
    });
  };

  // Handle Delete Confirmation
  const confirmDelete = async () => {
    if (!deleteTargetItem) return;
    setDeleteLoading(true);
    try {
      await deleteClientPurchaseOrder(deleteTargetItem.rawId || deleteTargetItem.id);
      SweetAlert.showToast({
        title: `Purchase Order ${deleteTargetItem.purchaseOrderId} deleted successfully.`,
        icon: 'success',
      });
      setDeleteTargetItem(null);
      if (viewItem?.id === deleteTargetItem.id) {
        setViewItem(null);
      }
      loadData();
    } catch (err) {
      SweetAlert.showError(err instanceof Error ? err.message : 'Failed to delete purchase order.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle File Upload Execution
  const handleExecuteUpload = async () => {
    if (!uploadTargetItem || !selectedUploadFile) {
      SweetAlert.showError('Please select a file to upload.');
      return;
    }

    if (selectedUploadFile.size > MAX_UPLOAD_FILE_SIZE) {
      SweetAlert.showError('File size exceeds the 50MB limit.');
      return;
    }

    setUploading(true);
    try {
      const updatedRow = await uploadClientPurchaseOrderFile(
        uploadTargetItem.rawId || uploadTargetItem.id,
        selectedUploadFile
      );
      SweetAlert.showToast({
        title: 'PO document uploaded successfully.',
        icon: 'success',
      });

      // Update in local state if currently viewed
      if (viewItem && (viewItem.id === uploadTargetItem.id || viewItem.rawId === uploadTargetItem.rawId)) {
        setViewItem(updatedRow);
      }

      setUploadTargetItem(null);
      setSelectedUploadFile(null);
      loadData();
    } catch (err) {
      SweetAlert.showError(err instanceof Error ? err.message : 'Failed to upload PO document.');
    } finally {
      setUploading(false);
    }
  };

  // Table PO File Cell renderer
  const renderPoFileCell = (row: ClientPurchaseOrderRow) => {
    const fileUrl = row.poFileUrl || row.fileUrl;
    if (!fileUrl && !row.fileName) {
      return <span className="inline-flex h-7 items-center text-sm leading-none text-gray-400">—</span>;
    }

    const displayName = row.fileName || 'purchase-order.pdf';

    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => void handleDownloadFile(row)}
          disabled={downloadingId === row.id}
          title={`Download ${displayName}`}
          className="inline-flex h-7 items-center gap-1.5 text-left text-sm leading-none text-gray-800 hover:text-orange-600 disabled:cursor-wait disabled:opacity-60 max-w-[180px]"
        >
          <FileText className="h-4 w-4 shrink-0 text-orange-600" aria-hidden />
          <span className="truncate">{displayName}</span>
        </button>
      </div>
    );
  };

  // 12 Columns in exact requested order:
  // 1. Purchase Order ID
  // 2. Brief ID
  // 3. Brief Name
  // 4. Plan ID
  // 5. Planner Name
  // 6. Submitted Date
  // 7. Assign By
  // 8. Finance User
  // 9. Cost Sheet Status
  // 10. Finance Status
  // 11. PO File
  // 12. Actions
  const columns: Column<ClientPurchaseOrderRow>[] = [
    {
      key: 'purchaseOrderId',
      header: 'Purchase Order ID',
      minWidth: 160,
      className: 'whitespace-nowrap font-medium text-gray-900',
      render: (row) => row.purchaseOrderId,
    },
    {
      key: 'briefId',
      header: 'Brief ID',
      minWidth: 100,
      className: 'whitespace-nowrap font-medium text-gray-800',
      render: (row) => row.briefId,
    },
    {
      key: 'briefName',
      header: 'Brief Name',
      minWidth: 160,
      maxWidth: 220,
      className: 'whitespace-nowrap truncate',
      render: (row) => row.briefName,
    },
    {
      key: 'planId',
      header: 'Plan ID',
      minWidth: 100,
      className: 'whitespace-nowrap font-medium text-gray-800',
      render: (row) => row.planId,
    },
    {
      key: 'plannerName',
      header: 'Planner Name',
      minWidth: 140,
      maxWidth: 180,
      className: 'whitespace-nowrap truncate',
      render: (row) => row.plannerName,
    },
    {
      key: 'submittedDate',
      header: 'Submitted Date',
      minWidth: 130,
      className: 'whitespace-nowrap',
      render: (row) => row.submittedDate,
    },
    {
      key: 'assignBy',
      header: 'Assign By',
      minWidth: 140,
      maxWidth: 180,
      className: 'whitespace-nowrap truncate',
      render: (row) => row.assignBy,
    },
    {
      key: 'financeUser',
      header: 'Finance User',
      minWidth: 140,
      maxWidth: 180,
      className: 'whitespace-nowrap truncate',
      render: (row) => row.financeUser,
    },
    {
      key: 'costSheetStatus',
      header: 'Cost Sheet Status',
      minWidth: 140,
      className: 'whitespace-nowrap',
      render: (row) =>
        row.costSheetStatus && row.costSheetStatus !== '—' && row.costSheetStatus !== '-' ? (
          <Badge status={row.costSheetStatus}>{row.costSheetStatus}</Badge>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'financeStatus',
      header: 'Finance Status',
      minWidth: 140,
      className: 'whitespace-nowrap',
      render: (row) =>
        row.financeStatus && row.financeStatus !== '—' && row.financeStatus !== '-' ? (
          <Badge status={row.financeStatus}>{row.financeStatus}</Badge>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'poFile',
      header: 'PO File',
      minWidth: 190,
      className: 'whitespace-nowrap',
      render: (row) => renderPoFileCell(row),
    },
    {
      key: 'actions',
      header: 'Actions',
      minWidth: 140,
      headerClassName: 'text-center',
      className: 'whitespace-nowrap text-center',
      render: (row) => {
        const hasFile = Boolean(row.poFileUrl || row.fileUrl);
        return (
          <div className="flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => setViewItem(row)}
              title="View Details"
              aria-label="View Details"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition-colors hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600"
            >
              <Eye className="h-4 w-4" />
            </button>

            {hasFile ? (
              <button
                type="button"
                onClick={() => void handleDownloadFile(row)}
                disabled={downloadingId === row.id}
                title="Download PO File"
                aria-label="Download PO File"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition-colors hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setUploadTargetItem(row);
                setSelectedUploadFile(null);
              }}
              title="Upload / Replace PO Document"
              aria-label="Upload PO Document"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition-colors hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600"
            >
              <Upload className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setDeleteTargetItem(row)}
              title="Delete Purchase Order"
              aria-label="Delete Purchase Order"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-red-500 transition-colors hover:border-red-500 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
      {/* Breadcrumb & Top Action */}
      <MasterHeader
        onCreateClick={() => undefined}
        showBreadcrumb
        showCreateButton={false}
        extraActions={
          <button
            type="button"
            onClick={() => navigate(ROUTES.CLIENT_PURCHASE_ORDERS_CREATE)}
            className="btn-primary flex w-full items-center justify-center gap-2 whitespace-nowrap sm:w-auto"
          >
            <Plus className="h-4 w-4" aria-hidden />
            <span>Create Client PO</span>
          </button>
        }
      />

      {/* Main Table Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <TableHeader title="Client Purchase Order">
          <SearchBar
            delay={300}
            placeholder="Search Purchase Order"
            onSearch={(query) => {
              setSearchQuery(query);
              setCurrentPage(1);
            }}
          />
        </TableHeader>

        {listError ? (
          <div className="px-5 py-3.5 bg-red-50 border-b border-red-200 flex items-center justify-between">
            <p role="alert" className="text-sm text-red-600">
              {listError}
            </p>
            <button
              type="button"
              onClick={loadData}
              className="text-xs font-semibold text-red-700 underline hover:text-red-900"
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="pt-0 overflow-x-auto overflow-y-visible">
          <Table
            data={displayedRows}
            startIndex={(paginationMeta.current_page - 1) * paginationMeta.per_page}
            loading={loading}
            desktopOnMobile
            emptyMessage={
              searchQuery.trim()
                ? 'No purchase orders match your search'
                : 'No Client Purchase Orders Found'
            }
            keyExtractor={(row) => row.id}
            columns={columns}
          />
        </div>
      </div>

      {/* Pagination connected to API pagination metadata */}
      <Pagination
        currentPage={paginationMeta.current_page}
        totalItems={paginationMeta.total}
        itemsPerPage={paginationMeta.per_page || ITEMS_PER_PAGE}
        onPageChange={(page) => {
          setCurrentPage(page);
        }}
      />

      {/* Section 5: Purchase Order Details Modal */}
      <ModalPopup
        show={Boolean(viewItem)}
        onClose={() => setViewItem(null)}
        title={`Client Purchase Order Details — ${viewItem?.purchaseOrderId || ''}`}
        panelClassName="!max-w-4xl"
        bodyClassName="max-h-[85vh] overflow-y-auto"
      >
        {viewItem && (
          <div className="space-y-6 text-sm text-gray-800">
            {/* Header Summary Banner */}
            <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-orange-700">
                    Purchase Order Number
                  </span>
                  {viewItem.status != null && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-orange-100 font-medium text-orange-800">
                      Status: {viewItem.status === 1 || viewItem.status === '1' ? 'Active' : viewItem.status}
                    </span>
                  )}
                </div>
                <div className="text-lg font-bold text-gray-900">{viewItem.purchaseOrderId}</div>
              </div>

              <div className="flex items-center gap-2">
                {(viewItem.poFileUrl || viewItem.fileUrl) && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePreviewFile(viewItem)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5 text-gray-600" />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDownloadFile(viewItem)}
                      disabled={downloadingId === viewItem.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Section A: Purchase Order Information */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-orange-600" />
                Purchase Order Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3">
                  <span className="block text-xs font-medium text-gray-500 mb-1">PO Number</span>
                  <span className="text-sm font-semibold text-gray-900">{viewItem.purchaseOrderId}</span>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3">
                  <span className="block text-xs font-medium text-gray-500 mb-1">PO Date / Submitted Date</span>
                  <span className="text-sm font-semibold text-gray-900">{viewItem.submittedDate}</span>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3">
                  <span className="block text-xs font-medium text-gray-500 mb-1">Finance Status</span>
                  {viewItem.financeStatus && viewItem.financeStatus !== '—' && viewItem.financeStatus !== '-' ? (
                    <div className="mt-0.5">
                      <Badge status={viewItem.financeStatus}>{viewItem.financeStatus}</Badge>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-gray-400">—</span>
                  )}
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3">
                  <span className="block text-xs font-medium text-gray-500 mb-1">Cost Sheet Status</span>
                  {viewItem.costSheetStatus && viewItem.costSheetStatus !== '—' && viewItem.costSheetStatus !== '-' ? (
                    <div className="mt-0.5">
                      <Badge status={viewItem.costSheetStatus}>{viewItem.costSheetStatus}</Badge>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-gray-400">—</span>
                  )}
                </div>
              </div>
            </div>

            {/* Section B: Client Information */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                <Building className="h-4 w-4 text-orange-600" />
                Client Information
              </h4>
              <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <span className="block text-xs font-medium text-gray-500">Company Name</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {viewItem.companyName || viewItem.clientName || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500">Client Name</span>
                    <span className="text-sm font-semibold text-gray-900">{viewItem.clientName || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500">Primary Email</span>
                    <span className="text-sm font-medium text-gray-800">{viewItem.primaryEmail || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500">GST Number</span>
                    <span className="text-sm font-semibold text-gray-900">{viewItem.gstNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500">PAN Number</span>
                    <span className="text-sm font-semibold text-gray-900">{viewItem.panNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500">Banking / Account</span>
                    <span className="text-sm font-medium text-gray-800">
                      {viewItem.bankName
                        ? `${viewItem.bankName} ${viewItem.accountNumber ? `(${viewItem.accountNumber})` : ''}`
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 text-xs">
                  <span className="block font-medium text-gray-500 mb-0.5">Address</span>
                  <span className="text-gray-800 font-medium">
                    {[
                      viewItem.address,
                      viewItem.city,
                      viewItem.state,
                      viewItem.country,
                      viewItem.pincode ? `PIN: ${viewItem.pincode}` : '',
                    ]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section C: Campaign & Assignment Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Campaign Information */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-orange-600" />
                  Campaign Information
                </h4>
                <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3 space-y-2">
                  <div>
                    <span className="block text-xs font-medium text-gray-500">Campaign Name</span>
                    <span className="text-sm font-semibold text-gray-900">{viewItem.campaign || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500">Campaign Period</span>
                    <span className="text-sm font-medium text-gray-800">{viewItem.period || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Assignment Information */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-orange-600" />
                  Assignment Information
                </h4>
                <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3 grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-xs font-medium text-gray-500">Brief</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {viewItem.briefId} {viewItem.briefName !== '—' ? `(${viewItem.briefName})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500">Planner / Plan</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {viewItem.planId} {viewItem.plannerName !== '—' ? `(${viewItem.plannerName})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500">Assigned User (Finance)</span>
                    <span className="text-sm font-semibold text-gray-900">{viewItem.financeUser}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500">Created By / Assign By</span>
                    <span className="text-sm font-semibold text-gray-900">{viewItem.assignBy}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section D: Order Items Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4 text-orange-600" />
                  Order Items ({viewItem.orders?.length || 0})
                </h4>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-gray-200 text-[#007b83] font-semibold uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2.5">#</th>
                      <th className="px-3 py-2.5">Order Name</th>
                      <th className="px-3 py-2.5">Description</th>
                      <th className="px-3 py-2.5">HSN/SAC</th>
                      <th className="px-3 py-2.5">City</th>
                      <th className="px-3 py-2.5 text-right">Slot</th>
                      <th className="px-3 py-2.5 text-right">Quantity</th>
                      <th className="px-3 py-2.5 text-right">Rate</th>
                      <th className="px-3 py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {viewItem.orders && viewItem.orders.length > 0 ? (
                      viewItem.orders.map((item: OrderLineItem, idx: number) => (
                        <tr key={item.key || idx} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{item.order_name || item.order || '—'}</td>
                          <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">
                            {item.description || '—'}
                          </td>
                          <td className="px-3 py-2 text-gray-700">{item.hsn_sac || item.hsnSac || '—'}</td>
                          <td className="px-3 py-2 text-gray-700">{item.city || '—'}</td>
                          <td className="px-3 py-2 text-right text-gray-800">{item.slot ?? 1}</td>
                          <td className="px-3 py-2 text-right text-gray-800">{item.qty ?? 1}</td>
                          <td className="px-3 py-2 text-right text-gray-800">{formatCurrency(item.rate)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-4 py-4 text-center text-gray-400">
                          No order line items available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section E: Tax and Amount Summary */}
            <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3">
                Tax and Amount Summary
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs mb-3">
                <div className="p-2.5 rounded bg-white border border-gray-200">
                  <span className="block text-gray-500">Subtotal</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(viewItem.subtotal)}</span>
                </div>
                <div className="p-2.5 rounded bg-white border border-gray-200">
                  <span className="block text-gray-500">
                    SGST {viewItem.sgstRate != null ? `(${viewItem.sgstRate}%)` : ''}
                  </span>
                  <span className="text-sm font-medium text-gray-800">{formatCurrency(viewItem.sgstAmount)}</span>
                </div>
                <div className="p-2.5 rounded bg-white border border-gray-200">
                  <span className="block text-gray-500">
                    CGST {viewItem.cgstRate != null ? `(${viewItem.cgstRate}%)` : ''}
                  </span>
                  <span className="text-sm font-medium text-gray-800">{formatCurrency(viewItem.cgstAmount)}</span>
                </div>
                <div className="p-2.5 rounded bg-white border border-gray-200">
                  <span className="block text-gray-500">
                    IGST {viewItem.igstRate != null ? `(${viewItem.igstRate}%)` : ''}
                  </span>
                  <span className="text-sm font-medium text-gray-800">{formatCurrency(viewItem.igstAmount)}</span>
                </div>
                <div className="p-2.5 rounded bg-white border border-gray-200">
                  <span className="block text-gray-500">Total Tax</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(viewItem.taxAmount)}</span>
                </div>
                <div className="col-span-2 p-2.5 rounded bg-orange-50 border border-orange-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Grand Total</span>
                  <span className="text-base font-bold text-[#f26222]">{formatCurrency(viewItem.totalAmount)}</span>
                </div>
              </div>

              {viewItem.amountInWords && (
                <div className="p-2.5 rounded bg-white border border-gray-200 text-xs">
                  <span className="text-gray-500 font-medium">Amount in Words: </span>
                  <span className="font-semibold text-gray-900">{viewItem.amountInWords}</span>
                </div>
              )}
            </div>

            {/* Section F: PO File Attachment Bar */}
            <div className="rounded-lg border border-gray-200 bg-white p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="h-5 w-5 text-orange-600 shrink-0" />
                <div className="min-w-0">
                  <span className="block text-xs text-gray-500">Attached Purchase Order File</span>
                  <span className="block text-sm font-semibold text-gray-900 truncate max-w-sm">
                    {viewItem.fileName || (viewItem.poFileUrl ? 'purchase-order.pdf' : 'No document attached')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {viewItem.poFileUrl || viewItem.fileUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePreviewFile(viewItem)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDownloadFile(viewItem)}
                      disabled={downloadingId === viewItem.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setUploadTargetItem(viewItem);
                    setSelectedUploadFile(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <Upload className="h-3.5 w-3.5 text-orange-600" />
                  {viewItem.poFileUrl ? 'Replace File' : 'Upload File'}
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setViewItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </ModalPopup>

      {/* Upload PO File Modal */}
      <ModalPopup
        show={Boolean(uploadTargetItem)}
        onClose={() => {
          if (!uploading) {
            setUploadTargetItem(null);
            setSelectedUploadFile(null);
          }
        }}
        title={`Upload PO Document — ${uploadTargetItem?.purchaseOrderId || ''}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload or replace the Purchase Order document for{' '}
            <strong className="text-gray-900">{uploadTargetItem?.purchaseOrderId}</strong>.
            Supported formats: PDF, Images, Word, Excel (Max 50MB).
          </p>

          <div
            onClick={() => uploadFileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 hover:border-orange-500 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer bg-gray-50/60 hover:bg-orange-50/30 transition-colors"
          >
            <Upload className="h-8 w-8 text-orange-600 mb-2" />
            <span className="text-sm font-semibold text-gray-800">
              {selectedUploadFile ? selectedUploadFile.name : 'Click to select file'}
            </span>
            <span className="text-xs text-gray-500 mt-1">
              {selectedUploadFile
                ? `${(selectedUploadFile.size / (1024 * 1024)).toFixed(2)} MB`
                : 'PDF, PNG, JPG, DOCX, XLSX (up to 50MB)'}
            </span>
            <input
              ref={uploadFileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setSelectedUploadFile(file);
              }}
              className="hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={uploading}
              onClick={() => {
                setUploadTargetItem(null);
                setSelectedUploadFile(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary flex items-center gap-1.5"
              disabled={uploading || !selectedUploadFile}
              onClick={() => void handleExecuteUpload()}
            >
              {uploading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Upload File</span>
                </>
              )}
            </button>
          </div>
        </div>
      </ModalPopup>

      {/* Delete PO Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetItem)}
        title="Delete Client Purchase Order"
        message={`Are you sure you want to delete purchase order "${deleteTargetItem?.purchaseOrderId}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        type="delete"
        loading={deleteLoading}
        onCancel={() => setDeleteTargetItem(null)}
        onConfirm={() => void confirmDelete()}
      />

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={Boolean(previewSource)}
        source={previewSource}
        onClose={() => setPreviewSource(null)}
        panelClassName="!w-[95%] md:!w-[750px]"
        closeButtonClassName="btn-secondary"
      />
    </div>
  );
};

export default ClientPurchaseOrder;
