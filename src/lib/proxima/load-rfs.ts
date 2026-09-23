import "server-only";
import { mapRfsListRow, type SubmissionRecord, type RfsListRow } from "./rfs-list";

export async function loadRfsList(): Promise<RfsListRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("RFS list is not configured");

  // Same server-side REST infrastructure as submit-rfs; select only list fields.
  const query = new URLSearchParams({
    select: "id,status,submitted_at,client_type,submission_type,rfs_contacts(contact_type,first_name,last_name,legal_owner_entity_name),rfs_properties(property_name,address_line_1,city,state,zip_code),rfs_acquisitions(purchase_or_expected_purchase_price)",
    submitted_at: "not.is.null",
    status: "neq.draft",
    order: "submitted_at.desc,id.asc",
    "rfs_contacts.order": "created_at.asc,id.asc",
  });
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rfs_submissions?${query}`, {
    headers: { apikey: secret },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("RFS list database request failed");
  const records: SubmissionRecord[] = await response.json();
  return records.map(mapRfsListRow);
}
