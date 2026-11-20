import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { modules } from "../course.js";
import { encodeProgress } from "../progress.js";

test.setTimeout(180_000);

test("legacy links upgrade in place and explain quiz resets", async ({
  page,
}) => {
  await page.goto("/");
  await page.goto("/1-2-f-1enyvj8");
  await expect(
    page.getByRole("heading", { name: modules[2].title, level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: /saved link.*updated/i }),
  ).toContainText(/retake.*quizzes/i);
  await expect(page.locator("#progress-count")).toHaveText(
    "0 of 4 modules completed",
  );
  await axe(page);
  await expect(page).toHaveURL(/\/4-/);
  expect(await page.getByLabel("Your resume link").inputValue()).toBe(
    page.url(),
  );
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: modules[0].title, level: 2 }),
  ).toBeVisible();

  await page.goto("/#2-2-f-b13pn1");
  await expect(
    page.getByRole("heading", { name: `Quiz: ${modules[2].title}`, level: 2 }),
  ).toBeVisible();
  await expect(page.locator("#progress-count")).toHaveText(
    "4 of 4 modules completed",
  );
  await expect(page).toHaveURL(/\/4-/);
  await expect(
    page.getByRole("status").filter({ hasText: /saved link.*updated/i }),
  ).toBeVisible();
});

test("changed or removed modules produce accessible migration feedback", async ({
  page,
}) => {
  const previous = modules.map((module, index) =>
    index === 1
      ? {
          ...module,
          questions: [
            { ...module.questions[0], prompt: "Earlier quiz question" },
            ...module.questions.slice(1),
          ],
        }
      : module,
  );
  const outdated = encodeProgress(
    { current: 3, completed: [0, 1, 2, 3], view: "diploma" },
    previous,
  );
  await page.goto(`/${outdated}`);
  await expect(
    page.getByRole("heading", { name: "Not quite there yet" }),
  ).toBeVisible();
  await expect(page.locator("#progress-count")).toHaveText(
    "3 of 4 modules completed",
  );
  await expect(page.locator("#progress-notice")).toHaveAttribute(
    "role",
    "status",
  );
  await expect(page.locator("#progress-notice")).toContainText(
    modules[1].title,
  );
  expect(new URL(page.url()).pathname.slice(1)).not.toBe(outdated);
  await expect(page.getByLabel("Your resume link")).toHaveValue(page.url());
  await axe(page);

  const removed = modules.map((module, index) =>
    index === 0 ? { ...module, id: "removed-module" } : module,
  );
  const oldDestination = encodeProgress(
    { current: 0, completed: [], view: "quiz" },
    removed,
  );
  await page.goto(`/${oldDestination}`);
  await expect(
    page.getByRole("heading", { name: modules[0].title, level: 2 }),
  ).toBeVisible();
  await expect(page.locator("#progress-notice")).toContainText(
    /no longer available.*first module/i,
  );
  await axe(page);
});

test("reset confirms before restarting and keeps saved links and theme", async ({
  page,
}) => {
  const token = encodeProgress(
    { current: 2, completed: [0, 1], view: "quiz" },
    modules,
  );
  await page.goto(`/?source=saved#${token}`);
  await page.getByRole("button", { name: "Dark mode" }).click();
  const before = page.url();
  const reset = page.getByRole("button", { name: "Reset course progress" });
  await expect(reset).toBeVisible({ timeout: 5000 });
  await expect(page.locator("#progress-count")).toHaveText(
    "2 of 4 modules completed",
  );
  await axe(page);
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    expect(dialog.message()).toMatch(/are you sure/i);
    expect(dialog.message()).toMatch(/start.*again.*no quizzes completed/i);
    await dialog.dismiss();
  });
  await reset.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(before);
  await expect(page.locator("#progress-count")).toHaveText(
    "2 of 4 modules completed",
  );
  await expect(
    page.getByRole("heading", { name: `Quiz: ${modules[2].title}` }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await reset.focus();
  await page.keyboard.press("Space");
  await expect(page).toHaveURL(new URL("/", before).href);
  await expect(page.locator("#progress-count")).toHaveText(
    "0 of 4 modules completed",
  );
  await expect(
    page.getByRole("heading", { name: modules[0].title, level: 2 }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Light mode" })).toBeVisible();
  await page.goto(before);
  await expect(page.locator("#progress-count")).toHaveText(
    "2 of 4 modules completed",
  );
  await expect(page.getByRole("button", { name: "Light mode" })).toBeVisible();
});

test("unfinished lessons and quizzes remind pointer users before continuing", async ({
  page,
}) => {
  for (const view of ["lesson", "quiz"]) {
    const token = encodeProgress(
      { current: 0, completed: [], ...(view === "quiz" ? { view } : {}) },
      modules,
    );
    await page.goto(`/${token}`);
    const next = page.getByRole("button", { name: "Next module" });
    const reminder = page.locator("#quiz-reminder");
    const before = page.url();
    await next.click();
    expect(page.url()).toBe(before);
    await expect(reminder).toBeVisible();
    await expect(reminder).toHaveAttribute("aria-hidden", "true");
    await expect(reminder).toContainText(/quiz/i);
    await expect(reminder).toContainText(/again.*continue/i);
    await axe(page);
    await next.click();
    await expect(
      page.getByRole("heading", { name: modules[1].title, level: 2 }),
    ).toBeVisible();
    await expect(reminder).toBeHidden();
  }
});

test("reminders reset and keyboard or virtual clicks skip them", async ({
  page,
}) => {
  await page.goto("/");
  const next = page.getByRole("button", { name: "Next module" });
  const reminder = page.locator("#quiz-reminder");
  await next.click();
  await expect(reminder).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(reminder).toBeHidden();
  await next.click();
  await expect(reminder).toBeVisible();
  await page.getByRole("button", { name: "Take quiz" }).click();
  await expect(reminder).toBeHidden();
  await next.click();
  await expect(reminder).toBeVisible();
  await page.getByRole("button", { name: "Back to lesson" }).click();
  await expect(reminder).toBeHidden();
  await next.click();
  await expect(reminder).toBeVisible();
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: modules[1].title, level: 2 }),
  ).toBeVisible();
  await expect(reminder).toBeHidden();
  await next.focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("heading", { name: modules[2].title, level: 2 }),
  ).toBeVisible();
  await next.evaluate((element) => element.click());
  await expect(
    page.getByRole("heading", { name: modules[3].title, level: 2 }),
  ).toBeVisible();
  await expect(next).toHaveCount(0);
});

test("completed modules skip the reminder", async ({ page }) => {
  for (const view of ["lesson", "quiz"]) {
    const token = encodeProgress(
      { current: 0, completed: [0], ...(view === "quiz" ? { view } : {}) },
      modules,
    );
    await page.goto(`/${token}`);
    await page.getByRole("button", { name: "Next module" }).click();
    await expect(
      page.getByRole("heading", { name: modules[1].title, level: 2 }),
    ).toBeVisible();
  }
});

test("touch users can continue after the reminder", async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: process.env.COURSE_BASE_URL || "http://127.0.0.1:4173",
    hasTouch: true,
    viewport: { width: 320, height: 800 },
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    const next = page.getByRole("button", { name: "Next module" });
    await next.tap();
    await expect(page.locator("#quiz-reminder")).toBeVisible();
    await next.tap();
    await expect(
      page.getByRole("heading", { name: modules[1].title, level: 2 }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test("quiz reminder fits narrow dark screens and respects reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Dark mode" }).click();
  const next = page.getByRole("button", { name: "Next module" });
  await next.click();
  const reminder = page.locator("#quiz-reminder");
  await expect(reminder).toBeVisible();
  const box = await reminder.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(
    await next.evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  expect(
    await next.evaluate((element) => getComputedStyle(element).boxShadow),
  ).not.toBe("none");
  await axe(page);
});

test("branding and footer remain accessible in both themes on narrow screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  const home = page.getByRole("link", { name: "ADHD for parents" });
  const footer = page.getByRole("contentinfo");
  const github = footer.getByRole("link", {
    name: "View the course on GitHub",
  });
  await expect(home).toHaveAttribute("href", "/");
  await expect(home).toContainText("🎓");
  await expect(home.locator('[aria-hidden="true"]')).toHaveText("🎓");
  await expect(footer).toContainText("Created by Alexander Hedberg");
  await expect(footer).toContainText("not medical advice");
  await expect(github).toHaveAttribute(
    "href",
    "https://github.com/shplack/adhd-course",
  );
  for (const mode of ["light", "dark"]) {
    if (mode === "dark")
      await page.getByRole("button", { name: "Dark mode" }).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    await github.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(github).toBeFocused();
    expect(
      await github.evaluate(
        (element) => getComputedStyle(element).outlineStyle,
      ),
    ).not.toBe("none");
    await axe(page);
  }
});

test("theme button names the next mode and describes the current mode", async ({
  page,
}) => {
  await page.goto("/");
  const toggle = page.locator("#theme-toggle");
  await expect(toggle).toHaveText("Dark mode");
  await expect(toggle).toHaveAccessibleName("Dark mode");
  await expect(toggle).toHaveAccessibleDescription("Dark mode is off.");
  await expect(toggle).not.toHaveAttribute("aria-pressed");

  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveText("Light mode");
  await expect(toggle).toHaveAccessibleName("Light mode");
  await expect(toggle).toHaveAccessibleDescription("Dark mode is on.");
  await page.reload();
  await expect(toggle).toHaveAccessibleName("Light mode");
  await expect(toggle).toHaveAccessibleDescription("Dark mode is on.");

  await toggle.click();
  await expect(toggle).toHaveAccessibleName("Dark mode");
  await expect(toggle).toHaveAccessibleDescription("Dark mode is off.");
  await page.reload();
  await expect(toggle).toHaveAccessibleName("Dark mode");
  await expect(toggle).toHaveAccessibleDescription("Dark mode is off.");
});

test("dark mode is accessible, independent of progress, and remembers a choice", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const toggle = page.locator("#theme-toggle");
  await expect(toggle).toHaveAccessibleName("Dark mode");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  const resumeLink = await page.getByLabel("Your resume link").inputValue();

  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAccessibleName("Light mode");
  await expect(page.getByRole("status")).toHaveText("Dark mode on.");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.getByLabel("Your resume link").inputValue()).toBe(
    resumeLink,
  );
  expect(
    await toggle.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe("none");
  await axe(page);

  for (const module of modules) {
    await page
      .getByRole("navigation", { name: "Course modules" })
      .getByRole("button", { name: new RegExp(module.title, "i") })
      .click();
    for (const button of await page
      .getByRole("button", { name: /simple summary:/i })
      .all()) {
      await button.click();
    }
    await axe(page);
  }
  await page.goto("/invalid-token");
  await expect(page.getByRole("alert")).toBeVisible();
  await axe(page);
  await page.getByRole("button", { name: "Take quiz" }).click();
  await page.getByRole("button", { name: /check answers/i }).click();
  await expect(page.locator("#quiz-result")).toContainText("Unanswered");
  await axe(page);
  await answerQuiz(page, modules[0], 0);
  await expect(page.locator("#quiz-result")).toContainText("Try again");
  await axe(page);
  await answerQuiz(page, modules[0]);
  await expect(page.locator("#quiz-result")).toContainText("Module completed");
  await axe(page);

  for (const completed of [[], modules.map((_, index) => index)]) {
    const token = encodeProgress(
      { current: 3, view: "diploma", completed },
      modules,
    );
    await page.goto(`/${token}`);
    await axe(page);
  }
  await page.reload();
  await expect(toggle).toHaveAccessibleName("Light mode");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await toggle.click();
  await expect(toggle).toHaveAccessibleName("Dark mode");
  await expect(page.getByRole("status").first()).toHaveText("Dark mode off.");
  await page.reload();
  await expect(toggle).toHaveAccessibleName("Dark mode");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
});

test("dark mode remains usable when browser storage is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Storage unavailable", "SecurityError");
      },
    });
  });
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText(
    "Your theme preference could not be loaded.",
  );
  const toggle = page.locator("#theme-toggle");
  await toggle.click();
  await expect(toggle).toHaveAccessibleName("Light mode");
  await expect(page.getByRole("status")).toHaveText(
    "Dark mode on. Your choice could not be saved in this browser.",
  );
  await expect(page.getByRole("button", { name: "Take quiz" })).toBeVisible();
});

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
  expect(quizStyle.backgroundColor).toBe("rgb(90, 49, 82)");
  for (const other of [previous, next]) {
    const otherStyle = await style(other);
    expect(otherStyle.backgroundColor).toBe("rgb(49, 94, 80)");
    expect(quizStyle.backgroundColor).not.toBe(otherStyle.backgroundColor);
    expect(quizStyle.borderRadius).not.toBe(otherStyle.borderRadius);
  }
  for (const button of [previous, quiz, next]) {
    const normal = (await style(button)).backgroundColor;
    await button.hover();
    expect((await style(button)).backgroundColor).not.toBe(normal);
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
      if (section.example.avoid) {
        const example = sublesson.locator(".example");
        await expect(
          example.getByText("What not to do:", { exact: false }),
        ).toBeVisible();
        await expect(example).toContainText(section.example.avoid);
        await expect(example).toContainText(section.example.try);
      }
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
    await expect(page.locator("#quiz").getByRole("status")).toContainText(
      /unanswered/i,
    );
    await axe(page);
    await answerQuiz(page, module, 1);
    await expect(page.locator("#quiz").getByRole("status")).toContainText(
      /question 2/i,
    );
    await expect(
      page.getByText(`${index} of ${modules.length} modules completed`),
    ).toBeVisible();
    await axe(page);
    await answerQuiz(page, module);
    await expect(page.locator("#quiz").getByRole("status")).toContainText(
      /completed/i,
    );
    await expect(page.locator("#quiz").getByRole("status")).toHaveAttribute(
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
    await expect(page.locator("#quiz").getByRole("status")).not.toContainText(
      /diploma.*ready/i,
    );
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
  await expect(page.locator("#quiz").getByRole("status")).toContainText(
    /diploma.*ready/i,
  );
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
    modules,
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
