import { expect, test } from "@playwright/test";

// Covers the spec's hard requirement that the site works fully without AI:
// none of these tests touch the chat panel.

test("homepage lists universities and works without AI", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "UniGuide — university aggregator" })).toBeVisible();
  await expect(page.getByText("Nazarbayev University")).toBeVisible();
});

test("country filter narrows the list", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox").first().selectOption("Kazakhstan");
  await expect(page.getByText("Nazarbayev University")).toBeVisible();
  await expect(page.getByText("Massachusetts Institute of Technology")).not.toBeVisible();
});

test("search narrows the list by name", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("Search by name or city…").fill("Oxford");
  await expect(page.getByText("University of Oxford")).toBeVisible();
  await expect(page.getByText("Nazarbayev University")).not.toBeVisible();
});

test("detail page shows admission requirements", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Nazarbayev University").click();
  await expect(page).toHaveURL(/\/universities\//);
  await expect(page.getByRole("heading", { name: "Admission requirements" })).toBeVisible();
  await expect(page.getByText("Required exams")).toBeVisible();
  await expect(page.getByText(/ЕНТ/).first()).toBeVisible();
});
