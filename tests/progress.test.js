import test from "node:test";
import assert from "node:assert/strict";
import { encodeProgress, decodeProgress } from "../progress.js";

test("round trips the current module and completed modules", () => {
  const state = { current: 2, completed: [0, 2] };
  assert.deepEqual(decodeProgress(encodeProgress(state, 4), 4), state);
});

test("rejects invalid, tampered, and future-version tokens", () => {
  const token = encodeProgress({ current: 1, completed: [0] }, 4);
  for (const bad of ["", "garbage", token + "x", token.replace(/^1/, "2")]) {
    assert.equal(decodeProgress(bad, 4), null);
  }
  assert.equal(decodeProgress(token, 1), null);
});

test("rejects invalid state instead of manufacturing a link", () => {
  assert.throws(() => encodeProgress({ current: 4, completed: [] }, 4));
  assert.throws(() => encodeProgress({ current: 0, completed: [4] }, 4));
  assert.throws(() => encodeProgress({ current: 0, completed: [1, 1] }, 4));
});
