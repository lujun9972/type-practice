import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import HomePage from "./pages/HomePage.vue";
import PlayPage from "./pages/PlayPage.vue";
import AdminPage from "./pages/AdminPage.vue";
import SettingsPage from "./pages/SettingsPage.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: HomePage },
    { path: "/play", component: PlayPage },
    { path: "/admin", component: AdminPage },
    { path: "/settings", component: SettingsPage },
  ],
});

createApp(App).use(router).mount("#app");
