import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import TypingSession from "@/components/TypingSession.vue";

const THREE_SEGMENTS = [
  { type: "text", content: "第一段。" },
  { type: "text", content: "第二段。" },
  { type: "text", content: "第三段。" },
];

/**
 * Helper: trigger complete on the n-th visible TypingSegment (0-indexed).
 */
function completeSegment(wrapper: ReturnType<typeof mount>, index: number) {
  const segments = wrapper.findAllComponents({ name: "TypingSegment" });
  segments[index].vm.$emit("complete");
}

describe("TypingSession", () => {
  it("shows only the first segment initially", () => {
    const wrapper = mount(TypingSession, {
      props: { segments: THREE_SEGMENTS },
    });
    const segments = wrapper.findAll(".segment-wrapper");
    expect(segments).toHaveLength(1);
  });

  it("does not emit complete initially", () => {
    const wrapper = mount(TypingSession, {
      props: { segments: THREE_SEGMENTS },
    });
    expect(wrapper.emitted("complete")).toBeFalsy();
  });

  it("unlocks second segment after first is completed", async () => {
    const wrapper = mount(TypingSession, {
      props: { segments: THREE_SEGMENTS },
    });
    await completeSegment(wrapper, 0);
    expect(wrapper.findAll(".segment-wrapper")).toHaveLength(2);
  });

  it("unlocks third segment after second is completed", async () => {
    const wrapper = mount(TypingSession, {
      props: { segments: THREE_SEGMENTS },
    });
    await completeSegment(wrapper, 0);
    await completeSegment(wrapper, 1);
    expect(wrapper.findAll(".segment-wrapper")).toHaveLength(3);
  });

  it("emits complete when last segment is completed", async () => {
    const wrapper = mount(TypingSession, {
      props: { segments: THREE_SEGMENTS },
    });
    await completeSegment(wrapper, 0);
    await completeSegment(wrapper, 1);
    await completeSegment(wrapper, 2);
    expect(wrapper.emitted("complete")).toBeTruthy();
  });

  it("completed segments remain visible", async () => {
    const wrapper = mount(TypingSession, {
      props: { segments: THREE_SEGMENTS },
    });
    await completeSegment(wrapper, 0);
    const wrappers = wrapper.findAll(".segment-wrapper");
    // First segment should still be in DOM.
    expect(wrappers.length).toBeGreaterThanOrEqual(2);
  });

  it("shows hint and skip buttons", () => {
    const wrapper = mount(TypingSession, {
      props: { segments: THREE_SEGMENTS },
    });
    expect(wrapper.find(".btn-hint").exists()).toBe(true);
    expect(wrapper.find(".btn-skip").exists()).toBe(true);
  });

  it("skip button shows remaining count", () => {
    const wrapper = mount(TypingSession, {
      props: { segments: THREE_SEGMENTS, skipLimit: 3 },
    });
    expect(wrapper.find(".btn-skip").text()).toContain("3");
  });

  it("skip skips current segment and unlocks next", async () => {
    const wrapper = mount(TypingSession, {
      props: { segments: THREE_SEGMENTS, skipLimit: 3 },
    });
    await wrapper.find(".btn-skip").trigger("click");
    // First segment skipped, second unlocked.
    expect(wrapper.findAll(".segment-wrapper")).toHaveLength(2);
    // Skip count decreased.
    expect(wrapper.find(".btn-skip").text()).toContain("2");
  });

  it("skip button is disabled when limit reached", async () => {
    const wrapper = mount(TypingSession, {
      props: { segments: THREE_SEGMENTS, skipLimit: 1 },
    });
    await wrapper.find(".btn-skip").trigger("click");
    expect(wrapper.find(".btn-skip").attributes("disabled")).toBeDefined();
  });

  it("hint button shows hint text", async () => {
    const wrapper = mount(TypingSession, {
      props: { segments: [{ type: "text", content: "你好" }] },
    });
    await wrapper.find(".btn-hint").trigger("click");
    expect(wrapper.find(".hint-display").text()).toBeTruthy();
  });

  it("hint is unlimited — button never disables", async () => {
    const wrapper = mount(TypingSession, {
      props: { segments: [{ type: "text", content: "你好" }] },
    });
    await wrapper.find(".btn-hint").trigger("click");
    await wrapper.find(".btn-hint").trigger("click");
    expect(wrapper.find(".btn-hint").attributes("disabled")).toBeFalsy();
  });
});

const SEGMENTS_WITH_IMAGE = [
  { type: "text", content: "第一段。" },
  { type: "image", url: "https://example.com/a.jpg" },
  { type: "text", content: "第二段。" },
  { type: "image", url: "https://example.com/b.jpg" },
  { type: "text", content: "第三段。" },
];

describe("TypingSession — image unlock", () => {
  it("image after first segment is hidden initially", () => {
    const wrapper = mount(TypingSession, {
      props: { segments: SEGMENTS_WITH_IMAGE },
    });
    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("image is revealed after preceding segment is completed", async () => {
    const wrapper = mount(TypingSession, {
      props: { segments: SEGMENTS_WITH_IMAGE },
    });
    await completeSegment(wrapper, 0);
    const imgs = wrapper.findAll("img");
    expect(imgs).toHaveLength(1);
    expect(imgs[0].attributes("src")).toBe("https://example.com/a.jpg");
  });

  it("second image revealed after second segment completed", async () => {
    const wrapper = mount(TypingSession, {
      props: { segments: SEGMENTS_WITH_IMAGE },
    });
    await completeSegment(wrapper, 0);
    await completeSegment(wrapper, 1);
    const imgs = wrapper.findAll("img");
    expect(imgs).toHaveLength(2);
  });
});

describe("TypingSession — results", () => {
  it("shows result overlay when all segments completed", async () => {
    const wrapper = mount(TypingSession, {
      props: { segments: THREE_SEGMENTS },
    });
    await completeSegment(wrapper, 0);
    await completeSegment(wrapper, 1);
    await completeSegment(wrapper, 2);
    expect(wrapper.find(".result-overlay").exists()).toBe(true);
  });

  it("result overlay shows time, accuracy and speed", async () => {
    const wrapper = mount(TypingSession, {
      props: { segments: THREE_SEGMENTS },
    });
    await completeSegment(wrapper, 0);
    await completeSegment(wrapper, 1);
    await completeSegment(wrapper, 2);
    const result = wrapper.find(".result-overlay");
    expect(result.text()).toContain("用时");
    expect(result.text()).toContain("准确率");
    expect(result.text()).toContain("速度");
  });
});
