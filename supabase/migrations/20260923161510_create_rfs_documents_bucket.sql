-- Private POC uploads are controlled by the server action using the secret key.
-- No browser Storage policies or changes to existing RLS are needed.
-- Keep the 5 MiB limit in sync with src/lib/rfs/documents.ts.
insert into storage.buckets (id, name, public, file_size_limit)
values ('rfs-documents', 'rfs-documents', false, 5242880)
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit;

grant insert on public.rfs_documents to service_role;
