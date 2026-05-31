import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
import SettingsPage from "@/pages/SettingsPage.vue";

vi.mock("@/api/materials", () => ({
  getConfig: vi.fn(),
  updateConfig: vi.fn(),
}));

import { getConfig, updateConfig } from "@/api/materials";

const DEFAULT_CONFIG = {
  skipPunctuation: true,
  skipLimit: 3,
  llm: {
    baseUrl: "https://api.deepseek.com",
    apiKey: "",
    model: "deepseek-v4-flash",
  },
};

async function mountSettings() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: SettingsPage }],
  });
  router.push("/");
  await router.isReady();
  const wrapper = mount(SettingsPage, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

describe("SettingsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads and displays config", async () => {
    vi.mocked(getConfig).mockResolvedValue(DEFAULT_CONFIG);
    const wrapper = await mountSettings();

    expect(getConfig).toHaveBeenCalledOnce();
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true);
    expect(wrapper.find('input[type="number"]').exists()).toBe(true);
    expect((wrapper.find('input[type="number"]').element as HTMLInputElement).value).toBe("3");
  });

  it("saves updated config", async () => {
    const updated = {
      ...DEFAULT_CONFIG,
      skipLimit: 5,
      llm: { ...DEFAULT_CONFIG.llm, apiKey: "sk-test" },
    };
    vi.mocked(getConfig).mockResolvedValue(DEFAULT_CONFIG);
    vi.mocked(updateConfig).mockResolvedValue(updated);

    const wrapper = await mountSettings();

    await wrapper.find('input[type="number"]').setValue(5);
    await wrapper.find('input[type="password"]').setValue("sk-test");
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(updateConfig).toHaveBeenCalledOnce();
    const savedArg = vi.mocked(updateConfig).mock.calls[0][0];
    expect(savedArg.skipLimit).toBe(5);
    expect(savedArg.llm.apiKey).toBe("sk-test");
    expect(wrapper.find(".success-banner").text()).toContain("已保存");
  });

  it("shows error on failed load", async () => {
    vi.mocked(getConfig).mockRejectedValue(new Error("Network error"));
    const wrapper = await mountSettings();

    expect(wrapper.find(".error-banner").text()).toContain("加载失败");
  });

  it("shows error on failed save", async () => {
    vi.mocked(getConfig).mockResolvedValue(DEFAULT_CONFIG);
    vi.mocked(updateConfig).mockRejectedValue(new Error("Server error"));

    const wrapper = await mountSettings();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(wrapper.find(".error-banner").text()).toContain("保存失败");
  });
});
