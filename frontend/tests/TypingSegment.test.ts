import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import TypingSegment from "@/components/TypingSegment.vue";

/**
 * Helper: simulate direct input (English, no IME).
 */
function typeDirect(wrapper: ReturnType<typeof mount>, text: string) {
  const input = wrapper.find(".typing-input");
  const el = input.element as HTMLInputElement;
  el.value = text;
  input.trigger("input");
}

/**
 * Helper: simulate IME input (Chinese).
 * Mirrors real browser: compositionstart → input events (ignored) → compositionend.
 */
function typeIME(wrapper: ReturnType<typeof mount>, text: string) {
  const input = wrapper.find(".typing-input");
  const el = input.element as HTMLInputElement;

  // Start composition.
  input.trigger("compositionstart");

  // Intermediate input events (pinyin letters) — should be ignored.
  el.value = "pinyin";
  input.trigger("input");

  // End composition with committed text.
  input.trigger("compositionend", { data: text });

  // Input clears after compositionend.
  el.value = "";
}

describe("TypingSegment", () => {
  it("renders all characters", () => {
    const wrapper = mount(TypingSegment, { props: { text: "abc" } });
    expect(wrapper.findAll(".char")).toHaveLength(3);
  });

  it("marks correct on matching direct input (English)", async () => {
    const wrapper = mount(TypingSegment, { props: { text: "abc" } });
    await typeDirect(wrapper, "a");
    expect(wrapper.findAll(".char")[0].classes()).toContain("correct");
  });

  it("marks incorrect on wrong direct input", async () => {
    const wrapper = mount(TypingSegment, { props: { text: "abc" } });
    await typeDirect(wrapper, "x");
    expect(wrapper.findAll(".char")[0].classes()).toContain("incorrect");
  });

  it("handles backspace", async () => {
    const wrapper = mount(TypingSegment, { props: { text: "abc" } });
    await typeDirect(wrapper, "a");
    await wrapper.find(".typing-input").trigger("keydown", { key: "Backspace" });
    expect(wrapper.findAll(".char")[0].classes()).toContain("pending");
  });

  it("emits complete when all chars correct", async () => {
    const wrapper = mount(TypingSegment, { props: { text: "ab" } });
    await typeDirect(wrapper, "a");
    await typeDirect(wrapper, "b");
    expect(wrapper.emitted("complete")).toBeTruthy();
  });

  it("handles Chinese characters via IME", async () => {
    const wrapper = mount(TypingSegment, { props: { text: "你好" } });
    await typeIME(wrapper, "你");
    expect(wrapper.findAll(".char")[0].classes()).toContain("correct");
  });

  it("handles Chinese punctuation via IME", async () => {
    const wrapper = mount(TypingSegment, { props: { text: "你好。" } });
    await typeIME(wrapper, "你");
    await typeIME(wrapper, "好");
    await typeIME(wrapper, "。");
    const chars = wrapper.findAll(".char");
    expect(chars[0].classes()).toContain("correct");
    expect(chars[1].classes()).toContain("correct");
    expect(chars[2].classes()).toContain("correct");
    expect(wrapper.emitted("complete")).toBeTruthy();
  });

  it("ignores input events during composition", async () => {
    const wrapper = mount(TypingSegment, { props: { text: "你好" } });
    // Type pinyin but don't finish composition.
    const input = wrapper.find(".typing-input");
    const el = input.element as HTMLInputElement;
    input.trigger("compositionstart");
    el.value = "ni";
    input.trigger("input");
    // No chars should be processed yet.
    expect(wrapper.findAll(".char")[0].classes()).toContain("pending");
  });

  it("corrects error via backspace and re-input", async () => {
    const wrapper = mount(TypingSegment, { props: { text: "你好" } });
    await typeIME(wrapper, "你");
    await typeIME(wrapper, "坏");
    expect(wrapper.findAll(".char")[1].classes()).toContain("incorrect");
    await wrapper.find(".typing-input").trigger("keydown", { key: "Backspace" });
    await typeIME(wrapper, "好");
    expect(wrapper.findAll(".char")[1].classes()).toContain("correct");
  });

  it("handles space key correctly", async () => {
    const wrapper = mount(TypingSegment, { props: { text: "a b" } });
    await typeDirect(wrapper, "a");
    // Space via keydown (not input event — browsers don't fire input for space in this setup)
    await wrapper.find(".typing-input").trigger("keydown", { key: " " });
    await typeDirect(wrapper, "b");
    const chars = wrapper.findAll(".char");
    expect(chars[0].classes()).toContain("correct");
    expect(chars[1].classes()).toContain("correct");
    expect(chars[2].classes()).toContain("correct");
    expect(wrapper.emitted("complete")).toBeTruthy();
  });
});
