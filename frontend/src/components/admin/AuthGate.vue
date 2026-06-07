<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  getAuthStatus,
  authSetup,
  authLogin,
  setToken,
  clearToken,
  getToken,
} from "@/api/materials";

const passwordSet = ref(false);
const authenticated = ref(false);
const authPassword = ref("");
const error = ref("");

const emit = defineEmits<{
  authenticated: [];
  error: [msg: string];
}>();

onMounted(async () => {
  const existingToken = getToken();
  if (existingToken) {
    authenticated.value = true;
    emit("authenticated");
    return;
  }
  try {
    const status = await getAuthStatus();
    passwordSet.value = status.passwordSet;
  } catch (e) {
    error.value = "认证状态检查失败：" + (e instanceof Error ? e.message : String(e));
    emit("error", error.value);
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
    emit("authenticated");
  } catch (e) {
    error.value = "认证失败：" + (e instanceof Error ? e.message : String(e));
    emit("error", error.value);
  }
}

function handleAuthError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("Invalid token") || msg.includes("Not authenticated")) {
    clearToken();
    authenticated.value = false;
  }
  return msg;
}

defineExpose({ handleAuthError, authenticated });
</script>

<template>
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
</template>

<style scoped>
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
