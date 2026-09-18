import { GROUPS, SECTIONS, cardsFor, defaultGroupIds, glyphsIn, nextUnselectedGroup } from "./kana.js";
import {
  confirmMiss,
  createSession,
  currentCard,
  markKnown,
  reveal,
  startNextPass,
  startNextRound,
  submitTyped,
} from "./engine.js";
import { clearedGroups, loadGroups, recordCleanPass, recordResult, saveGroups } from "./storage.js";

const app = document.getElementById("app");
const INSTALL = { deferred: null };

function basePath() {
  const path = location.pathname;
  if (path === "/kana" || path.startsWith("/kana/")) return "/kana";
  return "";
}

function routeScript() {
  const raw = location.pathname.replace(/^\/kana\/?/, "/") || "/";
  const part = raw.replace(/\/+$/, "") || "/";
  if (part === "/hiragana") return "hiragana";
  if (part === "/katakana") return "katakana";
  return "home";
}

function hrefFor(script) {
  const base = basePath();
  if (script === "home") return `${base}/` || "/";
  return `${base}/${script}`;
}

const state = {
  script: "home",
  selected: { hiragana: new Set(), katakana: new Set() },
  session: null,
  input: "",
  chartOpen: true,
};

function selectedFor(script) {
  return state.selected[script];
}

function persistSelection(script) {
  saveGroups(script, [...selectedFor(script)]);
}

function addGroup(script, id) {
  selectedFor(script).add(id);
  persistSelection(script);
  startSession(script);
  render();
}

function startSession(script) {
  const cards = cardsFor(script, selectedFor(script));
  state.session = { ...createSession(cards), script };
  state.input = "";
  state.chartOpen = true;
}

function applySession(next, result) {
  const finished = state.session && next.seenCount > state.session.seenCount;
  if (finished && result) {
    const card = currentCard(state.session);
    if (card) recordResult(card.id, result === "correct");
  }
  if (next.status === "complete" && state.session?.status !== "complete") {
    recordCleanPass(state.script, [...selectedFor(state.script)]);
  }
  state.session = next;
  state.input = "";
  render();
}

function navigate(script, replace = false) {
  const url = hrefFor(script);
  if (replace) history.replaceState({}, "", url);
  else history.pushState({}, "", url);
  state.script = script;
  if (script === "home") {
    state.session = null;
  } else if (!state.session || state.session.script !== script) {
    startSession(script);
  }
  render();
}

function toggleGroup(script, id) {
  const set = selectedFor(script);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  persistSelection(script);
  startSession(script);
  render();
}

function setSection(script, sectionId, on) {
  const set = selectedFor(script);
  for (const group of GROUPS[script]) {
    if (group.section !== sectionId) continue;
    if (on) set.add(group.id);
    else set.delete(group.id);
  }
  persistSelection(script);
  startSession(script);
  render();
}

function speak(kana) {
  try {
    const utter = new SpeechSynthesisUtterance(kana);
    utter.lang = "ja-JP";
    utter.rate = 0.85;
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  } catch {
    /* ignore */
  }
}

function onKeydown(event) {
  if (state.script === "home") return;
  const session = state.session;
  if (!session) return;
  const inInput = event.target && event.target.id === "answer";

  if (session.status === "retry-ready" && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    state.session = startNextRound(session);
    render();
    focusAnswer();
    return;
  }
  if (session.status === "pass-ready" && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    state.session = startNextPass(session);
    render();
    focusAnswer();
    return;
  }
  if (session.status === "complete" && event.key === "Enter") {
    event.preventDefault();
    startSession(state.script);
    render();
    focusAnswer();
    return;
  }
  if (session.status !== "active") return;

  if (event.key === " " && (!inInput || !state.input)) {
    event.preventDefault();
    if (!session.revealed) applySession(reveal(session, state.input));
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    if (session.revealed) {
      applySession(confirmMiss(session), "incorrect");
      focusAnswer();
    } else {
      const next = submitTyped(session, state.input);
      const result = next.lastGrade === "correct" ? "correct" : next.revealed ? "incorrect" : null;
      applySession(next, result);
      if (next.status === "active" && !next.revealed) focusAnswer();
    }
    return;
  }
  if (session.revealed && (event.key === "1" || event.key === "k" || event.key === "K")) {
    event.preventDefault();
    applySession(markKnown(session), "correct");
    focusAnswer();
  }
  if (session.revealed && (event.key === "2" || event.key === "m" || event.key === "M")) {
    event.preventDefault();
    applySession(confirmMiss(session), "incorrect");
    focusAnswer();
  }
}

function focusAnswer() {
  requestAnimationFrame(() => {
    const el = document.getElementById("answer");
    if (el) el.focus();
  });
}

function pileLabel(session) {
  if (session.phase === "retry") return `Retry ${session.retryRound}`;
  return "Deck";
}

function statsBar(session) {
  return `
    <div class="stats">
      <div><span class="label">Remaining</span><strong>${session.queue.length}</strong></div>
      <div><span class="label">Missed</span><strong>${session.passMisses}</strong></div>
      <div><span class="label">Pass</span><strong>${session.pass}</strong></div>
      <div><span class="label">Pile</span><strong>${pileLabel(session)}</strong></div>
    </div>
  `;
}

function chartHtml(script) {
  const selected = selectedFor(script);
  const cleared = clearedGroups(script);
  return SECTIONS.map((section) => {
    const groups = GROUPS[script].filter((g) => g.section === section.id);
    const allOn = groups.every((g) => selected.has(g.id));
    return `
      <section class="chart-section">
        <div class="section-head">
          <h2>${section.label}</h2>
          <button class="text-btn" data-section="${section.id}" data-on="${allOn ? "0" : "1"}">
            ${allOn ? "Clear" : "All"}
          </button>
        </div>
        <div class="chart">
          ${groups
            .map((group) => {
              const on = selected.has(group.id);
              const done = Boolean(cleared[group.id]);
              return `
                <button class="col ${on ? "on" : ""} ${done ? "cleared" : ""}" data-group="${group.id}" aria-pressed="${on}">
                  ${group.slots
                    .map((slot) =>
                      slot
                        ? `<span class="cell"><b>${slot.kana}</b><i>${slot.romaji}</i></span>`
                        : `<span class="cell gap">·</span>`
                    )
                    .join("")}
                </button>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }).join("");
}

function nextColumnButton(script) {
  const next = nextUnselectedGroup(script, selectedFor(script));
  if (!next) return "";
  const sample = glyphsIn(next)[0];
  const label = sample ? `${sample.kana} ${sample.romaji}` : next.title;
  return `<button class="primary" id="add-next" type="button" data-next="${next.id}">Add ${label}</button>`;
}

function studyHtml(script) {
  const session = state.session;
  const selectedCount = cardsFor(script, selectedFor(script)).length;
  if (!session || session.status === "empty") {
    return `
      ${nav(script)}
      <p class="lede">Pick a few columns. Full deck, then only the misses, then the full deck again until a pass is clean. Add a column when that subset is down.</p>
      ${chartHtml(script)}
      <p class="hint">${selectedCount} in deck</p>
    `;
  }
  if (session.status === "retry-ready") {
    return `
      ${nav(script)}
      ${statsBar(session)}
      <section class="interstitial">
        <p class="kicker">Pass ${session.pass}</p>
        <h1>${session.missed.length} to retry</h1>
        <p>Only the ones you missed, shuffled. Repeat this pile until it is empty, then the whole deck comes back.</p>
        <button class="primary" id="retry">Retry missed</button>
      </section>
      ${state.chartOpen ? chartHtml(script) : ""}
    `;
  }
  if (session.status === "pass-ready") {
    return `
      ${nav(script)}
      ${statsBar(session)}
      <section class="interstitial">
        <p class="kicker">Misses cleared</p>
        <h1>Full deck again</h1>
        <p>This sitting is done when you get through the whole deck with zero misses.</p>
        <button class="primary" id="next-pass">Whole deck</button>
      </section>
      ${state.chartOpen ? chartHtml(script) : ""}
    `;
  }
  if (session.status === "complete") {
    const next = nextUnselectedGroup(script, selectedFor(script));
    return `
      ${nav(script)}
      ${statsBar(session)}
      <section class="interstitial">
        <p class="kicker">できた</p>
        <h1>Clean pass</h1>
        <p>Pass ${session.pass} through ${session.deck.length} cards, no misses.${next ? " Add the next column when this subset feels easy." : " That is every column."}</p>
        <div class="actions">
          ${nextColumnButton(script)}
          <button class="${next ? "secondary" : "primary"}" id="again" type="button">Same deck again</button>
        </div>
      </section>
      ${chartHtml(script)}
    `;
  }
  const card = currentCard(session);
  const revealed = session.revealed;
  return `
    ${nav(script)}
    ${statsBar(session)}
    <section class="study">
      <button class="card ${revealed ? "revealed" : ""} ${revealed && session.lastGrade === "incorrect" ? "miss" : ""}" id="flip" type="button" aria-label="${revealed ? "Answer showing" : "Show answer"}">
        <span class="face front"><span class="kana">${card.kana}</span></span>
        <span class="face back">
          <span class="kana small">${card.kana}</span>
          <span class="roma">${card.romaji}</span>
          ${session.typedGuess ? `<span class="guess">you typed ${escapeHtml(session.typedGuess)}</span>` : ""}
        </span>
      </button>
      <form id="answer-form" class="answer-row" autocomplete="off">
        <input id="answer" name="answer" inputmode="latin" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="type romaji" value="${escapeHtml(state.input)}" ${revealed ? "disabled" : ""} />
        ${
          revealed
            ? session.lastGrade === "incorrect"
              ? `<button class="bad" id="missed" type="button">Continue</button>`
              : `<div class="grade-btns">
                <button type="button" class="good" id="knew">Knew · 1</button>
                <button type="button" class="bad" id="missed">Missed · 2</button>
              </div>`
            : `<button class="primary" type="submit">Check</button>`
        }
      </form>
      <p class="hint">${revealed ? (session.lastGrade === "incorrect" ? "Enter continues — this card returns in the retry pile." : "1 knew · 2 missed · Enter continues as missed.") : "Enter checks · Space or tap flips without typing."}</p>
      <div class="toolbar">
        <button class="text-btn" id="speak" type="button">Play sound</button>
        <button class="text-btn" id="toggle-chart" type="button">${state.chartOpen ? "Hide chart" : "Edit deck"}</button>
        <span class="muted">${selectedCount} selected</span>
      </div>
    </section>
    ${state.chartOpen ? chartHtml(script) : ""}
  `;
}

function nav(active) {
  return `
    <header class="top">
      <a class="brand" href="${hrefFor("home")}">かな</a>
      <nav>
        <a class="${active === "hiragana" ? "active" : ""}" href="${hrefFor("hiragana")}">Hiragana</a>
        <a class="${active === "katakana" ? "active" : ""}" href="${hrefFor("katakana")}">Katakana</a>
      </nav>
      <button class="text-btn install" id="install" hidden>Install</button>
    </header>
  `;
}

function homeHtml() {
  return `
    ${nav("home")}
    <section class="home">
      <p class="kicker">Kana drill</p>
      <h1>Full deck, retry the misses, then the full deck until it is clean.</h1>
      <div class="tiles">
        <a class="tile" href="${hrefFor("hiragana")}">
          <span class="glyph">あ</span>
          <span>
            <strong>Hiragana</strong>
            <em>Native Japanese words</em>
          </span>
        </a>
        <a class="tile" href="${hrefFor("katakana")}">
          <span class="glyph">ア</span>
          <span>
            <strong>Katakana</strong>
            <em>Loanwords & names</em>
          </span>
        </a>
      </div>
      <p class="hint">Start with a couple of columns. After a clean pass, add the next one. Works offline after the first load.</p>
    </section>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function bindStudy(script) {
  app.querySelectorAll("[data-group]").forEach((btn) => {
    btn.addEventListener("click", () => toggleGroup(script, btn.dataset.group));
  });
  app.querySelectorAll("[data-section]").forEach((btn) => {
    btn.addEventListener("click", () => setSection(script, btn.dataset.section, btn.dataset.on === "1"));
  });
  const form = document.getElementById("answer-form");
  const input = document.getElementById("answer");
  if (input) {
    input.addEventListener("input", () => {
      state.input = input.value.replace(/ /g, "");
      if (input.value !== state.input) input.value = state.input;
    });
  }
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = submitTyped(state.session, state.input);
    const result = next.lastGrade === "correct" ? "correct" : next.revealed ? "incorrect" : null;
    applySession(next, result);
    if (next.status === "active" && !next.revealed) focusAnswer();
  });
  document.getElementById("flip")?.addEventListener("click", () => {
    if (!state.session.revealed) applySession(reveal(state.session, state.input));
  });
  document.getElementById("knew")?.addEventListener("click", () => {
    applySession(markKnown(state.session), "correct");
    focusAnswer();
  });
  document.getElementById("missed")?.addEventListener("click", () => {
    applySession(confirmMiss(state.session), "incorrect");
    focusAnswer();
  });
  document.getElementById("retry")?.addEventListener("click", () => {
    state.session = startNextRound(state.session);
    render();
    focusAnswer();
  });
  document.getElementById("next-pass")?.addEventListener("click", () => {
    state.session = startNextPass(state.session);
    render();
    focusAnswer();
  });
  document.getElementById("again")?.addEventListener("click", () => {
    startSession(script);
    render();
    focusAnswer();
  });
  document.getElementById("add-next")?.addEventListener("click", (event) => {
    const id = event.currentTarget.dataset.next;
    if (id) addGroup(script, id);
  });
  document.getElementById("toggle-chart")?.addEventListener("click", () => {
    state.chartOpen = __omp_shell("state.chartOpen;")
    render();
  });
  document.getElementById("speak")?.addEventListener("click", () => {
    const card = currentCard(state.session);
    if (card) speak(card.kana);
  });
}

function bindChrome() {
  app.querySelectorAll("a[href]").forEach((link) => {
    const url = new URL(link.href, location.origin);
    if (url.origin !== location.origin) return;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const path = url.pathname.replace(/^\/kana\/?/, "/") || "/";
      const script = path.replace(/\/+$/, "") === "/katakana" ? "katakana" : path.replace(/\/+$/, "") === "/hiragana" ? "hiragana" : "home";
      navigate(script);
    });
  });
  const install = document.getElementById("install");
  if (install && INSTALL.deferred) {
    install.hidden = false;
    install.addEventListener("click", async () => {
      INSTALL.deferred.prompt();
      await INSTALL.deferred.userChoice;
      INSTALL.deferred = null;
      install.hidden = true;
    });
  }
}

function render() {
  const script = routeScript();
  state.script = script;
  if (script === "home") app.innerHTML = homeHtml();
  else app.innerHTML = studyHtml(script);
  bindChrome();
  if (script !== "home") bindStudy(script);
  if (script !== "home" && state.session?.status === "active" && !state.session.revealed) focusAnswer();
}

function boot() {
  for (const script of ["hiragana", "katakana"]) {
    state.selected[script] = new Set(loadGroups(script, defaultGroupIds(script)));
  }
  state.script = routeScript();
  if (state.script !== "home") startSession(state.script);
  window.addEventListener("popstate", () => {
    const script = routeScript();
    state.script = script;
    if (script === "home") state.session = null;
    else startSession(script);
    render();
  });
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    INSTALL.deferred = event;
    render();
  });
  render();
}

boot();
