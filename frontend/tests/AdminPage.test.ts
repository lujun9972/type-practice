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
  getMaterial: vi.fn(),
  updateMaterial: vi.fn(),
  fetchUrl: vi.fn(),
  fetchTopic: vi.fn(),
  getAuthStatus: vi.fn(() => Promise.resolve({ passwordSet: true })),
  authSetup: vi.fn(),
  authLogin: vi.fn(),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  getToken: vi.fn(() => "existing-token"),
  exportMaterials: vi.fn(),
  importMaterials: vi.fn(),
  importResolve: vi.fn(),
}));

import { listMaterials, createMaterial, deleteMaterial, previewSegments, getMaterial, updateMaterial, fetchUrl, fetchTopic, getAuthStatus, authSetup, authLogin, setToken, getToken, exportMaterials, importMaterials, importResolve } from "@/api/materials";

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

describe("AdminPage — view detail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clicking material card shows detail with content, segments and word count", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    const wrapper = await mountAdmin();

    // Click the first material card.
    await wrapper.find(".material-item").trigger("click");
    await flushPromises();

    // Detail view should show title, tags, content, segments, word count.
    expect(wrapper.find(".detail-view").exists()).toBe(true);
    expect(wrapper.find(".detail-view").text()).toContain("小王子");
    expect(wrapper.find(".detail-view").text()).toContain("从前有一个小王子。他住在一颗小行星上。");
    expect(wrapper.find(".detail-view").text()).toContain("从前有一个小王子");
    expect(wrapper.find(".detail-view").text()).toContain("19 字");
  });

  it("back button returns to material list", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    const wrapper = await mountAdmin();

    await wrapper.find(".material-item").trigger("click");
    await flushPromises();
    expect(wrapper.find(".detail-view").exists()).toBe(true);

    await wrapper.find(".btn-back").trigger("click");
    await flushPromises();
    expect(wrapper.find(".detail-view").exists()).toBe(false);
    expect(wrapper.findAll(".material-item")).toHaveLength(2);
  });
});

describe("AdminPage — edit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("edit button shows form, save updates material", async () => {
    const updated: Material = {
      ...MOCK_MATERIALS[0],
      title: "新标题",
      tags: ["新标签"],
      content: "新内容。很好。",
      segments: [{ type: "text", content: "新内容。很好。" }],
    };
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    vi.mocked(updateMaterial).mockResolvedValue(updated);
    vi.mocked(listMaterials).mockResolvedValue([updated, MOCK_MATERIALS[1]]);

    const wrapper = await mountAdmin();

    // Enter detail view.
    await wrapper.find(".material-item").trigger("click");
    await flushPromises();

    // Click edit.
    await wrapper.find(".btn-edit").trigger("click");
    await flushPromises();

    // Edit form should be visible.
    expect(wrapper.find(".edit-form").exists()).toBe(true);

    // Modify fields.
    await wrapper.find('.edit-form input[name="title"]').setValue("新标题");
    await wrapper.find('.edit-form input[name="tags"]').setValue("新标签");
    await wrapper.find('.edit-form textarea[name="content"]').setValue("新内容。很好。");
    await wrapper.find(".edit-form").trigger("submit.prevent");
    await flushPromises();

    expect(updateMaterial).toHaveBeenCalledWith("abc123", {
      title: "新标题",
      tags: "新标签",
      content: "新内容。很好。",
    });
  });

  it("editing material with images shows read-only content and preserves segments", async () => {
    const matWithImages: Material = {
      id: "img1",
      title: "带图文章",
      tags: ["图文"],
      content: "图片前文字。图片后文字。",
      segments: [
        { type: "text", content: "图片前文字。" },
        { type: "image", url: "https://example.com/a.jpg", position: 5 },
        { type: "text", content: "图片后文字。" },
      ],
    };
    const updated: Material = {
      ...matWithImages,
      title: "新标题",
      tags: ["新标签"],
    };
    vi.mocked(listMaterials).mockResolvedValue([matWithImages]);
    vi.mocked(updateMaterial).mockResolvedValue(updated);
    vi.mocked(listMaterials).mockResolvedValue([updated]);

    const wrapper = await mountAdmin();

    await wrapper.find(".material-item").trigger("click");
    await flushPromises();

    await wrapper.find(".btn-edit").trigger("click");
    await flushPromises();

    // Content should NOT be a textarea — images can't be edited in plain text.
    expect(wrapper.find('.edit-form textarea[name="content"]').exists()).toBe(false);
    // Content should be shown as read-only text.
    expect(wrapper.find(".edit-content-readonly").exists()).toBe(true);

    // Edit title/tags only.
    await wrapper.find('.edit-form input[name="title"]').setValue("新标题");
    await wrapper.find('.edit-form input[name="tags"]').setValue("新标签");
    await wrapper.find(".edit-form").trigger("submit.prevent");
    await flushPromises();

    // Should pass original segments to preserve images.
    expect(updateMaterial).toHaveBeenCalledWith("img1", expect.objectContaining({
      title: "新标题",
      tags: "新标签",
      segments: matWithImages.segments,
    }));
  });
});

describe("AdminPage — URL fetch preview & save", () => {
  beforeEach(() => vi.clearAllMocks());

  it("URL fetch shows preview, then save to library", async () => {
    const fetched: Material = {
      id: "url1",
      title: "article",
      tags: [],
      content: "抓取的内容。继续阅读。",
      segments: [
        { type: "text", content: "抓取的内容。" },
        { type: "text", content: "继续阅读。" },
      ],
    };
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    vi.mocked(fetchUrl).mockResolvedValue(fetched);
    const saved = { ...fetched, id: "saved1", title: "我的文章", tags: ["抓取"] };
    vi.mocked(createMaterial).mockResolvedValue(saved);
    vi.mocked(listMaterials).mockResolvedValue([...MOCK_MATERIALS, saved]);

    const wrapper = await mountAdmin();

    // Enter URL and submit.
    await wrapper.find('input[name="admin-url"]').setValue("https://example.com/article");
    await wrapper.find("form.url-fetch-form").trigger("submit.prevent");
    await flushPromises();

    // Preview should be visible.
    expect(wrapper.find(".fetch-preview").exists()).toBe(true);
    expect(wrapper.find(".fetch-preview").text()).toContain("抓取的内容");

    // Edit title and tags before saving.
    await wrapper.find('.fetch-preview input[name="preview-title"]').setValue("我的文章");
    await wrapper.find('.fetch-preview input[name="preview-tags"]').setValue("抓取");
    await wrapper.find(".btn-save-preview").trigger("click");
    await flushPromises();

    expect(createMaterial).toHaveBeenCalledWith({
      title: "我的文章",
      tags: "抓取",
      content: "抓取的内容。继续阅读。",
      segments: fetched.segments,
    });
  });

  it("discard button clears preview", async () => {
    const fetched: Material = {
      id: "url1", title: "test", tags: [], content: "内容。",
      segments: [{ type: "text", content: "内容。" }],
    };
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    vi.mocked(fetchUrl).mockResolvedValue(fetched);

    const wrapper = await mountAdmin();

    await wrapper.find('input[name="admin-url"]').setValue("https://example.com");
    await wrapper.find("form.url-fetch-form").trigger("submit.prevent");
    await flushPromises();
    expect(wrapper.find(".fetch-preview").exists()).toBe(true);

    await wrapper.find(".btn-discard-preview").trigger("click");
    await flushPromises();
    expect(wrapper.find(".fetch-preview").exists()).toBe(false);
  });
});

describe("AdminPage — AI generate preview & save", () => {
  beforeEach(() => vi.clearAllMocks());

  it("AI generate shows preview, then save to library", async () => {
    const generated: Material = {
      id: "gen1", title: "恐龙", tags: [],
      content: "很久很久以前。恐龙统治地球。",
      segments: [
        { type: "text", content: "很久很久以前。" },
        { type: "text", content: "恐龙统治地球。" },
      ],
    };
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    vi.mocked(fetchTopic).mockResolvedValue(generated);
    vi.mocked(createMaterial).mockResolvedValue(generated);
    vi.mocked(listMaterials).mockResolvedValue([...MOCK_MATERIALS, generated]);

    const wrapper = await mountAdmin();

    await wrapper.find('input[name="admin-topic"]').setValue("恐龙");
    await wrapper.find("form.topic-gen-form").trigger("submit.prevent");
    await flushPromises();

    expect(wrapper.find(".fetch-preview").exists()).toBe(true);
    expect(wrapper.find(".fetch-preview").text()).toContain("恐龙");

    await wrapper.find(".btn-save-preview").trigger("click");
    await flushPromises();

    expect(createMaterial).toHaveBeenCalled();
  });
});

describe("AdminPage — auth gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getToken).mockReturnValue(null);
  });

  it("shows password setup form when no password is set", async () => {
    vi.mocked(getAuthStatus).mockResolvedValue({ passwordSet: false });
    const wrapper = await mountAdmin();

    expect(wrapper.find(".auth-form").exists()).toBe(true);
    expect(wrapper.find(".auth-form").text()).toContain("设置密码");
  });

  it("shows login form when password is set but not authenticated", async () => {
    vi.mocked(getAuthStatus).mockResolvedValue({ passwordSet: true });
    const wrapper = await mountAdmin();

    expect(wrapper.find(".auth-form").exists()).toBe(true);
    expect(wrapper.find(".auth-form").text()).toContain("输入密码");
  });

  it("setup password and shows admin content", async () => {
    vi.mocked(getAuthStatus).mockResolvedValueOnce({ passwordSet: false });
    vi.mocked(authSetup).mockResolvedValue({ token: "test-token" });
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);

    const wrapper = await mountAdmin();

    await wrapper.find('input[name="auth-password"]').setValue("mypassword");
    await wrapper.find(".auth-form").trigger("submit.prevent");
    await flushPromises();

    expect(authSetup).toHaveBeenCalledWith("mypassword");
    expect(setToken).toHaveBeenCalledWith("test-token");
    expect(wrapper.find(".material-item").exists()).toBe(true);
  });

  it("login with correct password shows admin content", async () => {
    vi.mocked(getAuthStatus).mockResolvedValueOnce({ passwordSet: true });
    vi.mocked(authLogin).mockResolvedValue({ token: "test-token" });
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);

    const wrapper = await mountAdmin();

    await wrapper.find('input[name="auth-password"]').setValue("mypassword");
    await wrapper.find(".auth-form").trigger("submit.prevent");
    await flushPromises();

    expect(authLogin).toHaveBeenCalledWith("mypassword");
    expect(setToken).toHaveBeenCalledWith("test-token");
    expect(wrapper.find(".material-item").exists()).toBe(true);
  });
});

describe("AdminPage — export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getToken).mockReturnValue("existing-token");
  });

  it("export button toggles export panel", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    const wrapper = await mountAdmin();

    expect(wrapper.find(".export-panel").exists()).toBe(false);
    await wrapper.find(".btn-export-toggle").trigger("click");
    await flushPromises();
    expect(wrapper.find(".export-panel").exists()).toBe(true);
  });

  it("export panel shows three mode options", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    const wrapper = await mountAdmin();

    await wrapper.find(".btn-export-toggle").trigger("click");
    await flushPromises();

    expect(wrapper.find(".export-mode-row").exists()).toBe(true);
    const radios = wrapper.findAll('.export-mode-row input[type="radio"]');
    expect(radios).toHaveLength(3);
  });

  it("confirm export calls API and triggers download", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    const exportData = { version: 1, exportedAt: "2026-06-03T00:00:00Z", materials: MOCK_MATERIALS.map(m => ({ id: m.id, title: m.title, tags: m.tags, content: m.content })) };
    vi.mocked(exportMaterials).mockResolvedValue(exportData);

    // Mock URL.createObjectURL
    const mockUrl = "blob:mock-url";
    const createObjectURL = vi.fn(() => mockUrl);
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    const wrapper = await mountAdmin();

    await wrapper.find(".btn-export-toggle").trigger("click");
    await flushPromises();

    await wrapper.find(".btn-confirm-export").trigger("click");
    await flushPromises();

    expect(exportMaterials).toHaveBeenCalledWith({ mode: "all" });
    expect(createObjectURL).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it("shows checkboxes on material cards when mode=ids", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    const wrapper = await mountAdmin();

    await wrapper.find(".btn-export-toggle").trigger("click");
    await flushPromises();

    // Switch to manual mode
    const radios = wrapper.findAll('.export-mode-row input[type="radio"]');
    await radios[2].setValue(); // ids mode
    await flushPromises();

    expect(wrapper.find(".export-checkbox").exists()).toBe(true);
  });
});

describe("AdminPage — import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getToken).mockReturnValue("existing-token");
  });

  it("import button toggles import panel", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    const wrapper = await mountAdmin();

    expect(wrapper.find(".import-panel").exists()).toBe(false);
    await wrapper.find(".btn-import-toggle").trigger("click");
    await flushPromises();
    expect(wrapper.find(".import-panel").exists()).toBe(true);
  });

  it("import panel shows file input accepting .json", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    const wrapper = await mountAdmin();

    await wrapper.find(".btn-import-toggle").trigger("click");
    await flushPromises();

    const fileInput = wrapper.find(".import-file-input");
    expect(fileInput.exists()).toBe(true);
    expect(fileInput.attributes("accept")).toBe(".json");
  });

  it("import with no conflicts auto-resolves and shows summary", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    vi.mocked(importMaterials).mockResolvedValue({
      upload_id: "test-upload-id",
      total: 2,
      conflicts: [],
      new: [
        { index: 0, material: { id: "new1", title: "春晓", tags: ["唐诗"], content: "春眠不觉晓。" } },
        { index: 1, material: { id: "new2", title: "静夜思", tags: ["唐诗"], content: "床前明月光。" } },
      ],
    });
    vi.mocked(importResolve).mockResolvedValue({ imported: 2, skipped: 0, updated: 0, total: 2 });
    vi.mocked(listMaterials).mockResolvedValueOnce([...MOCK_MATERIALS]);

    const wrapper = await mountAdmin();

    await wrapper.find(".btn-import-toggle").trigger("click");
    await flushPromises();

    // Simulate file selection
    const file = new File(["test"], "export.json", { type: "application/json" });
    Object.defineProperty(wrapper.find(".import-file-input").element, "files", {
      value: [file],
      writable: false,
    });
    await wrapper.find(".import-file-input").trigger("change");
    await flushPromises();

    expect(importMaterials).toHaveBeenCalled();
    expect(importResolve).toHaveBeenCalledWith("test-upload-id", []);
    expect(wrapper.find(".import-summary").exists()).toBe(true);
    expect(wrapper.find(".import-summary").text()).toContain("2 条导入");
  });

  it("import with conflicts shows conflict dialog", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    vi.mocked(importMaterials).mockResolvedValue({
      upload_id: "test-upload-id",
      total: 2,
      conflicts: [{
        index: 0,
        imported: { id: "old1", title: "静夜思", tags: ["唐诗"], content: "床前明月光。" },
        local: { id: "abc123", title: "静夜思", tags: ["童话", "经典"], content: "床前明月光。" },
      }],
      new: [{ index: 1, material: { id: "new1", title: "春晓", tags: ["唐诗"], content: "春眠不觉晓。" } }],
    });

    const wrapper = await mountAdmin();

    await wrapper.find(".btn-import-toggle").trigger("click");
    await flushPromises();

    const file = new File(["test"], "export.json", { type: "application/json" });
    Object.defineProperty(wrapper.find(".import-file-input").element, "files", {
      value: [file],
      writable: false,
    });
    await wrapper.find(".import-file-input").trigger("change");
    await flushPromises();

    // Conflict dialog should be visible
    expect(wrapper.find(".conflict-dialog").exists()).toBe(true);
    expect(wrapper.find(".conflict-dialog").text()).toContain("素材冲突");
    expect(wrapper.find(".conflict-dialog").text()).toContain("1/1");
    expect(wrapper.find(".btn-keep-local").exists()).toBe(true);
    expect(wrapper.find(".btn-use-imported").exists()).toBe(true);
    expect(wrapper.find(".btn-keep-both").exists()).toBe(true);
  });

  it("resolving conflict calls resolve API and shows summary", async () => {
    vi.mocked(listMaterials).mockResolvedValue(MOCK_MATERIALS);
    vi.mocked(importMaterials).mockResolvedValue({
      upload_id: "test-upload-id",
      total: 1,
      conflicts: [{
        index: 0,
        imported: { id: "old1", title: "静夜思", tags: ["唐诗"], content: "床前明月光。" },
        local: { id: "abc123", title: "静夜思", tags: ["童话", "经典"], content: "床前明月光。" },
      }],
      new: [],
    });
    vi.mocked(importResolve).mockResolvedValue({ imported: 0, skipped: 1, updated: 0, total: 1 });
    vi.mocked(listMaterials).mockResolvedValueOnce(MOCK_MATERIALS);

    const wrapper = await mountAdmin();

    await wrapper.find(".btn-import-toggle").trigger("click");
    await flushPromises();

    const file = new File(["test"], "export.json", { type: "application/json" });
    Object.defineProperty(wrapper.find(".import-file-input").element, "files", {
      value: [file],
      writable: false,
    });
    await wrapper.find(".import-file-input").trigger("change");
    await flushPromises();

    // Click "keep local"
    await wrapper.find(".btn-keep-local").trigger("click");
    await flushPromises();

    expect(importResolve).toHaveBeenCalledWith("test-upload-id", [{ index: 0, action: "keep_local" }]);
    expect(wrapper.find(".import-summary").text()).toContain("1 条跳过");
  });
});
