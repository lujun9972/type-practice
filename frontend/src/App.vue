<template>
  <div class="app">
    <nav class="nav-bar">
      <router-link to="/">主页</router-link>
      <router-link to="/play">练习</router-link>
      <router-link to="/admin">管理</router-link>
      <router-link to="/settings">设置</router-link>
    </nav>
    <router-view />
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background: #1a1a2e;
  color: #eee;
}

.app {
  max-width: 640px;
  margin: 0 auto;
  padding: 1rem;
}

.nav-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #333;
}

.nav-bar a {
  color: #aaa;
  text-decoration: none;
}

.nav-bar a.router-link-active {
  color: #93c5fd;
}
</style>
