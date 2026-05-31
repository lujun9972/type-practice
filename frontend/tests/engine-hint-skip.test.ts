import { describe, it, expect } from "vitest";
import { TypingEngine } from "@/engine/TypingEngine";

describe("TypingEngine.hint", () => {
  it("returns the expected character at cursor", () => {
    const engine = new TypingEngine("abc");
    expect(engine.hint()).toBe("a");
  });

  it("returns the next expected char after some input", () => {
    const engine = new TypingEngine("abc");
    engine.input("a");
    expect(engine.hint()).toBe("b");
  });

  it("returns empty string when segment is complete", () => {
    const engine = new TypingEngine("ab");
    engine.input("a");
    engine.input("b");
    expect(engine.hint()).toBe("");
  });
});

describe("TypingEngine.skip", () => {
  it("marks remaining chars as skipped and completes segment", () => {
    const engine = new TypingEngine("abc");
    engine.input("a");
    engine.skip();
    expect(engine.isComplete).toBe(true);
  });

  it("marks remaining chars as skipped (not correct)", () => {
    const engine = new TypingEngine("abc");
    engine.input("a");
    engine.skip();
    // "a" was correct, "b" and "c" should be skipped
    expect(engine.chars[0].status).toBe("correct");
    expect(engine.chars[1].status).toBe("skipped");
    expect(engine.chars[2].status).toBe("skipped");
  });

  it("completes segment even when some chars were typed incorrectly", () => {
    const engine = new TypingEngine("abc");
    engine.input("x"); // incorrect for "a"
    engine.skip();
    expect(engine.isComplete).toBe(true);
  });

  it("marks all non-correct chars as skipped", () => {
    const engine = new TypingEngine("abc");
    engine.input("a"); // correct
    engine.input("x"); // incorrect for "b"
    engine.skip();
    expect(engine.chars[0].status).toBe("correct");
    expect(engine.chars[1].status).toBe("skipped"); // was incorrect, now skipped
    expect(engine.chars[2].status).toBe("skipped");
  });

  it("is no-op when already complete", () => {
    const engine = new TypingEngine("ab");
    engine.input("a");
    engine.input("b");
    engine.skip(); // should not crash
    expect(engine.isComplete).toBe(true);
  });
});
