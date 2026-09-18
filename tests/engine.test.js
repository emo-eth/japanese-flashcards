import { describe, expect, test } from "bun:test";
import { cardsFor, GROUPS, nextUnselectedGroup } from "../js/kana.js";
import {
  acceptedAnswers,
  confirmMiss,
  createSession,
  currentCard,
  gradeInput,
  markKnown,
  normalizeRomaji,
  remainingCount,
  reveal,
  startNextPass,
  startNextRound,
  submitTyped,
} from "../js/engine.js";

describe("romaji grading", () => {
  test("normalizes case and junk", () => {
    expect(normalizeRomaji(" Shi ")).toBe("shi");
    expect(normalizeRomaji("t'su")).toBe("tsu");
  });
  test("accepts common aliases", () => {
    expect(gradeInput("si", "shi")).toBe(true);
    expect(gradeInput("tu", "tsu")).toBe(true);
    expect(gradeInput("hu", "fu")).toBe(true);
    expect(gradeInput("o", "wo")).toBe(true);
    expect(gradeInput("wo", "wo")).toBe(true);
    expect(gradeInput("sya", "sha")).toBe(true);
    expect(gradeInput("jya", "ja")).toBe(true);
    expect(gradeInput("zu", "du")).toBe(true);
    expect(gradeInput("ji", "di")).toBe(true);
  });
  test("rejects mismatches", () => {
    expect(gradeInput("ka", "ki")).toBe(false);
    expect(gradeInput("", "a")).toBe(false);
    expect(acceptedAnswers("shi").has("shi")).toBe(true);
  });
});

describe("kana deck", () => {
  test("hiragana gojuon has 46 glyphs", () => {
    const ids = GROUPS.hiragana.filter((g) => g.section === "gojuon").map((g) => g.id);
    expect(cardsFor("hiragana", ids)).toHaveLength(46);
  });
  test("katakana gojuon has 46 glyphs", () => {
    const ids = GROUPS.katakana.filter((g) => g.section === "gojuon").map((g) => g.id);
    expect(cardsFor("katakana", ids)).toHaveLength(46);
  });
  test("next unselected group is first missing column", () => {
    expect(nextUnselectedGroup("hiragana", ["h-a"])?.id).toBe("h-ka");
    expect(nextUnselectedGroup("hiragana", GROUPS.hiragana.map((g) => g.id))).toBeNull();
  });
});

describe("college study loop", () => {
  const cards = [
    { id: "1", kana: "あ", romaji: "a" },
    { id: "2", kana: "い", romaji: "i" },
  ];

  test("typed hits leave the pile", () => {
    let session = createSession(cards, { rng: () => 0 });
    const first = currentCard(session);
    session = submitTyped(session, first.romaji);
    expect(session.correctCount).toBe(1);
    expect(remainingCount(session)).toBe(1);
  });

  test("a clean full pass completes without retries", () => {
    let session = createSession([cards[0]], { rng: () => 0 });
    session = submitTyped(session, "a");
    expect(session.status).toBe("complete");
    expect(session.pass).toBe(1);
  });

  test("misses retry until clear, then the whole deck runs again", () => {
    let session = createSession(cards, { rng: () => 0 });
    const first = currentCard(session);
    session = submitTyped(session, "nope");
    expect(session.revealed).toBe(true);
    session = confirmMiss(session);
    session = markKnown(session);
    expect(session.status).toBe("retry-ready");
    expect(session.missed.map((c) => c.id)).toEqual([first.id]);
    expect(session.passMisses).toBe(1);

    session = startNextRound(session);
    expect(session.phase).toBe("retry");
    expect(session.retryRound).toBe(1);
    expect(session.queue).toHaveLength(1);
    expect(currentCard(session).id).toBe(first.id);
    session = markKnown(session);
    expect(session.status).toBe("pass-ready");

    session = startNextPass(session);
    expect(session.status).toBe("active");
    expect(session.phase).toBe("full");
    expect(session.pass).toBe(2);
    expect(session.queue).toHaveLength(2);
    expect(session.passMisses).toBe(0);

    session = markKnown(session);
    session = markKnown(session);
    expect(session.status).toBe("complete");
  });

  test("a miss during retry keeps that card in the next retry round", () => {
    let session = createSession([cards[0]], { rng: () => 0 });
    session = submitTyped(session, "nope");
    session = confirmMiss(session);
    expect(session.status).toBe("retry-ready");
    session = startNextRound(session);
    session = submitTyped(session, "nope");
    session = confirmMiss(session);
    expect(session.status).toBe("retry-ready");
    expect(session.missed).toHaveLength(1);
    session = startNextRound(session);
    expect(session.retryRound).toBe(2);
    session = markKnown(session);
    expect(session.status).toBe("pass-ready");
  });


  test("flipping a card counts as a miss", () => {
    let session = createSession(cards, { rng: () => 0 });
    const first = currentCard(session);
    session = reveal(session);
    expect(session.revealed).toBe(true);
    expect(session.lastGrade).toBe("incorrect");
    session = confirmMiss(session);
    expect(session.missed.map((c) => c.id)).toEqual([first.id]);
    expect(session.passMisses).toBe(1);
  });
});
