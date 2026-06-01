import { describe, it, expect } from "vitest";
import { PinyinEngine } from "@/engine/PinyinEngine";

describe("PinyinEngine — basic Chinese", () => {
  it("inputs pinyin letters to match a single character", () => {
    const engine = new PinyinEngine("你");
    // "你" pinyin is "ni", cursor starts at 0
    expect(engine.cursor).toBe(0);
    expect(engine.isComplete).toBe(false);

    engine.input("n");
    expect(engine.isComplete).toBe(false);

    engine.input("i");
    expect(engine.isComplete).toBe(true);
    expect(engine.chars[0].status).toBe("correct");
  });

  it("inputs pinyin for two characters sequentially", () => {
    const engine = new PinyinEngine("你好");
    // "你" → "ni", "好" → "hao"
    engine.input("n");
    engine.input("i");
    // After "ni", first char done, cursor moves to second
    expect(engine.chars[0].status).toBe("correct");
    expect(engine.chars[1].status).toBe("pending");

    engine.input("h");
    engine.input("a");
    engine.input("o");
    expect(engine.isComplete).toBe(true);
    expect(engine.chars[1].status).toBe("correct");
  });

  it("wrong letter marks current target incorrect", () => {
    const engine = new PinyinEngine("你");
    engine.input("x"); // wrong letter
    expect(engine.chars[0].status).toBe("incorrect");
    expect(engine.isComplete).toBe(false);
  });

  it("backspace undoes last input within current target", () => {
    const engine = new PinyinEngine("你好");
    engine.input("n");
    engine.input("i"); // "你" done
    engine.input("x"); // wrong letter for "好"
    expect(engine.chars[1].status).toBe("incorrect");

    engine.backspace(); // undo "x"
    engine.input("h");
    engine.input("a");
    engine.input("o");
    expect(engine.isComplete).toBe(true);
  });

  it("backspace goes back to previous character when current is untouched", () => {
    const engine = new PinyinEngine("你好");
    engine.input("n");
    engine.input("i"); // "你" done, cursor now at "好"
    expect(engine.chars[0].status).toBe("correct");
    expect(engine.cursor).toBe(1);

    engine.backspace(); // "好" has typedCount=0, go back to "你"
    expect(engine.cursor).toBe(0);
    expect(engine.chars[0].status).toBe("pending");
    expect(engine.targets[0].typedCount).toBe(0);
  });

  it("backspace skips punctuation when going back", () => {
    const engine = new PinyinEngine("你。好");
    engine.input("n");
    engine.input("i"); // "你" done
    // "。" auto-skipped, cursor at "好"
    engine.backspace(); // go back past "。" to "你"
    expect(engine.cursor).toBe(0);
    expect(engine.chars[0].status).toBe("pending");
  });

  it("hint returns next expected letter", () => {
    const engine = new PinyinEngine("好");
    // "好" → "hao"
    const h = engine.hint();
    expect(h).toBe("h");

    engine.input("h");
    const a = engine.hint();
    expect(a).toBe("a");
  });
});

describe("PinyinEngine — punctuation auto-skip", () => {
  it("punctuation is auto-skipped", () => {
    const engine = new PinyinEngine("你。");
    // "。" should be auto-skipped, only "你" needs input
    engine.input("n");
    engine.input("i");
    expect(engine.isComplete).toBe(true);
  });

  it("punctuation status stays correct after extra input", () => {
    const engine = new PinyinEngine("你。好");
    engine.input("n");
    engine.input("i"); // "你" done
    // "。" is auto-handled, engine should skip to "好"
    expect(engine.chars[1].status).toBe("correct"); // "。" stays green
    // Type wrong letter — should target "好", not "。"
    engine.input("x");
    expect(engine.chars[1].status).toBe("correct"); // "。" unaffected
    expect(engine.chars[2].status).toBe("incorrect"); // "好" got the wrong letter
  });

  it("all-punctuation text is immediately complete", () => {
    const engine = new PinyinEngine("！！");
    expect(engine.isComplete).toBe(true);
  });
});

describe("PinyinEngine — English and numbers", () => {
  it("English letters are typed directly", () => {
    const engine = new PinyinEngine("abc");
    engine.input("a");
    engine.input("b");
    engine.input("c");
    expect(engine.isComplete).toBe(true);
    expect(engine.chars[0].status).toBe("correct");
  });

  it("numbers are typed directly", () => {
    const engine = new PinyinEngine("123");
    engine.input("1");
    engine.input("2");
    engine.input("3");
    expect(engine.isComplete).toBe(true);
  });
});

describe("PinyinEngine — mixed content", () => {
  it("Chinese + English + punctuation", () => {
    const engine = new PinyinEngine("你a好！");
    // "你" → ni, "a" → a, "好" → hao, "！" → auto-skip
    engine.input("n");
    engine.input("i"); // "你" done
    engine.input("a"); // "a" done
    engine.input("h");
    engine.input("a");
    engine.input("o"); // "好" done, "！" auto-skipped
    expect(engine.isComplete).toBe(true);
  });
});

describe("PinyinEngine — display info", () => {
  it("exposes pinyin annotation for each char", () => {
    const engine = new PinyinEngine("你好");
    const info = engine.targets;
    expect(info[0].display).toBe("你");
    expect(info[0].pinyin).toBeTruthy(); // e.g. "nǐ"
    expect(info[1].display).toBe("好");
    expect(info[1].pinyin).toBeTruthy(); // e.g. "hǎo"
  });
});
