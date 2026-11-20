// Versions 1–3 used these positions. Never reorder or reuse these IDs.
const legacyModules = [
  ["understanding", "d7eb17d658f25501"],
  ["support", "0e73e461374b1967"],
  ["daily", "f4ce5e5aed99021e"],
  ["care", "69539f262d60d9f1"],
];

function checksum(text) {
  let hash = 2166136261;
  for (const char of text) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  }
  return hash.toString(36);
}

function quizFingerprint(questions) {
  const content = JSON.stringify(
    questions.map(({ prompt, options, answer }) => [prompt, options, answer]),
  );
  let hash = 14695981039346656037n;
  for (const byte of new TextEncoder().encode(content)) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 1099511628211n);
  }
  return hash.toString(16).padStart(16, "0");
}

function validateModules(modules) {
  if (
    !Array.isArray(modules) ||
    modules.length < 1 ||
    modules.length > 30 ||
    modules.some(
      (module) =>
        !module ||
        typeof module.id !== "string" ||
        !/^[a-z0-9_-]{1,32}$/.test(module.id) ||
        !Array.isArray(module.questions),
    ) ||
    new Set(modules.map((module) => module.id)).size !== modules.length
  ) {
    throw new TypeError("Invalid course modules");
  }
}

function validState(state, count) {
  return (
    Number.isInteger(state?.current) &&
    state.current >= 0 &&
    state.current < count &&
    (state.view === undefined ||
      state.view === "quiz" ||
      state.view === "diploma") &&
    Array.isArray(state.completed) &&
    new Set(state.completed).size === state.completed.length &&
    state.completed.every(
      (item) => Number.isInteger(item) && item >= 0 && item < count,
    )
  );
}

function base64url(text) {
  return btoa(text)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export function encodeProgress(state, modules) {
  validateModules(modules);
  if (!validState(state, modules.length))
    throw new TypeError("Invalid progress");
  const completed = [...state.completed]
    .sort((a, b) => a - b)
    .map((index) => [
      modules[index].id,
      quizFingerprint(modules[index].questions),
    ]);
  const payload = `4-${base64url(JSON.stringify([modules[state.current].id, state.view || "lesson", completed]))}`;
  return `${payload}-${checksum(payload)}`;
}

export function decodeProgress(token, modules) {
  validateModules(modules);
  if (typeof token !== "string" || token.length > 4096) return null;
  const legacy = /^([123])-([0-9a-z]+)-([0-9a-z]+)-([0-9a-z]+)$/.exec(token);
  let destination;
  let view;
  let completions;
  let upgraded = false;
  if (legacy) {
    const [, version, currentText, maskText, check] = legacy;
    if (checksum(`${version}-${currentText}-${maskText}`) !== check)
      return null;
    const current = parseInt(currentText, 36);
    const mask = parseInt(maskText, 36);
    if (
      !Number.isSafeInteger(current) ||
      current >= legacyModules.length ||
      !Number.isSafeInteger(mask) ||
      mask >= 2 ** legacyModules.length ||
      current.toString(36) !== currentText ||
      mask.toString(36) !== maskText
    )
      return null;
    destination = legacyModules[current][0];
    view = version === "2" ? "quiz" : version === "3" ? "diploma" : "lesson";
    // Version 1 was used by both the original and expanded quizzes.
    completions = legacyModules
      .filter((_, index) => Math.floor(mask / 2 ** index) % 2)
      .map(([id, fingerprint]) => [id, version === "1" ? null : fingerprint]);
    upgraded = true;
  } else {
    const match = /^(4-([A-Za-z0-9_-]+))-([0-9a-z]+)$/.exec(token);
    if (!match || checksum(match[1]) !== match[3]) return null;
    let data;
    try {
      const json = atob(match[2].replaceAll("-", "+").replaceAll("_", "/"));
      if (base64url(json) !== match[2]) return null;
      data = JSON.parse(json);
    } catch (error) {
      if (
        error instanceof SyntaxError ||
        error.name === "InvalidCharacterError"
      )
        return null;
      throw error;
    }
    if (
      !Array.isArray(data) ||
      data.length !== 3 ||
      typeof data[0] !== "string" ||
      !/^[a-z0-9_-]{1,32}$/.test(data[0]) ||
      !["lesson", "quiz", "diploma"].includes(data[1]) ||
      !Array.isArray(data[2]) ||
      data[2].length > 30 ||
      data[2].some(
        (entry) =>
          !Array.isArray(entry) ||
          entry.length !== 2 ||
          typeof entry[0] !== "string" ||
          !/^[a-z0-9_-]{1,32}$/.test(entry[0]) ||
          typeof entry[1] !== "string" ||
          !/^[0-9a-f]{16}$/.test(entry[1]),
      ) ||
      new Set(data[2].map((entry) => entry[0])).size !== data[2].length
    )
      return null;
    [destination, view, completions] = data;
  }
  const current = modules.findIndex((module) => module.id === destination);
  const missingDestination = current === -1;
  const reset = [];
  const removed = [];
  const completed = [];
  for (const [id, fingerprint] of completions) {
    const index = modules.findIndex((module) => module.id === id);
    if (index < 0) removed.push(id);
    else if (fingerprint !== quizFingerprint(modules[index].questions))
      reset.push(id);
    else completed.push(index);
  }
  completed.sort((a, b) => a - b);
  const state = { current: missingDestination ? 0 : current, completed };
  if (view === "diploma" || (view === "quiz" && !missingDestination)) {
    state.view = view;
  }
  return { state, upgraded, reset, removed, missingDestination };
}
