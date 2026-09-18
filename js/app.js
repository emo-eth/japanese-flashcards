import { GROUPS, SECTIONS, cardsFor, defaultGroupIds, glyphsIn, nextUnselectedGroup } from "./kana.js";
import {
  confirmMiss,
  createSession,
  currentCard,
  liveGrade,
  markKnown,
  reveal,
  startNextPass,
  startNextRound,
} from "./engine.js";
import { clearedGroups, loadGroups, recordCleanPass, recordResult, saveGroups } from "./storage.js";

const app = document.getElementById("app");
const INSTALL = { deferred: null };
const FLASH_MS = 420;

function basePath() {
  const path = location.pathname;
  if (path === "/kana" || path.startsWith("/kana/")) return "/kana";
  return "";
}

function parseRoute() {
  const raw = location.pathname.replace(/^\/kana\/?/, "/") || "/";
  const parts = raw.replace(/\/+$/, "").split("/").filter(Boolean);
  const script = parts[0] === "hiragana" || parts[0] === "katakana" ? parts[0] : "home";
  if (script === "home") return { script: "home", view: "home" };
  const view = parts[1] === "study" ? "study" : "setup";
  return { script, view };
}

function hrefFor(script, view = "setup") {
  const base = basePath();
  if (script === "home") return `${base}/` || "/";
  if (view === "study") return `${base}/${script}/study`;
  return `${base}/${script}`;
}

const state = {
  script: "home",
  view: "home",
  selected: { hiragana: new Set(), katakana: new Set() },
  session: null,
  input: "",
  advancing: false,
  composing: false,
  flash: null,
  flashTimer: 0,
};

function selectedFor(script) {
  return state.selected[script];
}

function persistSelection(script) {
  saveGroups(script, [...selectedFor(script)]);
}

function deckCards(script) {
  return cardsFor(script, selectedFor(script));
}

function clearFlash() {
  if (state.flashTimer) {
    clearTimeout(state.flashTimer);
    state.flashTimer = 0;
  }
  state.flash = null;
  state.advancing = false;
}

function startSession(script) {
  clearFlash();
  const cards = deckCards(script);
  state.session = { ...createSession(cards), script };
  state.input = "";
}

function applySession(next, result) {
  const finished = state.session && next.seenCount > state.session.seenCount;
  if (finished && result) {
    const card = currentCard(state.session);
    if (card) recordResult(card.id, result === "correct");
  }
  if (
    next.status === "complete" &&
    state.session?.status !== "complete" &&
    state.view === "study"
  ) {
    recordCleanPass(state.script, [...selectedFor(state.script)]);
  }
  state.session = next;
  state.input = "";
  render();
}

function go(script, view, replace = false) {
  const url = hrefFor(script, view);
  if (replace) history.replaceState({}, "", url);
  else history.pushState({}, "", url);
  state.script = script;
  state.view = view;
  if (script === "home") {
    clearFlash();
    state.session = null;
  } else if (view === "setup") {
    clearFlash();
    state.session = null;
  } else if (view === "study") {
    if (!state.session || state.session.script !== script || state.session.status === "empty") {
      startSession(script);
    }
    if (!state.session || state.session.status === "empty") {
      go(script, "setup", true);
      return;
    }
  }
  render();
}

function beginStudy(script) {
  startSession(script);
  if (state.session.status === "empty") return;
  go(script, "study");
}

function addGroup(script, id) {
  selectedFor(script).add(id);
  persistSelection(script);
  startSession(script);
  go(script, "study");
}

function toggleGroup(script, id) {
  const set = selectedFor(script);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  persistSelection(script);
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

function continueMiss() {
  const session = state.session;
  if (!session?.revealed) return;
  applySession(confirmMiss(session), "incorrect");
  focusAnswer();
}

function missCurrent(guess = "") {
  const session = state.session;
  if (!session || session.status !== "active" || session.revealed || state.advancing) return;
  const card = currentCard(session);
  applySession(reveal(session, guess));
  if (card) speak(card.kana);
}

function hitCurrent() {
  const session = state.session;
  if (!session || session.status !== "active" || session.revealed || state.advancing) return;
  state.advancing = true;
  state.flash = "correct";
  render();
  state.flashTimer = window.setTimeout(() => {
    state.flashTimer = 0;
    state.flash = null;
    state.advancing = false;
    applySession(markKnown(state.session), "correct");
    focusAnswer();
  }, FLASH_MS);
}

function onTyped(raw) {
  if (state.advancing || state.composing) return;
  const session = state.session;
  if (!session || session.status !== "active" || session.revealed) return;
  const card = currentCard(session);
  if (!card) return;
  const value = String(raw).replace(/ /g, "");
  state.input = value;
  const verdict = liveGrade(value, card.romaji);
  if (verdict === "wait") {
    const input = document.getElementById("answer");
    if (input && input.value !== value) input.value = value;
    return;
  }
  if (verdict === "correct") {
    hitCurrent();
    return;
  }
  missCurrent(value);
}

function onKeydown(event) {
  if (state.script === "home") return;
  if (state.view === "setup") {
    if (event.key === "Enter" && deckCards(state.script).length) {
      event.preventDefault();
      beginStudy(state.script);
    }
    return;
  }
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
  if (state.advancing) {
    event.preventDefault();
    return;
  }

  if (event.key === " " && (!inInput || !state.input || session.revealed)) {
    event.preventDefault();
    if (session.revealed) continueMiss();
    else missCurrent(state.input);
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    if (session.revealed) continueMiss();
  }
}

function focusAnswer() {
  requestAnimationFrame(() => {
    const el = document.getElementById("answer");
    if (el && !el.disabled) el.focus();
  });
}

function pileLabel(session) {
  if (session.phase === "retry") return `Retry ${session.retryRound}`;
  return "Deck";
}

function statsBar(session) {
  return `
    <div class="stats slim">
      <div><span class="label">Left</span><strong>${session.queue.length}</strong></div>
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

function nav(script, view) {
  return `
    <header class="top">
      <a class="brand" href="${hrefFor("home")}">かな</a>
      <nav>
        <a class="${script === "hiragana" ? "active" : ""}" href="${hrefFor("hiragana")}">Hiragana</a>
        <a class="${script === "katakana" ? "active" : ""}" href="${hrefFor("katakana")}">Katakana</a>
      </nav>
      ${
        view === "study"
          ? `<a class="text-btn" href="${hrefFor(script)}">Deck</a>`
          : `<button class="text-btn install" id="install" hidden>Install</button>`
      }
    </header>
  `;
}

function setupHtml(script) {
  const count = deckCards(script).length;
  const title = script === "hiragana" ? "Hiragana" : "Katakana";
  return `
    ${nav(script, "setup")}
    <section class="setup">
      <p class="kicker">${title}</p>
      <h1>Pick columns, then start. The chart stays here so it cannot leak during a drill.</h1>
      <p class="lede">Full deck, retry the misses, then the full deck until a pass is clean. Type to answer; a miss waits so you can look.</p>
      ${chartHtml(script)}
      <div class="start-bar">
        <span>${count} in deck</span>
        <button class="primary" id="start" ${count ? "" : "disabled"}>Start · Enter</button>
      </div>
    </section>
  `;
}

function studyHtml(script) {
  const session = state.session;
  if (!session || session.status === "empty") return setupHtml(script);

  if (session.status === "retry-ready") {
    return `
      ${nav(script, "study")}
      ${statsBar(session)}
      <section class="interstitial">
        <p class="kicker">Pass ${session.pass}</p>
        <h1>${session.missed.length} to retry</h1>
        <p>Only the misses, shuffled. Repeat until this pile is empty, then the whole deck comes back.</p>
        <button class="primary" id="retry">Retry missed · Space</button>
      </section>
    `;
  }
  if (session.status === "pass-ready") {
    return `
      ${nav(script, "study")}
      ${statsBar(session)}
      <section class="interstitial">
        <p class="kicker">Misses cleared</p>
        <h1>Full deck again</h1>
        <p>Done when a whole-deck pass has zero misses.</p>
        <button class="primary" id="next-pass">Whole deck · Space</button>
      </section>
    `;
  }
  if (session.status === "complete") {
    const next = nextUnselectedGroup(script, selectedFor(script));
    return `
      ${nav(script, "study")}
      ${statsBar(session)}
      <section class="interstitial">
        <p class="kicker">できた</p>
        <h1>Clean pass</h1>
        <p>Pass ${session.pass} through ${session.deck.length} cards, no misses.${next ? " Add the next column when this subset feels easy." : ""}</p>
        <div class="actions">
          ${nextColumnButton(script)}
          <button class="${next ? "secondary" : "primary"}" id="again" type="button">Same deck again</button>
          <a class="secondary" href="${hrefFor(script)}">Edit deck</a>
        </div>
      </section>
    `;
  }

  const card = currentCard(session);
  const revealed = session.revealed || state.flash === "correct";
  const hit = state.flash === "correct";
  const miss = revealed && !hit;
  return `
    ${nav(script, "study")}
    ${statsBar(session)}
    <section class="study">
      <button class="card ${revealed ? "revealed" : ""} ${miss ? "miss" : ""} ${hit ? "hit" : ""}" id="flip" type="button" aria-label="${revealed ? "Continue" : "Show answer as a miss"}">
        <span class="face front"><span class="kana">${card.kana}</span></span>
        <span class="face back"${revealed ? "" : ' aria-hidden="true"'}>
          ${
            revealed
              ? `<span class="kana small">${card.kana}</span>
          <span class="roma">${card.romaji}</span>
          ${hit ? `<span class="guess ok">correct</span>` : ""}
          ${session.typedGuess && miss ? `<span class="guess">you typed ${escapeHtml(session.typedGuess)}</span>` : ""}`
              : ""
          }
        </span>
      </button>
      ${
        revealed
          ? hit
            ? `<p class="hint">next…</p>`
            : `<p class="hint">Space or tap to continue — this card returns in the retry pile.</p>`
          : `<input id="answer" name="answer" inputmode="latin" lang="en" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="romaji" value="${escapeHtml(state.input)}" aria-label="Type romaji" />`
      }
    </section>
  `;
}

function homeHtml() {
  return `
    ${nav("home", "home")}
    <section class="home">
      <p class="kicker">Kana drill</p>
      <h1>Build a deck on the chart. Study on a blank page so the answers cannot peek.</h1>
      <div class="tiles">
        <a class="tile" href="${hrefFor("hiragana")}">
          <span class="glyph">あ</span>
          <span>
            <strong>Hiragana</strong>
            <em>Pick columns, then start</em>
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
      <p class="hint">Type the sound. A full match goes to the next card. A miss waits on the answer until Space or tap. Works offline after the first load.</p>
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

function bindSetup(script) {
  app.querySelectorAll("[data-group]").forEach((btn) => {
    btn.addEventListener("click", () => toggleGroup(script, btn.dataset.group));
  });
  app.querySelectorAll("[data-section]").forEach((btn) => {
    btn.addEventListener("click", () => setSection(script, btn.dataset.section, btn.dataset.on === "1"));
  });
  document.getElementById("start")?.addEventListener("click", () => beginStudy(script));
}

function bindStudy(script) {
  const input = document.getElementById("answer");
  if (input) {
    input.addEventListener("compositionstart", () => {
      state.composing = true;
    });
    input.addEventListener("compositionend", (event) => {
      state.composing = false;
      onTyped(event.target.value);
    });
    input.addEventListener("input", () => {
      if (state.composing) return;
      onTyped(input.value);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") event.preventDefault();
    });
  }
  document.getElementById("flip")?.addEventListener("click", () => {
    const session = state.session;
    if (!session || session.status !== "active") return;
    if (state.advancing) return;
    if (session.revealed) continueMiss();
    else missCurrent(state.input);
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
}

function bindChrome() {
  app.querySelectorAll("a[href]").forEach((link) => {
    const url = new URL(link.href, location.origin);
    if (url.origin !== location.origin) return;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const path = url.pathname.replace(/^\/kana\/?/, "/") || "/";
      const parts = path.replace(/\/+$/, "").split("/").filter(Boolean);
      const script = parts[0] === "hiragana" || parts[0] === "katakana" ? parts[0] : "home";
      const view = parts[1] === "study" ? "study" : script === "home" ? "home" : "setup";
      go(script, view);
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
  const route = parseRoute();
  state.script = route.script;
  state.view = route.view;
  if (route.script === "home") app.innerHTML = homeHtml();
  else if (route.view === "setup") app.innerHTML = setupHtml(route.script);
  else app.innerHTML = studyHtml(route.script);
  bindChrome();
  if (route.script !== "home" && route.view === "setup") bindSetup(route.script);
  if (route.script !== "home" && route.view === "study") bindStudy(route.script);
  if (
    route.view === "study" &&
    state.session?.status === "active" &&
    state.session.revealed === false &&
    state.advancing === false
  ) {
    focusAnswer();
  }
}

function boot() {
  for (const script of ["hiragana", "katakana"]) {
    state.selected[script] = new Set(loadGroups(script, defaultGroupIds(script)));
  }
  const route = parseRoute();
  state.script = route.script;
  state.view = route.view;
  if (route.view === "study") {
    startSession(route.script);
    if (state.session.status === "empty") {
      history.replaceState({}, "", hrefFor(route.script, "setup"));
      state.view = "setup";
    }
  }
  window.addEventListener("popstate", () => {
    const next = parseRoute();
    state.script = next.script;
    state.view = next.view;
    if (next.view !== "study") {
      clearFlash();
      state.session = null;
    } else if (!state.session || state.session.script !== next.script) {
      startSession(next.script);
    }
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
