import { expect, type Page } from "@playwright/test";

export async function openWorkspace(page: Page, syncAvailable = false) {
  await page.route("**/api/resumes", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Cloud accounts are not configured." }),
      });
      return;
    }

    if (route.request().method() === "PUT" && syncAvailable) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, saved: 1 }),
      });
      return;
      return;
    }

    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Payments are not configured yet." }),
      });
      return;
    }

    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Cloud accounts are not configured." }),
    });
  });

  await page.route("**/api/payments/initialize", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ error: "Payments are not configured yet." }),
  }));

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "CV details" })).toBeVisible();
  await expect(page.locator(".cloud-status-banner")).toContainText("Supabase is not configured yet.");
}
