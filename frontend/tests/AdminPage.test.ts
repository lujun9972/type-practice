import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
import AdminPage from "@/pages/AdminPage.vue";
import type { Material } from "@/api/materials";

// Mock the API module
vi.mock("@/api/materials", () => ({
  listMaterials: vi.fn(),
  createMaterial: vi.fn(),
  deleteMaterial: vi.fn(),
  previewSegments: vi.fn(),
}));

import { listMaterials, createMaterial, deleteMaterial, previewSegments } from "@/api/materials";

const MOCK_MATERIALS: Material[] = [
  {
    id: "abc123",
    title: "小王子",
    tags: ["童话", "经典"],
    content: "从前有一个小王子。他住在一颗小行星上。",
    segments: [
      { type: "text", content: "从前有一个小王子。" },
      { type: "text", content: "他住在一颗小行星上。" },
    ],
  },
  {
    id: "def456",
    title: "三体",
    tags: ["科幻"],
    content: "宇宙很大，生活更大。",
    segments: [{ type: "text", content: "宇宙很大，生活更大。" }],
  },
];

async function mountAdmin() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/admin", component: AdminPage }],
  });
  router.push("/admin");
  await router.isReady();
  const wrapper = mount(AdminPage, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

describe("AdminPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and displays material list", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    const wrapper = await mountAdmin();

    expect(listMaterials).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain("小王子");
    expect(wrapper.text()).toContain("三体");
    expect(wrapper.text()).toContain("童话");
    expect(wrapper.text()).toContain("科幻");
  });

  it("shows empty message when no materials", async () => {
    vi.mocked(listMaterials).mockResolvedValue([]);
    const wrapper = await mountAdmin();

    expect(wrapper.text()).toContain("暂无素材");
  });
});

describe("AdminPage — create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("create form submits and refreshes list", async () => {
    vi.mocked(listMaterials).mockResolvedValueOnce([]);
    const created: Material = {
      id: "new1",
      title: "新素材",
      tags: ["test"],
      content: "测试内容。很好。",
      segments: [{ type: "text", content: "测试内容。很好。" }],
    };
    vi.mocked(createMaterial).mockResolvedValue(created);
    vi.mocked(listMaterials).mockResolvedValueOnce([created]);

    const wrapper = await mountAdmin();

    // Fill the form.
    await wrapper.find('input[name="title"]').setValue("新素材");
    await wrapper.find('input[name="tags"]').setValue("test");
    await wrapper.find('textarea[name="content"]').setValue("测试内容。很好。");
    await wrapper.find("form.create-form").trigger("submit.prevent");
    await flushPromises();

    expect(createMaterial).toHaveBeenCalledWith({
      title: "新素材",
      tags: "test",
      content: "测试内容。很好。",
    });
    // List should refresh with new material.
    expect(wrapper.text()).toContain("新素材");
  });

  it("preview shows segments before saving", async () => {
    vi.mocked(listMaterials).mockResolvedValue([]);
    vi.mocked(previewSegments).mockResolvedValue([
      { type: "text", content: "第一句。" },
      { type: "text", content: "第二句。" },
    ]);

    const wrapper = await mountAdmin();

    await wrapper.find('textarea[name="content"]').setValue("第一句。第二句。");
    await wrapper.find("button.preview-btn").trigger("click");
    await flushPromises();

    // Should show segment preview.
    expect(wrapper.find(".segment-preview").exists()).toBe(true);
    expect(wrapper.find(".segment-preview").text()).toContain("第一句");
    expect(wrapper.find(".segment-preview").text()).toContain("第二句");
  });
});

describe("AdminPage — delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delete button removes material from list", async () => {
    const mat: Material = {
      id: "del1",
      title: "待删除",
      tags: [],
      content: "内容。",
      segments: [],
    };
    vi.mocked(listMaterials).mockResolvedValueOnce([mat]);
    vi.mocked(deleteMaterial).mockResolvedValue(undefined);
    vi.mocked(listMaterials).mockResolvedValueOnce([]);

    const wrapper = await mountAdmin();
    expect(wrapper.text()).toContain("待删除");

    await wrapper.find(".btn-delete").trigger("click");
    await flushPromises();

    expect(deleteMaterial).toHaveBeenCalledWith("del1");
    expect(wrapper.text()).toContain("暂无素材");
  });
});

describe("AdminPage — error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows error banner when list load fails", async () => {
    vi.mocked(listMaterials).mockRejectedValue(new Error("Network error"));

    const wrapper = await mountAdmin();

    expect(wrapper.find(".error-banner").exists()).toBe(true);
    expect(wrapper.find(".error-banner").text()).toContain("加载素材列表失败");
  });

  it("shows error when create fails", async () => {
    vi.mocked(listMaterials).mockResolvedValue([]);
    vi.mocked(createMaterial).mockRejectedValue(new Error("Server error"));

    const wrapper = await mountAdmin();

    await wrapper.find('input[name="title"]').setValue("测试");
    await wrapper.find('textarea[name="content"]').setValue("内容。");
    await wrapper.find("form.create-form").trigger("submit.prevent");
    await flushPromises();

    expect(wrapper.find(".error-banner").text()).toContain("创建失败");
  });
});
