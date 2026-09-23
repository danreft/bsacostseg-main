import 'server-only';
import { isUuid, type DetailRecord } from './rfs-detail';
import { rfsGet } from './rfs-server';

export async function loadRfsDetail(id: string): Promise<DetailRecord | null> {
  if (!isUuid(id)) return null;
  const records = await rfsGet<DetailRecord>('rfs_submissions', new URLSearchParams({
    select: 'id,status,submitted_at,client_type,submission_type,rfs_contacts(*),rfs_properties(*),rfs_acquisitions(*),rfs_additional_information(*),rfs_documents(id,document_category,file_name,processing_status,storage_path)',
    id: `eq.${id}`, status: 'neq.draft', submitted_at: 'not.is.null', limit: '1',
    'rfs_contacts.order': 'created_at.asc,id.asc', 'rfs_documents.order': 'created_at.asc,id.asc',
  }));
  return records[0] ?? null;
}
