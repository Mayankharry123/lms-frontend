import type { AllLeadtype } from '../types/lead/lead.types';
/**
 * Defines the supported lead data formats used to pre-fill Brief creation,
 * including nested brand and agency information.
 */
export type LeadBriefPrefillSource = Omit<Partial<AllLeadtype>, 'id' | 'brandId' | 'agencyId'> & {
  id?: string | number;
  name?: string;
  contact_person?: string;
  brand_name?: string;
  brand_id?: string | number;
  agency_id?: string | number | null;
  brand?: { id?: string | number; name?: string };
  agency?: { id?: string | number; name?: string } | null;
  brandId?: string;
  agencyId?: string;
  leadNumericId?: string;
};
/**
 * Maps lead data into the CreateBriefForm initial-data structure.
 * Pre-fills contact person, brand, agency, and lead identifiers
 * while supporting both ID-based and nested API response formats.
 */
/** Maps a lead row to CreateBriefForm initialData (contact person, brand, agency). */
export function buildBriefInitialDataFromLead(lead: LeadBriefPrefillSource): Record<string, unknown> {
  const leadId = String(lead.leadNumericId ?? lead.id ?? '').replace(/^#/, '');
  const brandId = String(lead.brandId ?? lead.brand_id ?? lead.brand?.id ?? '').trim();
  const agencyId = String(lead.agencyId ?? lead.agency_id ?? lead.agency?.id ?? '').trim();
  const brandName = lead.brandName || lead.brand_name || lead.brand?.name;
  const contactPerson = lead.contactPerson || lead.contact_person || lead.name;
  const agencyName = lead.agencyName || lead.agency?.name;

  return {
    lead_id: leadId || undefined,
    contact_person_id: leadId || undefined,
    contactPerson: leadId || contactPerson,
    contact_person: contactPerson,
    brand_id: brandId || undefined,
    brandName: brandId || brandName,
    agency_id: agencyId || undefined,
    createdBy: agencyId || undefined,
    agency: agencyId
      ? { id: agencyId, name: agencyName }
      : agencyName
        ? { name: agencyName }
        : undefined,
  };
}

export type BriefCreateLocationState = {
  leadBriefPrefill?: Record<string, unknown>;
};
