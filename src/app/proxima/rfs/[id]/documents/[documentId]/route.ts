import { documentViewUrl } from '../../../../../../lib/proxima/view-document';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const { id, documentId } = await params;
  const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' };
  try {
    const url = await documentViewUrl(id, documentId);
    if (!url) return new Response('Document not found.', { status: 404, headers });
    return new Response(null, { status: 303, headers: { ...headers, Location: url } });
  } catch {
    return new Response('Document could not be opened. Please return to the request and try again.', { status: 503, headers });
  }
}
