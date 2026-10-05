import { ENDPOINTS } from '../constants/endpoints';

const dgplayApiKey = String(import.meta.env.VITE_DGPLAY_API_KEY || '').trim();

function dgplayBaseUrl(): string {
  const configuredBase = String(import.meta.env.VITE_DGPLAY_API_BASE_URL || 'http://localhost:8080/api')
    .trim()
    .replace(/\/+$/, '');
  return import.meta.env.DEV ? '/dgplay-api' : configuredBase;
}

function publisherListUrl(search?: string): string {
  const params = new URLSearchParams();
  const query = search?.trim();
  if (query) params.set('search', query);
  const suffix = params.toString();
  return `${dgplayBaseUrl()}${ENDPOINTS.PUBLISHERS.LIST}${suffix ? `?${suffix}` : ''}`;
}

type DgplayBody = {
  status?: number | string;
  message?: string;
  data?: unknown;
};

async function dgplayGet(url: string): Promise<DgplayBody> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-DGPlay-Api-Key': dgplayApiKey,
    },
  });
  const body = (await response.json().catch(() => ({}))) as DgplayBody;
  if (!response.ok || (body.status !== 1 && body.status !== '1')) {
    throw new Error(body.message || 'Publisher request failed');
  }
  return body;
}

export type PublisherOption = {
  id: string;
  name: string;
};

export type PublisherBankDetails = {
  gstNumber: string;
  panNumber: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
};

export type PublisherAddress = {
  id: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
};

export type PublisherDetail = {
  id: string;
  name: string;
  primaryEmail: string;
  companyName: string;
  bank: PublisherBankDetails;
  addresses: PublisherAddress[];
};

const asText = (value: unknown) => (value == null ? '' : String(value).trim());

function unwrapData(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const record = payload as Record<string, unknown>;
  if ('data' in record && (record.success === true || record.status === 1 || record.status === '1')) {
    return record.data;
  }
  return payload;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function mapPublisherOption(raw: unknown): PublisherOption | null {
  const record = asRecord(raw);
  const id = asText(record.id);
  const name = asText(record.name ?? record.publisher_name ?? record.company_name);
  if (!id || !name) return null;
  return { id, name };
}

function mapAddresses(value: unknown): PublisherAddress[] {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list
    .map((item, index) => {
      const record = asRecord(item);
      return {
        id: asText(record.id) || `address-${index}`,
        address: asText(record.address),
        city: asText(record.city),
        state: asText(record.state),
        country: asText(record.country),
        pincode: asText(record.pincode ?? record.pin_code),
      };
    })
    .filter((item) => item.address || item.city || item.state || item.country || item.pincode);
}

export function mapPublisherDetail(raw: unknown): PublisherDetail {
  const record = asRecord(unwrapData(raw) ?? raw);
  const bank = asRecord(record.bank_details ?? record.bankDetails);
  return {
    id: asText(record.id),
    name: asText(record.name),
    primaryEmail: asText(record.primary_email ?? record.primaryEmail ?? record.email),
    companyName: asText(record.company_name ?? record.companyName),
    bank: {
      gstNumber: asText(bank.gst_number ?? bank.gstNumber),
      panNumber: asText(bank.pan_number ?? bank.panNumber),
      accountHolderName: asText(bank.account_holder_name ?? bank.accountHolderName),
      accountNumber: asText(bank.account_number ?? bank.accountNumber),
      ifscCode: asText(bank.ifsc_code ?? bank.ifscCode),
      bankName: asText(bank.bank_name ?? bank.bankName),
    },
    addresses: mapAddresses(record.address ?? record.addresses),
  };
}

export async function listPublishers(search?: string): Promise<PublisherOption[]> {
  const body = await dgplayGet(publisherListUrl(search));
  const payload = unwrapData(body);
  const list = Array.isArray(payload) ? payload : [];
  return list.map(mapPublisherOption).filter((item): item is PublisherOption => item !== null);
}

export async function getPublisherById(id: string | number): Promise<PublisherDetail> {
  const body = await dgplayGet(`${dgplayBaseUrl()}${ENDPOINTS.PUBLISHERS.DETAIL(id)}`);
  return mapPublisherDetail(body);
}
