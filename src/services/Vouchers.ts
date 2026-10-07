export interface VoucherRow {
  id: string;
  voucherId: string;
  voucherType: string;
  personName: string;
  expenseFileName: string;
  expenseFile?: File;
  orders?: VoucherOrderLine[];
  sgst?: number;
  cgst?: number;
  igst?: number;
}

export interface VoucherOrderLine {
  date: string;
  particular: string;
  purpose: string;
  mode: string;
  amount: number;
}

export interface CreateVoucherPayload {
  voucherType: string;
  personName: string;
  expenseFile: File;
  orders: VoucherOrderLine[];
  sgst: number;
  cgst: number;
  igst: number;
}

export const MOCK_VOUCHERS: VoucherRow[] = [
  {
    id: 'voucher-001',
    voucherId: 'VCH-2026-001',
    voucherType: 'Staff Welfare Expenses',
    personName: 'Aarav Sharma',
    expenseFileName: 'staff-welfare-october.pdf',
  },
  {
    id: 'voucher-002',
    voucherId: 'VCH-2026-002',
    voucherType: 'Tour & Travelling Expenses',
    personName: 'Neha Verma',
    expenseFileName: 'travel-expense-delhi.xlsx',
  },
  {
    id: 'voucher-003',
    voucherId: 'VCH-2026-003',
    voucherType: 'Office Expenses',
    personName: 'Rohan Mehta',
    expenseFileName: 'office-supplies-receipt.pdf',
  },
];

export async function listVouchers(): Promise<VoucherRow[]> {
  return MOCK_VOUCHERS.map((voucher) => ({ ...voucher }));
}

export async function createVoucher(payload: CreateVoucherPayload): Promise<VoucherRow> {
  const highestId = MOCK_VOUCHERS.reduce((highest, voucher) => {
    const sequence = Number(voucher.voucherId.match(/(\d+)$/)?.[1] ?? 0);
    return Math.max(highest, sequence);
  }, 0);
  const sequence = highestId + 1;
  const voucherId = `VCH-${new Date().getFullYear()}-${String(sequence).padStart(3, '0')}`;
  const voucher: VoucherRow = {
    id: `voucher-${sequence}`,
    voucherId,
    voucherType: payload.voucherType,
    personName: payload.personName,
    expenseFileName: payload.expenseFile.name,
    expenseFile: payload.expenseFile,
    orders: payload.orders.map((order) => ({ ...order })),
    sgst: payload.sgst,
    cgst: payload.cgst,
    igst: payload.igst,
  };
  MOCK_VOUCHERS.unshift(voucher);
  return { ...voucher };
}
