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

function readLocation(focus = false, preserveCompleted = false) {
  const token = tokenFromLocation();
  const decoded = token ? decodeProgress(token, modules.length) : fresh();
  const completed = state.completed;
  state = decoded || fresh();
  if (decoded && preserveCompleted) {
    const merged = [...new Set([...state.completed, ...completed])];
    if (merged.length !== state.completed.length) {
      state.completed = merged;
      history.replaceState(null, "", resumeUrl());
    }
  }
  $("#invalid-link").textContent = decoded
    ? ""
    : "This resume link could not be read. You are starting a fresh course.";
  render(focus);
}

function resumeUrl() {
  return `${location.origin}/${encodeProgress(state, modules.length)}`;
}

function navigate(index, view) {
  state = { current: index, completed: state.completed };
  if (view === "quiz" || view === "diploma") state.view = view;
  history.pushState(null, "", resumeUrl());
  render(true);
}

function render(focus) {
  const module = modules[state.current];
  const isQuiz = state.view === "quiz";
  const isDiploma = state.view === "diploma";
  const complete = state.completed.length === modules.length;
  const nextUnfinished = modules.findIndex(
    (_, index) => !state.completed.includes(index),
  );
  const title = isDiploma
    ? "Your diploma"
    : isQuiz
      ? `Quiz: ${module.title}`
      : module.title;
  document.title = `${title} — Alongside`;
  $("#progress-count").textContent =
    `${state.completed.length} of ${modules.length} modules completed`;
  $("#progress-bar").value = state.completed.length;
  $("#resume-link").value = resumeUrl();
  $("#copy-message").textContent = "";
  $("#module-list").innerHTML = modules
    .map(
      (item, index) => `
    <li><button type="button" class="module-link ${index === state.current ? "active" : ""}" data-module="${index}" ${index === state.current ? 'aria-current="step"' : ""}>
      <span class="module-number" aria-hidden="true">${state.completed.includes(index) ? "✓" : String(index + 1).padStart(2, "0")}</span>
      <span><small>MODULE ${String(index + 1).padStart(2, "0")}</small>${item.title}</span>
      <span class="sr-only">${state.completed.includes(index) ? "Completed" : "Not completed"}</span>
    </button></li>`,
    )
    .join("");
  $("#content").innerHTML = `
    <div class="lesson-top"><span>THE PARENT'S GUIDE TO ADULT ADHD</span><span>${String(state.current + 1).padStart(2, "0")} / ${String(modules.length).padStart(2, "0")}</span></div>
    <article>
      <p class="eyebrow"><span aria-hidden="true">✦</span> ${isDiploma ? "YOUR COURSE" : `MODULE ${String(state.current + 1).padStart(2, "0")} · ${module.eyebrow}`}</p>
      <h2 tabindex="-1" id="lesson-title">${title}</h2>
      ${
        isDiploma
          ? complete
            ? `<section class="diploma"><h3>Course completed</h3><p>You completed all ${modules.length} quizzes. Thank you for taking the time to learn and listen.</p><p><strong>Your pretend course password:</strong> One more tab…</p><p>Just for fun — this is not a real password or credential.</p></section>`
            : `<section class="diploma"><h3>Not quite there yet</h3><p>Complete all ${modules.length} quizzes to unlock your diploma. You have completed ${state.completed.length} of ${modules.length}.</p><p>Your next unfinished quiz is ${modules[nextUnfinished].title}.</p><button class="primary" type="button" id="unfinished">Go to next unfinished quiz: ${modules[nextUnfinished].title}</button></section>`
          : !isQuiz
            ? `
      <p class="intro">${module.intro}</p>
      <div class="divider"></div>
      ${module.sections.map((section, index) => `<section class="lesson-section"><span class="section-number" aria-hidden="true">0${index + 1}</span><div><div class="sublesson-heading"><h3>${section.title}</h3><button class="summary-toggle" type="button" aria-label="Simple summary: ${section.title}" aria-expanded="false" aria-controls="summary-${index}">Simple summary</button></div><div class="simple-summary" id="summary-${index}" hidden><p>${section.summary}</p></div>${section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}<div class="example"><h4>Example</h4><p>${section.example.scenario}</p><p>${section.example.try}</p></div></div></section>`).join("")}
      <div class="source"><span aria-hidden="true">↗</span><div><strong>GO A LITTLE DEEPER</strong><a href="${module.url}" target="_blank" rel="noopener noreferrer">External resource: ${module.source} <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span></a><p>Evidence and guidance behind this lesson · opens in a new tab</p></div></div>
      `
            : `
      <form id="quiz" class="quiz">
        <p class="eyebrow">A MOMENT TO REFLECT</p><h3>Quick check-in</h3><p>${module.questions.length} simple questions. Take your time.</p>
        ${module.questions
          .map(
            (
              question,
              questionIndex,
            ) => `<fieldset><legend>Question ${questionIndex + 1}: ${question.prompt}</legend>
          ${question.options.map((option, index) => `<label class="answer"><input type="radio" name="answer-${questionIndex}" value="${index}" /> ${option}</label>`).join("")}
        </fieldset>`,
          )
          .join("")}
        <button class="primary" type="submit">Check answers <span aria-hidden="true">→</span></button>
        <p id="quiz-result" role="status" aria-live="polite"></p>
      </form>
      `
      }
      <nav class="lesson-navigation" aria-label="${isDiploma ? "Diploma navigation" : isQuiz ? "Quiz navigation" : "Lesson navigation"}">
        ${
          isDiploma
            ? '<button type="button" id="back-to-lesson">Back to lesson</button>'
            : `
        ${isQuiz ? '<button type="button" id="back-to-lesson">Back to lesson</button>' : state.current > 0 ? '<button type="button" id="previous">Previous module</button>' : ""}
        ${!isQuiz ? '<button type="button" id="take-quiz">Take quiz</button>' : ""}
        ${state.current < modules.length - 1 ? '<button type="button" id="next">Next module</button>' : ""}
        <button type="button" id="view-diploma" ${complete || state.current === modules.length - 1 ? "" : "hidden"}>View diploma</button>
        `
        }
      </nav>
    </article>`;
  document
    .querySelectorAll("[data-module]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        navigate(Number(button.dataset.module)),
      ),
    );
  document.querySelectorAll(".summary-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      document.getElementById(button.getAttribute("aria-controls")).hidden =
        expanded;
    });
  });
  $("#previous")?.addEventListener("click", () => navigate(state.current - 1));
  $("#next")?.addEventListener("click", () => navigate(state.current + 1));
  $("#take-quiz")?.addEventListener("click", () =>
    navigate(state.current, "quiz"),
  );
  $("#back-to-lesson")?.addEventListener("click", () =>
    navigate(state.current),
  );
  $("#view-diploma")?.addEventListener("click", () =>
    navigate(state.current, "diploma"),
  );
  $("#unfinished")?.addEventListener("click", () =>
    navigate(nextUnfinished, "quiz"),
  );
  $("#quiz")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const answers = new FormData(event.currentTarget);
    const missing = [];
    const incorrect = [];
    module.questions.forEach((question, index) => {
      const selected = answers.get(`answer-${index}`);
      if (selected === null) missing.push(index + 1);
      else if (Number(selected) !== question.answer) incorrect.push(index + 1);
    });
    if (missing.length || incorrect.length) {
      const feedback = [];
      if (missing.length)
        feedback.push(
          `Unanswered: ${missing.map((number) => `question ${number}`).join(", ")}.`,
        );
      if (incorrect.length)
        feedback.push(
          `Try again: ${incorrect.map((number) => `question ${number}`).join(", ")}.`,
        );
      $("#quiz-result").textContent = feedback.join(" ");
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
      const allComplete = state.completed.length === modules.length;
      if (allComplete) $("#view-diploma").hidden = false;
      $("#quiz-result").textContent = allComplete
        ? "That’s right! Module completed. Your diploma is ready. Your resume link has been updated."
        : "That’s right! Module completed. Your resume link has been updated.";
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
window.addEventListener("popstate", () => readLocation(true, true));
window.addEventListener("hashchange", () => readLocation(true));
readLocation();
