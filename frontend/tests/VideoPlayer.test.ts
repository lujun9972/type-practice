import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import VideoPlayer from "@/components/VideoPlayer.vue";

function createWrapper(props = {}) {
  return mount(VideoPlayer, {
    props: {
      videoUrl: "/api/videos/test.mp4",
      startTimeMs: null,
      nextStartTimeMs: null,
      ...props,
    },
  });
}

describe("VideoPlayer", () => {
  it("renders a video element with correct source", () => {
    const wrapper = createWrapper();
    const video = wrapper.find("video");
    expect(video.exists()).toBe(true);
    expect(video.attributes("src")).toBe("/api/videos/test.mp4");
  });

  it("shows loading indicator initially", () => {
    const wrapper = createWrapper();
    expect(wrapper.find(".video-loading").exists()).toBe(true);
  });

  it("emits buffered event when loadeddata fires", async () => {
    const wrapper = createWrapper();
    const video = wrapper.find("video");
    await video.trigger("loadeddata");
    expect(wrapper.emitted("buffered")).toBeTruthy();
    expect(wrapper.find(".video-loading").exists()).toBe(false);
  });

  it("renders progress bar", () => {
    const wrapper = createWrapper();
    expect(wrapper.find(".progress-bar").exists()).toBe(true);
    expect(wrapper.find(".progress-fill").exists()).toBe(true);
  });

  it("renders volume control", () => {
    const wrapper = createWrapper();
    expect(wrapper.find("input[type='range']").exists()).toBe(true);
  });
});
