import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function signIn(page: Page) {
  const credentialsPath = resolve("test-results/integration/test-user.json");
  let credentials: { email: string; password: string };
  try {
    credentials = JSON.parse(await readFile(credentialsPath, "utf8")) as { email: string; password: string };
  } catch {
    throw new Error("The temporary integration test user is missing. Run the suite through its configured global setup.");
  }

  await page.goto("/login");
  await page.getByLabel("Email address").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "CV details" })).toBeVisible();
}

async function findCheckoutInput(page: Page, label: RegExp, selector: string) {
  for (const frame of page.frames()) {
    const accessibleInput = frame.getByLabel(label).first();
    if (await accessibleInput.count()) return accessibleInput;
    const matchingInput = frame.locator(selector).first();
    if (await matchingInput.count()) return matchingInput;
  }
  throw new Error(`Paystack checkout field ${label} was not found.`);
}

async function fillCheckoutField(page: Page, label: RegExp, selector: string, value: string) {
  const input = await findCheckoutInput(page, label, selector);
  await input.fill(value);
}

async function fillOptionalCheckoutField(page: Page, label: RegExp, selector: string, value: string | undefined) {
  if (!value) return;
  for (const frame of page.frames()) {
    const input = frame.getByLabel(label).first();
    if (await input.count()) {
      await input.fill(value);
      return;
    }
    const matchingInput = frame.locator(selector).first();
    if (await matchingInput.count()) {
      await matchingInput.fill(value);
      return;
    }
  }
}

async function checkoutButton(page: Page) {
  for (const frame of page.frames()) {
    const button = frame.getByRole("button", { name: /pay|continue|authorize/i }).last();
    if (await button.count()) return button;
  }
  throw new Error("The Paystack checkout submit button was not found.");
}

async function completePaystackTestCheckout(page: Page) {
  const cardNumber = process.env.PAYSTACK_E2E_CARD_NUMBER;
  const expiry = process.env.PAYSTACK_E2E_CARD_EXPIRY;
  const cvc = process.env.PAYSTACK_E2E_CARD_CVC;
  if (!cardNumber || !expiry || !cvc) {
    throw new Error("Set Paystack's published test card number, expiry, and CVC in .env.e2e.local.");
  }

  await fillCheckoutField(page, /card number/i, 'input[autocomplete="cc-number"], input[name*="card" i], input[placeholder*="0000"]', cardNumber);
  await fillCheckoutField(page, /expir/i, 'input[autocomplete="cc-exp"], input[name*="expir" i], input[placeholder*="MM"]', expiry);
  await fillCheckoutField(page, /cvv|cvc|security code/i, 'input[autocomplete="cc-csc"], input[name*="cvv" i], input[placeholder*="CVV" i]', cvc);
  await (await checkoutButton(page)).click();

  const pin = process.env.PAYSTACK_E2E_CARD_PIN;
  await fillOptionalCheckoutField(page, /pin/i, 'input[name*="pin" i], input[placeholder*="PIN" i]', pin);
  if (pin) await (await checkoutButton(page)).click();

  const otp = process.env.PAYSTACK_E2E_OTP;
  await fillOptionalCheckoutField(page, /otp|one.time password/i, 'input[name*="otp" i], input[placeholder*="OTP" i]', otp);
  if (otp) await (await checkoutButton(page)).click();

  await expect(page).toHaveURL(/\/payment\/callback/, { timeout: 90_000 });
  await expect(page.getByRole("status")).toContainText("Payment confirmed.", { timeout: 90_000 });
}

async function downloadActualPdf(page: Page) {
  const downloadPromise = page.waitForEvent("download", { timeout: 90_000 });
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  if (!stream) throw new Error("The generated PDF download did not provide a file stream.");
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const pdf = Buffer.concat(chunks);
  expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  expect(pdf.byteLength).toBeGreaterThan(1500);
  return download.suggestedFilename();
}

test("local Supabase saves CVs and Chromium generates a real PDF", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("CV title").fill("Integration PDF CV");
  await page.getByLabel("Full name").fill("E2E PDF Candidate");
  await page.getByLabel("Professional title").fill("Integration Engineer");
  await expect(page.locator(".saved-label")).toContainText("Synced to your account", { timeout: 30_000 });

  await page.reload();
  await expect(page.getByLabel("CV title")).toHaveValue("Integration PDF CV");
  await expect(page.getByLabel("Full name")).toHaveValue("E2E PDF Candidate");

  await expect(await downloadActualPdf(page)).toBe("Integration-PDF-CV.pdf");
});

test("Paystack test checkout verifies a payment and unlocks premium PDF rendering", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("CV title").fill("Integration Premium CV");
  await page.getByLabel("Full name").fill("E2E Premium Candidate");
  await page.getByRole("button", { name: /Monogram/ }).click();
  await expect(page.locator(".saved-label")).toContainText("Synced to your account", { timeout: 30_000 });

  await page.getByRole("button", { name: "Download PDF" }).click();
  await expect(page).toHaveURL(/https:\/\/checkout\.paystack\.com\//, { timeout: 60_000 });
  await completePaystackTestCheckout(page);

  await page.goto("/");
  await expect(page.getByLabel("CV title")).toHaveValue("Integration Premium CV");
  await expect(await downloadActualPdf(page)).toBe("Integration-Premium-CV.pdf");
});
