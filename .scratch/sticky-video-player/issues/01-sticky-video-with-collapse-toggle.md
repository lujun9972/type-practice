Status: ready-for-agent

## Parent

`.scratch/sticky-video-player/PRD.md`

## What to build

在 TypingSession.vue 中为 Video Material 的 VideoPlayer 添加 sticky 定位和收起/展开功能：

1. **Sticky 容器**：用一个 `position: sticky; top: 0` 的 wrapper div 包裹 VideoPlayer 和 buffering 提示，使其在打字区域滚动时始终粘在顶部可见。
2. **收起/展开 toggle**：在 sticky wrapper 内加一个按钮（右上角），点击切换 `videoCollapsed` 状态。收起时 wrapper `max-height: 0; overflow: hidden`，视频隐藏但音频继续；展开时恢复自然高度。CSS transition 实现平滑过渡。
3. **边界情况**：所有新元素都在 `v-if="videoUrl"` 内，非视频素材完全不受影响。

## Acceptance criteria

- [ ] VideoPlayer 被 sticky wrapper 包裹，滚动时视频始终可见
- [ ] sticky 只在 .typing-session 容器范围内生效（滚出打字区域后视频自然消失）
- [ ] 右上角有收起/展开按钮，点击切换视频可见性
- [ ] 收起时 max-height 动画平滑，音频继续播放
- [ ] 收起后有可见的"展开视频"提示条
- [ ] 非视频素材不受任何影响
- [ ] 新增组件测试覆盖：sticky wrapper 渲染、toggle 交互、collapsed 状态 CSS
- [ ] 所有现有测试仍然通过

## Blocked by

None - can start immediately
