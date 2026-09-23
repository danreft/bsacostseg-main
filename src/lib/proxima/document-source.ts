import type { AnalysisDocument } from './pre-analysis';

// Keep source navigation separate from extraction data and rendering. The existing
// endpoint signs access on demand. Browsers may carry the fragment through its
// redirect; PDF viewer support and the existence of the requested page can vary.
export function documentSourceHref(submissionId: string, document: AnalysisDocument, page?: number): string {
  const href = `/proxima/rfs/${encodeURIComponent(submissionId)}/documents/${encodeURIComponent(document.id)}`;
  return /\.pdf$/i.test(document.fileName) && page !== undefined && Number.isSafeInteger(page) && page > 0
    ? `${href}#page=${page}` : href;
}
