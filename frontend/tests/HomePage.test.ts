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
  goalType: null as string | null,
  todayTimeEarned: 0,
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

  it("shows daily goal selector with tabs when no goal set", async () => {
    const wrapper = await mountHome({ todayTarget: null });
    expect(wrapper.text()).toContain("按 XP");
    expect(wrapper.text()).toContain("按时间");
  });

  it("shows XP goal buttons by default", async () => {
    const wrapper = await mountHome({ todayTarget: null });
    expect(wrapper.text()).toContain("轻松 (80 XP)");
    expect(wrapper.text()).toContain("正常 (150 XP)");
    expect(wrapper.text()).toContain("挑战 (300 XP)");
  });

  it("shows time goal buttons when time tab clicked", async () => {
    const wrapper = await mountHome({ todayTarget: null });
    const timeTab = wrapper.findAll("button").find(b => b.text() === "按时间");
    await timeTab!.trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("轻松 (5 分钟)");
    expect(wrapper.text()).toContain("正常 (10 分钟)");
    expect(wrapper.text()).toContain("挑战 (20 分钟)");
  });

  it("calls setDailyGoal with xp type when XP goal selected", async () => {
    vi.mocked(setDailyGoal).mockResolvedValue({ ...MOCK_STATS, todayTarget: 80, goalType: "xp" });
    const wrapper = await mountHome({ todayTarget: null });
    const buttons = wrapper.findAll("button");
    const easyBtn = buttons.find((b) => b.text().includes("轻松 (80 XP)"));
    await easyBtn!.trigger("click");
    await flushPromises();
    expect(setDailyGoal).toHaveBeenCalledWith({ difficulty: "easy", goal_type: "xp" });
  });

  it("calls setDailyGoal with time type when time goal selected", async () => {
    vi.mocked(setDailyGoal).mockResolvedValue({ ...MOCK_STATS, todayTarget: 300, goalType: "time" });
    const wrapper = await mountHome({ todayTarget: null });
    const timeTab = wrapper.findAll("button").find(b => b.text() === "按时间");
    await timeTab!.trigger("click");
    await flushPromises();
    const buttons = wrapper.findAll("button");
    const easyBtn = buttons.find((b) => b.text().includes("轻松 (5 分钟)"));
    await easyBtn!.trigger("click");
    await flushPromises();
    expect(setDailyGoal).toHaveBeenCalledWith({ difficulty: "easy", goal_type: "time" });
  });

  it("shows XP progress bar when XP goal is set", async () => {
    const wrapper = await mountHome({
      todayTarget: 150,
      todayEarned: 80,
      todayCompleted: false,
      goalType: "xp",
    });
    expect(wrapper.text()).toContain("80");
    expect(wrapper.text()).toContain("150");
    expect(wrapper.text()).toContain("XP");
  });

  it("shows time progress when time goal is set", async () => {
    const wrapper = await mountHome({
      todayTarget: 600,
      todayEarned: 180,
      todayCompleted: false,
      goalType: "time",
    });
    expect(wrapper.text()).toContain("3");
    expect(wrapper.text()).toContain("10 分钟");
  });

  it("shows completion message when goal met", async () => {
    const wrapper = await mountHome({
      todayTarget: 80,
      todayEarned: 80,
      todayCompleted: true,
      goalType: "xp",
    });
    expect(wrapper.text()).toContain("已完成");
  });

  it("has start practice button that navigates to /play", async () => {
    const wrapper = await mountHome();
    const btn = wrapper.find("[data-test='start-practice']");
    expect(btn.exists()).toBe(true);
  });

  it("shows switch button when goal is in progress", async () => {
    const wrapper = await mountHome({
      todayTarget: 150,
      todayEarned: 80,
      todayCompleted: false,
      goalType: "xp",
    });
    expect(wrapper.text()).toContain("切换到按时间");
  });
});
