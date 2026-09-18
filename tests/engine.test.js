import { describe, expect, test } from "bun:test";
import { cardsFor, GROUPS } from "../js/kana.js";
import {
  acceptedAnswers,
  confirmMiss,
  createSession,
  currentCard,
  gradeInput,
  markKnown,
  normalizeRomaji,
  remainingCount,
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
});

describe("retry missed rounds", () => {
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

  test("misses become the next round until they are known", () => {
    let session = createSession(cards, { rng: () => 0 });
    const first = currentCard(session);
    session = submitTyped(session, "nope");
    expect(session.revealed).toBe(true);
    session = confirmMiss(session);
    session = markKnown(session);
    expect(session.status).toBe("round-complete");
    expect(session.missed.map((c) => c.id)).toEqual([first.id]);
    session = startNextRound(session);
    expect(session.round).toBe(2);
    expect(session.queue).toHaveLength(1);
    expect(currentCard(session).id).toBe(first.id);
    session = markKnown(session);
    expect(session.status).toBe("complete");
  });

  test("clearing the whole pile completes", () => {
    let session = createSession([cards[0]], { rng: () => 0 });
    session = submitTyped(session, "a");
    expect(session.status).toBe("complete");
  });
});
