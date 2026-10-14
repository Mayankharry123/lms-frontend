import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Download, Eye, FileText, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MasterHeader from '../../components/ui/MasterHeader';
import ModalPopup from '../../components/ui/ModalPopup';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import Table, { type Column } from '../../components/ui/Table';
import TableHeader from '../../components/ui/TableHeader';
import Badge from '../../components/ui/Badge';
import FilePreviewModal from '../../components/ui/FilePreviewModal';
import { ROUTES } from '../../constants';
import {
  listClientPurchaseOrders,
  type ClientPurchaseOrderRow,
} from '../../services/ClientPurchaseOrders';
import { downloadFileFromUrl } from '../../utils/downloadFile';
import SweetAlert from '../../utils/SweetAlert';

const ITEMS_PER_PAGE = 10;

type PreviewSource = { kind: 'remote'; url: string; name?: string } | null;

const matchesQuery = (row: ClientPurchaseOrderRow, query: string): boolean => {
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

const ClientPurchaseOrder: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ClientPurchaseOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewItem, setViewItem] = useState<ClientPurchaseOrderRow | null>(null);
  const [previewSource, setPreviewSource] = useState<PreviewSource>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    setListError('');
    listClientPurchaseOrders()
      .then((data) => {
        setRows(data);
      })
      .catch((error: unknown) => {
        console.error('Failed to load client purchase orders:', error);
        setRows([]);
        setListError('Failed to load Client Purchase Orders. Please try again later.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => matchesQuery(row, query));
  }, [rows, searchQuery]);

  const totalItems = filtered.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageRows = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const downloadFile = async (row: ClientPurchaseOrderRow) => {
    if (!row.fileUrl) {
      SweetAlert.showError('No downloadable file is available for this purchase order.');
      return;
    }
    if (downloadingId) return;

    setDownloadingId(row.id);
    try {
      await downloadFileFromUrl(row.fileUrl, row.fileName || `${row.purchaseOrderId.replace(/\//g, '-')}.pdf`);
    } catch (err) {
      SweetAlert.showError(err instanceof Error ? err.message : 'Failed to download file');
    } finally {
      setDownloadingId(null);
    }
  };

  const viewFile = (row: ClientPurchaseOrderRow) => {
    if (!row.fileUrl) {
      SweetAlert.showError('No file attachment is available to preview.');
      return;
    }
    setPreviewSource({ kind: 'remote', url: row.fileUrl, name: row.fileName ?? undefined });
  };

  const fileCell = (row: ClientPurchaseOrderRow) => {
    if (!row.fileName && !row.fileUrl) {
      return <span className="inline-flex h-7 items-center text-sm leading-none text-gray-400">-</span>;
    }

    const displayName = row.fileName || 'purchase-order.pdf';

    return (
      <button
        type="button"
        onClick={() => void downloadFile(row)}
        disabled={downloadingId === row.id}
        title={`Download ${displayName}`}
        className="inline-flex h-7 items-center gap-1.5 text-left text-sm leading-none text-gray-800 hover:text-orange-600 disabled:cursor-wait disabled:opacity-60"
      >
        <FileText className="h-4 w-4 shrink-0 text-orange-600" aria-hidden />
        <span className="whitespace-nowrap truncate max-w-[200px]">{displayName}</span>
      </button>
    );
  };

  const columns: Column<ClientPurchaseOrderRow>[] = [
    {
      key: 'purchaseOrderId',
      header: 'Purchase Order Id',
      className: 'whitespace-nowrap font-medium text-gray-900',
      render: (row) => row.purchaseOrderId,
    },
    {
      key: 'briefId',
      header: 'Brief Id',
      className: 'whitespace-nowrap',
      render: (row) => row.briefId,
    },
    {
      key: 'briefName',
      header: 'Brief Name',
      className: 'whitespace-nowrap max-w-[220px] truncate',
      render: (row) => row.briefName,
    },
    {
      key: 'planId',
      header: 'Plan Id',
      className: 'whitespace-nowrap',
      render: (row) => row.planId,
    },
    {
      key: 'plannerName',
      header: 'Planner Name',
      className: 'whitespace-nowrap max-w-[180px] truncate',
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
      className: 'whitespace-nowrap max-w-[180px] truncate',
      render: (row) => row.assignBy,
    },
    {
      key: 'assignTo',
      header: 'Finance User',
      className: 'whitespace-nowrap max-w-[180px] truncate',
      render: (row) => row.assignTo,
    },
    {
      key: 'costSheetStatus',
      header: 'Cost Sheet Status',
      className: 'whitespace-nowrap',
      render: (row) => (
        <Badge status={row.costSheetStatus}>{row.costSheetStatus || '-'}</Badge>
      ),
    },
    {
      key: 'financeStatus',
      header: 'Finance Status',
      className: 'whitespace-nowrap',
      render: (row) => (
        <Badge status={row.financeStatus}>{row.financeStatus || '-'}</Badge>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total Amount',
      className: 'whitespace-nowrap font-medium text-gray-900',
      render: (row) =>
        row.totalAmount != null
          ? `₹${Number(row.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '-',
    },
    {
      key: 'file',
      header: 'File',
      minWidth: 220,
      headerClassName: 'text-left',
      className: 'whitespace-nowrap',
      render: (row) => fileCell(row),
    },
    {
      key: 'actions',
      header: 'Actions',
      minWidth: 120,
      headerClassName: 'text-center',
      className: 'whitespace-nowrap text-center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewItem(row)}
            title="View Details"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition-colors hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600"
          >
            <Eye className="h-4 w-4" />
          </button>
          {row.fileUrl ? (
            <button
              type="button"
              onClick={() => void downloadFile(row)}
              disabled={downloadingId === row.id}
              title="Download File"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition-colors hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
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

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <TableHeader title="Client Purchase Order">
          <SearchBar
            delay={0}
            placeholder="Search Purchase Order"
            onSearch={(query) => {
              setSearchQuery(query);
              setCurrentPage(1);
            }}
          />
        </TableHeader>

        {listError ? (
          <div className="px-5 py-3.5 bg-red-50 border-b border-red-200 flex items-center justify-between">
            <p role="alert" className="text-sm text-red-600">{listError}</p>
            <button
              type="button"
              onClick={loadData}
              className="text-xs font-semibold text-red-700 underline hover:text-red-900"
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="pt-0 overflow-visible">
          <Table
            data={pageRows}
            startIndex={startIndex}
            loading={loading}
            desktopOnMobile
            emptyMessage="No Client Purchase Orders Found"
            keyExtractor={(row) => row.id}
            columns={columns}
          />
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />

      {/* Details View Modal */}
      <ModalPopup
        show={Boolean(viewItem)}
        onClose={() => setViewItem(null)}
        title="Client Purchase Order Details"
      >
        {viewItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                <span className="block text-xs font-medium text-gray-500">Purchase Order Id</span>
                <span className="text-sm font-semibold text-gray-900">{viewItem.purchaseOrderId}</span>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                <span className="block text-xs font-medium text-gray-500">Submitted Date</span>
                <span className="text-sm font-semibold text-gray-900">{viewItem.submittedDate}</span>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                <span className="block text-xs font-medium text-gray-500">Brief Id</span>
                <span className="text-sm font-semibold text-gray-900">{viewItem.briefId}</span>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                <span className="block text-xs font-medium text-gray-500">Brief Name</span>
                <span className="text-sm font-semibold text-gray-900">{viewItem.briefName}</span>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                <span className="block text-xs font-medium text-gray-500">Plan Id</span>
                <span className="text-sm font-semibold text-gray-900">{viewItem.planId}</span>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                <span className="block text-xs font-medium text-gray-500">Planner Name</span>
                <span className="text-sm font-semibold text-gray-900">{viewItem.plannerName}</span>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                <span className="block text-xs font-medium text-gray-500">Assign By</span>
                <span className="text-sm font-semibold text-gray-900">{viewItem.assignBy}</span>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                <span className="block text-xs font-medium text-gray-500">Finance User</span>
                <span className="text-sm font-semibold text-gray-900">{viewItem.assignTo}</span>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                <span className="block text-xs font-medium text-gray-500 mb-1">Cost Sheet Status</span>
                <Badge status={viewItem.costSheetStatus}>{viewItem.costSheetStatus || '-'}</Badge>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                <span className="block text-xs font-medium text-gray-500 mb-1">Finance Status</span>
                <Badge status={viewItem.financeStatus}>{viewItem.financeStatus || '-'}</Badge>
              </div>
            </div>

            {viewItem.orders && viewItem.orders.length > 0 && (
              <div className="space-y-2">
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Order Items ({viewItem.orders.length})
                </span>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-left">City</th>
                        <th className="px-3 py-2 text-right">Slot</th>
                        <th className="px-3 py-2 text-right">Rate</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {viewItem.orders.map((o, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2 font-medium text-gray-800">{o.order || '-'}</td>
                          <td className="px-3 py-2 text-gray-600">{o.city || '-'}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{o.qty || 0}</td>
                          <td className="px-3 py-2 text-right text-gray-600">₹{Number(o.rate || 0).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900">₹{Number(o.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(viewItem.totalAmount != null || viewItem.subtotal != null) && (
              <div className="rounded-lg border border-orange-100 bg-orange-50/40 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                {viewItem.subtotal != null && (
                  <div>
                    <span className="text-gray-500">Subtotal: </span>
                    <span className="font-semibold text-gray-900">
                      ₹{Number(viewItem.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {viewItem.totalAmount != null && (
                  <div>
                    <span className="text-gray-500">Grand Total: </span>
                    <span className="font-bold text-[#f26222] text-sm">
                      ₹{Number(viewItem.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            )}

            {viewItem.fileUrl ? (
              <div className="rounded-lg border border-gray-200 bg-white p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-orange-600" />
                  <span className="text-sm font-medium text-gray-800 truncate max-w-[260px]">
                    {viewItem.fileName || 'purchase-order.pdf'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => viewFile(viewItem)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => void downloadFile(viewItem)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                </div>
              </div>
            ) : null}

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

      <FilePreviewModal
        isOpen={Boolean(previewSource)}
        source={previewSource}
        onClose={() => setPreviewSource(null)}
        panelClassName="!w-[95%] md:!w-[700px]"
        closeButtonClassName="btn-secondary"
      />
    </div>
  );
};

export default ClientPurchaseOrder;
