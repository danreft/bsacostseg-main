import { test, expect } from '@playwright/test';

// Read-only against real submissions. Review actions only change browser state.
test('existing RFS opens detail and private documents; review remains local', async ({ page, request }) => {
  await page.goto('/proxima/rfs');
  const row = page.locator('tbody tr').filter({ has: page.getByRole('checkbox') }).first();
  await expect(row).toBeVisible();
  const cells = row.locator('td');
  const entity = await cells.nth(3).innerText();
  const contact = await cells.nth(4).innerText();
  const price = await cells.nth(6).innerText();
  const link = row.getByRole('link');
  const href = await link.getAttribute('href');
  expect(href).toMatch(/^\/proxima\/rfs\/[0-9a-f-]{36}$/);
  await link.click();
  await expect(page).toHaveURL(href!);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(entity);
  const entitySection = page.getByRole('region', { name: 'Entity & Contact' });
  await expect(entitySection.getByText(contact, { exact: true })).toBeVisible();
  for (const name of ['Property & Acquisition', 'Supporting Documents', 'Additional Information', 'Pre-Analysis']) {
    await expect(page.getByRole('region', { name, exact: true })).toBeVisible();
  }
  const property = page.getByRole('region', { name: 'Property & Acquisition' });
  await expect(property.getByText(price, { exact: true })).toBeVisible();
  for (const label of ['Property Address', 'City', 'State', 'County', 'ZIP Code', 'Approximate Total Acres', 'Acquisition Status', 'Existing Purchase Price Allocation']) {
    await expect(property.locator('dt').filter({ hasText: new RegExp(`^${label}$`) })).toBeVisible();
  }
  const documents = page.getByRole('link', { name: /^View Document:/ });
  expect(await documents.count(), 'Existing RFS must have a document to verify signing').toBeGreaterThan(0);
  const appraisalRow = page.getByRole('region', { name: 'Supporting Documents' }).locator('div').filter({ has: page.getByRole('heading', { name: 'Property Appraisal', exact: true }) }).filter({ has: page.getByRole('link', { name: /^View Document:/ }) }).last();
  const analysis = page.getByRole('region', { name: 'Pre-Analysis', exact: true });
  await expect(appraisalRow, 'Existing appraisal required to exercise simulated pre-analysis').toBeVisible();
  await expect(analysis.getByText('Review Complete', { exact: true })).toBeVisible();
  await expect(analysis.getByText(/Simulated POC results/)).toBeVisible();
  await expect(analysis.getByRole('table', { name: 'Information Found', exact: true })).toBeVisible();
  await expect(analysis.getByText('18,500 SF', { exact: true })).toBeVisible();
  await expect(analysis.getByRole('table', { name: 'Information Still Needed', exact: true })).toBeVisible();
  const source = analysis.getByRole('link', { name: 'Property Appraisal · p. 42', exact: true }).first();
  const appraisalHref = await appraisalRow.getByRole('link', { name: /^View Document:/ }).getAttribute('href');
  const sourceHref = (await source.getAttribute('href'))!;
  expect(sourceHref.split('#')[0]).toBe(appraisalHref);
  const sourceResponse = await request.get(sourceHref, { maxRedirects: 0 });
  expect(sourceResponse.status()).toBe(303);
  expect(sourceResponse.headers().location).toContain('/storage/v1/object/sign/rfs-documents/');
  const documentHref = (await documents.first().getAttribute('href'))!;
  const signed = await request.get(documentHref, { maxRedirects: 0 });
  expect(signed.status()).toBe(303);
  expect(signed.headers()['cache-control']).toContain('no-store');
  const signedUrl = signed.headers().location;
  expect(signedUrl).toContain('/storage/v1/object/sign/rfs-documents/');
  const file = await request.get(signedUrl);
  expect(file.ok()).toBe(true);
  expect((await file.body()).length).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Review RFS', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Reject', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Confirm Rejection' })).toBeDisabled();
  await dialog.getByLabel('Rejection reason').fill('Please clarify the acquisition details.');
  await dialog.getByRole('button', { name: 'Confirm Rejection' }).click();
  await expect(page.getByRole('status')).toContainText('Rejected');
  await page.getByRole('button', { name: 'Review RFS', exact: true }).click();
  await dialog.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Create Project' })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(entity);
  await expect(page.getByRole('button', { name: 'Create Project' })).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: '/tmp/proxima-rfs-detail.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const id of ['invalid', '00000000-0000-0000-0000-000000000000']) {
    await page.goto(`/proxima/rfs/${id}`);
    await expect(page.getByRole('heading', { name: 'Request not found.' })).toBeVisible();
  }
  const wrongDocument = await request.get(`${href}/documents/00000000-0000-0000-0000-000000000000`);
  expect(wrongDocument.status()).toBe(404);
  const wrongRequest = await request.get(documentHref.replace(href!, '/proxima/rfs/00000000-0000-0000-0000-000000000000'));
  expect(wrongRequest.status()).toBe(404);
  await page.goto('/request');
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Proxima' })).toHaveCount(0);
});
