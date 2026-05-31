import { describe, it, expect } from "vitest";
import { TypingEngine } from "@/engine/TypingEngine";

describe("TypingEngine", () => {
  describe("initialization", () => {
    it("initializes with a segment and cursor at position 0", () => {
      const engine = new TypingEngine("你好世界");
      expect(engine.cursor).toBe(0);
      expect(engine.segment).toBe("你好世界");
      expect(engine.isComplete).toBe(false);
    });

    it("all chars start as pending", () => {
      const engine = new TypingEngine("abc");
      const chars = engine.chars;
      expect(chars).toEqual([
        { char: "a", status: "pending" },
        { char: "b", status: "pending" },
        { char: "c", status: "pending" },
      ]);
    });
  });

  describe("correct input", () => {
    it("marks char as correct and advances cursor", () => {
      const engine = new TypingEngine("abc");
      engine.input("a");
      expect(engine.cursor).toBe(1);
      expect(engine.chars[0].status).toBe("correct");
    });

    it("advances through all chars correctly", () => {
      const engine = new TypingEngine("ab");
      engine.input("a");
      engine.input("b");
      expect(engine.cursor).toBe(2);
      expect(engine.chars[0].status).toBe("correct");
      expect(engine.chars[1].status).toBe("correct");
      expect(engine.isComplete).toBe(true);
    });
  });

  describe("incorrect input", () => {
    it("marks char as incorrect and still advances cursor", () => {
      const engine = new TypingEngine("abc");
      engine.input("x");
      expect(engine.cursor).toBe(1);
      expect(engine.chars[0].status).toBe("incorrect");
    });
  });

  describe("backspace", () => {
    it("moves cursor back and resets char to pending", () => {
      const engine = new TypingEngine("abc");
      engine.input("a");
      engine.backspace();
      expect(engine.cursor).toBe(0);
      expect(engine.chars[0].status).toBe("pending");
    });

    it("is no-op at beginning", () => {
      const engine = new TypingEngine("abc");
      engine.backspace();
      expect(engine.cursor).toBe(0);
    });
  });

  describe("completion", () => {
    it("marks segment complete when all chars typed correctly", () => {
      const engine = new TypingEngine("hi");
      engine.input("h");
      engine.input("i");
      expect(engine.isComplete).toBe(true);
    });

    it("not complete when some chars are incorrect", () => {
      const engine = new TypingEngine("hi");
      engine.input("h");
      engine.input("x");
      expect(engine.isComplete).toBe(false);
    });

    it("becomes complete after backspace and correction", () => {
      const engine = new TypingEngine("hi");
      engine.input("h");
      engine.input("x");
      engine.backspace();
      engine.input("i");
      expect(engine.isComplete).toBe(true);
    });
  });
});
