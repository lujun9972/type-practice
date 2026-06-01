import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
import SettingsPage from "@/pages/SettingsPage.vue";

vi.mock("@/api/materials", () => ({
  getConfig: vi.fn(),
  updateConfig: vi.fn(),
  getAuthStatus: vi.fn(() => Promise.resolve({ passwordSet: true })),
  authSetup: vi.fn(),
  authLogin: vi.fn(),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  getToken: vi.fn(() => "existing-token"),
  authChangePassword: vi.fn(),
}));

import { getConfig, updateConfig, getAuthStatus, authLogin, setToken, getToken, authChangePassword } from "@/api/materials";

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

describe("SettingsPage — auth gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getToken).mockReturnValue(null);
  });

  it("shows login form when not authenticated", async () => {
    vi.mocked(getAuthStatus).mockResolvedValue({ passwordSet: true });
    const wrapper = await mountSettings();

    expect(wrapper.find(".auth-form").exists()).toBe(true);
    expect(wrapper.find(".auth-form").text()).toContain("输入密码");
  });

  it("login shows settings content", async () => {
    vi.mocked(getAuthStatus).mockResolvedValueOnce({ passwordSet: true });
    vi.mocked(authLogin).mockResolvedValue({ token: "test-token" });
    vi.mocked(getConfig).mockResolvedValue(DEFAULT_CONFIG);

    const wrapper = await mountSettings();

    await wrapper.find('input[name="auth-password"]').setValue("mypassword");
    await wrapper.find(".auth-form").trigger("submit.prevent");
    await flushPromises();

    expect(authLogin).toHaveBeenCalledWith("mypassword");
    expect(setToken).toHaveBeenCalledWith("test-token");
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true);
  });
});

describe("SettingsPage — password change", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getToken).mockReturnValue("existing-token");
  });

  it("shows password change section and submits", async () => {
    vi.mocked(getConfig).mockResolvedValue(DEFAULT_CONFIG);
    vi.mocked(authChangePassword).mockResolvedValue(undefined);

    const wrapper = await mountSettings();

    expect(wrapper.find(".password-change").exists()).toBe(true);

    await wrapper.find('input[name="current-password"]').setValue("oldpass");
    await wrapper.find('input[name="new-password"]').setValue("newpass");
    await wrapper.find(".password-change form").trigger("submit.prevent");
    await flushPromises();

    expect(authChangePassword).toHaveBeenCalledWith("oldpass", "newpass");
    expect(wrapper.find(".success-banner").text()).toContain("密码已修改");
  });
});
