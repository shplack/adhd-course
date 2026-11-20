import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { modules } from "../course.js";
import { encodeProgress } from "../progress.js";

test.setTimeout(180_000);

test("take quiz stands out from nearby navigation and remains keyboard accessible", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Course modules" })
    .getByRole("button", { name: /support without taking over/i })
    .click();
  const nav = page.getByRole("navigation", { name: "Lesson navigation" });
  const quiz = nav.getByRole("button", { name: "Take quiz" });
  const previous = nav.getByRole("button", { name: "Previous module" });
  const next = nav.getByRole("button", { name: "Next module" });
  const style = (locator) =>
    locator.evaluate((element) => {
      const { backgroundColor, borderRadius } = getComputedStyle(element);
      return { backgroundColor, borderRadius };
    });
  const quizStyle = await style(quiz);
  for (const other of [previous, next]) {
    const otherStyle = await style(other);
    expect(quizStyle.backgroundColor).not.toBe(otherStyle.backgroundColor);
    expect(quizStyle.borderRadius).not.toBe(otherStyle.borderRadius);
  }
  await previous.focus();
  await page.keyboard.press("Tab");
  await expect(quiz).toBeFocused();
  expect(
    await quiz.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe("none");
  await axe(page);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: /quiz: support without taking over/i }),
  ).toBeFocused();
});

async function axe(page) {
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
}

async function answerQuiz(page, module, wrongIndex = -1) {
  for (const [index, question] of module.questions.entries()) {
    const option =
      index === wrongIndex
        ? (question.answer + 1) % question.options.length
        : question.answer;
    await page
      .getByRole("group", { name: `Question ${index + 1}: ${question.prompt}` })
      .getByLabel(question.options[option], { exact: true })
      .check();
  }
  await page.getByRole("button", { name: /check answers/i }).click();
}

test("all modules expose accessible structure, citations, feedback and progress", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("banner")).toHaveCount(1);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(
    page.getByRole("navigation", { name: "Course modules" }),
  ).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

  for (const [index, module] of modules.entries()) {
    await expect(
      page.getByRole("heading", { name: module.title, level: 2 }),
    ).toBeVisible();
    const headings = await page
      .locator("main h2, main h3")
      .evaluateAll((nodes) => nodes.map((node) => node.tagName));
    expect(headings[0]).toBe("H2");
    expect(headings.slice(1).every((heading) => heading === "H3")).toBe(true);
    for (const section of module.sections) {
      const sublesson = page.locator("section.lesson-section").filter({
        has: page.getByRole("heading", { name: section.title, level: 3 }),
      });
      await expect(
        sublesson.getByRole("heading", { name: "Example", level: 4 }),
      ).toBeVisible();
      await expect(
        sublesson.getByText(section.example.scenario, { exact: true }),
      ).toBeVisible();
      await expect(
        sublesson.getByText(section.example.try, { exact: true }),
      ).toBeVisible();
      await sublesson.getByText(section.paragraphs[0], { exact: true }).hover();
      const summaryButton = sublesson.getByRole("button", {
        name: `Simple summary: ${section.title}`,
      });
      await expect(summaryButton).toHaveCSS("opacity", "1");
      await expect(summaryButton).toHaveAttribute("aria-expanded", "false");
      await summaryButton.click();
      await expect(summaryButton).toHaveAttribute("aria-expanded", "true");
      await expect(
        sublesson.getByText(section.summary, { exact: true }),
      ).toBeVisible();
      await summaryButton.click();
      await expect(summaryButton).toHaveAttribute("aria-expanded", "false");
      await expect(
        sublesson.getByText(section.summary, { exact: true }),
      ).toBeHidden();
    }
    const citation = page.getByRole("link", {
      name: /external resource.*opens in a new tab/i,
    });
    await expect(citation).toHaveAttribute("href", module.url);
    await expect(citation).toHaveAttribute("target", "_blank");
    await expect(citation).toHaveAttribute("rel", /noopener.*noreferrer/);
    const nav = page.getByRole("navigation", { name: "Course modules" });
    await expect(
      nav.getByRole("button", {
        name: new RegExp(module.title + ".*Not completed", "i"),
      }),
    ).toHaveAttribute("aria-current", "step");
    await expect(nav.locator(".module-number").nth(index)).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    await expect(page.locator("form#quiz")).toHaveCount(0);
    await axe(page);
    const navigation = page.getByRole("navigation", {
      name: "Lesson navigation",
    });
    await navigation.getByRole("button", { name: "Take quiz" }).click();
    await expect(
      page.getByRole("heading", { name: `Quiz: ${module.title}`, level: 2 }),
    ).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Back to lesson" }),
    ).toBeVisible();
    await expect(page.locator(".lesson-section")).toHaveCount(0);
    await expect(page.locator("form fieldset")).toHaveCount(
      module.questions.length,
    );
    for (const [questionIndex, question] of module.questions.entries())
      await expect(
        page.getByRole("group", {
          name: `Question ${questionIndex + 1}: ${question.prompt}`,
        }),
      ).toBeVisible();
    await axe(page);
    await page.getByRole("button", { name: /check answers/i }).click();
    await expect(page.getByRole("status")).toContainText(/unanswered/i);
    await axe(page);
    await answerQuiz(page, module, 1);
    await expect(page.getByRole("status")).toContainText(/question 2/i);
    await expect(
      page.getByText(`${index} of ${modules.length} modules completed`),
    ).toBeVisible();
    await axe(page);
    await answerQuiz(page, module);
    await expect(page.getByRole("status")).toContainText(/completed/i);
    await expect(page.getByRole("status")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    await expect(
      nav.getByRole("button", {
        name: new RegExp(module.title + ".*Completed", "i"),
      }),
    ).toHaveAttribute("aria-current", "step");
    await axe(page);
    if (index < modules.length - 1) {
      await page.getByRole("button", { name: /next module/i }).click();
      await expect(
        page.getByRole("heading", { name: modules[index + 1].title }),
      ).toBeFocused();
    } else {
      await expect(
        page.getByRole("button", { name: /next module/i }),
      ).toHaveCount(0);
    }
  }
  const resume = new URL(page.url()).pathname;
  await page.goto(resume);
  await expect(
    page.getByText(`${modules.length} of ${modules.length} modules completed`),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: `Quiz: ${modules.at(-1).title}` }),
  ).toBeVisible();
});

test("quiz links can be copied, reopened, and navigated with browser history", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const takeQuiz = page.getByRole("button", { name: "Take quiz" });
  await takeQuiz.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: `Quiz: ${modules[0].title}` }),
  ).toBeFocused();
  await page.getByRole("button", { name: /copy my resume link/i }).click();
  await expect(page.locator("#copy-message")).toContainText("copied");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(page.url());
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: modules[0].title, exact: true }),
  ).toBeFocused();
  await page.goForward();
  await expect(
    page.getByRole("heading", { name: `Quiz: ${modules[0].title}` }),
  ).toBeFocused();
  await page.goto(copied);
  await expect(
    page.getByRole("heading", { name: `Quiz: ${modules[0].title}` }),
  ).toBeVisible();
  await answerQuiz(page, modules[0]);
  await expect(
    page.getByText(`1 of ${modules.length} modules completed`),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByText(`1 of ${modules.length} modules completed`),
  ).toBeVisible();
  await page.goForward();
  await page.getByRole("button", { name: "Back to lesson" }).click();
  await expect(
    page.getByRole("heading", { name: modules[0].title, exact: true }),
  ).toBeFocused();
});

test("diploma stays locked when quizzes are skipped and points to the next unfinished quiz", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Course modules" })
    .getByRole("button", {
      name: /care, treatment and next steps.*not completed/i,
    })
    .click();
  await page.getByRole("button", { name: "View diploma" }).click();
  await expect(
    page.getByRole("heading", { name: "Your diploma" }),
  ).toBeFocused();
  await expect(page.getByText(/complete all 4 quizzes/i)).toBeVisible();
  await expect(page.getByText("I'll do it later...")).toHaveCount(0);
  await axe(page);
  await page.getByRole("button", { name: /next unfinished quiz/i }).click();
  await expect(
    page.getByRole("heading", { name: `Quiz: ${modules[0].title}` }),
  ).toBeFocused();
});

test("completing the last outstanding quiz unlocks the diploma and survives resume", async ({
  page,
}) => {
  await page.goto("/");
  for (const index of [3, 0, 2]) {
    await page
      .getByRole("navigation", { name: "Course modules" })
      .getByRole("button", {
        name: new RegExp(`${modules[index].title}.*Not completed`, "i"),
      })
      .click();
    await page.getByRole("button", { name: "Take quiz" }).click();
    await answerQuiz(page, modules[index]);
    await expect(page.getByRole("status")).not.toContainText(/diploma.*ready/i);
  }
  const partialResume = page.url();
  await page.goto(partialResume);
  await page
    .getByRole("navigation", { name: "Course modules" })
    .getByRole("button", {
      name: /support without taking over.*not completed/i,
    })
    .click();
  await page.getByRole("button", { name: "Take quiz" }).click();
  await answerQuiz(page, modules[1]);
  await expect(page.getByRole("status")).toContainText(/diploma.*ready/i);
  const view = page.getByRole("button", { name: "View diploma" });
  await view.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Your diploma" }),
  ).toBeFocused();
  await expect(page.getByText("I'll do it later...")).toBeVisible();
  await expect(page.getByText(/not a real password/i)).toBeVisible();
  await axe(page);
  const resume = new URL(page.url()).pathname;
  await page.goto(resume);
  await expect(
    page.getByRole("heading", { name: "Your diploma" }),
  ).toBeVisible();
  await expect(page.getByText("I'll do it later...")).toBeVisible();
  const oldLink = encodeProgress(
    { current: 0, completed: [0, 1, 2, 3] },
    modules.length,
  );
  await page.goto(`/${oldLink}`);
  await page.getByRole("button", { name: "View diploma" }).click();
  await expect(page.getByText("I'll do it later...")).toBeVisible();
});

test("summary is keyboard operable and available on touch screens", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  const section = page.locator(".lesson-section").first();
  const button = section.getByRole("button", {
    name: `Simple summary: ${modules[0].sections[0].title}`,
  });
  await button.focus();
  await expect(button).toHaveCSS("opacity", "1");
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(
    section.getByText(modules[0].sections[0].summary, { exact: true }),
  ).toBeVisible();
  await axe(page);
  await page.keyboard.press("Space");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  try {
    const touchPage = await context.newPage();
    await touchPage.goto("/");
    const touchButton = touchPage.getByRole("button", {
      name: `Simple summary: ${modules[0].sections[0].title}`,
    });
    await expect(touchButton).toHaveCSS("opacity", "1");
    await touchButton.tap();
    await expect(touchButton).toHaveAttribute("aria-expanded", "true");
    await expect(
      touchPage.getByText(modules[0].sections[0].summary, { exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test("invalid and fragment links and keyboard navigation", async ({ page }) => {
  await page.goto("/not-a-valid-token");
  await expect(page.getByRole("alert")).toContainText(/could not be read/i);
  await axe(page);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: /skip to lesson/i }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#lesson")).toBeFocused();
  await page.getByRole("button", { name: /next module/i }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: modules[1].title }),
  ).toBeFocused();
  const token = new URL(page.url()).pathname.slice(1);
  await page.goto("/#" + token);
  await expect(
    page.getByRole("heading", { name: modules[1].title }),
  ).toBeVisible();
});
