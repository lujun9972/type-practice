import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import VideoPlayer from "@/components/VideoPlayer.vue";

function createWrapper(props = {}) {
  return mount(VideoPlayer, {
    props: {
      videoUrl: "/api/videos/test.mp4",
      playUntilMs: null,
      playFromStart: false,
      ...props,
    },
  });
}

/**
 * Helper: simulate video loaded and return the underlying HTMLVideoElement.
 */
async function loadVideo(wrapper: ReturnType<typeof mount>) {
  const video = wrapper.find("video");
  await video.trigger("loadeddata");
  return video.element as HTMLVideoElement;
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

describe("VideoPlayer — playUntil (Continuous Playback)", () => {
  it("playUntil plays from current position to target, pauses, and emits reachedTarget", async () => {
    const wrapper = createWrapper();
    const videoEl = await loadVideo(wrapper);

    // Mock play() to resolve immediately
    videoEl.play = vi.fn().mockResolvedValue(undefined);
    // Set duration so timeupdate works
    Object.defineProperty(videoEl, "duration", { value: 30, writable: true });
    // Start at 2 seconds
    Object.defineProperty(videoEl, "currentTime", { value: 2, writable: true });

    // Call playUntil(5000) — play from 2s to 5s
    const vm = wrapper.vm as unknown as { playUntil: (ms: number) => void };
    vm.playUntil(5000);

    // video.play() should have been called
    expect(videoEl.play).toHaveBeenCalled();

    // Simulate timeupdate — currentTime advances past 5.0s
    Object.defineProperty(videoEl, "currentTime", { value: 5.1, writable: true });
    await wrapper.find("video").trigger("timeupdate");

    // Video should be paused
    expect(videoEl.paused).toBe(true);
    // reachedTarget event emitted
    expect(wrapper.emitted("reachedTarget")).toBeTruthy();
  });

  it("changing playUntilMs prop triggers playback to new target", async () => {
    const wrapper = createWrapper();
    const videoEl = await loadVideo(wrapper);

    videoEl.play = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(videoEl, "duration", { value: 30, writable: true });
    Object.defineProperty(videoEl, "currentTime", { value: 3, writable: true });

    await wrapper.setProps({ playUntilMs: 8000 });

    expect(videoEl.play).toHaveBeenCalled();

    Object.defineProperty(videoEl, "currentTime", { value: 8.1, writable: true });
    await wrapper.find("video").trigger("timeupdate");

    expect(videoEl.paused).toBe(true);
    expect(wrapper.emitted("reachedTarget")).toBeTruthy();
  });

  it("playFromStart plays from 0 to target on load", async () => {
    const wrapper = createWrapper({ playFromStart: true, playUntilMs: 3000 });

    const videoEl = wrapper.find("video").element as HTMLVideoElement;
    videoEl.play = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(videoEl, "duration", { value: 30, writable: true });
    Object.defineProperty(videoEl, "currentTime", { value: 0, writable: true });

    await wrapper.find("video").trigger("loadeddata");

    expect(videoEl.play).toHaveBeenCalled();

    Object.defineProperty(videoEl, "currentTime", { value: 3.0, writable: true });
    await wrapper.find("video").trigger("timeupdate");

    expect(videoEl.paused).toBe(true);
    expect(wrapper.emitted("reachedTarget")).toBeTruthy();
  });

  it("playUntilMs null plays to video end via ended event", async () => {
    const wrapper = createWrapper();
    const videoEl = await loadVideo(wrapper);

    videoEl.play = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(videoEl, "duration", { value: 30, writable: true });
    Object.defineProperty(videoEl, "currentTime", { value: 10, writable: true });

    const vm = wrapper.vm as unknown as { playUntil: (ms: number) => void };

    await wrapper.setProps({ playUntilMs: null });

    expect(videoEl.play).not.toHaveBeenCalled();

    vm.playUntil(30000);
    expect(videoEl.play).toHaveBeenCalled();

    await wrapper.find("video").trigger("ended");
    expect(wrapper.emitted("reachedTarget")).toBeTruthy();
  });

  it("seekTo sets currentTime and pauses (resume scenario)", async () => {
    const wrapper = createWrapper();
    const videoEl = await loadVideo(wrapper);

    videoEl.play = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(videoEl, "duration", { value: 30, writable: true });

    const vm = wrapper.vm as unknown as { seekTo: (ms: number) => void };
    vm.seekTo(10000);

    expect(videoEl.currentTime).toBe(10);
  });

  it("timeupdate-based stopping — no setTimeout used", async () => {
    const wrapper = createWrapper();
    const videoEl = await loadVideo(wrapper);

    videoEl.play = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(videoEl, "duration", { value: 30, writable: true });
    Object.defineProperty(videoEl, "currentTime", { value: 2, writable: true });

    const vm = wrapper.vm as unknown as { playUntil: (ms: number) => void };
    vm.playUntil(5000);

    Object.defineProperty(videoEl, "currentTime", { value: 3.5, writable: true });
    await wrapper.find("video").trigger("timeupdate");
    expect(wrapper.emitted("reachedTarget")).toBeFalsy();

    Object.defineProperty(videoEl, "currentTime", { value: 5.0, writable: true });
    await wrapper.find("video").trigger("timeupdate");
    expect(wrapper.emitted("reachedTarget")).toBeTruthy();
  });
});
