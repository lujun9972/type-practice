import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import TypingSession from "@/components/TypingSession.vue";
import VideoPlayer from "@/components/VideoPlayer.vue";
import TypingSegment from "@/components/TypingSegment.vue";

const videoSegments = [
  { type: "text", content: "你好世界", startTimeMs: 0, endTimeMs: 3000 },
  { type: "text", content: "第二段", startTimeMs: 3000, endTimeMs: 6000 },
];

function createWrapper(props = {}) {
  return mount(TypingSession, {
    props: {
      segments: videoSegments,
      videoUrl: "test.mp4",
      ...props,
    },
    global: {
      stubs: {
        VideoPlayer: true,
        TypingSegment: true,
      },
    },
  });
}

describe("TypingSession — sticky video", () => {
  it("renders a sticky wrapper around VideoPlayer when videoUrl is present", () => {
    const wrapper = createWrapper();
    const stickyWrapper = wrapper.find(".video-sticky-wrapper");
    expect(stickyWrapper.exists()).toBe(true);
    expect(stickyWrapper.findComponent(VideoPlayer).exists()).toBe(true);
  });

  it("does not render sticky wrapper when no videoUrl", () => {
    const wrapper = createWrapper({ videoUrl: "" });
    expect(wrapper.find(".video-sticky-wrapper").exists()).toBe(false);
  });

  it("renders collapse button inside sticky wrapper when expanded", () => {
    const wrapper = createWrapper();
    const collapseBtn = wrapper.find(".btn-collapse-video");
    expect(collapseBtn.exists()).toBe(true);
  });

  it("toggles collapsed state on collapse button click", async () => {
    const wrapper = createWrapper();
    const stickyWrapper = wrapper.find(".video-sticky-wrapper");
    const collapseBtn = wrapper.find(".btn-collapse-video");

    expect(stickyWrapper.classes()).not.toContain("collapsed");

    await collapseBtn.trigger("click");
    expect(stickyWrapper.classes()).toContain("collapsed");
  });

  it("does not render buttons when no videoUrl", () => {
    const wrapper = createWrapper({ videoUrl: "" });
    expect(wrapper.find(".btn-collapse-video").exists()).toBe(false);
    expect(wrapper.find(".btn-expand-video").exists()).toBe(false);
  });

  it("shows expand button outside wrapper when collapsed", async () => {
    const wrapper = createWrapper();
    // Not collapsed yet — no expand button
    expect(wrapper.find(".btn-expand-video").exists()).toBe(false);

    // Collapse
    await wrapper.find(".btn-collapse-video").trigger("click");
    expect(wrapper.find(".video-sticky-wrapper").classes()).toContain("collapsed");

    // Expand button now visible outside wrapper
    const expandBtn = wrapper.find(".btn-expand-video");
    expect(expandBtn.exists()).toBe(true);
  });

  it("can expand back via expand button after collapsing", async () => {
    const wrapper = createWrapper();

    // Collapse
    await wrapper.find(".btn-collapse-video").trigger("click");
    expect(wrapper.find(".video-sticky-wrapper").classes()).toContain("collapsed");

    // Expand
    await wrapper.find(".btn-expand-video").trigger("click");
    expect(wrapper.find(".video-sticky-wrapper").classes()).not.toContain("collapsed");
    expect(wrapper.find(".btn-expand-video").exists()).toBe(false);
  });
});
