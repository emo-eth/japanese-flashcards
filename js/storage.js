const KEY = "kana-flashcards-v1";

const empty = {
  groups: { hiragana: null, katakana: null },
  stats: {},
  cleared: { hiragana: {}, katakana: {} },
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(empty);
    const parsed = JSON.parse(raw);
    return {
      groups: {
        hiragana: Array.isArray(parsed?.groups?.hiragana) ? parsed.groups.hiragana : null,
        katakana: Array.isArray(parsed?.groups?.katakana) ? parsed.groups.katakana : null,
      },
      stats: parsed?.stats && typeof parsed.stats === "object" ? parsed.stats : {},
      cleared: {
        hiragana:
          parsed?.cleared?.hiragana && typeof parsed.cleared.hiragana === "object"
            ? parsed.cleared.hiragana
            : {},
        katakana:
          parsed?.cleared?.katakana && typeof parsed.cleared.katakana === "object"
            ? parsed.cleared.katakana
            : {},
      },
    };
  } catch {
    return structuredClone(empty);
  }
}

function writeState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function loadGroups(script, fallback) {
  const stored = read().groups[script];
  return stored?.length ? stored : fallback;
}

export function saveGroups(script, ids) {
  const state = read();
  state.groups[script] = [...ids];
  writeState(state);
}

export function recordResult(cardId, correct) {
  const state = read();
  const prev = state.stats[cardId] ?? { seen: 0, correct: 0, incorrect: 0, streak: 0 };
  const next = {
    seen: prev.seen + 1,
    correct: prev.correct + (correct ? 1 : 0),
    incorrect: prev.incorrect + (correct ? 0 : 1),
    streak: correct ? prev.streak + 1 : 0,
  };
  state.stats[cardId] = next;
  writeState(state);
  return next;
}

export function getStat(cardId) {
  return read().stats[cardId] ?? { seen: 0, correct: 0, incorrect: 0, streak: 0 };
}

export function recordCleanPass(script, groupIds) {
  const state = read();
  const now = new Date().toISOString();
  const bucket = state.cleared[script] ?? {};
  for (const id of groupIds) {
    const prev = bucket[id] ?? { count: 0, lastAt: null };
    bucket[id] = { count: prev.count + 1, lastAt: now };
  }
  state.cleared[script] = bucket;
  writeState(state);
}

export function clearedGroups(script) {
  return read().cleared[script] ?? {};
}
