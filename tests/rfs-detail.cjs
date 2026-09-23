const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
}).outputText, filename);
const { detailContacts, additionalFields, isUuid, documentLabels, mailingAddress } = require('../src/lib/proxima/rfs-detail.ts');
const primary = { id: '1', contact_type: 'primary', first_name: 'Client', last_name: 'Owner', email: 'client@example.test', legal_owner_entity_name: 'Entity LLC', address_line_1: '10 Main St', city: 'Austin', state: 'TX', zip_code: '78701' };
const extra = { id: '2', contact_type: 'additional', first_name: 'Other', last_name: 'Contact', email: 'other@example.test' };
const self = { client_type: 'new_client', submission_type: 'self', rfs_contacts: [primary, extra] };
assert.equal(detailContacts(self).primary, primary);
assert.equal(detailContacts(self).representative, undefined);
assert.deepEqual(detailContacts(self).additional, [extra]);
assert.equal(mailingAddress(primary), '10 Main St, Austin, TX, 78701');
assert.equal(detailContacts({ ...self, rfs_contacts: [primary, { ...extra, email: 'CLIENT@example.test' }] }).additional.length, 0);
const rep = { ...primary, contact_type: 'authorized_representative' };
const behalf = { ...self, submission_type: 'representative', rfs_contacts: [rep, extra] };
assert.equal(detailContacts(behalf).primary, extra);
assert.equal(detailContacts(behalf).representative, rep);
assert.equal(detailContacts(behalf).entity, rep);
assert.deepEqual(detailContacts(behalf).additional, []);
assert.equal(detailContacts({ ...behalf, rfs_contacts: [rep] }).primary, undefined);
assert.equal(detailContacts({ ...self, client_type: 'existing_client' }).primary, primary);
assert.equal(isUuid('invalid'), false);
assert.equal(isUuid('52550abc-1234-4321-9876-123456789012'), true);
const information = { referral_source: 'referral-partner', referral_code: 'CODE', referral_partner_name: null, cpa_tax_filing_company: '', tax_filing_timing: 'within-90-days', preferred_communication_method: 'both', additional_details: null };
assert.equal(Object.fromEntries(additionalFields(information))['Tax Filing Timing'], 'In 31–90 days');
assert.equal(Object.fromEntries(additionalFields(information))['Referral Code'], 'CODE');
assert.equal(Object.fromEntries(additionalFields({ ...information, referral_source: 'online-search' }))['Referral Code'], null);
assert.deepEqual(additionalFields(null), []);
assert.equal(documentLabels.fixed_asset_equipment_list, 'Fixed Asset / Equipment List');
console.log('RFS detail mapping checks passed.');

// Simulated pre-analysis is gated by a real, stored appraisal; no data is persisted.
const { mockPreAnalysis } = require('../src/lib/proxima/mock-pre-analysis.ts');
const { documentSourceHref } = require('../src/lib/proxima/document-source.ts');
const appraisalDocument = { id: 'appraisal-id', document_category: 'property_appraisal', file_name: 'appraisal.pdf', storage_path: 'submission/property_appraisal/file.pdf' };
assert.equal(mockPreAnalysis([]), null);
assert.equal(mockPreAnalysis([{ ...appraisalDocument, document_category: 'purchase_agreement' }]), null);
assert.equal(mockPreAnalysis([{ ...appraisalDocument, storage_path: null }]), null);
const analysis = mockPreAnalysis([appraisalDocument]);
assert.equal(analysis.status, 'review_complete');
assert.equal(analysis.simulated, true);
assert.equal(analysis.foundInformation.length, 14);
assert.equal(analysis.missingInformation.length, 5);
for (const item of analysis.foundInformation) {
  assert.ok(item.label && item.value);
  assert.equal(item.source.document.id, appraisalDocument.id);
  assert.ok(Number.isSafeInteger(item.source.page) && item.source.page > 0);
  assert.ok(['High', 'Medium', 'Low'].includes(item.confidence));
}
assert.equal(analysis.foundInformation.filter(item => item.confidence === 'Medium').length, 2);
assert.ok(analysis.missingInformation.every(item => ['Grain Bins', 'Machine Shed', 'Center Pivots'].includes(item.appliesTo)));
assert.equal(documentSourceHref('submission', analysis.document, 42), '/proxima/rfs/submission/documents/appraisal-id#page=42');
assert.equal(documentSourceHref('submission', { ...analysis.document, fileName: 'appraisal.docx' }, 42), '/proxima/rfs/submission/documents/appraisal-id');
assert.equal(documentSourceHref('submission', analysis.document, -1), '/proxima/rfs/submission/documents/appraisal-id');
console.log('Simulated pre-analysis shape and source-link checks passed.');
