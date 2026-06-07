import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import MaterialBrowser from "@/components/MaterialBrowser.vue";
import type { Material } from "@/api/types";

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
  {
    id: "mat3",
    title: "静夜思",
    tags: ["唐诗", "李白", "五言"],
    content: "床前明月光，疑是地上霜。",
    segments: [{ type: "text", content: "床前明月光，疑是地上霜。" }],
  },
];

function mountBrowser(props: Record<string, unknown> = {}) {
  return mount(MaterialBrowser, {
    props: { materials: MOCK_MATERIALS, ...props },
  });
}

describe("MaterialBrowser — render", () => {
  it("renders material cards with titles and tags", () => {
    const wrapper = mountBrowser();
    const cards = wrapper.findAll(".material-card");
    expect(cards).toHaveLength(3);
    expect(wrapper.text()).toContain("小王子");
    expect(wrapper.text()).toContain("三体");
    expect(wrapper.text()).toContain("童话");
    expect(wrapper.text()).toContain("科幻");
  });
});

describe("MaterialBrowser — select", () => {
  it("emits select event when card is clicked", async () => {
    const wrapper = mountBrowser();
    await wrapper.findAll(".material-card")[0].trigger("click");
    expect(wrapper.emitted("select")).toHaveLength(1);
    expect(wrapper.emitted("select")![0][0]).toEqual(MOCK_MATERIALS[0]);
  });
});

describe("MaterialBrowser — search", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("filters materials by title after debounce", async () => {
    const wrapper = mountBrowser();
    await wrapper.find("input").setValue("小王");
    await flushPromises();

    // Before debounce — still shows all
    expect(wrapper.findAll(".material-card")).toHaveLength(3);

    vi.advanceTimersByTime(350);
    await flushPromises();

    const cards = wrapper.findAll(".material-card");
    expect(cards).toHaveLength(1);
    expect(cards[0].text()).toContain("小王子");
  });

  it("filters materials by tag name", async () => {
    const wrapper = mountBrowser();
    await wrapper.find("input").setValue("科幻");
    await flushPromises();

    vi.advanceTimersByTime(350);
    await flushPromises();

    const cards = wrapper.findAll(".material-card");
    expect(cards).toHaveLength(1);
    expect(cards[0].text()).toContain("三体");
  });

  it("search is case-insensitive", async () => {
    const wrapper = mountBrowser();
    // Chinese case doesn't vary, but verify lowercase filter works
    await wrapper.find("input").setValue("三体");
    await flushPromises();
    vi.advanceTimersByTime(350);
    await flushPromises();
    expect(wrapper.findAll(".material-card")).toHaveLength(1);

    // Clear
    await wrapper.find("input").setValue("");
    await flushPromises();
    vi.advanceTimersByTime(350);
    await flushPromises();
    expect(wrapper.findAll(".material-card")).toHaveLength(3);
  });

  it("shows all materials when search is empty", () => {
    const wrapper = mountBrowser();
    expect(wrapper.findAll(".material-card")).toHaveLength(3);
  });
});

describe("MaterialBrowser — clear button", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("clear button is not visible when search is empty", () => {
    const wrapper = mountBrowser();
    expect(wrapper.find(".search-clear").exists()).toBe(false);
  });

  it("clear button is visible when search has text", async () => {
    const wrapper = mountBrowser();
    await wrapper.find("input").setValue("test");
    await flushPromises();
    expect(wrapper.find(".search-clear").exists()).toBe(true);
  });

  it("clear button resets search and shows all materials", async () => {
    const wrapper = mountBrowser();
    await wrapper.find("input").setValue("小王");
    await flushPromises();
    vi.advanceTimersByTime(350);
    await flushPromises();

    expect(wrapper.findAll(".material-card")).toHaveLength(1);

    await wrapper.find(".search-clear").trigger("click");
    await flushPromises();

    expect(wrapper.findAll(".material-card")).toHaveLength(3);
    expect(wrapper.find(".search-clear").exists()).toBe(false);
  });
});

describe("MaterialBrowser — random button", () => {
  it("does not show random button by default", () => {
    const wrapper = mountBrowser();
    expect(wrapper.find(".btn-random").exists()).toBe(false);
  });

  it("shows random button when showRandomButton is true and materials exist", () => {
    const wrapper = mountBrowser({ showRandomButton: true });
    expect(wrapper.find(".btn-random").exists()).toBe(true);
    expect(wrapper.find(".btn-random").text()).toContain("随机练习");
  });

  it("random button selects from all materials when no filter", async () => {
    const wrapper = mountBrowser({ showRandomButton: true });
    await wrapper.find(".btn-random").trigger("click");

    expect(wrapper.emitted("select")).toHaveLength(1);
    const selected = wrapper.emitted("select")![0][0] as Material;
    expect(MOCK_MATERIALS.map((m) => m.id)).toContain(selected.id);
  });

  it("random button selects from filtered results", async () => {
    vi.useFakeTimers();
    const wrapper = mountBrowser({ showRandomButton: true });

    await wrapper.find("input").setValue("三体");
    await flushPromises();
    vi.advanceTimersByTime(350);
    await flushPromises();

    expect(wrapper.findAll(".material-card")).toHaveLength(1);

    await wrapper.find(".btn-random").trigger("click");
    const selected = wrapper.emitted("select")![0][0] as Material;
    expect(selected.id).toBe("mat2");

    vi.useRealTimers();
  });

  it("hides random button when no materials match filter", async () => {
    vi.useFakeTimers();
    const wrapper = mountBrowser({ showRandomButton: true });

    await wrapper.find("input").setValue("不存在的素材");
    await flushPromises();
    vi.advanceTimersByTime(350);
    await flushPromises();

    expect(wrapper.find(".btn-random").exists()).toBe(false);

    vi.useRealTimers();
  });
});

describe("MaterialBrowser — card-actions slot", () => {
  it("renders card-actions slot content", () => {
    const wrapper = mount(MaterialBrowser, {
      props: { materials: MOCK_MATERIALS },
      slots: {
        "card-actions": `<template #card-actions="{ material }"><button class="btn-test">{{ material.title }}</button></template>`,
      },
    });

    const buttons = wrapper.findAll(".btn-test");
    expect(buttons).toHaveLength(3);
    expect(buttons[0].text()).toBe("小王子");
  });
});

describe("MaterialBrowser — tag bar", () => {
  it("shows tag bar with all unique tags sorted by material count descending", () => {
    const wrapper = mountBrowser();
    const tagChips = wrapper.findAll(".tag-bar .tag-chip");
    const tagTexts = tagChips.map((t) => t.text());

    // Tags sorted by count: 唐诗(1), 李白(1), 五言(1), 童话(1), 经典(1), 科幻(1)
    // All have count 1, so alphabetical/insertion order
    expect(tagTexts).toContain("童话");
    expect(tagTexts).toContain("经典");
    expect(tagTexts).toContain("科幻");
    expect(tagTexts).toContain("唐诗");
    expect(tagTexts).toContain("李白");
    expect(tagTexts).toContain("五言");
  });

  it("clicking a tag chip selects it and filters materials", async () => {
    const wrapper = mountBrowser();
    const tagChips = wrapper.findAll(".tag-bar .tag-chip");
    const scifiChip = tagChips.find((t) => t.text() === "科幻");
    expect(scifiChip).toBeTruthy();

    await scifiChip!.trigger("click");
    await flushPromises();

    const cards = wrapper.findAll(".material-card");
    expect(cards).toHaveLength(1);
    expect(cards[0].text()).toContain("三体");
  });

  it("clicking a selected tag chip deselects it", async () => {
    const wrapper = mountBrowser();
    const scifiChip = wrapper.findAll(".tag-bar .tag-chip").find((t) => t.text() === "科幻");
    await scifiChip!.trigger("click");
    await flushPromises();
    expect(wrapper.findAll(".material-card")).toHaveLength(1);

    await scifiChip!.trigger("click");
    await flushPromises();
    expect(wrapper.findAll(".material-card")).toHaveLength(3);
  });

  it("multiple tags filter with AND logic", async () => {
    const wrapper = mountBrowser();
    const tagChips = wrapper.findAll(".tag-bar .tag-chip");

    const tangChip = tagChips.find((t) => t.text() === "唐诗");
    const liBaiChip = tagChips.find((t) => t.text() === "李白");

    await tangChip!.trigger("click");
    await liBaiChip!.trigger("click");
    await flushPromises();

    const cards = wrapper.findAll(".material-card");
    expect(cards).toHaveLength(1);
    expect(cards[0].text()).toContain("静夜思");
  });

  it("selected tags are highlighted", async () => {
    const wrapper = mountBrowser();
    const scifiChip = wrapper.findAll(".tag-bar .tag-chip").find((t) => t.text() === "科幻");
    expect(scifiChip!.classes()).not.toContain("selected");

    await scifiChip!.trigger("click");
    await flushPromises();
    expect(scifiChip!.classes()).toContain("selected");
  });

  it("search and tags combine with AND logic", async () => {
    vi.useFakeTimers();
    const wrapper = mountBrowser();

    // Select "童话" tag
    const tonghuaChip = wrapper.findAll(".tag-bar .tag-chip").find((t) => t.text() === "童话");
    await tonghuaChip!.trigger("click");
    await flushPromises();

    // Search for "小" — only "小王子" has both tag "童话" and title containing "小"
    await wrapper.find("input").setValue("小");
    await flushPromises();
    vi.advanceTimersByTime(350);
    await flushPromises();

    const cards = wrapper.findAll(".material-card");
    expect(cards).toHaveLength(1);
    expect(cards[0].text()).toContain("小王子");

    vi.useRealTimers();
  });

  it("shows selected tags as filter chips with remove button", async () => {
    const wrapper = mountBrowser();
    const scifiChip = wrapper.findAll(".tag-bar .tag-chip").find((t) => t.text() === "科幻");
    await scifiChip!.trigger("click");
    await flushPromises();

    const filterChips = wrapper.findAll(".filter-chip");
    expect(filterChips).toHaveLength(1);
    expect(filterChips[0].text()).toContain("科幻");
  });

  it("clicking filter chip remove button deselects the tag", async () => {
    const wrapper = mountBrowser();
    const scifiChip = wrapper.findAll(".tag-bar .tag-chip").find((t) => t.text() === "科幻");
    await scifiChip!.trigger("click");
    await flushPromises();
    expect(wrapper.findAll(".material-card")).toHaveLength(1);

    const removeBtn = wrapper.find(".filter-chip .filter-remove");
    await removeBtn.trigger("click");
    await flushPromises();
    expect(wrapper.findAll(".material-card")).toHaveLength(3);
  });
});

describe("MaterialBrowser — tag bar collapse/expand", () => {
  it("shows only first 8 tags by default", () => {
    const manyTags: Material[] = Array.from({ length: 12 }, (_, i) => ({
      id: `m${i}`,
      title: `Material ${i}`,
      tags: [`tag${i}`],
      content: `content ${i}`,
      segments: [{ type: "text", content: `content ${i}` }],
    }));
    const wrapper = mountBrowser({ materials: manyTags });
    const tagChips = wrapper.findAll(".tag-bar .tag-chip");
    expect(tagChips).toHaveLength(8);
    expect(wrapper.find(".tag-toggle").exists()).toBe(true);
  });

  it("does not show toggle when 8 or fewer tags", () => {
    const wrapper = mountBrowser();
    expect(wrapper.find(".tag-toggle").exists()).toBe(false);
  });

  it("expands to show all tags when toggle clicked", async () => {
    const manyTags: Material[] = Array.from({ length: 12 }, (_, i) => ({
      id: `m${i}`,
      title: `Material ${i}`,
      tags: [`tag${i}`],
      content: `content ${i}`,
      segments: [{ type: "text", content: `content ${i}` }],
    }));
    const wrapper = mountBrowser({ materials: manyTags });

    await wrapper.find(".tag-toggle").trigger("click");
    await flushPromises();

    expect(wrapper.findAll(".tag-bar .tag-chip")).toHaveLength(12);
    expect(wrapper.find(".tag-toggle").text()).toBe("收起");
  });

  it("collapses back when toggle clicked again", async () => {
    const manyTags: Material[] = Array.from({ length: 12 }, (_, i) => ({
      id: `m${i}`,
      title: `Material ${i}`,
      tags: [`tag${i}`],
      content: `content ${i}`,
      segments: [{ type: "text", content: `content ${i}` }],
    }));
    const wrapper = mountBrowser({ materials: manyTags });

    await wrapper.find(".tag-toggle").trigger("click");
    await flushPromises();
    expect(wrapper.findAll(".tag-bar .tag-chip")).toHaveLength(12);

    await wrapper.find(".tag-toggle").trigger("click");
    await flushPromises();
    expect(wrapper.findAll(".tag-bar .tag-chip")).toHaveLength(8);
    expect(wrapper.find(".tag-toggle").text()).toBe("更多…");
  });
});

describe("MaterialBrowser — empty state", () => {
  it("shows empty message when search + tags produce no results", async () => {
    vi.useFakeTimers();
    const wrapper = mountBrowser();
    await wrapper.find("input").setValue("不存在的素材");
    await flushPromises();
    vi.advanceTimersByTime(350);
    await flushPromises();

    expect(wrapper.find(".empty-filter").exists()).toBe(true);
    expect(wrapper.find(".empty-filter").text()).toContain("没有匹配的素材");
    expect(wrapper.find(".btn-clear-all").exists()).toBe(true);

    vi.useRealTimers();
  });

  it("clear all button resets search and tags", async () => {
    vi.useFakeTimers();
    const wrapper = mountBrowser();

    // Select a tag and search
    const scifiChip = wrapper.findAll(".tag-bar .tag-chip").find((t) => t.text() === "科幻");
    await scifiChip!.trigger("click");
    await flushPromises();
    await wrapper.find("input").setValue("不存在");
    await flushPromises();
    vi.advanceTimersByTime(350);
    await flushPromises();

    expect(wrapper.find(".empty-filter").exists()).toBe(true);

    // Click clear all
    await wrapper.find(".btn-clear-all").trigger("click");
    await flushPromises();

    expect(wrapper.findAll(".material-card")).toHaveLength(3);
    expect(wrapper.find(".empty-filter").exists()).toBe(false);

    vi.useRealTimers();
  });
});
