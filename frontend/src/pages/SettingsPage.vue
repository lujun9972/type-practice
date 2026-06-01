<template>
  <div>
    <h1>设置</h1>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <!-- Auth gate -->
    <div v-if="!authenticated" class="auth-form-wrapper">
      <form class="auth-form" @submit.prevent="onAuthSubmit">
        <label>{{ passwordSet ? "输入密码" : "设置密码" }}</label>
        <input
          name="auth-password"
          type="password"
          v-model="authPassword"
          :placeholder="passwordSet ? '密码' : '设置管理密码'"
          required
        />
        <button type="submit">{{ passwordSet ? "确认" : "设置" }}</button>
      </form>
    </div>

    <template v-if="authenticated">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-if="saved" class="success-banner">已保存</div>

    <form v-if="config" @submit.prevent="onSave" class="settings-form">
      <fieldset>
        <legend>练习设置</legend>

        <label class="field">
          <input type="checkbox" v-model="config.skipPunctuation" />
          跳过标点符号
        </label>

        <label class="field">
          连续跳过次数上限
          <input type="number" v-model.number="config.skipLimit" min="0" max="20" />
        </label>
      </fieldset>

      <fieldset>
        <legend>练习模式</legend>
        <label class="field">
          <select v-model="config.typingMode">
            <option value="typing">打字模式</option>
            <option value="pinyin">拼音模式</option>
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend>LLM 设置</legend>

        <label class="field">
          Base URL
          <input type="text" v-model="config.llm.baseUrl" placeholder="https://api.deepseek.com" />
        </label>

        <label class="field">
          API Key
          <input type="password" v-model="config.llm.apiKey" placeholder="sk-..." />
        </label>

        <label class="field">
          Model
          <input type="text" v-model="config.llm.model" placeholder="deepseek-v4-flash" />
        </label>
      </fieldset>

      <button type="submit" :disabled="saving">
        {{ saving ? "保存中..." : "保存" }}
      </button>
    </form>

    <div v-if="passwordSet" class="password-change">
      <h2>修改密码</h2>
      <form @submit.prevent="onChangePassword">
        <label class="field">
          当前密码
          <input name="current-password" type="password" v-model="currentPassword" required />
        </label>
        <label class="field">
          新密码
          <input name="new-password" type="password" v-model="newPassword" required />
        </label>
        <button type="submit" :disabled="saving">修改</button>
      </form>
      <div v-if="passwordChanged" class="success-banner">密码已修改</div>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getConfig, updateConfig, getAuthStatus, authSetup, authLogin, setToken, clearToken, getToken, authChangePassword } from "@/api/materials";
import type { AppConfig } from "@/api/materials";

const config = ref<AppConfig | null>(null);
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const saved = ref(false);
const passwordSet = ref(false);
const authenticated = ref(false);
const authPassword = ref("");
const currentPassword = ref("");
const newPassword = ref("");
const passwordChanged = ref(false);

async function refresh() {
  try {
    loading.value = true;
    error.value = "";
    config.value = await getConfig();
  } catch (e) {
    error.value = "加载失败：" + (e instanceof Error ? e.message : String(e));
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  const existingToken = getToken();
  if (existingToken) {
    authenticated.value = true;
  }
  const status = await getAuthStatus();
  passwordSet.value = status.passwordSet;
  if (authenticated.value) {
    await refresh();
  }
});

async function onAuthSubmit() {
  if (!authPassword.value) return;
  try {
    error.value = "";
    let result: { token: string };
    if (passwordSet.value) {
      result = await authLogin(authPassword.value);
    } else {
      result = await authSetup(authPassword.value);
    }
    setToken(result.token);
    authenticated.value = true;
    authPassword.value = "";
    await refresh();
  } catch (e) {
    error.value = "认证失败：" + (e instanceof Error ? e.message : String(e));
  }
}

async function onChangePassword() {
  if (!currentPassword.value || !newPassword.value) return;
  try {
    saving.value = true;
    error.value = "";
    passwordChanged.value = false;
    await authChangePassword(currentPassword.value, newPassword.value);
    passwordChanged.value = true;
    currentPassword.value = "";
    newPassword.value = "";
    setTimeout(() => { passwordChanged.value = false; }, 2000);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Invalid token") || msg.includes("Not authenticated")) {
      clearToken();
      authenticated.value = false;
    }
    error.value = "修改密码失败：" + msg;
  } finally {
    saving.value = false;
  }
}

async function onSave() {
  if (!config.value) return;
  try {
    saving.value = true;
    error.value = "";
    saved.value = false;
    config.value = await updateConfig(config.value);
    saved.value = true;
    setTimeout(() => { saved.value = false; }, 2000);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Invalid token") || msg.includes("Not authenticated")) {
      clearToken();
      authenticated.value = false;
    }
    error.value = "保存失败：" + msg;
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
h1 {
  text-align: center;
  margin-bottom: 1rem;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

fieldset {
  border: 1px solid #333;
  border-radius: 8px;
  padding: 1rem;
}

legend {
  color: #93c5fd;
  font-weight: bold;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.75rem;
  color: #ccc;
}

.field input[type="text"],
.field input[type="password"],
.field input[type="number"],
.field select {
  padding: 0.5rem;
  background: #2a2a4a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #eee;
  font-size: 1rem;
}

.field input[type="checkbox"] {
  width: 1.2rem;
  height: 1.2rem;
  margin-right: 0.5rem;
  vertical-align: middle;
}

button[type="submit"] {
  padding: 0.6rem 1.5rem;
  background: #1e3a5f;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  color: #93c5fd;
  cursor: pointer;
  font-size: 1rem;
}

button[type="submit"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-banner {
  padding: 0.75rem;
  background: #7f1d1d;
  border-radius: 6px;
  color: #fca5a5;
  margin-bottom: 1rem;
}

.success-banner {
  padding: 0.75rem;
  background: #14532d;
  border-radius: 6px;
  color: #86efac;
  margin-bottom: 1rem;
}

.loading {
  text-align: center;
  color: #888;
}

.auth-form-wrapper {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 280px;
}

.auth-form label {
  font-size: 1.1rem;
  font-weight: bold;
  text-align: center;
}

.auth-form input {
  padding: 0.5rem;
  background: #2a2a4a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #eee;
  font-size: 1rem;
}

.auth-form button {
  padding: 0.5rem 1rem;
  background: #1e3a5f;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  color: #93c5fd;
  cursor: pointer;
}
</style>
