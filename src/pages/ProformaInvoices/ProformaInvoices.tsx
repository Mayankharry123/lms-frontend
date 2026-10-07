import React, { useMemo, useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ExportExcelButton from '../../components/ui/ExportExcelButton';
import FilePreviewModal from '../../components/ui/FilePreviewModal';
import MasterHeader from '../../components/ui/MasterHeader';
import Pagination from '../../components/ui/Pagination';
import PageBackHeader from '../../components/ui/PageBackHeader';
import SearchBar from '../../components/ui/SearchBar';
import Table, { type Column } from '../../components/ui/Table';
import TableHeader from '../../components/ui/TableHeader';
import { ROUTES } from '../../constants';
import {
  createMockProformaInvoiceFile,
  MOCK_PROFORMA_INVOICES,
  removeMockProformaInvoice,
  type ProformaInvoiceRow,
} from '../../services/ProformaInvoices';
import SweetAlert from '../../utils/SweetAlert';
import {
  defaultDatedXlsxFilename,
  downloadBlobFile,
} from '../../utils/downloadFile';

const ITEMS_PER_PAGE = 10;
const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type PreviewSource = { kind: 'file'; file: File } | null;

const formatCurrency = (amount: number) => CURRENCY_FORMATTER.format(amount);

const matchesQuery = (row: ProformaInvoiceRow, query: string) =>
  [
    row.proformaInvoiceId,
    row.fileName ?? '',
    row.brandNameFileName,
    row.subTotalAmount,
    row.igst,
    row.cgst,
    row.sgst,
    row.totalAmount,
  ]
    .join(' ')
    .toLowerCase()
    .includes(query);

const SHEET_HEADERS = [
  'PI ID',
  'File Name',
  'Brand Name File Name',
  'Sub Total Amount',
  'IGST',
  'CGST',
  'SGST',
  'Total Amount',
];

const exportProformaInvoices = (rows: ProformaInvoiceRow[]) => {
  const worksheet = XLSX.utils.aoa_to_sheet([
    SHEET_HEADERS,
    ...rows.map((row) => [
      row.proformaInvoiceId,
      row.fileName ?? '',
      row.brandNameFileName,
      row.subTotalAmount,
      row.igst,
      row.cgst,
      row.sgst,
      row.totalAmount,
    ]),
  ]);
  rows.forEach((_, index) => {
    for (let column = 3; column <= 7; column += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: index + 1, c: column })];
      if (cell) cell.z = '₹#,##0.00';
    }
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Proforma Invoice');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  downloadBlobFile(
    defaultDatedXlsxFilename('proforma-invoices'),
    new Blob([buffer], { type: EXCEL_MIME })
  );
};

const ProformaInvoices: React.FC = () => {
  const navigate = useNavigate();
  const loading = false;
  const [rows, setRows] = useState<ProformaInvoiceRow[]>(MOCK_PROFORMA_INVOICES);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewItem, setViewItem] = useState<ProformaInvoiceRow | null>(null);
  const [previewSource, setPreviewSource] = useState<PreviewSource>(null);
  const [deleteItem, setDeleteItem] = useState<ProformaInvoiceRow | null>(null);
  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return query ? rows.filter((row) => matchesQuery(row, query)) : rows;
  }, [rows, searchQuery]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageRows = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const viewFile = (row: ProformaInvoiceRow) => {
    setPreviewSource({ kind: 'file', file: createMockProformaInvoiceFile(row) });
  };

  const downloadFile = (row: ProformaInvoiceRow) => {
    const file = createMockProformaInvoiceFile(row);
    downloadBlobFile(file.name, file);
  };

  const fileCell = (row: ProformaInvoiceRow) => {
    if (!row.fileName) {
      return <span className="inline-flex h-7 items-center text-sm leading-none text-gray-400">-</span>;
    }
    return (
      <button
        type="button"
        onClick={() => viewFile(row)}
        title={`View ${row.fileName}`}
        className="inline-flex h-7 items-center gap-1.5 text-left text-sm leading-none text-gray-800 hover:text-orange-600"
      >
        <FileText className="h-4 w-4 shrink-0 text-orange-600" aria-hidden />
        <span className="whitespace-nowrap">{row.fileName}</span>
      </button>
    );
  };

  const columns: Column<ProformaInvoiceRow>[] = [
    {
      key: 'proformaInvoiceId',
      header: 'PI ID',
      className: 'whitespace-nowrap',
      render: (row) => row.proformaInvoiceId || '-',
    },
    {
      key: 'fileName',
      header: 'File Name',
      minWidth: 190,
      className: 'whitespace-nowrap align-middle',
      allowOverflow: true,
      render: fileCell,
    },
    {
      key: 'brandNameFileName',
      header: 'Brand Name File Name',
      minWidth: 200,
      render: (row) => row.brandNameFileName || '-',
    },
    {
      key: 'subTotalAmount',
      header: 'Sub Total Amount',
      className: 'whitespace-nowrap text-right',
      render: (row) => formatCurrency(row.subTotalAmount),
    },
    {
      key: 'igst',
      header: 'IGST',
      className: 'whitespace-nowrap text-right',
      render: (row) => formatCurrency(row.igst),
    },
    {
      key: 'cgst',
      header: 'CGST',
      className: 'whitespace-nowrap text-right',
      render: (row) => formatCurrency(row.cgst),
    },
    {
      key: 'sgst',
      header: 'SGST',
      className: 'whitespace-nowrap text-right',
      render: (row) => formatCurrency(row.sgst),
    },
    {
      key: 'totalAmount',
      header: 'Total Amount',
      className: 'whitespace-nowrap text-right font-semibold',
      render: (row) => formatCurrency(row.totalAmount),
    },
  ];

  const detailFields: { label: string; value: React.ReactNode }[] = viewItem
    ? [
        { label: 'PI ID', value: viewItem.proformaInvoiceId || '-' },
        { label: 'File Name', value: fileCell(viewItem) },
        { label: 'Brand Name File Name', value: viewItem.brandNameFileName || '-' },
        { label: 'Sub Total Amount', value: formatCurrency(viewItem.subTotalAmount) },
        { label: 'IGST', value: formatCurrency(viewItem.igst) },
        { label: 'CGST', value: formatCurrency(viewItem.cgst) },
        { label: 'SGST', value: formatCurrency(viewItem.sgst) },
        { label: 'Total Amount', value: formatCurrency(viewItem.totalAmount) },
      ]
    : [];

  const confirmDelete = () => {
    if (!deleteItem) return;
    removeMockProformaInvoice(deleteItem.id);
    const remainingCount = rows.filter((row) => row.id !== deleteItem.id).length;
    setRows((current) => current.filter((row) => row.id !== deleteItem.id));
    setCurrentPage((current) =>
      Math.min(current, Math.max(1, Math.ceil(remainingCount / ITEMS_PER_PAGE)))
    );
    setDeleteItem(null);
    SweetAlert.showDeleteSuccess({ text: 'The mock Proforma Invoice was removed.' });
  };

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
        <PageBackHeader onBack={() => setViewItem(null)} title="Proforma Invoice" />
        <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
            <h3 className="text-lg font-semibold text-gray-800">Proforma Invoice</h3>
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
      <ConfirmDialog
        isOpen={Boolean(deleteItem)}
        title={`Delete Proforma Invoice "${deleteItem?.proformaInvoiceId ?? ''}"?`}
        message="This action will permanently remove the Proforma Invoice. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => setDeleteItem(null)}
        onConfirm={confirmDelete}
      />
      <MasterHeader
        onCreateClick={() => undefined}
        showBreadcrumb
        showCreateButton={false}
        extraActions={
          <button
            type="button"
            onClick={() => navigate(ROUTES.PROFORMA_INVOICES_CREATE)}
            className="btn-primary flex w-full items-center justify-center gap-2 whitespace-nowrap sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create Proforma Invoice</span>
          </button>
        }
      />

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <TableHeader title="Proforma Invoice">
          <ExportExcelButton
            className="w-full sm:w-auto"
            buttonClassName="btn-primary !bg-gray-800 w-full sm:w-auto"
            label="Excel Export"
            fetchExport={async () => exportProformaInvoices(filtered)}
            disabled={loading || filtered.length === 0}
            aria-label="Export Proforma Invoices as Excel"
          />
          <SearchBar
            delay={0}
            placeholder="Please Search Proforma Invoice"
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
            emptyMessage={searchQuery ? 'No Proforma Invoices Found' : 'No Proforma Invoices Available'}
            keyExtractor={(row) => row.id}
            columns={columns}
            onView={(row) => setViewItem(row)}
            onDownload={downloadFile}
            onDelete={(row) => setDeleteItem(row)}
            showViewWithoutPermission
            deletePermissionSlug="proforma-invoice.delete"
          />
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />
      {previewModal}
    </div>
  );
};

export default ProformaInvoices;
