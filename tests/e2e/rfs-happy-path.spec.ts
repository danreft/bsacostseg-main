import { expect, test } from "@playwright/test";
import path from "node:path";

test("new client submits a request for themselves", async ({ page }) => {
  await page.goto("/request");
  await page.getByRole("radio", { name: "No, I'm new to Boa Safra", exact: true }).check();
  await page.getByRole("radio", { name: "For myself", exact: true }).check();

  const contact = page.getByRole("region", { name: "Authorized Representative Information", exact: true });
  await contact.getByRole("textbox", { name: "First Name", exact: true }).fill("Playwright");
  await contact.getByRole("textbox", { name: "Last Name", exact: true }).fill("Tester");
  await contact.getByRole("textbox", { name: "Title / Role", exact: true }).fill("POC Test");
  await contact.getByRole("textbox", { name: "Email", exact: true }).fill("playwright-test@example.com");
  await contact.getByRole("textbox", { name: "Primary Phone", exact: true }).fill("555-555-0100");

  const owner = page.getByRole("region", { name: "Legal Owner / Entity Information", exact: true });
  await owner.getByRole("textbox", { name: "Legal Owner / Entity Name", exact: true }).fill("PLAYWRIGHT TEST FARM LLC");
  await owner.getByRole("textbox", { name: "Address", exact: true }).fill("123 POC Test Lane");
  await owner.getByRole("textbox", { name: "City", exact: true }).fill("Testville");
  await owner.getByRole("textbox", { name: "State", exact: true }).fill("IA");
  await owner.getByRole("textbox", { name: "ZIP Code", exact: true }).fill("50001");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Property & Acquisition Information", exact: true })).toBeVisible();

  const property = page.getByRole("region", { name: "Property Information", exact: true });
  await property.getByLabel(/^Property \/ Farm Name/).fill("Playwright Test Farm");
  await property.getByLabel(/^Property Address/).fill("456 POC Test Farm Road");
  await property.getByLabel(/^City/).fill("Testville");
  await property.getByLabel(/^State/).fill("IA");
  await property.getByLabel(/^County/).fill("POC Test County");
  await property.getByLabel(/^ZIP Code/).fill("50001");
  await property.getByLabel(/^Approximate Total Acres/).fill("100");
  await page.getByRole("group", { name: /^Has this property already been acquired/ })
    .getByRole("radio", { name: "Yes", exact: true }).check();
  await page.getByLabel(/^Acquisition Date/).fill("2025-01-15");
  await page.getByLabel(/^Total Purchase Price/).fill("1234567");
  await page.getByRole("group", { name: /^Was the purchase price already allocated/ })
    .getByRole("radio", { name: "Not Sure", exact: true }).check();
  await page.getByLabel("Property Appraisal (optional)", { exact: true })
    .setInputFiles(path.join(__dirname, "fixtures/property-appraisal.pdf"));
  await expect(page.getByText("Selected: property-appraisal.pdf", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Communication Preferences", exact: true })).toBeVisible();

  await page.getByLabel(/^How did you hear about us/).selectOption({ label: "Online Search" });
  await page.getByLabel("CPA / Tax Filing Company", { exact: true }).fill("PLAYWRIGHT POC TAX COMPANY");
  await page.getByLabel(/^When do you plan to file your taxes/).selectOption({ label: "Within 30 days" });
  await page.getByRole("group", { name: /^Preferred Method of Communication/ })
    .getByRole("radio", { name: "Email", exact: true }).check();
  await page.getByRole("button", { name: "Review Request", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Final Verification & Submission", exact: true })).toBeVisible();

  await expect(page.getByText("Playwright Tester", { exact: true })).toBeVisible();
  await expect(page.getByText("PLAYWRIGHT TEST FARM LLC", { exact: true })).toBeVisible();
  await expect(page.getByText("Playwright Test Farm", { exact: true })).toBeVisible();
  await expect(page.getByText(/^\$?1,?234,?567(?:\.00)?$/)).toBeVisible();

  // One click, no mocks or direct database access: exercise the real server action.
  await page.getByRole("button", { name: "Submit Request", exact: true }).click();
  await expect(page.getByText("Your request was submitted successfully.", { exact: true }))
    .toBeVisible({ timeout: 30_000 });
});
