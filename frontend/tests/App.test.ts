import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import { createRouter, createMemoryHistory } from "vue-router";
import App from "@/App.vue";

async function mountApp(path = "/") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div>Play</div>" } },
      { path: "/admin", component: { template: "<div>Admin</div>" } },
    ],
  });
  router.push(path);
  await router.isReady();
  return mount(App, { global: { plugins: [router] } });
}

describe("App", () => {
  it("renders nav links", async () => {
    const wrapper = await mountApp();
    expect(wrapper.find("nav").text()).toContain("练习");
    expect(wrapper.find("nav").text()).toContain("管理");
  });
});
