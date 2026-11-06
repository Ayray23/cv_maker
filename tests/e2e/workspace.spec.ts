import { expect, test } from "@playwright/test";
import { openWorkspace } from "./fixtures";

test("editing updates the live preview and saves the draft locally", async ({ page }) => {
  await openWorkspace(page);

  await page.getByLabel("Full name").fill("Jordan Rivers");
  await page.getByLabel("Professional title").fill("Product Designer");
  await expect(page.locator(".resume-paper h3")).toHaveText("Jordan Rivers");
  await expect(page.locator(".resume-paper .resume-header p")).toHaveText("Product Designer");

  await expect.poll(() => page.evaluate(() => {
    const saved = localStorage.getItem("cvforge.documents.v1");
    return saved ? JSON.parse(saved).documents[0]?.draft.fullName : null;
  })).toBe("Jordan Rivers");

  await page.reload();
  await expect(page.getByLabel("Full name")).toHaveValue("Jordan Rivers");
  await expect(page.locator(".resume-paper h3")).toHaveText("Jordan Rivers");
});

test("creating a CV, selecting a premium template, and opening preview work", async ({ page }) => {
  await openWorkspace(page, true);

  await page.getByRole("button", { name: "Create a new CV" }).click();
  await expect(page.locator(".document-item")).toHaveCount(2);
  await page.getByLabel("CV title").fill("Portfolio CV");

  const premiumTemplate = page.getByRole("button", { name: /Monogram/ });
  await premiumTemplate.click();
  await expect(premiumTemplate).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".resume-paper")).toHaveClass(/template-monogram/);

  await page.route("**/api/downloads/pdf", (route) => route.fulfill({
    status: 402,
    contentType: "application/json",
    body: JSON.stringify({ error: "Checkout required.", paymentRequired: true }),
  }));
  await page.getByRole("button", { name: "Download PDF" }).click();
  await expect(page.locator(".notice")).toContainText("Payments are not configured yet.");

  await page.setViewportSize({ width: 390, height: 844 });
  const previewButton = page.getByRole("button", { name: "Preview" });
  await previewButton.click();
  await expect(page.getByRole("button", { name: "Edit CV" })).toHaveAttribute("aria-pressed", "true");
});

test("download button produces a browser download when the API returns a PDF", async ({ page }) => {
  await openWorkspace(page, true);
  await page.getByLabel("CV title").fill("Senior Designer");
  await page.route("**/api/downloads/pdf", (route) => route.fulfill({
    status: 200,
    contentType: "application/pdf",
    headers: { "Content-Disposition": 'attachment; filename="Senior-Designer.pdf"' },
    body: "%PDF-1.4\n% Mock PDF for the browser download flow\n%%EOF",
  }));

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("Senior-Designer.pdf");
});
