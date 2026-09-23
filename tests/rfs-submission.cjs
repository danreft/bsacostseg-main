// Targeted POC checks: node tests/rfs-submission.cjs (no extra dependencies).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
}).outputText, filename);
const { mapSubmission } = require('../src/lib/rfs/submission.ts');
const { submitRfs } = require('../src/app/actions/submit-rfs.ts');
const contact = { firstName: 'POC TEST', lastName: 'Submission', role: 'Owner', email: 'poc@example.com', primaryPhone: '5550101000', secondaryPhone: '' };
const input = {
  path: 'new', submittingFor: 'self',
  client: { ...contact, entity: 'POC TEST ENTITY', address: '1 Test Lane', addressLine2: '', city: 'Test', state: 'IA', zip: '50001' },
  additional: null,
  service: { propertyName: 'POC TEST FARM', address: '2 Test Lane', city: 'Test', state: 'IA', county: 'Test', zip: '50001', acres: '12.5', acquired: 'yes', acquisitionDate: '2026-09-01', purchasePrice: '1,250,000.50', existingAllocation: 'not-sure' },
  information: { referralSource: 'online-search', noReferralCode: false, referralCode: 'stale', referralPartnerName: 'stale', cpaCompany: '', taxFilingTiming: 'later', additionalDetails: 'POC TEST', communicationPreference: 'email' },
};
const originalInput = structuredClone(input);
const mapped = mapSubmission(input);
assert.deepEqual(mapped.submission, { client_type: 'new_client', submission_type: 'self' });
assert.equal(mapped.contacts[0].legal_owner_entity_name, 'POC TEST ENTITY');
assert.equal(mapped.contacts[0].contact_type, 'primary');
assert.equal(mapped.property.approximate_total_acres, 12.5);
assert.equal(mapped.acquisition.purchase_or_expected_purchase_price, '1250000.50');
assert.equal(mapped.acquisition.existing_purchase_price_allocation, 'not_sure');
assert.equal(mapped.information.referral_code, null);
assert.equal(mapped.information.referral_partner_name, null);
assert.equal(mapped.information.cpa_tax_filing_company, null);
const copy = () => structuredClone(input);
let p = copy(); p.path = 'existing'; p.submittingFor = 'other';
assert.equal(mapSubmission(p).submission.submission_type, 'self');
assert.equal(mapSubmission(p).contacts[0].contact_type, 'primary');
p = copy(); p.submittingFor = 'other'; p.additional = contact;
assert.deepEqual(mapSubmission(p).contacts.map(c => c.contact_type), ['authorized_representative', 'additional']);
p.additional = null; assert.throws(() => mapSubmission(p));
p = copy(); p.additional = { ...contact, lastName: '', role: '' };
assert.equal(mapSubmission(p).contacts.length, 2); // Existing optional partial-contact rule.
p.additional = Object.fromEntries(Object.keys(contact).map(k => [k, '']));
assert.equal(mapSubmission(p).contacts.length, 1);
p = copy(); p.service.acquired = 'no'; assert.equal(mapSubmission(p).acquisition.acquisition_status, 'in_progress');
p = copy(); p.information.referralSource = 'referral-partner';
assert.equal(mapSubmission(p).information.referral_code, 'stale');
p.information.noReferralCode = true;
assert.equal(mapSubmission(p).information.referral_code, null);
assert.equal(mapSubmission(p).information.referral_partner_name, 'stale');
p.information.referralPartnerName = ''; assert.throws(() => mapSubmission(p));
for (const [section, field, value] of [
  ['client','firstName',' '], ['client','email','invalid'], ['client','entity',''],
  ['service','zip','abc'], ['service','acres','0'], ['service','acres','Infinity'],
  ['service','purchasePrice','0'], ['service','purchasePrice','1,00'], ['service','purchasePrice','1.001'],
  ['service','acquisitionDate','2026-02-30'], ['service','existingAllocation','invalid'],
  ['information','communicationPreference',''], ['information','taxFilingTiming',''], ['information','referralSource',''],
]) { p = copy(); p[section][field] = value; assert.throws(() => mapSubmission(p), `${section}.${field}`); }
assert.throws(() => mapSubmission(null));

(async () => {
  const originalFetch = global.fetch, originalLog = console.error;
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL, oldSecret = process.env.SUPABASE_SECRET_KEY;
  console.error = () => {};
  try {
    let calls = 0;
    global.fetch = async () => { calls++; throw new Error('Unexpected network'); };
    delete process.env.SUPABASE_SECRET_KEY;
    assert.equal((await submitRfs(input)).success, false);
    assert.equal(calls, 0);
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://poc.invalid';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_TEST_ONLY';
    const id = '00000000-0000-4000-8000-000000000001';
    global.fetch = async (url, options) => {
      calls++;
      assert.equal(url, 'https://poc.invalid/rest/v1/rpc/submit_rfs');
      assert.equal(options.headers.apikey, 'sb_secret_TEST_ONLY');
      assert.deepEqual(JSON.parse(options.body), { payload: mapped });
      return Response.json(id);
    };
    assert.deepEqual(await submitRfs(input), { success: true, submissionId: id, documentsFailed: 0 });
    assert.equal(calls, 1);
    global.fetch = async () => new Response('PRIVATE DATABASE ERROR', { status: 500 });
    const failure = await submitRfs(input);
    assert.equal(failure.success, false);
    assert.ok(!failure.error.includes('PRIVATE'));
    global.fetch = async () => { throw new Error('Network failure'); };
    assert.equal((await submitRfs(input)).success, false);
    assert.deepEqual(input, originalInput);
  } finally {
    global.fetch = originalFetch; console.error = originalLog;
    for (const [key, value] of [['NEXT_PUBLIC_SUPABASE_URL', oldUrl], ['SUPABASE_SECRET_KEY', oldSecret]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
  console.log('RFS mapping, validation, and server action mocked checks passed. No live writes performed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
