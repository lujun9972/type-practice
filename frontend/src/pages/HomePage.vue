<template>
  <div class="home-page">
    <div class="level-section">
      <div class="level-badge">Lv.{{ stats.level }}</div>
      <div class="level-title">{{ stats.title }}</div>
    </div>

    <div class="xp-section">
      <div class="xp-bar-container">
        <div class="xp-bar" :style="{ width: xpPercent + '%' }"></div>
      </div>
      <div class="xp-text">
        <span>{{ stats.totalXp }}</span> / <span>{{ stats.nextLevelXp ?? '∞' }}</span> XP
      </div>
    </div>

    <div class="streak-section">
      <span class="streak-icon">🔥</span>
      <span class="streak-count">{{ stats.streak.current }} 天</span>
      <span v-if="stats.streak.repairItems > 0" class="repair-count">
        🛠️ ×{{ stats.streak.repairItems }}
      </span>
    </div>

    <div class="daily-goal-section">
      <template v-if="!stats.todayTarget">
        <h3>选择今日目标</h3>
        <div class="goal-tabs">
          <button
            :class="['goal-tab', { active: activeTab === 'xp' }]"
            @click="activeTab = 'xp'"
          >按 XP</button>
          <button
            :class="['goal-tab', { active: activeTab === 'time' }]"
            @click="activeTab = 'time'"
          >按时间</button>
        </div>

        <template v-if="activeTab === 'xp'">
          <div class="goal-buttons">
            <button @click="selectGoal('easy', 'xp')" class="goal-btn easy">轻松 (80 XP)</button>
            <button @click="selectGoal('normal', 'xp')" class="goal-btn normal">正常 (150 XP)</button>
            <button @click="selectGoal('challenge', 'xp')" class="goal-btn challenge">挑战 (300 XP)</button>
          </div>
        </template>

        <template v-else>
          <div class="goal-buttons">
            <button @click="selectGoal('easy', 'time')" class="goal-btn easy">轻松 (5 分钟)</button>
            <button @click="selectGoal('normal', 'time')" class="goal-btn normal">正常 (10 分钟)</button>
            <button @click="selectGoal('challenge', 'time')" class="goal-btn challenge">挑战 (20 分钟)</button>
          </div>
          <div class="custom-goal">
            <label>自定义</label>
            <input
              v-model.number="customMinutes"
              type="number"
              min="5"
              max="60"
              step="1"
              placeholder="分钟"
              class="custom-input"
            />
            <button @click="selectCustomGoal" class="goal-btn custom-go">确定</button>
          </div>
        </template>
      </template>

      <template v-else-if="stats.todayCompleted">
        <div class="goal-complete">今日目标已完成！</div>
        <div v-if="stats.goalType" class="goal-type-switch">
          <button
            v-if="stats.goalType === 'xp'"
            class="switch-btn"
            @click="switchGoalType('time')"
          >切换到按时间</button>
          <button
            v-else
            class="switch-btn"
            @click="switchGoalType('xp')"
          >切换到按 XP</button>
        </div>
      </template>

      <template v-else>
        <div class="goal-progress">
          <div class="xp-bar-container">
            <div class="xp-bar daily" :style="{ width: dailyPercent + '%' }"></div>
          </div>
          <div class="xp-text">
            <template v-if="stats.goalType === 'time'">
              <span>{{ Math.floor(stats.todayEarned / 60) }}</span> / <span>{{ Math.floor(stats.todayTarget! / 60) }}</span> 分钟
            </template>
            <template v-else>
              <span>{{ stats.todayEarned }}</span> / <span>{{ stats.todayTarget }}</span> XP
            </template>
          </div>
        </div>
        <div class="goal-type-switch">
          <button
            v-if="stats.goalType === 'xp'"
            class="switch-btn"
            @click="switchGoalType('time')"
          >切换到按时间</button>
          <button
            v-else
            class="switch-btn"
            @click="switchGoalType('xp')"
          >切换到按 XP</button>
        </div>
      </template>
    </div>

    <button data-test="start-practice" class="start-btn" @click="$router.push('/play')">
      开始练习
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { getStats, setDailyGoal, type Stats } from "@/api/stats";

const stats = ref<Stats>({
  totalXp: 0,
  level: 1,
  title: "打字新手",
  nextLevelXp: 500,
  streak: { current: 0, longest: 0, repairItems: 0 },
  todayTarget: null,
  todayEarned: 0,
  todayCompleted: false,
  goalType: null,
  todayTimeEarned: 0,
});

const activeTab = ref<"xp" | "time">("xp");
const customMinutes = ref<number>(10);

const xpPercent = computed(() => {
  if (!stats.value.nextLevelXp) return 100;
  const prevLevel = stats.value.level <= 1 ? 0 : [0, 500, 1500, 3000, 5000, 8000, 12000, 18000, 25000, 35000][stats.value.level - 1] || 0;
  const range = stats.value.nextLevelXp - prevLevel;
  return Math.min(100, ((stats.value.totalXp - prevLevel) / range) * 100);
});

const dailyPercent = computed(() => {
  if (!stats.value.todayTarget) return 0;
  return Math.min(100, (stats.value.todayEarned / stats.value.todayTarget) * 100);
});

async function loadStats() {
  stats.value = await getStats();
}

async function selectGoal(difficulty: "easy" | "normal" | "challenge", goalType: "xp" | "time") {
  stats.value = await setDailyGoal({ difficulty, goal_type: goalType });
}

async function selectCustomGoal() {
  const mins = customMinutes.value;
  if (!mins || mins < 5 || mins > 60) return;
  stats.value = await setDailyGoal({ difficulty: "custom", goal_type: "time", custom_minutes: mins });
}

async function switchGoalType(goalType: "xp" | "time") {
  const difficulty = stats.value.goalType === "time"
    ? (stats.value.todayTarget! >= 300 ? "easy" : stats.value.todayTarget! >= 150 ? "normal" : "challenge")
    : "easy";
  stats.value = await setDailyGoal({ difficulty, goal_type: goalType });
}

onMounted(loadStats);
</script>

<style scoped>
.home-page {
  text-align: center;
  padding: 2rem 0;
}

.level-section {
  margin-bottom: 1.5rem;
}

.level-badge {
  font-size: 2.5rem;
  font-weight: bold;
  color: #fbbf24;
}

.level-title {
  font-size: 1.2rem;
  color: #aaa;
  margin-top: 0.25rem;
}

.xp-section {
  margin-bottom: 1.5rem;
}

.xp-bar-container {
  background: #333;
  border-radius: 8px;
  height: 12px;
  overflow: hidden;
}

.xp-bar {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 8px;
  transition: width 0.3s ease;
}

.xp-bar.daily {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.xp-text {
  font-size: 0.85rem;
  color: #888;
  margin-top: 0.3rem;
}

.streak-section {
  margin-bottom: 1.5rem;
  font-size: 1.2rem;
}

.streak-icon {
  font-size: 1.5rem;
}

.repair-count {
  margin-left: 1rem;
  font-size: 0.9rem;
  color: #aaa;
}

.daily-goal-section {
  margin-bottom: 2rem;
  min-height: 80px;
}

.daily-goal-section h3 {
  margin-bottom: 0.75rem;
  color: #ccc;
}

.goal-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 0.75rem;
  justify-content: center;
}

.goal-tab {
  padding: 0.4rem 1.2rem;
  border: 1px solid #555;
  background: transparent;
  color: #aaa;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.goal-tab:first-child {
  border-radius: 8px 0 0 8px;
}

.goal-tab:last-child {
  border-radius: 0 8px 8px 0;
  border-left: none;
}

.goal-tab.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}

.goal-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.goal-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
}

.goal-btn.easy {
  background: #10b981;
  color: #fff;
}

.goal-btn.normal {
  background: #3b82f6;
  color: #fff;
}

.goal-btn.challenge {
  background: #ef4444;
  color: #fff;
}

.custom-goal {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.custom-goal label {
  color: #aaa;
  font-size: 0.9rem;
}

.custom-input {
  width: 60px;
  padding: 0.3rem 0.5rem;
  border: 1px solid #555;
  border-radius: 6px;
  background: #222;
  color: #fff;
  font-size: 0.9rem;
  text-align: center;
}

.custom-go {
  background: #6366f1;
  color: #fff;
  padding: 0.3rem 0.8rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.goal-complete {
  color: #10b981;
  font-size: 1.1rem;
  font-weight: bold;
}

.goal-type-switch {
  margin-top: 0.5rem;
}

.switch-btn {
  background: transparent;
  border: 1px solid #555;
  color: #888;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
}

.switch-btn:hover {
  border-color: #888;
  color: #ccc;
}

.start-btn {
  display: block;
  width: 100%;
  max-width: 280px;
  margin: 0 auto;
  padding: 1rem;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
}

.start-btn:hover {
  opacity: 0.9;
}
</style>
