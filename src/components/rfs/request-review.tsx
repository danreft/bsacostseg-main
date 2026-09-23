import type { ReactNode } from "react";
import type { AdditionalInformationValue } from "./additional-information";
import { referralOptions, taxFilingTimingOptions } from "./additional-information-options";
import type { ClientInformation, ContactInformation } from "./contact-fields";
import { documentCategories, type ServiceDetailsValue, type SupportingDocuments } from "./service-details";

function Summary({ rows }: { rows: [string, string][] }) {
  return <dl className="contact-summary review-summary">{rows.filter(([, value]) => value.trim()).map(([label, value]) =>
    <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
  </dl>;
}

function phone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^\d{10}$/.test(digits)) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (/^1\d{10}$/.test(digits)) return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return value.trim();
}

function contactRows(contact: ContactInformation): [string, string][] {
  return [
    ["Name", [contact.firstName.trim(), contact.lastName.trim()].filter(Boolean).join(" ")],
    ["Title / Role", contact.role], ["Email", contact.email],
    ["Primary Phone", phone(contact.primaryPhone)], ["Secondary Phone", phone(contact.secondaryPhone)],
  ];
}

function locality(value: { city: string; state: string; zip: string }) {
  return [value.city.trim(), [value.state.trim(), value.zip.trim()].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

function date(value: string) {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function price(value: string) {
  if (!value.trim()) return "";
  const amount = Number(value.replaceAll(",", ""));
  return Number.isFinite(amount) ? amount.toLocaleString("en-US", { style: "currency", currency: "USD" }) : value;
}

function ReviewSection({ title, step, onEdit, children }: {
  title: string; step: number; onEdit: (step: number) => void; children: ReactNode;
}) {
  return <section className="form-section review-section" aria-labelledby={`review-${step}`}>
    <div className="section-heading"><h2 id={`review-${step}`}>{title}</h2>
      <button type="button" className="text-button" aria-label={`Edit ${title}`} onClick={() => onEdit(step)}>Edit</button>
    </div>
    {children}
  </section>;
}

export function RequestReview({ client, additional, service, documents, information, onEdit, onSubmit, submitting }: {
  client: ClientInformation;
  additional: ContactInformation | null;
  service: ServiceDetailsValue;
  documents: SupportingDocuments;
  information: AdditionalInformationValue;
  onEdit: (step: number) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const ownerRows: [string, string][] = [
    ["Legal Owner / Entity Name", client.entity],
    ["Mailing Address", [client.address.trim(), client.addressLine2.trim(), locality(client)].filter(Boolean).join("\n")],
  ];
  const referral = referralOptions.find((option) => option.id === information.referralSource);
  const selectedDocuments = documentCategories.filter((category) => documents[category.id]);
  const communication = { text: "Text", email: "Email", both: "Both", no: "No" };

  return <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
    <fieldset disabled={submitting} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }} aria-busy={submitting}>
    <p className="supporting-copy">Review your information before submitting. Select Edit to make changes.</p>
    <ReviewSection title="Contact Information" step={1} onEdit={onEdit}>
      <h3>Authorized Representative</h3>
      <Summary rows={contactRows(client)} />
      <h3>Legal Owner / Entity</h3>
      <Summary rows={ownerRows} />
      {additional && Object.values(additional).some((value) => value.trim()) && <>
        <h3>Additional Contact</h3><Summary rows={contactRows(additional)} />
      </>}
    </ReviewSection>

    <ReviewSection title="Service Details" step={2} onEdit={onEdit}>
      <h3>Property</h3>
      <Summary rows={[
        ["Property / Farm Name", service.propertyName], ["Property Address", service.address],
        ["City / State / ZIP", locality(service)], ["County", service.county],
        ["Approximate Total Acres", service.acres ? Number(service.acres).toLocaleString("en-US", { maximumFractionDigits: 20 }) : ""],
      ]} />
      <h3>Acquisition</h3>
      <Summary rows={[
        [service.acquired === "no" ? "Expected Closing Date" : "Acquisition Date", date(service.acquisitionDate)],
        [service.acquired === "no" ? "Expected Purchase Price" : "Total Purchase Price", price(service.purchasePrice)],
        ["Existing Purchase Price Allocation", service.existingAllocation ? { yes: "Yes", no: "No", "not-sure": "Not Sure" }[service.existingAllocation] : ""],
      ]} />
      <h3>Supporting Documents</h3>
      <p className="supporting-copy">Selected files will be saved with your request when you submit.</p>
      {selectedDocuments.length ? <Summary rows={selectedDocuments.map((category) => [category.label, documents[category.id]!.name])} />
        : <p className="supporting-copy">No supporting documents selected.</p>}
    </ReviewSection>

    <ReviewSection title="Additional Information" step={3} onEdit={onEdit}>
      <Summary rows={[
        ["How did you hear about us?", referral?.label ?? ""],
        ["Referral Code", referral?.isReferralPartner && !information.noReferralCode ? information.referralCode : ""],
        ["Referral Partner Name", referral?.isReferralPartner && information.noReferralCode ? information.referralPartnerName : ""],
        ["CPA / Tax Filing Company", information.cpaCompany],
        ["Tax filing timing", taxFilingTimingOptions.find((option) => option.id === information.taxFilingTiming)?.label ?? ""],
        ["Preferred Method of Communication", information.communicationPreference ? communication[information.communicationPreference] : ""],
        ["Additional Details", information.additionalDetails],
      ]} />
    </ReviewSection>

    <p className="supporting-copy review-acknowledgment">By submitting this request, you confirm that the information provided is accurate to the best of your knowledge. Our team may contact you if additional information or documentation is needed.</p>
    <div className="form-navigation review-navigation">
      <button type="button" className="secondary-button" onClick={() => onEdit(3)}>Previous</button>
      <div><button type="button" className="text-button" disabled aria-describedby="review-save-note">Save for Later</button><span id="review-save-note" className="save-note">Coming soon</span></div>
      <button type="submit" className="primary-button">{submitting ? "Submitting…" : "Submit Request"}</button>
    </div>
    </fieldset>
  </form>;
}
