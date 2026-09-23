import 'server-only';
import { isUuid, type RfsDocument } from './rfs-detail';
import { rfsGet, rfsServerConfig } from './rfs-server';

// Reusable source access boundary for future analysis links. No page-level navigation yet.
// POC assumes the Proxima deployment is restricted to internal users. Add analyst
// authorization here before exposing these routes outside that trusted environment.
export async function documentViewUrl(submissionId: string, documentId: string): Promise<string | null> {
  if (!isUuid(submissionId) || !isUuid(documentId)) return null;
  const documents = await rfsGet<RfsDocument>('rfs_documents', new URLSearchParams({
    select: 'id,storage_path,rfs_submissions!inner(id)', id: `eq.${documentId}`,
    rfs_submission_id: `eq.${submissionId}`, 'rfs_submissions.status': 'neq.draft',
    'rfs_submissions.submitted_at': 'not.is.null', limit: '1',
  }));
  const path = documents[0]?.storage_path;
  if (!path || path.split('/')[0].toLowerCase() !== submissionId.toLowerCase() || path.split('/').some(p => p === '..' || p === '.')) return null;
  const { url, secret } = rfsServerConfig();
  const response = await fetch(`${url}/storage/v1/object/sign/rfs-documents/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST', headers: { apikey: secret, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 60 }), cache: 'no-store', signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('Document could not be opened');
  const result: { signedURL?: string } = await response.json();
  if (!result.signedURL?.startsWith('/object/sign/')) throw new Error('Invalid document response');
  return `${url}/storage/v1${result.signedURL}`;
}
