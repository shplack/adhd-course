import { modules } from "./course.js";
import { decodeProgress, encodeProgress } from "./progress.js";

const $ = (selector) => document.querySelector(selector);
const fresh = () => ({ current: 0, completed: [] });
let state = fresh();

function tokenFromLocation() {
  return location.hash
    ? location.hash.slice(1)
    : location.pathname.replace(/^\/|\/$/g, "");
}

function readLocation(focus = false) {
  const token = tokenFromLocation();
  const decoded = token ? decodeProgress(token, modules.length) : fresh();
  state = decoded || fresh();
  $("#invalid-link").textContent = decoded
    ? ""
    : "This resume link could not be read. You are starting a fresh course.";
  render(focus);
}

function resumeUrl() {
  return `${location.origin}/${encodeProgress(state, modules.length)}`;
}

function navigate(index) {
  state.current = index;
  history.pushState(null, "", resumeUrl());
  render(true);
}

function render(focus) {
  const module = modules[state.current];
  $("#progress-count").textContent =
    `${state.completed.length} of ${modules.length} modules completed`;
  $("#progress-bar").value = state.completed.length;
  $("#resume-link").value = resumeUrl();
  $("#copy-message").textContent = "";
  $("#module-list").innerHTML = modules
    .map(
      (item, index) => `
    <li><button type="button" class="module-link ${index === state.current ? "active" : ""}" data-module="${index}" ${index === state.current ? 'aria-current="step"' : ""}>
      <span class="module-number">${state.completed.includes(index) ? "✓" : String(index + 1).padStart(2, "0")}</span>
      <span><small>MODULE ${String(index + 1).padStart(2, "0")}</small>${item.title}</span>
      <span class="sr-only">${state.completed.includes(index) ? "Completed" : "Not completed"}</span>
    </button></li>`,
    )
    .join("");
  $("#content").innerHTML = `
    <div class="lesson-top"><span>THE PARENT'S GUIDE TO ADULT ADHD</span><span>${String(state.current + 1).padStart(2, "0")} / ${String(modules.length).padStart(2, "0")}</span></div>
    <article>
      <p class="eyebrow"><span aria-hidden="true">✦</span> MODULE ${String(state.current + 1).padStart(2, "0")} · ${module.eyebrow}</p>
      <h2 tabindex="-1" id="lesson-title">${module.title}</h2>
      <p class="intro">${module.intro}</p>
      <div class="divider"></div>
      ${module.sections.map(([title, text], index) => `<section class="lesson-section"><span class="section-number" aria-hidden="true">0${index + 1}</span><div><h3>${title}</h3><p>${text}</p></div></section>`).join("")}
      <div class="source"><span aria-hidden="true">↗</span><div><strong>GO A LITTLE DEEPER</strong><a href="${module.url}" target="_blank" rel="noopener noreferrer">External resource: ${module.source} <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span></a><p>Evidence and guidance behind this lesson · opens in a new tab</p></div></div>
      <form id="quiz" class="quiz">
        <p class="eyebrow">A MOMENT TO REFLECT</p><h3>Quick check-in</h3><p>One simple question. Take your time.</p>
        <fieldset><legend>${module.question}</legend>
          ${module.options.map((option, index) => `<label class="answer"><input type="radio" name="answer" value="${index}" /> ${option}</label>`).join("")}
        </fieldset>
        <button class="primary" type="submit">Check answer <span aria-hidden="true">→</span></button>
        <p id="quiz-result" role="status" aria-live="polite"></p>
      </form>
      <div class="lesson-navigation">
        ${state.current > 0 ? '<button type="button" id="previous">← Previous module</button>' : "<span></span>"}
        ${state.current < modules.length - 1 ? '<button type="button" id="next">Next module →</button>' : "<span>That’s the course. Keep the conversation going.</span>"}
      </div>
    </article>`;
  document
    .querySelectorAll("[data-module]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        navigate(Number(button.dataset.module)),
      ),
    );
  $("#previous")?.addEventListener("click", () => navigate(state.current - 1));
  $("#next")?.addEventListener("click", () => navigate(state.current + 1));
  $("#quiz").addEventListener("submit", (event) => {
    event.preventDefault();
    const selected = new FormData(event.currentTarget).get("answer");
    if (selected === null) {
      $("#quiz-result").textContent = "Choose an answer before checking.";
    } else if (Number(selected) !== module.answer) {
      $("#quiz-result").textContent =
        "Not quite. Take another look and try again.";
    } else {
      if (!state.completed.includes(state.current))
        state.completed.push(state.current);
      history.replaceState(null, "", resumeUrl());
      $("#progress-count").textContent =
        `${state.completed.length} of ${modules.length} modules completed`;
      $("#progress-bar").value = state.completed.length;
      $("#resume-link").value = resumeUrl();
      const currentButton = document.querySelector(
        `[data-module="${state.current}"]`,
      );
      currentButton.querySelector(".module-number").textContent = "✓";
      currentButton.querySelector(".sr-only").textContent = "Completed";
      $("#quiz-result").textContent =
        "That’s right! Module completed. Your resume link has been updated.";
    }
  });
  if (focus) $("#lesson-title").focus();
}

$("#copy-link").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(resumeUrl());
    $("#copy-message").textContent = "Resume link copied.";
  } catch {
    $("#resume-link").focus();
    $("#resume-link").select();
    $("#copy-message").textContent =
      "Copy was not available. Your link is selected; copy it manually.";
  }
});
document.querySelector(".skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  $("#lesson").focus();
});
window.addEventListener("popstate", () => readLocation(true));
window.addEventListener("hashchange", () => readLocation(true));
readLocation();
