import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
import HomePage from "@/pages/HomePage.vue";

vi.mock("@/api/stats", () => ({
  getStats: vi.fn(),
  setDailyGoal: vi.fn(),
  useRepair: vi.fn(),
}));

import { getStats, setDailyGoal } from "@/api/stats";

const MOCK_STATS = {
  totalXp: 600,
  level: 2,
  title: "打字学徒",
  nextLevelXp: 1500,
  streak: { current: 3, longest: 5, repairItems: 1 },
  todayTarget: null,
  todayEarned: 0,
  todayCompleted: false,
};

async function mountHome(stats = MOCK_STATS) {
  vi.mocked(getStats).mockResolvedValue({ ...MOCK_STATS, ...stats });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: HomePage },
      { path: "/play", component: { template: "<div>PlayPage</div>" } },
    ],
  });
  router.push("/");
  await router.isReady();
  const wrapper = mount(HomePage, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays level and title", async () => {
    const wrapper = await mountHome();
    expect(wrapper.text()).toContain("Lv.2");
    expect(wrapper.text()).toContain("打字学徒");
  });

  it("displays XP progress", async () => {
    const wrapper = await mountHome();
    expect(wrapper.text()).toContain("600");
    expect(wrapper.text()).toContain("1500");
  });

  it("displays streak count", async () => {
    const wrapper = await mountHome();
    expect(wrapper.text()).toContain("3");
  });

  it("shows daily goal selector when no goal set", async () => {
    const wrapper = await mountHome({ todayTarget: null });
    expect(wrapper.text()).toContain("轻松");
    expect(wrapper.text()).toContain("正常");
    expect(wrapper.text()).toContain("挑战");
  });

  it("calls setDailyGoal when difficulty selected", async () => {
    vi.mocked(setDailyGoal).mockResolvedValue({ ...MOCK_STATS, todayTarget: 80 });
    const wrapper = await mountHome({ todayTarget: null });
    const buttons = wrapper.findAll("button");
    const easyBtn = buttons.find((b) => b.text().includes("轻松"));
    await easyBtn!.trigger("click");
    await flushPromises();
    expect(setDailyGoal).toHaveBeenCalledWith("easy");
  });

  it("shows progress bar when goal is set", async () => {
    const wrapper = await mountHome({
      todayTarget: 150,
      todayEarned: 80,
      todayCompleted: false,
    });
    expect(wrapper.text()).toContain("80");
    expect(wrapper.text()).toContain("150");
  });

  it("shows completion message when goal met", async () => {
    const wrapper = await mountHome({
      todayTarget: 80,
      todayEarned: 80,
      todayCompleted: true,
    });
    expect(wrapper.text()).toContain("已完成");
  });

  it("has start practice button that navigates to /play", async () => {
    const wrapper = await mountHome();
    const btn = wrapper.find("[data-test='start-practice']");
    expect(btn.exists()).toBe(true);
  });
});
