import { expect, test } from "@playwright/test";

// The AI panel is additive — these tests only confirm the widget opens, sends a message, and
// renders *some* reply (works whether or not a real OPENAI_API_KEY is configured for this run:
// without one, api/chat still responds gracefully with an error bubble instead of crashing).

test("chat panel opens, sends a message, and renders a reply", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Ask UniGuide" }).click();
  await expect(page.getByText("UniGuide assistant")).toBeVisible();

  await page.getByPlaceholder("e.g. compare MIT and NU").fill("What universities are in Kazakhstan?");
  await page.getByRole("button", { name: "Send" }).click();

  const bubbles = page.locator(".whitespace-pre-wrap");
  await expect(bubbles).toHaveCount(3, { timeout: 20_000 });
});

test("closing the chat panel does not affect the catalog", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ask UniGuide" }).click();
  await page.getByRole("button", { name: "Close chat" }).click();
  await expect(page.getByText("Nazarbayev University")).toBeVisible();
});
