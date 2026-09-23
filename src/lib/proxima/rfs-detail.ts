import { primaryListContact, type ListContact, type SubmissionRecord, statusLabel } from './rfs-list';
import { referralOptions, taxFilingTimingOptions } from '../../components/rfs/additional-information-options';

export type DetailContact = ListContact & {
  id: string; title_role: string; email: string; primary_phone: string;
  address_line_1: string | null; address_line_2: string | null;
  city: string | null; state: string | null; zip_code: string | null;
};
export type RfsDocument = { id: string; document_category: string; file_name: string; processing_status: string; storage_path: string | null };
export type DetailRecord = Omit<SubmissionRecord, 'rfs_contacts' | 'rfs_properties' | 'rfs_acquisitions'> & {
  rfs_contacts: DetailContact[];
  rfs_properties: (NonNullable<SubmissionRecord['rfs_properties']> & { county: string; approximate_total_acres: string | number }) | null;
  rfs_acquisitions: (NonNullable<SubmissionRecord['rfs_acquisitions']> & { acquisition_status: string; acquisition_or_expected_closing_date: string; existing_purchase_price_allocation: string }) | null;
  rfs_additional_information: { referral_source: string; referral_code: string | null; referral_partner_name: string | null; cpa_tax_filing_company: string | null; tax_filing_timing: string; preferred_communication_method: string; additional_details: string | null } | null;
  rfs_documents: RfsDocument[];
};
export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function detailContacts(record: DetailRecord) {
  const primary = primaryListContact(record) as DetailContact | undefined;
  const representative = record.submission_type === 'representative' ? record.rfs_contacts.find(c => c.contact_type === 'authorized_representative') : undefined;
  const ownerType = record.submission_type === 'representative' ? 'authorized_representative' : 'primary';
  const entity = record.rfs_contacts.find(c => c.contact_type === ownerType && c.legal_owner_entity_name?.trim())
    ?? record.rfs_contacts.find(c => c.legal_owner_entity_name?.trim());
  const samePerson = (a: DetailContact, b?: DetailContact) => !!b && (a.id === b.id || (!!a.email && a.email.trim().toLowerCase() === b.email.trim().toLowerCase()));
  const additional = record.submission_type === 'self' ? record.rfs_contacts.filter(c => c.contact_type === 'additional' && !samePerson(c, primary)) : [];
  return { primary, representative, entity, additional };
}
export function mailingAddress(contact?: DetailContact) {
  return contact ? [contact.address_line_1, contact.address_line_2, contact.city, contact.state, contact.zip_code].filter(Boolean).join(', ') : '';
}
export const documentLabels: Record<string, string> = {
  purchase_agreement: 'Purchase Agreement', property_appraisal: 'Property Appraisal',
  existing_purchase_price_allocation: 'Existing Purchase Price Allocation', fixed_asset_equipment_list: 'Fixed Asset / Equipment List', other: 'Other Supporting Document',
};
export function readable(value: string) { return statusLabel(value.replaceAll('-', '_')); }
export function additionalFields(info: DetailRecord['rfs_additional_information']): [string, string | null][] {
  if (!info) return [];
  const partner = referralOptions.some(o => o.id === info.referral_source && o.isReferralPartner);
  return [
    ['How did you hear about us?', referralOptions.find(o => o.id === info.referral_source)?.label ?? readable(info.referral_source)],
    ['Referral Code', partner ? info.referral_code : null], ['Referral Partner Name', partner ? info.referral_partner_name : null],
    ['CPA / Tax Filing Company', info.cpa_tax_filing_company],
    ['Tax Filing Timing', taxFilingTimingOptions.find(o => o.id === info.tax_filing_timing)?.label ?? readable(info.tax_filing_timing)],
    ['Preferred Method of Communication', ({ text: 'Text', email: 'Email', both: 'Both (Text and Email)', no: 'No' } as Record<string, string>)[info.preferred_communication_method] ?? readable(info.preferred_communication_method)],
    ['Additional Details', info.additional_details],
  ];
}
