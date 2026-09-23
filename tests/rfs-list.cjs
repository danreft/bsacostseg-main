// Read-only mapping checks: node tests/rfs-list.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
}).outputText, filename);
const { mapRfsListRow, formatPurchasePrice, formatSubmissionDate } = require('../src/lib/proxima/rfs-list.ts');
const record = {
  id: '52550abc-1234-4321-9876-123456789012', status: 'submitted', submitted_at: '2026-09-23T00:15:00Z',
  client_type: 'new_client', submission_type: 'self',
  rfs_contacts: [{ contact_type: 'primary', first_name: 'Client', last_name: 'Owner', legal_owner_entity_name: 'Legal Owner LLC' }],
  rfs_properties: { property_name: 'Property Name', address_line_1: '10 Main St', city: 'Austin', state: 'TX', zip_code: '78701' },
  rfs_acquisitions: { purchase_or_expected_purchase_price: '6250000' },
};
let row = mapRfsListRow(record);
assert.equal(row.id, record.id);
assert.equal(row.displayId, 'RFS-52550ABC');
assert.equal(row.primaryContact, 'Client Owner');
assert.equal(row.entity, 'Legal Owner LLC');
assert.equal(row.property, 'Property Name');
assert.equal(row.status, 'submitted');
assert.equal(formatPurchasePrice(row.purchasePrice), '$6,250,000');
assert.equal(formatPurchasePrice(6250000.5), '$6,250,000.50');
assert.equal(formatPurchasePrice(0), '$0');
assert.equal(formatPurchasePrice(null), '—');
assert.equal(formatSubmissionDate(row.submittedAt), '09-23-2026');
assert.equal(formatSubmissionDate('invalid'), '—');
const represented = structuredClone(record);
represented.submission_type = 'representative';
represented.rfs_contacts[0] = { ...record.rfs_contacts[0], contact_type: 'authorized_representative', first_name: 'Authorized', last_name: 'Representative' };
represented.rfs_contacts.push({ contact_type: 'additional', first_name: 'Actual', last_name: 'Client', legal_owner_entity_name: null });
row = mapRfsListRow(represented);
assert.equal(row.primaryContact, 'Actual Client');
assert.equal(row.entity, 'Legal Owner LLC');
represented.rfs_contacts.pop();
assert.equal(mapRfsListRow(represented).primaryContact, '—');
const existing = { ...record, client_type: 'existing_client' };
assert.equal(mapRfsListRow(existing).primaryContact, 'Client Owner');
record.rfs_properties.property_name = ' ';
assert.equal(mapRfsListRow(record).property, '10 Main St, Austin, TX 78701');
assert.equal(mapRfsListRow({ ...record, rfs_properties: null, rfs_acquisitions: null, rfs_contacts: [] }).property, '—');
console.log('RFS list mapping checks passed.');
