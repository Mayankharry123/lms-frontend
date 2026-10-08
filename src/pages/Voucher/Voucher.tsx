import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MasterHeader from '../../components/ui/MasterHeader';
import ModalPopup from '../../components/ui/ModalPopup';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import Table, { type Column } from '../../components/ui/Table';
import TableHeader from '../../components/ui/TableHeader';
import { ROUTES } from '../../constants';
import {
  getVoucher,
  getVoucherSampleDownload,
  listVoucherTypes,
  listVouchers,
  type VoucherRow,
} from '../../services/Vouchers';
import { downloadFileFromUrl } from '../../utils/downloadFile';
import SweetAlert from '../../utils/SweetAlert';

const ITEMS_PER_PAGE = 10;
const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});
const formatAmount = (amount: number | null) => (amount === null ? '-' : CURRENCY_FORMATTER.format(amount));
const formatRate = (rate: number | null) => (rate === null ? '-' : `${rate}%`);

const Voucher: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [selectedVoucherTypeId, setSelectedVoucherTypeId] = useState('');
  const [voucherTypes, setVoucherTypes] = useState<{ id: string; name: string }[]>([]);
  const [voucherTypeError, setVoucherTypeError] = useState('');
  const [downloadingVoucherId, setDownloadingVoucherId] = useState<string | null>(null);
  const [downloadingSample, setDownloadingSample] = useState(false);

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

    listVoucherTypes()
      .then((data) => {
        if (mounted) {
          setVoucherTypes(data);
          setVoucherTypeError('');
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load voucher types:', error);
        if (mounted) {
          setVoucherTypes([]);
          setVoucherTypeError('Failed to load voucher types.');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [
        row.voucherId,
        row.voucherType,
        row.personName,
        row.subtotal,
        row.sgstRate,
        row.cgstRate,
        row.totalTax,
        row.totalAmount,
        row.expenseFileName,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [rows, searchQuery]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageRows = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const selectedVoucherType = voucherTypes.find((type) => type.id === selectedVoucherTypeId);

  const downloadVoucher = async (row: VoucherRow) => {
    if (downloadingVoucherId) return;
    setDownloadingVoucherId(row.id);
    try {
      const voucher = await getVoucher(row.id);
      if (!voucher.fileUrl) {
        throw new Error('No downloadable file is available for this voucher.');
      }
      await downloadFileFromUrl(
        voucher.fileUrl,
        voucher.expenseFileName || row.expenseFileName || 'voucher'
      );
    } catch (error) {
      SweetAlert.showError(error instanceof Error ? error.message : 'Failed to download voucher.');
    } finally {
      setDownloadingVoucherId(null);
    }
  };

  const expenseFileButton = (row: VoucherRow) => {
    if (!row.expenseFileName) {
      return <span className="inline-flex h-7 items-center text-sm leading-none text-gray-400">-</span>;
    }

    return (
      <button
        type="button"
        onClick={() => void downloadVoucher(row)}
        disabled={downloadingVoucherId !== null}
        title={`Download ${row.expenseFileName}`}
        className="inline-flex h-7 items-center gap-1.5 text-left text-sm leading-none text-gray-800 hover:text-orange-600 disabled:cursor-wait disabled:opacity-60"
      >
        <FileText className="h-4 w-4 shrink-0 text-orange-600" aria-hidden />
        <span className="whitespace-nowrap">{row.expenseFileName}</span>
      </button>
    );
  };

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
      key: 'subtotal',
      header: 'Subtotal',
      className: 'whitespace-nowrap text-right',
      render: (row) => formatAmount(row.subtotal),
    },
    {
      key: 'sgstRate',
      header: 'SGST Rate',
      className: 'whitespace-nowrap text-right',
      render: (row) => formatRate(row.sgstRate),
    },
    {
      key: 'cgstRate',
      header: 'CGST Rate',
      className: 'whitespace-nowrap text-right',
      render: (row) => formatRate(row.cgstRate),
    },
    {
      key: 'totalTax',
      header: 'Total Tax',
      className: 'whitespace-nowrap text-right',
      render: (row) => formatAmount(row.totalTax),
    },
    {
      key: 'totalAmount',
      header: 'Total Amount',
      className: 'whitespace-nowrap text-right font-semibold',
      render: (row) => formatAmount(row.totalAmount),
    },
    {
      key: 'expenseFileName',
      header: 'Expense File Name',
      minWidth: 220,
      headerClassName: 'text-left',
      className: 'whitespace-nowrap',
      render: (row) => expenseFileButton(row),
    },
  ];

  const downloadDemoVoucher = async () => {
    if (!selectedVoucherType || downloadingSample) return;
    setDownloadingSample(true);
    try {
      const sample = await getVoucherSampleDownload(selectedVoucherType.id);
      await downloadFileFromUrl(
        sample.downloadUrl,
        sample.fileName || `${selectedVoucherType.name}-sample.xlsx`
      );
      setTypeDialogOpen(false);
    } catch (error) {
      SweetAlert.showError(error instanceof Error ? error.message : 'Failed to download sample voucher.');
    } finally {
      setDownloadingSample(false);
    }
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
            value={selectedVoucherTypeId}
            onChange={(event) => setSelectedVoucherTypeId(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            disabled={voucherTypes.length === 0}
          >
            <option value="">{voucherTypeError ? 'Voucher types unavailable' : 'Select Voucher Type'}</option>
            {voucherTypes.map((voucherType) => (
              <option key={voucherType.id} value={voucherType.id}>
                {voucherType.name}
              </option>
            ))}
          </select>
          {voucherTypeError ? <p className="mt-2 text-xs text-red-600">{voucherTypeError}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setTypeDialogOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary !bg-gray-800"
              onClick={() => void downloadDemoVoucher()}
              disabled={!selectedVoucherTypeId || downloadingSample}
            >
              <Download className="h-4 w-4" aria-hidden />
              {downloadingSample ? 'Downloading...' : 'Download Voucher'}
            </button>
          </div>
        </div>
      </ModalPopup>
    </div>
  );
};

export default Voucher;
