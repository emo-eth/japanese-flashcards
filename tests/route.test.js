import { describe, expect, test } from "bun:test";
import { basePath, hrefFor, parseRoute } from "../js/route.js";

describe("GitHub Pages / prefix routing", () => {
  test("root paths keep an empty base", () => {
    expect(basePath("/")).toBe("");
    expect(basePath("/hiragana")).toBe("");
    expect(basePath("/katakana/study")).toBe("");
  });

  test("first non-script segment is the site base", () => {
    expect(basePath("/kana")).toBe("/kana");
    expect(basePath("/kana/hiragana/study")).toBe("/kana");
    expect(basePath("/japanese-flashcards")).toBe("/japanese-flashcards");
    expect(basePath("/japanese-flashcards/katakana")).toBe("/japanese-flashcards");
  });

  test("parses script and view after the base", () => {
    expect(parseRoute("/")).toEqual({ script: "home", view: "home" });
    expect(parseRoute("/hiragana")).toEqual({ script: "hiragana", view: "setup" });
    expect(parseRoute("/katakana/study")).toEqual({ script: "katakana", view: "study" });
    expect(parseRoute("/japanese-flashcards/")).toEqual({ script: "home", view: "home" });
    expect(parseRoute("/japanese-flashcards/hiragana")).toEqual({ script: "hiragana", view: "setup" });
    expect(parseRoute("/japanese-flashcards/hiragana/study")).toEqual({
      script: "hiragana",
      view: "study",
    });
    expect(parseRoute("/kana/katakana/study")).toEqual({ script: "katakana", view: "study" });
  });

  test("builds hrefs under the current base", () => {
    expect(hrefFor("home", "home", "/")).toBe("/");
    expect(hrefFor("hiragana", "setup", "/")).toBe("/hiragana");
    expect(hrefFor("hiragana", "study", "/katakana")).toBe("/hiragana/study");
    expect(hrefFor("home", "home", "/japanese-flashcards/hiragana")).toBe("/japanese-flashcards/");
    expect(hrefFor("katakana", "study", "/japanese-flashcards/")).toBe(
      "/japanese-flashcards/katakana/study"
    );
  });
});
