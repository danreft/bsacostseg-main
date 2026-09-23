// Shared validation; keep the bucket limit and Next.js body limit in sync when changing this.
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_CATEGORY_MAP = {
  "purchase-agreement": "purchase_agreement",
  "property-appraisal": "property_appraisal",
  "existing-allocation": "existing_purchase_price_allocation",
  "asset-equipment-list": "fixed_asset_equipment_list",
  other: "other",
} as const;

const documentTypes: Record<string, string> = {
  pdf: "application/pdf", doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv", txt: "text/plain", rtf: "application/rtf",
  odt: "application/vnd.oasis.opendocument.text", ods: "application/vnd.oasis.opendocument.spreadsheet",
};
export const DOCUMENT_ACCEPT = Object.keys(documentTypes).map(extension => `.${extension}`).join(",");

export function documentExtension(file: File) { return /\.([a-z0-9]+)$/i.exec(file.name)?.[1].toLowerCase() ?? ""; }
export function documentMimeType(file: File) { return documentTypes[documentExtension(file)]; }

export function documentValidationError(file: File): string | null {
  if (!Object.hasOwn(documentTypes, documentExtension(file))) {
    return "Please select a supported document: PDF, Word, Excel, PowerPoint, CSV, TXT, RTF, ODT, or ODS.";
  }
  if (file.size > MAX_DOCUMENT_BYTES) return `Each document must be ${MAX_DOCUMENT_BYTES / 1024 / 1024} MB or smaller. Please replace or remove the oversized file in Step 2.`;
  if (file.size === 0) return "A selected document is empty. Please replace or remove it in Step 2.";
  return null;
}

export function validateDocuments(input: FormData) {
  if (!(input instanceof FormData)) throw new Error("Please select your supporting documents again in Step 2.");
  const seen = new Set<string>();
  return Array.from(input.entries()).map(([key, file]) => {
    if (!Object.hasOwn(DOCUMENT_CATEGORY_MAP, key) || seen.has(key) || !(file instanceof File)) {
      throw new Error("Please select one file per document category in Step 2.");
    }
    seen.add(key);
    const error = documentValidationError(file);
    if (error) throw new Error(error);
    return { category: DOCUMENT_CATEGORY_MAP[key as keyof typeof DOCUMENT_CATEGORY_MAP], file };
  });
}
