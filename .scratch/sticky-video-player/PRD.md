Status: ready-for-agent

# Sticky Video Player — 视频始终可见 PRD

## Problem Statement

孩子在练习 Video Material 打字时，随着打完更多 Segment，页面内容增长，浏览器向下滚动，视频播放器被滚出视口看不到了。视频是吸引孩子打字的核心动力——看不到视频，练习就变成了枯燥的纯打字任务。

## Solution

在 TypingSession 中，将 VideoPlayer 容器设为 `position: sticky; top: 0`，使其在滚动时始终粘在容器顶部。同时添加一个收起/展开按钮，让孩子在视频暂停等待期间可以折叠视频，腾出更多空间给打字区域。

## User Stories

### 视频始终可见

1. As a player, I want the video to stay visible at the top while I scroll down through completed segments, so that I can always see the video content
2. As a player, I want the video to be sticky only within the typing area, so that when I scroll to the result/completion screen the video naturally scrolls away
3. As a player, I want the sticky behavior to work on all screen sizes, so that I have a consistent experience on tablet and laptop

### 收起/展开

4. As a player, I want a button to collapse the video player, so that I can free up screen space when the video is paused and I don't need to watch it
5. As a player, I want a button to expand the video player after collapsing it, so that I can see the video again when the next segment plays
6. As a player, I want the collapse/expand transition to be smooth (CSS transition), so that the UI doesn't jump
7. As a player, I want the collapse button to be clearly visible on the video player, so that I can find it easily
8. As a player, I want the video to keep playing audio even when collapsed, so that I don't miss any sound while typing

### 降级

9. As a player, I want non-video Materials to be completely unaffected by this change, so that my existing typing experience doesn't change
10. As a player, I want the collapse/expand state to reset when I start a new Material, so that I always start with the video visible

## Implementation Decisions

### Sticky Container Strategy

Add a wrapper `div` around the `VideoPlayer` component in `TypingSession.vue` with `position: sticky; top: 0; z-index: 10`. The sticky container sits inside `.typing-session` which is the scroll container's descendant. When the user scrolls past the video's natural position, it sticks at the top of the typing session area.

Key CSS:
- The sticky wrapper needs an explicit `z-index` to stay above scrolling content
- The sticky wrapper should have the same background as the video player wrapper (black) to avoid content showing through during scroll
- `max-height` transition on the collapse toggle should animate smoothly

### Collapse Toggle

Add a `videoCollapsed` ref in `TypingSession.vue`. The sticky wrapper's height is controlled by this ref:
- `videoCollapsed = false`: wrapper has natural height (video visible), sticky active
- `videoCollapsed = true`: wrapper has `max-height: 0; overflow: hidden` (video hidden), sticky becomes irrelevant since height is 0

A toggle button (▲ / ▼ or similar) is positioned absolutely in the top-right corner of the sticky wrapper. When collapsed, the button shows at the original position as a small "展开视频" bar so the user can find it.

### Audio During Collapse

When video is collapsed, the `<video>` element remains in the DOM (just hidden via `max-height: 0; overflow: hidden`). Audio continues to play. No JS changes needed for this — it's a natural consequence of the CSS-only hide approach.

### Modules to Modify

**TypingSession.vue** (primary change):
- Add `videoCollapsed` ref
- Wrap `VideoPlayer` + buffering indicator in a `div.video-sticky-wrapper`
- Add toggle button inside the wrapper
- Add CSS for sticky, collapse animation, and toggle button styling

**VideoPlayer.vue**: No changes needed. Sticky is applied on the parent wrapper, not on VideoPlayer itself.

### Non-Video Materials

The `v-if="videoUrl"` guard already controls whether VideoPlayer renders. The sticky wrapper and toggle button are inside this same conditional. Text-only Materials see zero change.

## Testing Decisions

### What makes a good test

Test user-visible behavior: the sticky wrapper is rendered, the toggle button exists and toggles the collapsed state, and the CSS classes change correctly.

### Modules to test

**TypingSession component tests** (extend existing or add new):
- Video Material renders a sticky wrapper around VideoPlayer
- Toggle button is visible when video is present
- Clicking toggle button toggles `videoCollapsed` state
- Collapsed state applies the correct CSS class
- Non-video Material does not render sticky wrapper or toggle button

### Prior art

- Follow `TypingSession.test.ts` pattern (if exists) or `VideoPlayer.test.ts` pattern
- Use Vue TestUtils `mount` with stubs for child components
- Assert on DOM structure and class bindings

## Out of Scope

- **Mini floating window (PiP)**: considered but rejected in favor of simpler sticky approach
- **Split layout (video left, typing right)**: not needed for mobile/tablet-first audience
- **Remembering collapse state across sessions**: always start expanded
- **Auto-collapse when video is paused**: manual control only, avoids confusion for young users
- **Draggable video position**: unnecessary complexity for sticky approach

## Further Notes

- This is a CSS-first solution with minimal JS (one ref + one toggle function). The sticky behavior and collapse animation are purely CSS-driven.
- The decision to use sticky (not fixed) was deliberate: sticky respects the `.typing-session` container boundary, so when the user finishes all segments and the result overlay appears, the video naturally scrolls away. Fixed positioning would require manual cleanup logic.
- The collapse feature addresses the trade-off that a sticky 40vh video consumes significant screen real estate on smaller devices. Users can voluntarily trade visibility for space.
