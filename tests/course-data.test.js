import test from "node:test";
import assert from "node:assert/strict";
import { modules } from "../course.js";
import { decodeProgress } from "../progress.js";

test("each sublesson has several paragraphs and a substantial labelled example", () => {
  for (const module of modules) {
    for (const section of module.sections) {
      assert.ok(section.title, module.title);
      assert.ok(
        Array.isArray(section.paragraphs) && section.paragraphs.length >= 3,
        section.title,
      );
      assert.ok(
        section.paragraphs.every(
          (paragraph) => typeof paragraph === "string" && paragraph.trim(),
        ),
        section.title,
      );
      assert.ok(
        section.example?.scenario?.trim() && section.example?.try?.trim(),
        section.title,
      );
      const words = [
        ...section.paragraphs,
        section.example.scenario,
        section.example.try,
      ]
        .join(" ")
        .trim()
        .split(/\s+/).length;
      assert.ok(
        words >= 250 && words <= 400,
        `${module.title}: ${section.title} has ${words} words`,
      );
    }
  }
});

test("each module has a distinct research citation and three to five valid questions", () => {
  const urls = new Set();
  for (const module of modules) {
    assert.ok(
      module.questions?.length >= 3 && module.questions.length <= 5,
      module.title,
    );
    for (const question of module.questions) {
      assert.ok(question.prompt && question.options.length >= 2);
      assert.ok(
        Number.isInteger(question.answer) &&
          question.answer >= 0 &&
          question.answer < question.options.length,
      );
      assert.equal(new Set(question.options).size, question.options.length);
    }
    assert.ok(
      module.source &&
        /^https:\/\/(pubmed\.ncbi\.nlm\.nih\.gov|pmc\.ncbi\.nlm\.nih\.gov|doi\.org)\//.test(
          module.url,
        ),
    );
    assert.ok(!urls.has(module.url), module.title);
    urls.add(module.url);
  }
});

test("existing version 1 course links retain their original module positions and progress", () => {
  assert.deepEqual(
    modules.slice(0, 4).map((module) => module.title),
    [
      "Understanding adult ADHD",
      "Support without taking over",
      "Making daily life easier",
      "Care, treatment and next steps",
    ],
  );
  assert.deepEqual(decodeProgress("1-2-3-10ij55n", modules.length), {
    current: 2,
    completed: [0, 1],
  });
});
