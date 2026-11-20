import test from "node:test";
import assert from "node:assert/strict";
import { modules } from "../course.js";
import { encodeProgress, decodeProgress } from "../progress.js";

test("new links keep stable destinations and quiz completions through reorder", () => {
  const state = { current: 2, completed: [0, 2], view: "quiz" };
  const token = encodeProgress(state, modules);
  assert.match(token, /^4-/);
  assert.deepEqual(decodeProgress(token, modules).state, state);
  const reordered = [modules[2], modules[0], modules[1], modules[3]];
  assert.deepEqual(decodeProgress(token, reordered).state, {
    current: 0,
    completed: [0, 1],
    view: "quiz",
  });
  const added = [...reordered, { ...modules[0], id: "new-module" }];
  assert.deepEqual(decodeProgress(token, added).state.completed, [0, 1]);
});

test("quiz changes reset only affected completions, but lesson edits do not", () => {
  const token = encodeProgress(
    { current: 2, completed: [0, 1, 2, 3], view: "diploma" },
    modules,
  );
  const proseEdit = modules.map((module, index) =>
    index === 0 ? { ...module, intro: "New lesson text" } : module,
  );
  assert.deepEqual(
    decodeProgress(token, proseEdit).state.completed,
    [0, 1, 2, 3],
  );
  for (const change of [
    { prompt: "Changed question" },
    {
      options: ["Changed choice", ...modules[1].questions[0].options.slice(1)],
    },
    {
      answer:
        (modules[1].questions[0].answer + 1) %
        modules[1].questions[0].options.length,
    },
  ]) {
    const changed = modules.map((module, index) =>
      index === 1
        ? {
            ...module,
            questions: [
              { ...module.questions[0], ...change },
              ...module.questions.slice(1),
            ],
          }
        : module,
    );
    const result = decodeProgress(token, changed);
    assert.deepEqual(result.state.completed, [0, 2, 3]);
    assert.deepEqual(result.reset, [modules[1].id]);
    assert.equal(result.state.view, "diploma");
  }
});

test("real legacy links map original positions and safely reset ambiguous quizzes", () => {
  const lesson = decodeProgress("1-2-f-1enyvj8", modules);
  assert.deepEqual(lesson.state, { current: 2, completed: [] });
  assert.deepEqual(
    lesson.reset,
    modules.map((module) => module.id),
  );
  assert.equal(lesson.upgraded, true);
  const reordered = [modules[2], modules[0], modules[1], modules[3]];
  const quiz = decodeProgress("2-2-f-b13pn1", reordered);
  assert.deepEqual(quiz.state, {
    current: 0,
    completed: [0, 1, 2, 3],
    view: "quiz",
  });
  assert.deepEqual(quiz.reset, []);
  const diploma = decodeProgress("3-2-f-16w75tu", modules);
  assert.deepEqual(diploma.state, {
    current: 2,
    completed: [0, 1, 2, 3],
    view: "diploma",
  });
  assert.equal(diploma.upgraded, true);
  const changed = modules.map((module, index) =>
    index === 1
      ? {
          ...module,
          questions: [
            { ...module.questions[0], prompt: "Changed" },
            ...module.questions.slice(1),
          ],
        }
      : module,
  );
  assert.deepEqual(
    decodeProgress("2-2-f-b13pn1", changed).state.completed,
    [0, 2, 3],
  );
});

test("removed destinations fall back safely without losing other completions", () => {
  const token = encodeProgress(
    { current: 2, completed: [0, 2], view: "quiz" },
    modules,
  );
  const remaining = modules.filter((_, index) => index !== 2);
  const result = decodeProgress(token, remaining);
  assert.deepEqual(result.state, { current: 0, completed: [0] });
  assert.equal(result.missingDestination, true);
});

test("rejects malformed, tampered, future-version tokens and invalid state", () => {
  const token = encodeProgress({ current: 1, completed: [0] }, modules);
  for (const bad of [
    "",
    "garbage",
    `${token}x`,
    token.replace(/^4/, "5"),
    "1-2-f-1enyvj9",
  ]) {
    assert.equal(decodeProgress(bad, modules), null);
  }
  assert.throws(() => encodeProgress({ current: 4, completed: [] }, modules));
  assert.throws(() => encodeProgress({ current: 0, completed: [4] }, modules));
  assert.throws(() =>
    encodeProgress({ current: 0, completed: [1, 1] }, modules),
  );
  assert.throws(() =>
    encodeProgress({ current: 0, completed: [], view: "other" }, modules),
  );
});
