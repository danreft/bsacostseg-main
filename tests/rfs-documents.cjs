// Targeted document checks only. Native fetch is mocked; no live writes or secrets.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
}).outputText, filename);
const { submitRfs } = require('../src/app/actions/submit-rfs.ts');
const { MAX_DOCUMENT_BYTES, validateDocuments } = require('../src/lib/rfs/documents.ts');
const input = {
  path: 'new', submittingFor: 'self',
  client: { firstName: 'POC', lastName: 'Test', role: 'Owner', email: 'poc@example.com', primaryPhone: '5550101000', secondaryPhone: '', entity: 'TEST LLC', address: '1 Test Lane', addressLine2: '', city: 'Test', state: 'IA', zip: '50001' },
  additional: null,
  service: { propertyName: 'TEST FARM', address: '2 Test Lane', city: 'Test', state: 'IA', county: 'Test', zip: '50001', acres: '12', acquired: 'yes', acquisitionDate: '2026-09-01', purchasePrice: '100000', existingAllocation: 'not-sure' },
  information: { referralSource: 'online-search', noReferralCode: false, referralCode: '', referralPartnerName: '', cpaCompany: '', taxFilingTiming: 'later', additionalDetails: '', communicationPreference: 'email' },
};
const id = '11111111-1111-4111-8111-111111111111';
const pdf = new File([fs.readFileSync('tests/e2e/fixtures/property-appraisal.pdf')], '../../appraisal.PDF', { type: 'application/pdf' });
const files = (file = pdf, category = 'property-appraisal') => {
  const data = new FormData(); data.append(category, file); return data;
};

(async () => {
  const originalFetch = global.fetch, originalLog = console.error;
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL, oldSecret = process.env.SUPABASE_SECRET_KEY;
  const logs = [];
  console.error = (...args) => logs.push(args);
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.invalid';
  process.env.SUPABASE_SECRET_KEY = 'test-server-secret';
  let calls = [];
  function mock(failure) {
    calls = [];
    global.fetch = async (url, options) => {
      calls.push({ url, ...options });
      if (url.endsWith('/rpc/submit_rfs')) return Response.json(id);
      if (url.includes('/storage/') && failure === 'upload') return new Response('private error', { status: 500 });
      if (url.includes('/storage/') && failure === 'network') throw new TypeError('network failure');
      if (url.endsWith('/rfs_documents') && failure === 'metadata') return new Response('private error', { status: 403 });
      if (url.endsWith('/rfs_documents') && failure === 'timeout') throw new DOMException('timeout', 'TimeoutError');
      return new Response(null, { status: 200 });
    };
  }
  try {
    mock();
    assert.deepEqual(await submitRfs(input), { success: true, submissionId: id, documentsFailed: 0 });
    assert.equal(calls.length, 1);
    for (const invalid of [files(new File(['bad'], 'bad.exe')), files(new File(['bad'], 'pdf')),
      files(new File([], 'empty.pdf')), files(new File([new Uint8Array(MAX_DOCUMENT_BYTES + 1)], 'large.pdf')),
      files(pdf, '../other'), files('not a file')]) {
      mock();
      const result = await submitRfs(input, invalid);
      assert.equal(result.success, false);
      assert.ok(result.error);
      assert.equal(calls.length, 0, 'Reject invalid files before creating the RFS');
    }
    const duplicate = files(); duplicate.append('property-appraisal', pdf);
    assert.throws(() => validateDocuments(duplicate));
    assert.equal(validateDocuments(files(new File([new Uint8Array(MAX_DOCUMENT_BYTES)], 'max.pdf'))).length, 1);

    mock();
    assert.deepEqual(await submitRfs(input, files()), { success: true, submissionId: id, documentsFailed: 0 });
    assert.equal(calls.length, 3);
    const metadata = JSON.parse(calls[2].body);
    assert.match(metadata.storage_path, new RegExp(`^${id}/property_appraisal/[0-9a-f-]{36}\\.pdf$`));
    assert.deepEqual(metadata, { rfs_submission_id: id, document_category: 'property_appraisal', file_name: '../../appraisal.PDF', storage_path: metadata.storage_path, mime_type: 'application/pdf', file_size: pdf.size, processing_status: 'pending' });
    assert.ok(calls[1].url.endsWith(`/rfs-documents/${metadata.storage_path}`));
    assert.equal(calls[1].headers['x-upsert'], 'false');
    assert.equal(calls[1].body.size, pdf.size);
    const firstPath = metadata.storage_path;
    mock(); await submitRfs(input, files());
    assert.notEqual(JSON.parse(calls[2].body).storage_path, firstPath);

    for (const failure of ['upload', 'network', 'metadata', 'timeout']) {
      mock(failure);
      const result = await submitRfs(input, files());
      assert.deepEqual(result, { success: true, submissionId: id, documentsFailed: 1 });
      assert.equal(calls.length, ['upload', 'network'].includes(failure) ? 2 : 3);
      assert.ok(calls.every(call => call.method === 'POST'), 'Never delete the created RFS');
      assert.equal(logs.at(-1)[1].submissionId, id);
      assert.ok(logs.at(-1)[1].storagePath);
    }
    mock();
    const normalFetch = global.fetch;
    global.fetch = async (url, options) => {
      if (url.includes('/storage/') && url.includes('/property_appraisal/')) {
        calls.push({ url, ...options }); return new Response(null, { status: 500 });
      }
      return normalFetch(url, options);
    };
    const multiple = files(); multiple.append('other', pdf);
    assert.equal((await submitRfs(input, multiple)).documentsFailed, 1);
    assert.equal(JSON.parse(calls.at(-1).body).document_category, 'other', 'Continue after a failed document');
    assert.ok(!JSON.stringify(logs).includes('test-server-secret'));
    console.log('Document checks passed: validation before RPC, optional files, upload/metadata, unique safe paths, partial failures, continuation.');
  } finally {
    global.fetch = originalFetch; console.error = originalLog;
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldSecret === undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY = oldSecret;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
