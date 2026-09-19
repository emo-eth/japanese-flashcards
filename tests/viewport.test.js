import { describe, expect, test } from "bun:test";
import { computeKeyboardViewport } from "../js/viewport.js";

describe("keyboard visual viewport", () => {
  test("uses innerHeight when visualViewport is missing", () => {
    expect(computeKeyboardViewport({ visualHeight: null, visualOffsetTop: null, innerHeight: 800 })).toEqual({
      height: 800,
      offsetTop: 0,
      keyboardHeight: 0,
    });
  });

  test("treats the gap below the visual viewport as the keyboard", () => {
    expect(
      computeKeyboardViewport({ visualHeight: 430.4, visualOffsetTop: 18.2, innerHeight: 852 })
    ).toEqual({
      height: 430,
      offsetTop: 18,
      keyboardHeight: 422,
    });
  });
});
