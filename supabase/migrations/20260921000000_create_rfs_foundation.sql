-- Database foundation only. Client access stays closed until access policies exist.
begin;

create table public.rfs_submissions (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft',
  client_type text not null,
  submission_type text not null,
  clerk_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  constraint rfs_submissions_status_check check (status in ('draft', 'submitted')),
  constraint rfs_submissions_client_type_check check (client_type in ('existing_client', 'new_client')),
  constraint rfs_submissions_submission_type_check check (submission_type in ('self', 'representative'))
);

comment on column public.rfs_submissions.status is
  'Extend the named CHECK constraint in a later migration to add statuses; no workflow transitions are enforced.';
comment on column public.rfs_submissions.clerk_user_id is
  'Nullable external identity; unauthenticated prospects can have requests. No authentication integration yet.';

create table public.rfs_contacts (
  id uuid primary key default gen_random_uuid(),
  rfs_submission_id uuid not null references public.rfs_submissions(id) on delete cascade,
  contact_type text not null check (contact_type in ('primary', 'authorized_representative', 'additional')),
  first_name text not null,
  last_name text not null,
  title_role text not null,
  email text not null,
  primary_phone text not null,
  secondary_phone text,
  legal_owner_entity_name text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  zip_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index rfs_contacts_submission_idx on public.rfs_contacts (rfs_submission_id);

create table public.rfs_properties (
  id uuid primary key default gen_random_uuid(),
  rfs_submission_id uuid not null unique references public.rfs_submissions(id) on delete cascade,
  property_name text,
  address_line_1 text not null,
  city text not null,
  state text not null,
  county text not null,
  zip_code text not null,
  approximate_total_acres numeric(18, 6) not null
    check (approximate_total_acres > 0 and approximate_total_acres <> 'NaN'::numeric),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rfs_acquisitions (
  id uuid primary key default gen_random_uuid(),
  rfs_submission_id uuid not null unique references public.rfs_submissions(id) on delete cascade,
  acquisition_status text not null check (acquisition_status in ('acquired', 'in_progress')),
  acquisition_or_expected_closing_date date not null,
  purchase_or_expected_purchase_price numeric(18, 2) not null
    check (purchase_or_expected_purchase_price >= 0 and purchase_or_expected_purchase_price <> 'NaN'::numeric),
  existing_purchase_price_allocation text not null check (existing_purchase_price_allocation in ('yes', 'no', 'not_sure')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rfs_documents (
  id uuid primary key default gen_random_uuid(),
  rfs_submission_id uuid not null references public.rfs_submissions(id) on delete cascade,
  document_category text not null check (document_category in (
    'purchase_agreement', 'property_appraisal', 'existing_purchase_price_allocation',
    'fixed_asset_equipment_list', 'other'
  )),
  file_name text not null,
  storage_path text,
  mime_type text,
  file_size bigint check (file_size >= 0),
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processing', 'complete', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index rfs_documents_submission_idx on public.rfs_documents (rfs_submission_id);
comment on table public.rfs_documents is 'Document metadata only; no storage or processing integration.';
comment on column public.rfs_documents.file_size is 'File size in bytes, when known.';

create table public.rfs_additional_information (
  id uuid primary key default gen_random_uuid(),
  rfs_submission_id uuid not null unique references public.rfs_submissions(id) on delete cascade,
  referral_source text not null,
  referral_code text,
  referral_partner_name text,
  cpa_tax_filing_company text,
  tax_filing_timing text not null,
  additional_details text,
  preferred_communication_method text not null check (preferred_communication_method in ('text', 'email', 'both', 'no')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.rfs_additional_information.referral_source is
  'Opaque list value; future Proxima-managed options are intentionally not constrained here.';
comment on column public.rfs_additional_information.tax_filing_timing is
  'Opaque list value; future Proxima-managed options are intentionally not constrained here.';

-- One shared timestamp trigger; this performs no submission or workflow logic.
create function public.rfs_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger rfs_submissions_updated_at before update on public.rfs_submissions
  for each row execute function public.rfs_set_updated_at();
create trigger rfs_contacts_updated_at before update on public.rfs_contacts
  for each row execute function public.rfs_set_updated_at();
create trigger rfs_properties_updated_at before update on public.rfs_properties
  for each row execute function public.rfs_set_updated_at();
create trigger rfs_acquisitions_updated_at before update on public.rfs_acquisitions
  for each row execute function public.rfs_set_updated_at();
create trigger rfs_documents_updated_at before update on public.rfs_documents
  for each row execute function public.rfs_set_updated_at();
create trigger rfs_additional_information_updated_at before update on public.rfs_additional_information
  for each row execute function public.rfs_set_updated_at();

-- Intentionally no policies: ordinary clients cannot access RFS rows.
alter table public.rfs_submissions enable row level security;
alter table public.rfs_contacts enable row level security;
alter table public.rfs_properties enable row level security;
alter table public.rfs_acquisitions enable row level security;
alter table public.rfs_documents enable row level security;
alter table public.rfs_additional_information enable row level security;

-- Also remove any inherited default client grants (including privileges outside RLS).
revoke all on table public.rfs_submissions, public.rfs_contacts, public.rfs_properties,
  public.rfs_acquisitions, public.rfs_documents, public.rfs_additional_information
  from public, anon, authenticated;

commit;
