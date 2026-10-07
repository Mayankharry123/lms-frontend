import React, { useEffect, useMemo, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import MasterHeader from '../../components/ui/MasterHeader';
import ModalPopup from '../../components/ui/ModalPopup';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import Table, { type Column } from '../../components/ui/Table';
import TableHeader from '../../components/ui/TableHeader';
import { ROUTES } from '../../constants';
import { listVouchers, type VoucherRow } from '../../services/Vouchers';
import { defaultDatedXlsxFilename, downloadBlobFile } from '../../utils/downloadFile';

const ITEMS_PER_PAGE = 10;
const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const VOUCHER_TYPES = [
  'Staff Welfare Expenses',
  'Tour & Travelling Expenses',
  'Office Expenses',
  'Site Repair & Maintenance',
  'Refreshment Expenses',
  'Printing & Stationery Expenses',
  'Business Promotion Expenses',
  'Transportation Expenses',
  'Telephone Expenses',
  'Hotel Accommodation Expenses',
];

const Voucher: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [selectedVoucherType, setSelectedVoucherType] = useState('');

  useEffect(() => {
    let mounted = true;
    listVouchers()
      .then((data) => {
        if (mounted) {
          setRows(data);
          setListError('');
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load vouchers:', error);
        if (mounted) {
          setRows([]);
          setListError('Failed to load vouchers. Please try again later.');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.voucherId, row.voucherType, row.personName, row.expenseFileName]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [rows, searchQuery]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageRows = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const columns: Column<VoucherRow>[] = [
    {
      key: 'voucherId',
      header: 'Voucher Id',
      className: 'whitespace-nowrap',
      render: (row) => row.voucherId,
    },
    {
      key: 'voucherType',
      header: 'Voucher Type',
      render: (row) => row.voucherType,
    },
    {
      key: 'personName',
      header: 'Person Name',
      render: (row) => row.personName,
    },
    {
      key: 'expenseFileName',
      header: 'Expense File Name',
      className: 'whitespace-nowrap',
      render: (row) => row.expenseFileName || '-',
    },
  ];

  const downloadDemoVoucher = () => {
    if (!selectedVoucherType) return;

    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Voucher Id', 'Voucher Type', 'Person Name', 'Expense File Name'],
      ['', selectedVoucherType, '', ''],
    ]);
    worksheet['!cols'] = [{ wch: 18 }, { wch: 34 }, { wch: 24 }, { wch: 34 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Voucher');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    const typeSlug = selectedVoucherType.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    downloadBlobFile(
      defaultDatedXlsxFilename(`demo-voucher-${typeSlug}`),
      new Blob([buffer], { type: EXCEL_MIME })
    );
    setTypeDialogOpen(false);
  };

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
      <MasterHeader
        onCreateClick={() => undefined}
        showBreadcrumb
        showCreateButton={false}
        extraActions={
          <button
            type="button"
            onClick={() => navigate(ROUTES.VOUCHERS_CREATE)}
            className="btn-primary flex w-full items-center justify-center gap-2 whitespace-nowrap sm:w-auto"
          >
            <Plus className="h-4 w-4" aria-hidden />
            <span>Upload Voucher</span>
          </button>
        }
      />

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <TableHeader title="Voucher">
          <button
            type="button"
            onClick={() => setTypeDialogOpen(true)}
            className="btn-primary !bg-gray-800 w-full sm:w-auto"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download Demo Voucher
          </button>
          <SearchBar
            delay={0}
            placeholder="Please Search Voucher"
            onSearch={(query) => {
              setSearchQuery(query);
              setCurrentPage(1);
            }}
          />
        </TableHeader>

        {listError ? <p role="alert" className="px-5 py-3 text-sm text-red-600">{listError}</p> : null}
        <div className="pt-0 overflow-visible">
          <Table
            data={pageRows}
            startIndex={startIndex}
            loading={loading}
            desktopOnMobile
            emptyMessage="No Vouchers Found"
            keyExtractor={(row) => row.id}
            columns={columns}
          />
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />

      <ModalPopup
        show={typeDialogOpen}
        onClose={() => setTypeDialogOpen(false)}
        title="Download Demo Voucher"
      >
        <div className="space-y-4">
          <label htmlFor="voucher-type" className="block text-sm font-medium text-gray-700">
            Voucher Type
          </label>
          <select
            id="voucher-type"
            value={selectedVoucherType}
            onChange={(event) => setSelectedVoucherType(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          >
            <option value="">Select Voucher Type</option>
            {VOUCHER_TYPES.map((voucherType) => (
              <option key={voucherType} value={voucherType}>
                {voucherType}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setTypeDialogOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary !bg-gray-800"
              onClick={downloadDemoVoucher}
              disabled={!selectedVoucherType}
            >
              <Download className="h-4 w-4" aria-hidden />
              Download Voucher
            </button>
          </div>
        </div>
      </ModalPopup>
    </div>
  );
};

export default Voucher;
