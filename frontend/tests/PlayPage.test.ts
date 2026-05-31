import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
import PlayPage from "@/pages/PlayPage.vue";
import type { Material } from "@/api/materials";

vi.mock("@/api/materials", () => ({
  listMaterials: vi.fn(),
  getMaterial: vi.fn(),
  fetchUrl: vi.fn(),
  fetchTopic: vi.fn(),
}));

import { listMaterials, getMaterial, fetchUrl, fetchTopic } from "@/api/materials";

const MOCK_MATERIALS: Material[] = [
  {
    id: "mat1",
    title: "小王子",
    tags: ["童话", "经典"],
    content: "从前有一个小王子。他住在一颗小行星上。",
    segments: [
      { type: "text", content: "从前有一个小王子。" },
      { type: "text", content: "他住在一颗小行星上。" },
    ],
  },
  {
    id: "mat2",
    title: "三体",
    tags: ["科幻"],
    content: "宇宙很大，生活更大。",
    segments: [{ type: "text", content: "宇宙很大，生活更大。" }],
  },
];

async function mountPlay() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: PlayPage }],
  });
  router.push("/");
  await router.isReady();
  const wrapper = mount(PlayPage, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

describe("PlayPage — material list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches and displays material cards", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    const wrapper = await mountPlay();

    expect(listMaterials).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain("小王子");
    expect(wrapper.text()).toContain("三体");
    expect(wrapper.text()).toContain("童话");
    expect(wrapper.text()).toContain("科幻");
  });

  it("shows empty state with link to admin", async () => {
    vi.mocked(listMaterials).mockResolvedValue([]);
    const wrapper = await mountPlay();

    expect(wrapper.text()).toContain("暂无素材");
    expect(wrapper.find("a[href='/admin']").exists()).toBe(true);
  });
});

describe("PlayPage — select and play", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clicking material card shows typing session", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    vi.mocked(getMaterial).mockResolvedValue(MOCK_MATERIALS[0]);

    const wrapper = await mountPlay();

    // Click the first material card.
    await wrapper.find(".material-card").trigger("click");
    await flushPromises();

    // TypingSession should now be visible with the material's segments.
    expect(wrapper.findComponent({ name: "TypingSession" }).exists()).toBe(true);
    // Back button should be visible.
    expect(wrapper.find(".btn-back").exists()).toBe(true);
  });

  it("back button returns to material list", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    vi.mocked(getMaterial).mockResolvedValue(MOCK_MATERIALS[0]);

    const wrapper = await mountPlay();
    await wrapper.find(".material-card").trigger("click");
    await flushPromises();

    // Click back.
    await wrapper.find(".btn-back").trigger("click");
    await flushPromises();

    // Should see material cards again.
    expect(wrapper.findAll(".material-card").length).toBe(2);
  });
});

describe("PlayPage — tag filter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clicking a tag filters materials", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    const wrapper = await mountPlay();

    // Click the "科幻" tag.
    const tags = wrapper.findAll(".tag");
    const scifiTag = tags.find((t) => t.text() === "科幻");
    expect(scifiTag).toBeTruthy();
    await scifiTag!.trigger("click");
    await flushPromises();

    // Only "三体" should be visible.
    const cards = wrapper.findAll(".material-card");
    expect(cards).toHaveLength(1);
    expect(cards[0].text()).toContain("三体");
  });

  it("clicking tag again clears filter", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    const wrapper = await mountPlay();

    const scifiTag = wrapper.findAll(".tag").find((t) => t.text() === "科幻");
    await scifiTag!.trigger("click");
    await flushPromises();

    // Click again to clear.
    await scifiTag!.trigger("click");
    await flushPromises();

    expect(wrapper.findAll(".material-card")).toHaveLength(2);
  });
});

describe("PlayPage — URL fetch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("URL input fetches and starts typing session", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    const fetched: Material = {
      id: "url1",
      title: "article",
      tags: [],
      content: "抓取内容。继续。",
      segments: [
        { type: "text", content: "抓取内容。" },
        { type: "text", content: "继续。" },
      ],
    };
    vi.mocked(fetchUrl).mockResolvedValue(fetched);

    const wrapper = await mountPlay();

    await wrapper.find('input[name="url"]').setValue("https://example.com/article");
    await wrapper.find("form.url-form").trigger("submit.prevent");
    await flushPromises();

    expect(fetchUrl).toHaveBeenCalledWith("https://example.com/article");
    expect(wrapper.findComponent({ name: "TypingSession" }).exists()).toBe(true);
  });

  it("shows error on failed fetch", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    vi.mocked(fetchUrl).mockRejectedValue(new Error("No readable content found"));

    const wrapper = await mountPlay();

    await wrapper.find('input[name="url"]').setValue("https://bad.url");
    await wrapper.find("form.url-form").trigger("submit.prevent");
    await flushPromises();

    expect(wrapper.find(".error-banner").text()).toContain("抓取失败");
    // Should still show material list.
    expect(wrapper.findAll(".material-card").length).toBe(2);
  });
});

describe("PlayPage — topic generate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("topic input generates and starts typing session", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    const generated: Material = {
      id: "gen1",
      title: "恐龙",
      tags: [],
      content: "很久很久以前。恐龙统治地球。",
      segments: [
        { type: "text", content: "很久很久以前。" },
        { type: "text", content: "恐龙统治地球。" },
      ],
    };
    vi.mocked(fetchTopic).mockResolvedValue(generated);

    const wrapper = await mountPlay();

    await wrapper.find('input[name="topic"]').setValue("恐龙");
    await wrapper.find("form.topic-form").trigger("submit.prevent");
    await flushPromises();

    expect(fetchTopic).toHaveBeenCalledWith("恐龙", "zh", "auto");
    expect(wrapper.findComponent({ name: "TypingSession" }).exists()).toBe(true);
  });

  it("shows error on generation failure", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    vi.mocked(fetchTopic).mockRejectedValue(new Error("LLM API key not configured"));

    const wrapper = await mountPlay();

    await wrapper.find('input[name="topic"]').setValue("测试");
    await wrapper.find("form.topic-form").trigger("submit.prevent");
    await flushPromises();

    expect(wrapper.find(".error-banner").text()).toContain("生成失败");
  });
});
