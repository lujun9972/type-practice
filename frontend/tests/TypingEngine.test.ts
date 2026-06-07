import { describe, it, expect } from "vitest";
import { TypingEngine } from "@/engine/TypingEngine";

describe("TypingEngine", () => {
  it("initializes chars from segment as pending with cursor at 0", () => {
    const engine = new TypingEngine("abc");
    expect(engine.segment).toBe("abc");
    expect(engine.cursor).toBe(0);
    expect(engine.chars).toEqual([
      { char: "a", status: "pending" },
      { char: "b", status: "pending" },
      { char: "c", status: "pending" },
    ]);
  });

  describe("input", () => {
    it("marks correct char and advances cursor", () => {
      const engine = new TypingEngine("ab");
      engine.input("a");
      expect(engine.chars[0].status).toBe("correct");
      expect(engine.cursor).toBe(1);
    });

    it("marks incorrect char and advances cursor", () => {
      const engine = new TypingEngine("ab");
      engine.input("x");
      expect(engine.chars[0].status).toBe("incorrect");
      expect(engine.cursor).toBe(1);
    });

    it("is no-op when cursor at end", () => {
      const engine = new TypingEngine("a");
      engine.input("a");
      engine.input("x");
      expect(engine.cursor).toBe(1);
    });
  });

  describe("backspace", () => {
    it("undoes last input and resets status to pending", () => {
      const engine = new TypingEngine("ab");
      engine.input("a");
      engine.backspace();
      expect(engine.cursor).toBe(0);
      expect(engine.chars[0].status).toBe("pending");
    });

    it("is no-op at cursor 0", () => {
      const engine = new TypingEngine("a");
      engine.backspace();
      expect(engine.cursor).toBe(0);
    });
  });

  describe("hint", () => {
    it("returns the current expected char", () => {
      const engine = new TypingEngine("abc");
      expect(engine.hint()).toBe("a");
      engine.input("a");
      expect(engine.hint()).toBe("b");
    });

    it("returns empty string at end", () => {
      const engine = new TypingEngine("a");
      engine.input("a");
      expect(engine.hint()).toBe("");
    });
  });

  describe("skip", () => {
    it("marks all non-correct chars as skipped", () => {
      const engine = new TypingEngine("abc");
      engine.input("a");
      engine.skip();
      expect(engine.chars[0].status).toBe("correct");
      expect(engine.chars[1].status).toBe("skipped");
      expect(engine.chars[2].status).toBe("skipped");
      expect(engine.cursor).toBe(3);
    });

    it("marks all chars as skipped when nothing typed", () => {
      const engine = new TypingEngine("ab");
      engine.skip();
      expect(engine.chars.every((c) => c.status === "skipped")).toBe(true);
      expect(engine.cursor).toBe(2);
    });
  });

  describe("isComplete", () => {
    it("is false initially", () => {
      const engine = new TypingEngine("a");
      expect(engine.isComplete).toBe(false);
    });

    it("is false when incorrect chars remain", () => {
      const engine = new TypingEngine("ab");
      engine.input("x");
      engine.input("b");
      expect(engine.isComplete).toBe(false);
    });

    it("is true when all chars correct", () => {
      const engine = new TypingEngine("ab");
      engine.input("a");
      engine.input("b");
      expect(engine.isComplete).toBe(true);
    });

    it("is true when all chars correct or skipped", () => {
      const engine = new TypingEngine("ab");
      engine.input("a");
      engine.skip();
      expect(engine.isComplete).toBe(true);
    });
  });

  describe("unicode", () => {
    it("handles Chinese characters", () => {
      const engine = new TypingEngine("你好世界");
      expect(engine.chars.length).toBe(4);
      engine.input("你");
      expect(engine.chars[0].status).toBe("correct");
      expect(engine.cursor).toBe(1);
    });

    it("backspace works across Chinese characters", () => {
      const engine = new TypingEngine("你好");
      engine.input("你");
      engine.input("好");
      engine.backspace();
      expect(engine.cursor).toBe(1);
      expect(engine.chars[1].status).toBe("pending");
    });
  });

  describe("mixed input flow", () => {
    it("correct → incorrect → backspace → retype", () => {
      const engine = new TypingEngine("abc");
      engine.input("a");
      engine.input("x");
      expect(engine.chars[1].status).toBe("incorrect");
      engine.backspace();
      expect(engine.chars[1].status).toBe("pending");
      engine.input("b");
      expect(engine.chars[1].status).toBe("correct");
      engine.input("c");
      expect(engine.isComplete).toBe(true);
    });
  });
});
