export type ListContact = {
  contact_type: "primary" | "authorized_representative" | "additional";
  first_name: string;
  last_name: string;
  legal_owner_entity_name: string | null;
};

export type SubmissionRecord = {
  id: string;
  status: string;
  submitted_at: string;
  client_type: string;
  submission_type: string;
  rfs_contacts: ListContact[];
  rfs_properties: {
    property_name: string | null;
    address_line_1: string;
    city: string;
    state: string;
    zip_code: string;
  } | null;
  rfs_acquisitions: { purchase_or_expected_purchase_price: number | string } | null;
};

export type RfsListRow = {
  id: string;
  displayId: string;
  submittedAt: string;
  entity: string;
  primaryContact: string;
  property: string;
  purchasePrice: number | null;
  status: string;
};

// A missing required client-side contact must never fall back to the representative.
export function primaryListContact(record: SubmissionRecord): ListContact | undefined {
  const contacts = record.rfs_contacts;
  if (record.client_type === "new_client" && record.submission_type === "representative") {
    return contacts.find(contact => contact.contact_type === "additional");
  }
  return contacts.find(contact => contact.contact_type === "primary")
    ?? contacts.find(contact => contact.contact_type === "additional")
    ?? (record.client_type === "existing_client" ? contacts[0] : undefined);
}

export function mapRfsListRow(record: SubmissionRecord): RfsListRow {
  const contact = primaryListContact(record);
  const ownerType = record.submission_type === "representative" ? "authorized_representative" : "primary";
  const entity = record.rfs_contacts.find(c => c.contact_type === ownerType)?.legal_owner_entity_name?.trim()
    || record.rfs_contacts.find(c => c.legal_owner_entity_name?.trim())?.legal_owner_entity_name?.trim();
  const property = record.rfs_properties;
  const price = record.rfs_acquisitions?.purchase_or_expected_purchase_price;
  return {
    id: record.id,
    displayId: `RFS-${record.id.slice(0, 8).toUpperCase()}`,
    submittedAt: record.submitted_at,
    entity: entity || "—",
    primaryContact: contact ? [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim() || "—" : "—",
    property: property?.property_name?.trim() || (property
      ? [property.address_line_1, property.city, [property.state, property.zip_code].filter(Boolean).join(" ")].filter(Boolean).join(", ")
      : "—"),
    purchasePrice: price != null && Number.isFinite(Number(price)) ? Number(price) : null,
    status: record.status,
  };
}

// UTC keeps date rendering consistent between server and browser for this POC.
export function formatSubmissionDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "2-digit", day: "2-digit", year: "numeric" }).format(date).replaceAll("/", "-");
}

export function formatPurchasePrice(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 }).format(value);
}

export function statusLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}
