import { test, expect } from "@playwright/test";

// Read-only: uses existing submissions and never runs the public submission flow.
test("internal RFS list loads real submissions and supports list controls", async ({ page }) => {
  await page.goto("/proxima/rfs");
  await expect(page.getByRole("heading", { name: "Requests for Service" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Client RFS", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  const rows = page.locator("tbody tr").filter({ has: page.getByRole("checkbox") });
  const count = await rows.count();
  expect(count, "At least one real submission is needed for this check").toBeGreaterThan(0);
  const cells = rows.first().locator("td");
  await expect(cells.nth(1)).toHaveText(/^RFS-[A-F0-9]{8}$/);
  await expect(cells.nth(2)).toHaveText(/^\d{2}-\d{2}-\d{4}$/);
  await expect(cells.nth(6)).toHaveText(/^\$[\d,]+(?:\.\d{2})?$/);
  await expect(cells.nth(7)).toHaveText("Submitted");
  const values = await Promise.all([3, 4, 5].map(index => cells.nth(index).innerText()));
  for (const value of values) {
    expect(value).not.toBe("—");
    await page.getByRole("searchbox").fill(value.toLowerCase());
    await expect(rows.first()).toBeVisible();
    await page.getByRole("searchbox").fill("");
  }
  await page.getByRole("searchbox").fill("no matching request 8e4e5bb5");
  await expect(page.getByText("No requests found.")).toBeVisible();
  await page.getByRole("button", { name: "Clear All Filters" }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Status" })).toHaveValue("all");
  await expect(rows).toHaveCount(count);
  await page.getByRole("combobox", { name: "Status" }).selectOption("submitted");
  await expect(rows).toHaveCount(count);
  await page.getByRole("checkbox", { name: "Select all visible requests" }).check();
  await expect(page.getByRole("status")).toContainText(`${count} selected`);
  await page.getByRole("checkbox", { name: "Select all visible requests" }).uncheck();
  for (const label of ["RFS ID", "Submission Date", "Entity", "Primary Contact", "Property", "Purchase Price", "Status"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.getByRole("columnheader").filter({ has: page.getByRole("button", { name: label, exact: true }) })).toHaveAttribute("aria-sort", "ascending");
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "/tmp/proxima-rfs-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
