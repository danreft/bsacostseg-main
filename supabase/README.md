# RFS database foundation

`migrations/20260921000000_create_rfs_foundation.sql` defines the initial six tables in
the `public` schema. It has not been applied to a database. No frontend, storage,
authentication, submission, or AI integration is included.

Connection preparation adds only root `.env.example` placeholders and ignores for
local CLI state. No Supabase SDK, client, or authentication code is needed yet.
At preparation time there is no CLI, `supabase/config.toml`, project link, or local
environment file. The existing migration is unchanged and has not been executed.

## Connect and apply (run manually)

Run from the repository root. You need access to the intended Supabase project,
its project reference, and its database password if prompted. CLI login uses your
Supabase account/personal access token; a publishable API key cannot apply migrations.
Do not send credentials in chat or put them in commands/files committed to source control.

1. Install the CLI on macOS, then check the installed command help:

   ```sh
   brew install supabase/tap/supabase
   supabase --version
   supabase --help
   supabase init --help
   supabase login --help
   supabase link --help
   supabase migration list --help
   supabase db push --help
   ```

2. Initialize local CLI configuration and authenticate. `init` generates configuration;
   it does not apply the migration. Do not use `--force` if configuration already exists.
   No Docker stack is required for this remote workflow.

   ```sh
   supabase init
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```

   Replace `YOUR_PROJECT_REF` with the reference from the intended project's dashboard.
   Enter credentials through the CLI's prompts. Confirm `supabase/.temp/project-ref`
   matches that project. Local `config.toml` project naming is not proof of remote linkage.

3. Before applying, confirm the target project and have an appropriate backup if it
   contains existing data. In that project's SQL Editor, run the verification query
   below: on an untouched target all six rows must have `table_exists = false`.
   Also check that this returns null:

   ```sql
   select to_regprocedure('public.rfs_set_updated_at()') as existing_function;
   ```

   Preview migration history and the pending migration:

   ```sh
   supabase migration list --linked
   supabase db push --linked --dry-run
   ```

   Proceed only if the preview lists exactly
   `20260921000000_create_rfs_foundation.sql` and the remote history is compatible.
   If objects already exist, history differs, or other migrations are pending, stop
   and reconcile the target/history first. Do not reset the database, repair history,
   overwrite the migration, or use `--include-all` to bypass a mismatch.
   A dry run previews migrations; it does not execute or validate SQL correctness.

4. After checking the preview, apply and confirm recorded history:

   ```sh
   supabase db push --linked
   supabase migration list --linked
   ```

   Confirm version `20260921000000` appears in both local and remote columns, then
   run the query below in the same project's SQL Editor. Do not also paste the
   migration into SQL Editor: the CLI workflow maintains migration history.

## Verify the real database

This read-only query always returns six rows, including missing tables. After the
migration, every row must show `table_exists = true`, `rls_enabled = true`,
`policy_count = 0`, `client_has_privileges = false`, and `public_has_grants = false`.
The client check includes inherited table and column privileges. These catalog
checks verify presence and the locked-down posture, not every constraint/trigger behavior.

```sql
with expected(table_name) as (
  values ('rfs_submissions'), ('rfs_contacts'), ('rfs_properties'),
         ('rfs_acquisitions'), ('rfs_documents'), ('rfs_additional_information')
)
select e.table_name,
       c.oid is not null as table_exists,
       c.relrowsecurity as rls_enabled,
       (select count(*) from pg_policy p where p.polrelid = c.oid) as policy_count,
       case when c.oid is not null then exists (
         select 1
         from (values ('anon'), ('authenticated')) as roles(role_name)
         where has_table_privilege(roles.role_name, c.oid,
                 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
            or has_any_column_privilege(roles.role_name, c.oid,
                 'SELECT,INSERT,UPDATE,REFERENCES')
       ) end as client_has_privileges,
       case when c.oid is not null then (
         exists (
           select 1 from aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
           where a.grantee = 0
         ) or exists (
           select 1 from pg_attribute att
           cross join lateral aclexplode(att.attacl) a
           where att.attrelid = c.oid and att.attnum > 0
             and not att.attisdropped and a.grantee = 0
         )
       ) end as public_has_grants
from expected e
left join pg_namespace n on n.nspname = 'public'
left join pg_class c on c.relnamespace = n.oid and c.relname = e.table_name
  and c.relkind in ('r', 'p')
order by e.table_name;
```

## Future application environment

When ready to configure future connectivity, copy placeholders without overwriting
an existing local file:

```sh
cp -n .env.example .env.local
```

Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from
the project's Connect dialog. `.env.local` is ignored. Next.js reads it automatically;
restart the development server after edits. These variables are not CLI credentials,
do not link the project, and are not consumed by this POC yet. No application secret
or service-role key is required. Client access remains denied after configuration.

References: [Next.js environment setup](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs),
[CLI installation](https://github.com/supabase/cli#install-the-cli),
and [migration push reference](https://supabase.com/docs/reference/cli/supabase-db-push).

## Relationships and assumptions

- All tables use generated UUID primary keys and `timestamptz` timestamps.
  `created_at` and `updated_at` default to transaction time; one shared invoker
  trigger refreshes `updated_at` on each row update. Child updates do not touch the parent.
- Every child has a required parent foreign key with `ON DELETE CASCADE`.
  Cascading applies to every status; restrictions on deleting submitted requests
  must be decided before granting delete access.
- Properties, acquisitions, and additional information each have a unique parent
  key, enforcing **at most one** per RFS. A draft may have no children yet; required
  child presence at submission is deferred to future submission validation.
- Contacts and document metadata allow multiple rows per RFS. Their parent keys
  are indexed; the one-to-one tables already have indexes from unique constraints.
  No uniqueness by contact type or document category is assumed.
- Fields explicitly described as nullable remain nullable. Other supplied fields
  are required when their row is created. A draft parent needs client/submission
  types but no Clerk identity. Saving partially completed child rows is not implemented.
- Acreage uses `numeric(18,6)` and must be positive; prices use `numeric(18,2)` and
  must be nonnegative. Non-finite values are rejected. File size is nullable,
  nonnegative bytes (`bigint`); ZIP codes and phone numbers are text.
  Monetary amounts assume a single application currency, to be confirmed before integration.
- Status defaults to `draft`; only `draft` and `submitted` are initially allowed.
  Add future statuses by replacing `rfs_submissions_status_check` in a migration.
  There are no transitions or automatic changes to `submitted_at`.
- Referral source and tax filing timing are unconstrained text values for future
  Proxima identifiers. Current POC choices are not embedded in the database.
- Document records default to `pending`; storage location and file details may
  remain unknown. No storage objects, buckets, or processing logic are created.

## Access

RLS is enabled on all six tables with **no policies**. All table privileges are
also revoked from `PUBLIC`, `anon`, and `authenticated`, including any project
default grants. Ordinary clients cannot read or mutate these tables.
Database owners and privileged service roles can bypass RLS; do not expose
privileged credentials to the frontend. This is intentionally not a production
authorization model. See the [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Before frontend integration

Configure the target Supabase project, apply and validate the migration against
PostgreSQL, and decide how Clerk identities and unauthenticated drafts establish
ownership. Add narrowly scoped grants and tested RLS policies for that model.
Define transactional submission validation, draft persistence, and deletion rules
separately; the schema does not enforce completeness of an entire submitted RFS.

The future persistence adapter must translate current frontend values:

| Frontend | Database |
| --- | --- |
| Client `existing` / `new` | `existing_client` / `new_client` |
| Submitting for `self` / `other` | `self` / `representative` |
| Acquired `yes` / `no` | `acquired` / `in_progress` |
| Allocation `not-sure` | `not_sure` |
| `purchase-agreement` | `purchase_agreement` |
| `property-appraisal` | `property_appraisal` |
| `existing-allocation` | `existing_purchase_price_allocation` |
| `asset-equipment-list` | `fixed_asset_equipment_list` |

Map camelCase fields to their database names, parse numeric/date strings, and
convert optional blank fields to null. Decide contact-role mapping explicitly for
representative requests and the submission type for the existing-client path.
The UI's `noReferralCode` flag is presentation state; only the supplied code/name
is stored. Confirm stable Proxima list identifiers before replacing POC choices.

Future AI extraction tables can reference RFS/document UUIDs. Extracted facts,
assets, conflicts, and missing information must remain separate from these
client-supplied records; extraction must never silently overwrite source data.

## Validation

Static checks cover the six table definitions, requested columns, parent foreign
keys, one-to-one uniqueness, timestamp triggers, RLS enablement, and absence of
policies or out-of-scope integrations. No PostgreSQL server, `psql`, or Supabase CLI
was available, so SQL execution, catalog inspection, constraint behavior, trigger
execution, and role-based access tests remain pending. No tooling was installed
and no remote database was changed.
