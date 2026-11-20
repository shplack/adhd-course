function checksum(text) {
  let hash = 2166136261;
  for (const char of text) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  }
  return hash.toString(36);
}

function valid(state, count) {
  return (
    Number.isInteger(count) &&
    count > 0 &&
    count <= 30 &&
    Number.isInteger(state?.current) &&
    state.current >= 0 &&
    state.current < count &&
    (state.view === undefined || state.view === "quiz") &&
    Array.isArray(state.completed) &&
    new Set(state.completed).size === state.completed.length &&
    state.completed.every(
      (item) => Number.isInteger(item) && item >= 0 && item < count,
    )
  );
}

export function encodeProgress(state, count) {
  if (!valid(state, count)) throw new TypeError("Invalid progress");
  const mask = state.completed.reduce((value, item) => value + 2 ** item, 0);
  const version = state.view === "quiz" ? "2" : "1";
  const payload = `${version}-${state.current.toString(36)}-${mask.toString(36)}`;
  return `${payload}-${checksum(payload)}`;
}

export function decodeProgress(token, count) {
  if (
    typeof token !== "string" ||
    !/^[12]-[0-9a-z]+-[0-9a-z]+-[0-9a-z]+$/.test(token)
  )
    return null;
  const [version, currentText, maskText, check] = token.split("-");
  const payload = `${version}-${currentText}-${maskText}`;
  if (checksum(payload) !== check) return null;
  const current = parseInt(currentText, 36);
  const mask = parseInt(maskText, 36);
  if (
    !Number.isSafeInteger(mask) ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 30 ||
    mask >= 2 ** count
  )
    return null;
  const completed = Array.from({ length: count }, (_, i) => i).filter(
    (i) => Math.floor(mask / 2 ** i) % 2,
  );
  const state =
    version === "2"
      ? { current, completed, view: "quiz" }
      : { current, completed };
  return valid(state, count) && encodeProgress(state, count) === token
    ? state
    : null;
}
