import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("course supports accessible navigation, quiz completion and resume", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /understanding adult adhd/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /external resource.*opens in a new tab/i }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .getByLabel("Difficulty with planning or remembering tasks")
    .check();
  await page.getByRole("button", { name: /check answer/i }).click();
  await expect(page.getByRole("status")).toContainText(/completed/i);
  await page.getByRole("button", { name: /next module/i }).click();
  await expect(
    page.getByRole("heading", { name: /support without taking over/i }),
  ).toBeFocused();
  const resume = new URL(page.url()).pathname;
  await page.goto(resume);
  await expect(
    page.getByRole("heading", { name: /support without taking over/i }),
  ).toBeVisible();
  await expect(page.getByText("1 of 4 modules completed")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("invalid links recover accessibly and fragment links resume", async ({
  page,
}) => {
  await page.goto("/not-a-valid-token");
  await expect(page.getByRole("alert")).toContainText(/could not be read/i);
  await page.getByRole("button", { name: /next module/i }).click();
  const token = new URL(page.url()).pathname.slice(1);
  await page.goto("/#" + token);
  await expect(
    page.getByRole("heading", { name: /support without taking over/i }),
  ).toBeVisible();
});

test("keyboard users can reach and activate course navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: /skip to lesson/i }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#lesson")).toBeFocused();
  await expect(page.locator("#invalid-link")).toBeEmpty();
  await page.getByRole("button", { name: /next module/i }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: /support without taking over/i }),
  ).toBeFocused();
});

test("wrong and missing answers do not complete a module, and all modules can be completed", async ({
  page,
}) => {
  await page.goto("/");
  for (let index = 0; index < 4; index++) {
    await page.getByRole("button", { name: /check answer/i }).click();
    await expect(page.getByRole("status")).toContainText(/choose an answer/i);
    await page.locator('input[name="answer"][value="1"]').check();
    await page.getByRole("button", { name: /check answer/i }).click();
    await expect(page.getByRole("status")).toContainText(/try again/i);
    await expect(
      page.getByText(`${index} of 4 modules completed`),
    ).toBeVisible();
    await page.locator('input[name="answer"][value="0"]').check();
    await page.getByRole("button", { name: /check answer/i }).click();
    await expect(
      page.getByText(`${index + 1} of 4 modules completed`),
    ).toBeVisible();
    if (index < 3)
      await page.getByRole("button", { name: /next module/i }).click();
  }
  await page.reload();
  await expect(page.getByText("4 of 4 modules completed")).toBeVisible();
});
