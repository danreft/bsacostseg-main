-- One RPC call is one transaction: any failed child insert rolls everything back.
begin;
create function public.submit_rfs(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  submission_id uuid;
begin
  insert into public.rfs_submissions (status, client_type, submission_type, clerk_user_id, submitted_at)
  values ('submitted', payload->'submission'->>'client_type', payload->'submission'->>'submission_type', null, now())
  returning id into submission_id;

  insert into public.rfs_contacts (rfs_submission_id, contact_type, first_name, last_name, title_role, email, primary_phone, secondary_phone, legal_owner_entity_name, address_line_1, address_line_2, city, state, zip_code)
  select submission_id, r.contact_type, r.first_name, r.last_name, r.title_role, r.email, r.primary_phone, r.secondary_phone, r.legal_owner_entity_name, r.address_line_1, r.address_line_2, r.city, r.state, r.zip_code
  from pg_catalog.jsonb_populate_recordset(null::public.rfs_contacts, payload->'contacts') as r;

  insert into public.rfs_properties (rfs_submission_id, property_name, address_line_1, city, state, county, zip_code, approximate_total_acres)
  select submission_id, r.property_name, r.address_line_1, r.city, r.state, r.county, r.zip_code, r.approximate_total_acres
  from pg_catalog.jsonb_populate_record(null::public.rfs_properties, payload->'property') as r;

  insert into public.rfs_acquisitions (rfs_submission_id, acquisition_status, acquisition_or_expected_closing_date, purchase_or_expected_purchase_price, existing_purchase_price_allocation)
  select submission_id, r.acquisition_status, r.acquisition_or_expected_closing_date, r.purchase_or_expected_purchase_price, r.existing_purchase_price_allocation
  from pg_catalog.jsonb_populate_record(null::public.rfs_acquisitions, payload->'acquisition') as r;

  insert into public.rfs_additional_information (rfs_submission_id, referral_source, referral_code, referral_partner_name, cpa_tax_filing_company, tax_filing_timing, additional_details, preferred_communication_method)
  select submission_id, r.referral_source, r.referral_code, r.referral_partner_name, r.cpa_tax_filing_company, r.tax_filing_timing, r.additional_details, r.preferred_communication_method
  from pg_catalog.jsonb_populate_record(null::public.rfs_additional_information, payload->'information') as r;

  return submission_id;
end;
$$;

-- Only the server secret may invoke this function. Existing RLS stays enabled.
revoke all on function public.submit_rfs(jsonb) from public, anon, authenticated;
grant execute on function public.submit_rfs(jsonb) to service_role;
grant select, insert on public.rfs_submissions, public.rfs_contacts,
  public.rfs_properties, public.rfs_acquisitions, public.rfs_additional_information to service_role;
commit;
