const ALIASES = {
  shi: ["si"],
  chi: ["ti"],
  tsu: ["tu"],
  fu: ["hu"],
  ji: ["zi"],
  zu: ["dzu"],
  di: ["ji", "dji", "dzi", "zi"],
  du: ["zu", "dzu"],
  wo: ["o"],
  n: ["nn"],
  sha: ["sya"],
  shu: ["syu"],
  sho: ["syo"],
  cha: ["tya"],
  chu: ["tyu"],
  cho: ["tyo"],
  ja: ["zya", "jya", "dya"],
  ju: ["zyu", "jyu", "dyu"],
  jo: ["zyo", "jyo", "dyo"],
};

export function normalizeRomaji(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[āáàâ]/g, "a")
    .replace(/[īíìî]/g, "i")
    .replace(/[ūúùû]/g, "u")
    .replace(/[ēéèê]/g, "e")
    .replace(/[ōóòô]/g, "o")
    .replace(/['’.\-\s]/g, "");
}

export function acceptedAnswers(romaji) {
  const primary = normalizeRomaji(romaji);
  const extra = ALIASES[primary] ?? [];
  return new Set([primary, ...extra.map(normalizeRomaji)]);
}

export function gradeInput(input, romaji) {
  const typed = normalizeRomaji(input);
  if (!typed) return false;
  return acceptedAnswers(romaji).has(typed);
}

export function shuffle(items, rng = Math.random) {
  const next = items.slice();
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function blankSession(rng) {
  return {
    deck: [],
    phase: "full",
    pass: 1,
    retryRound: 0,
    queue: [],
    missed: [],
    known: [],
    passMisses: 0,
    correctCount: 0,
    incorrectCount: 0,
    seenCount: 0,
    status: "empty",
    revealed: false,
    lastGrade: null,
    typedGuess: "",
    rng,
  };
}

/**
 * College flashcard loop:
 * full deck → retry misses until that pile is empty → full deck again
 * until one full-deck pass has zero misses.
 */
export function createSession(cards, opts = {}) {
  const rng = opts.rng ?? Math.random;
  if (!cards.length) return blankSession(rng);
  const deck = cards.slice();
  return {
    ...blankSession(rng),
    deck,
    queue: shuffle(deck, rng),
    status: "active",
  };
}

export function currentCard(session) {
  if (session.status !== "active") return null;
  return session.queue[0] ?? null;
}

export function remainingCount(session) {
  return session.queue.length;
}

export function accuracyPct(session) {
  if (!session.seenCount) return 0;
  return Math.round((session.correctCount / session.seenCount) * 100);
}

export function reveal(session, guess = "") {
  if (session.status !== "active" || session.revealed) return session;
  return {
    ...session,
    revealed: true,
    typedGuess: guess,
    lastGrade: null,
  };
}

function finishPile(session) {
  if (session.missed.length) return { ...session, status: "retry-ready" };
  if (session.phase === "full" && session.passMisses === 0) {
    return { ...session, status: "complete" };
  }
  return { ...session, status: "pass-ready" };
}

function finishCard(session, card, correct) {
  const queue = session.queue.slice(1);
  const known = correct ? [...session.known, card] : session.known;
  const missed = correct ? session.missed : [...session.missed, card];
  const passMisses =
    correct || session.phase !== "full" ? session.passMisses : session.passMisses + 1;
  const next = {
    ...session,
    queue,
    known,
    missed,
    passMisses,
    revealed: false,
    lastGrade: correct ? "correct" : "incorrect",
    typedGuess: "",
    correctCount: session.correctCount + (correct ? 1 : 0),
    incorrectCount: session.incorrectCount + (correct ? 0 : 1),
    seenCount: session.seenCount + 1,
  };
  if (queue.length) return { ...next, status: "active" };
  return finishPile(next);
}

export function markKnown(session) {
  const card = currentCard(session);
  if (!card) return session;
  return finishCard(session, card, true);
}

export function markMissed(session) {
  const card = currentCard(session);
  if (!card) return session;
  return finishCard(session, card, false);
}

export function submitTyped(session, input) {
  const card = currentCard(session);
  if (!card) return session;
  const typed = normalizeRomaji(input);
  if (!typed) return reveal(session, input);
  const ok = gradeInput(typed, card.romaji);
  if (ok) return finishCard(session, card, true);
  return {
    ...session,
    revealed: true,
    lastGrade: "incorrect",
    typedGuess: input,
  };
}

export function confirmMiss(session) {
  if (!session.revealed) return session;
  const card = currentCard(session);
  if (!card) return session;
  return finishCard(session, card, false);
}

export function startNextRound(session) {
  if (session.status !== "retry-ready") return session;
  return {
    ...session,
    phase: "retry",
    retryRound: session.retryRound + 1,
    queue: shuffle(session.missed, session.rng ?? Math.random),
    missed: [],
    known: [],
    status: "active",
    revealed: false,
    lastGrade: null,
    typedGuess: "",
  };
}

export function startNextPass(session) {
  if (session.status !== "pass-ready") return session;
  return {
    ...session,
    phase: "full",
    pass: session.pass + 1,
    retryRound: 0,
    queue: shuffle(session.deck, session.rng ?? Math.random),
    missed: [],
    known: [],
    passMisses: 0,
    status: "active",
    revealed: false,
    lastGrade: null,
    typedGuess: "",
  };
}
