jest.mock('../../constants', () => ({
  API_BASE_URL: 'http://api.test',
}));

jest.mock('../../utils/downloadFile', () => ({
  fileBaseName: (urlOrPath: string) => {
    if (!urlOrPath) return '';
    const clean = urlOrPath.split('?')[0].split('#')[0];
    const parts = clean.split(/[/\\]/);
    return parts[parts.length - 1] || '';
  },
  downloadFileFromUrl: jest.fn(),
}));

jest.mock('../../utils/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

import {
  formatSubmittedDate,
  getNextPoNumber,
  mapRawPurchaseOrder,
  listClientPurchaseOrders,
} from '../ClientPurchaseOrders';
import { apiClient } from '../../utils/apiClient';

describe('ClientPurchaseOrders Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('formatSubmittedDate correctly formats ISO dates and preserves DD Mon YYYY format', () => {
    expect(formatSubmittedDate('2026-10-15')).toBe('15 Oct 2026');
    expect(formatSubmittedDate('2026-01-05 12:30:00')).toBe('05 Jan 2026');
    expect(formatSubmittedDate('09 Oct 2026')).toBe('09 Oct 2026');
  });

  test('getNextPoNumber creates correct sequence pattern', () => {
    const poNumber = getNextPoNumber(0);
    expect(poNumber).toMatch(/^PO\/Client\/\d{2}-\d{2}\/0001$/);
    const poNumber10 = getNextPoNumber(9);
    expect(poNumber10).toMatch(/^PO\/Client\/\d{2}-\d{2}\/0010$/);
  });

  test('mapRawPurchaseOrder correctly maps all 12 table fields and detailed view properties', () => {
    const rawApiData = {
      id: 1,
      po_number: 'PO/Client/26-27/0001',
      po_date: '2026-10-15',
      brief_id: 416,
      brief: {
        id: 416,
        name: 'L3 Brief',
      },
      planner_id: 181,
      planner: {
        id: 181,
        name: 'Naman',
      },
      brand: {
        id: 10,
        name: 'Brand X',
      },
      assign_to: 2,
      assigned_to: {
        id: 2,
        name: 'Manoj',
        email: 'manoj@dgtoohl.com',
      },
      created_by: 1,
      creator: {
        id: 1,
        name: 'Mayank Sharma',
        email: 'mayank.sharma@dgtoohl.com',
      },
      finance_status: {
        id: 3,
        name: 'Approved',
        slug: 'approved',
      },
      cost_sheet_status: 'Submitted',
      company_name: 'Test Corp',
      client_name: 'John Doe',
      primary_email: 'john@test.com',
      gst_number: '07AAAAA0000A1Z5',
      pan_number: 'ABCDE1234F',
      address: '123 Test Street',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      pincode: '110001',
      campaign: 'Diwali 2026',
      period: 'Oct - Nov 2026',
      subtotal: 10000,
      sgst_rate: 9,
      sgst_amount: 900,
      cgst_rate: 9,
      cgst_amount: 900,
      igst_rate: 0,
      igst_amount: 0,
      tax_amount: 1800,
      total_amount: 11800,
      amount_in_words: 'Eleven Thousand Eight Hundred Rupees Only',
      po_file: 'sales-purchase-orders/po_1.pdf',
      po_file_url: 'http://localhost:8000/storage/sales-purchase-orders/po_1.pdf',
      status: 1,
      items: [
        {
          id: 101,
          order_name: 'Billboard Slot 1',
          description: 'South Delhi hoardings',
          hsn_sac: '998361',
          city: 'Delhi',
          slot: 1,
          qty: 1,
          rate: 10000,
          amount: 10000,
        },
      ],
    };

    const mapped = mapRawPurchaseOrder(rawApiData);

    // 12 columns check
    expect(mapped.purchaseOrderId).toBe('PO/Client/26-27/0001');
    expect(mapped.briefId).toBe('#416');
    expect(mapped.briefName).toBe('L3 Brief');
    expect(mapped.planId).toBe('#181');
    expect(mapped.plannerName).toBe('Naman');
    expect(mapped.submittedDate).toBe('15 Oct 2026');
    expect(mapped.assignBy).toBe('Mayank Sharma');
    expect(mapped.financeUser).toBe('Manoj');
    expect(mapped.costSheetStatus).toBe('Submitted');
    expect(mapped.financeStatus).toBe('Approved');
    expect(mapped.poFileUrl).toBe('http://localhost:8000/storage/sales-purchase-orders/po_1.pdf');
    expect(mapped.fileName).toBe('po_1.pdf');

    // Detail fields check
    expect(mapped.companyName).toBe('Test Corp');
    expect(mapped.clientName).toBe('John Doe');
    expect(mapped.primaryEmail).toBe('john@test.com');
    expect(mapped.subtotal).toBe(10000);
    expect(mapped.totalAmount).toBe(11800);
    expect(mapped.amountInWords).toBe('Eleven Thousand Eight Hundred Rupees Only');
    expect(mapped.orders).toHaveLength(1);
    expect(mapped.orders?.[0].order_name).toBe('Billboard Slot 1');
  });

  test('listClientPurchaseOrders parses meta.pagination and rows from API response', async () => {
    const mockApiResponse = {
      success: true,
      message: 'Sales purchase orders retrieved successfully',
      meta: {
        timestamp: '2026-10-22 13:23:29',
        status_code: 200,
        pagination: {
          current_page: 1,
          per_page: 10,
          total: 1,
          last_page: 1,
          from: 1,
          to: 1,
        },
      },
      data: [
        {
          id: 1,
          po_number: 'PO/Client/26-27/0001',
          po_date: '2026-10-15',
          brief_id: 416,
          brief: { id: 416, name: 'L3 Brief' },
          planner_id: 181,
          planner: { id: 181, name: 'Naman' },
        },
      ],
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockApiResponse);

    const result = await listClientPurchaseOrders({ page: 1, per_page: 10 });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].purchaseOrderId).toBe('PO/Client/26-27/0001');
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.current_page).toBe(1);
  });
});
