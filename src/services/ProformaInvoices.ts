export type ProformaInvoiceRow = {
  id: string;
  proformaInvoiceId: string;
  fileName: string;
  brandNameFileName: string;
  subTotalAmount: number;
  igst: number;
  cgst: number;
  sgst: number;
  totalAmount: number;
  brandId?: string;
  gstNumber?: string;
  address?: string;
  orderDetails?: Array<{
    order: string;
    hsnSac: string;
    city: string;
    qty: number;
    rate: number;
    amount: number;
  }>;
};

export type CreateMockProformaInvoiceInput = {
  brandId: string;
  brandName: string;
  gstNumber: string;
  address: string;
  orderDetails: NonNullable<ProformaInvoiceRow['orderDetails']>;
  subTotalAmount: number;
  igst: number;
  cgst: number;
  sgst: number;
};

const makeInvoice = (
  id: string,
  brandNameFileName: string,
  subTotalAmount: number,
  igst: number,
  cgst: number,
  sgst: number
): ProformaInvoiceRow => ({
  id,
  proformaInvoiceId: id,
  fileName: `${id.toLowerCase()}-${brandNameFileName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`,
  brandNameFileName,
  subTotalAmount,
  igst,
  cgst,
  sgst,
  totalAmount: subTotalAmount + igst + cgst + sgst,
});

export const MOCK_PROFORMA_INVOICES: ProformaInvoiceRow[] = [
  makeInvoice('PI-2026-001', 'Alok Test', 125000, 22500, 0, 0),
  makeInvoice('PI-2026-002', 'Northstar Media', 84250.5, 0, 7582.55, 7582.55),
  makeInvoice('PI-2026-003', 'Bluebird Retail', 57600, 10368, 0, 0),
  makeInvoice('PI-2026-004', 'Apex Foods', 214999.99, 0, 19350, 19350),
  makeInvoice('PI-2026-005', 'Greenfield Motors', 46800, 8424, 0, 0),
  makeInvoice('PI-2026-006', 'Summit Healthcare', 132500, 0, 11925, 11925),
  makeInvoice('PI-2026-007', 'Urban Living', 39999.5, 7199.91, 0, 0),
  makeInvoice('PI-2026-008', 'Bright Future Education', 76500, 0, 6885, 6885),
  makeInvoice('PI-2026-009', 'Silverline Hotels', 189000, 34020, 0, 0),
  makeInvoice('PI-2026-010', 'Everest Technologies', 96500.25, 0, 8685.02, 8685.02),
  makeInvoice('PI-2026-011', 'Coastal Travels', 55000, 9900, 0, 0),
  makeInvoice('PI-2026-012', 'Meadow Organics', 117750, 0, 10597.5, 10597.5),
];

export function createMockProformaInvoice(
  input: CreateMockProformaInvoiceInput
): ProformaInvoiceRow {
  const currentYear = new Date().getFullYear();
  const sequence = MOCK_PROFORMA_INVOICES.reduce((highest, row) => {
    const match = row.proformaInvoiceId.match(/^PI-\d{4}-(\d+)$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0) + 1;
  const id = `PI-${currentYear}-${String(sequence).padStart(3, '0')}`;
  const brandFileSlug =
    input.brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
    'brand';
  const invoice: ProformaInvoiceRow = {
    id,
    proformaInvoiceId: id,
    fileName: `${id.toLowerCase()}-${brandFileSlug}.txt`,
    brandNameFileName: input.brandName,
    subTotalAmount: input.subTotalAmount,
    igst: input.igst,
    cgst: input.cgst,
    sgst: input.sgst,
    totalAmount: input.subTotalAmount + input.igst + input.cgst + input.sgst,
    brandId: input.brandId,
    gstNumber: input.gstNumber,
    address: input.address,
    orderDetails: input.orderDetails,
  };
  MOCK_PROFORMA_INVOICES.unshift(invoice);
  return invoice;
}

export function removeMockProformaInvoice(id: string): void {
  const index = MOCK_PROFORMA_INVOICES.findIndex((row) => row.id === id);
  if (index >= 0) MOCK_PROFORMA_INVOICES.splice(index, 1);
}

export function createMockProformaInvoiceFile(row: ProformaInvoiceRow): File {
  const content = [
    'PROFORMA INVOICE',
    `PI ID: ${row.proformaInvoiceId}`,
    `Brand Name: ${row.brandNameFileName}`,
    ...(row.gstNumber ? [`GST No.: ${row.gstNumber}`] : []),
    ...(row.address ? [`Address: ${row.address}`] : []),
    '',
    ...(row.orderDetails ?? []).flatMap((line, index) => [
      `Order ${index + 1}: ${line.order}`,
      `HSN/SAC: ${line.hsnSac}`,
      `City: ${line.city}`,
      `Slot: ${line.qty}`,
      `Rate: INR ${line.rate.toFixed(2)}`,
      `Amount: INR ${line.amount.toFixed(2)}`,
    ]),
    ...(row.orderDetails?.length ? [''] : []),
    `Sub Total Amount: INR ${row.subTotalAmount.toFixed(2)}`,
    `IGST: INR ${row.igst.toFixed(2)}`,
    `CGST: INR ${row.cgst.toFixed(2)}`,
    `SGST: INR ${row.sgst.toFixed(2)}`,
    `Total Amount: INR ${row.totalAmount.toFixed(2)}`,
    '',
    'Mock Proforma Invoice file for demonstration purposes.',
  ].join('\n');

  return new File([content], row.fileName, { type: 'text/plain' });
}
