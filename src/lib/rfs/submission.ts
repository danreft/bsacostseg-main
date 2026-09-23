import type { ClientInformation, ContactInformation } from "../../components/rfs/contact-fields";
import type { ServiceDetailsValue } from "../../components/rfs/service-details";
import type { AdditionalInformationValue } from "../../components/rfs/additional-information";
import { referralOptions, taxFilingTimingOptions } from "../../components/rfs/additional-information-options";

export type SubmissionInput = {
  path: "existing" | "new";
  submittingFor: "self" | "other" | null;
  client: ClientInformation;
  additional: ContactInformation | null;
  service: ServiceDetailsValue;
  information: AdditionalInformationValue;
};

export class SubmissionValidationError extends Error {}
function invalid(): never { throw new SubmissionValidationError("Please review all required fields before submitting."); }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
function str(value: unknown, required = false): string {
  if (typeof value !== "string" || (required && !value.trim())) invalid();
  return value.trim();
}
function choice(value: unknown, options: readonly string[]): string {
  if (typeof value !== "string" || !options.includes(value)) invalid();
  return value;
}
function contact(value: unknown, required: boolean) {
  const c = record(value);
  const email = str(c.email, required);
  if (email && !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(email)) invalid();
  return {
    first_name: str(c.firstName, required), last_name: str(c.lastName, required),
    title_role: str(c.role, required), email, primary_phone: str(c.primaryPhone, required),
    secondary_phone: str(c.secondaryPhone) || null,
  };
}

// Runtime validation is intentional: the server action receives untrusted input.
export function mapSubmission(input: unknown) {
  const p = record(input);
  const path = choice(p.path, ["existing", "new"]);
  const representative = path === "new" && choice(p.submittingFor, ["self", "other"]) === "other";
  const c = record(p.client), s = record(p.service), i = record(p.information);
  const primary = {
    ...contact(c, true), contact_type: representative ? "authorized_representative" : "primary",
    legal_owner_entity_name: str(c.entity, true), address_line_1: str(c.address, true),
    address_line_2: str(c.addressLine2) || null, city: str(c.city, true),
    state: str(c.state, true), zip_code: str(c.zip, true),
  };
  const contacts: object[] = [primary];
  if (representative || p.additional != null) {
    const extra = contact(p.additional, representative);
    // Optional contacts can be partial in the existing UI; empty selections are omitted.
    if (representative || Object.values(extra).some(Boolean)) contacts.push({ ...extra, contact_type: "additional" });
  }
  const zip = str(s.zip, true);
  if (!/^\d{5}(-\d{4})?$/.test(zip)) invalid();
  const acres = Number(str(s.acres, true));
  if (!Number.isFinite(acres) || acres < 0.0001 || acres > 100000000) invalid();
  const price = str(s.purchasePrice, true);
  if (!/^(?=.*[1-9])([0-9]+|[0-9]{1,3}(,[0-9]{3})+)(\.[0-9]{1,2})?$/.test(price)) invalid();
  // Keep decimal precision for numeric(18,2); send an unformatted decimal, not a JS float.
  const decimalPrice = price.replaceAll(",", "").replace(/^0+(?=\d)/, "");
  if (decimalPrice.split(".")[0].length > 16) invalid();
  const date = str(s.acquisitionDate, true);
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < "1800-01-01" || date > "9999-12-31" || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) invalid();
  const source = choice(i.referralSource, referralOptions.map(o => o.id));
  const partner = referralOptions.some(o => o.id === source && o.isReferralPartner);
  if (typeof i.noReferralCode !== "boolean") invalid();
  const cpa = str(i.cpaCompany);
  if (cpa.length > 100) invalid();
  return {
    submission: { client_type: path === "existing" ? "existing_client" : "new_client", submission_type: representative ? "representative" : "self" },
    contacts,
    property: { property_name: str(s.propertyName) || null, address_line_1: str(s.address, true), city: str(s.city, true), state: str(s.state, true), county: str(s.county, true), zip_code: zip, approximate_total_acres: acres },
    acquisition: { acquisition_status: choice(s.acquired, ["yes", "no"]) === "yes" ? "acquired" : "in_progress", acquisition_or_expected_closing_date: date, purchase_or_expected_purchase_price: decimalPrice, existing_purchase_price_allocation: choice(s.existingAllocation, ["yes", "no", "not-sure"]).replace("-", "_") },
    information: { referral_source: source, referral_code: partner && !i.noReferralCode ? str(i.referralCode) || null : null, referral_partner_name: partner && i.noReferralCode ? str(i.referralPartnerName, true) : null, cpa_tax_filing_company: cpa || null, tax_filing_timing: choice(i.taxFilingTiming, taxFilingTimingOptions.map(o => o.id)), additional_details: str(i.additionalDetails) || null, preferred_communication_method: choice(i.communicationPreference, ["text", "email", "both", "no"]) },
  };
}
