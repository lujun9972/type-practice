Status: ready-for-agent

# Video Material — 视频打字练习 PRD

## Problem Statement

孩子打字练习的动力来源是「打完才能看到更多」——但纯文本 Material 的激励有限。孩子喜欢看动画片、短视频，如果能通过打字来驱动视频播放，每打完一句字幕就能看到对应的视频片段，打字练习就从"任务"变成了"解锁喜欢的内容"的游戏。

## Solution

在现有 Material 体系中新增 **Video Material** 类型。管理员上传视频文件和字幕文件（SRT/VTT），后端解析字幕为带时间戳的 Segment。孩子在 PlayPage 打字时，每打完一个 Segment，视频播放该字幕对应的片段（延伸到下一句开始），然后暂停等待下一句打完。视频与文本 Material 共享同一套 Progress、XP、Hint、Skip 机制。

## User Stories

### 视频素材创建（管理员）

1. As an admin, I want to switch to "视频素材" mode in the material creation form, so that I can upload video + subtitle instead of typing text
2. As an admin, I want to upload a video file (mp4, webm, etc.) when creating a Video Material, so that the video is stored on the server
3. As an admin, I want to upload a subtitle file (SRT or VTT) alongside the video, so that the system knows what text to display and when
4. As an admin, I want to see a preview of parsed subtitle segments with their timestamps before saving, so that I can verify the subtitles were parsed correctly
5. As an admin, I want to delete individual subtitle segments that are noise (e.g. `[音乐]`, `(笑声)`), so that the player only types meaningful dialogue
6. As an admin, I want to edit the text content of individual subtitle segments, so that I can fix typos from the subtitle file
7. As an admin, I want to be warned with a confirmation prompt when uploading a video file with the same name as an existing one, so that I don't accidentally overwrite another material's video
8. As an admin, I want the system to automatically detect the encoding of subtitle files (UTF-8, GBK, etc.), so that Chinese subtitle files display correctly regardless of origin
9. As an admin, I want the system to automatically clean formatting tags (`<i>`, `<b>`, `{\an8}`, etc.) from subtitles, so that the player doesn't need to type formatting markup

### 视频素材管理

10. As an admin, I want Video Materials to appear alongside text Materials in the Material Library, so that I manage them in one place
11. As an admin, I want to edit a Video Material's title, tags, and subtitle content after creation, so that I can fix mistakes
12. As an admin, I want deleting a Video Material to also delete the associated video file from disk, so that storage doesn't accumulate orphaned files
13. As an admin, I want Video Materials to support the same tag system as text Materials, so that I can organize them with tags like "视频"

### 视频打字体验（玩家）

14. As a player, I want to see a video player above the typing area when playing a Video Material, so that I can watch the video as I type
15. As a player, I want the video to play the corresponding subtitle segment after I finish typing each segment, so that typing directly drives the video playback
16. As a player, I want the video to extend playback to the start of the next subtitle before pausing, so that transitions feel smooth instead of abrupt cuts
17. As a player, I want the video to stay paused on the last frame while I'm typing the next segment, so that I have visual context without distraction
18. As a player, I want a read-only progress bar on the video player showing my position in the video, so that I can see how much I've completed
19. As a player, I want to adjust the video volume, so that I can control the audio level
20. As a player, I want the system to wait until the first subtitle segment's video is buffered before I start typing, so that the first playback works smoothly
21. As a player, I want to use Hint (pinyin/letter hints) and Skip on subtitle segments just like text segments, so that I have the same help mechanisms
22. As a player, I want to earn XP for typing subtitle text the same way as text Materials (1 correct char = 1 XP), so that video practice contributes to my progress equally
23. As a player, I want subtitle typing to work in both normal and pinyin mode, so that I can practice either input method with video content
24. As a player, I want to see the standard completion screen (time, accuracy, speed) after finishing all subtitle segments, so that I get my performance summary

### 进度恢复

25. As a player, I want my Video Material progress to be saved the same way as text Materials, so that I can resume where I left off
26. As a player, I want the video to seek directly to the current subtitle position when I resume a Video Material, so that I see the right frame
27. As a player, I want completed subtitle segments to show read-only scores (same as text Materials), so that I can see my past performance

### 导入导出

28. As an admin, I want Video Materials to be included in JSON exports with their subtitle data (but not the video file), so that I can back up the text content
29. As an admin, I want to be prompted to re-upload the video file when importing a Video Material from JSON, so that the material is fully functional after import

## Implementation Decisions

### Data Model Extensions

**Segment type extension**: Add optional timestamp fields to the existing Segment interface rather than creating a new type. A subtitle Segment uses `type: "text"` with additional `startTimeMs` and `endTimeMs` fields. This allows TypingSession to reuse all existing typing logic without branching on a new segment type.

Segment shape after extension:
```
{
  type: "text" | "image",
  content?: string,
  url?: string,
  position?: number,
  startTimeMs?: number,  // subtitle start time in ms
  endTimeMs?: number,    // subtitle end time in ms
}
```

**Material extension**: Add optional `videoUrl` field to the existing Material model. When `videoUrl` is present, the Material is treated as a Video Material in the frontend (video player is shown). No separate model or table.

```
{
  id: string,
  title: string,
  tags: string[],
  content: string,       // concatenated subtitle text
  segments: Segment[],
  videoUrl?: string,     // path to video file, relative to video storage root
}
```

### Backend Modules

**1. Subtitle Parser** (`backend/app/subtitle_parser/`): Deep module. Pure function that takes subtitle file content + format hint → returns list of `{"content": str, "startTimeMs": int, "endTimeMs": int}`. Responsibilities:
- Parse SRT format (index → timestamp → text blocks)
- Parse VTT format (similar structure with WEBVTT header)
- Auto-detect encoding via chardet library
- Clean formatting tags: strip `<b>`, `<i>`, `<u>`, `{\an8}` and similar SRT/ASS control sequences
- Validate: must produce at least 1 valid segment, reject with specific error messages on malformed input

**2. Video File Store** (`backend/app/store.py` extension): New module alongside MaterialStore. Responsibilities:
- Accept uploaded video file via multipart form data
- Store to configurable directory (`backend/data/videos/`)
- Preserve original filename; if a file with the same name exists, return a conflict signal so the API layer can prompt confirmation
- Serve video files via a new GET endpoint with appropriate Content-Type and Range header support (for video seeking/buffering)
- Delete video file when associated Material is deleted

**3. Video Material API** (new endpoints in `backend/app/main.py`):
- `POST /api/materials/video` — multipart upload (video file + subtitle file + title + tags). Parses subtitle, creates Material with `videoUrl` field
- `PUT /api/materials/{id}/video` — update subtitle content (re-parse) or replace video file
- `GET /api/videos/{filename}` — serve video files with Range header support
- Reuse existing `DELETE /api/materials/{id}` — extend to also delete the video file if `videoUrl` is present

### Frontend Modules

**4. Video Player Component** (`frontend/src/components/VideoPlayer.vue`): Deep module. Wraps HTML5 `<video>` element with programmatic control. Interface:
- Props: `videoUrl`, `currentStartTimeMs`, `currentEndTimeMs`, `autoplay`
- Emits: `segment-playback-complete`, `buffered`
- Behavior: on receiving new start/end times → seek to start → play → pause at end (extended to next subtitle start). Read-only progress bar + volume control. No user-draggable seek.

**5. TypingSession Extension**: Minimal changes to existing `TypingSession.vue`:
- Accept optional `videoUrl` prop
- When `videoUrl` is present, render `VideoPlayer` above the typing area
- On `segment-complete` event → pass the completed segment's timestamps to VideoPlayer
- All existing typing/hint/skip logic unchanged — subtitle segments use `type: "text"` so no branching needed

**6. Admin Page Video Upload**: Extend `AdminPage.vue`:
- Add a toggle switch: "文本素材" / "视频素材"
- In video mode: show file upload fields (video + subtitle) instead of textarea
- After subtitle upload → call parse endpoint → show editable segment list
- Editing: delete segments or modify text content inline. No merge/split.

### Playback Behavior

The core playback flow:
1. Page loads → video loads → wait for first segment to buffer → enable typing
2. Player types segment N → `segment-complete` fires
3. VideoPlayer receives `startTimeMs[N]` and `startTimeMs[N+1]` (or video end for last segment)
4. Video seeks to `startTimeMs[N]`, plays until `startTimeMs[N+1]`, pauses
5. Player types segment N+1 → repeat
6. After last segment → show standard completion screen

For progress resumption: on page load, if `startIndex > 0`, video seeks to `startTimeMs[startIndex]` and stays paused on that frame.

### File Handling

- Video files stored in `backend/data/videos/` with original filename
- Same-name overwrite: API checks for existing file, returns conflict status, frontend shows confirmation dialog. On confirm, overwrite proceeds.
- Maximum file size: configurable, suggest 500MB default
- Supported video formats: mp4, webm (browser-compatible formats)

### Subtitle Format Support

- SRT (.srt): `index → timestamp → text` blocks separated by blank lines
- VTT (.vtt): WEBVTT header + similar timestamp-text structure
- Format auto-detection by file extension and content inspection
- Both converted to same internal representation by the Subtitle Parser

### Export/Import

- Export: Video Materials included in JSON export with all fields except the video file itself. `videoUrl` is preserved in the export.
- Import: When importing a Material with `videoUrl`, the system detects the missing video file and shows a prompt to re-upload. The material can still be imported (as incomplete) or skipped.

## Testing Decisions

### What makes a good test

Tests should verify external behavior, not implementation details. For pure functions (subtitle parser), test input/output pairs with edge cases. For API endpoints, test HTTP request/response including error cases. For Vue components, test user-visible behavior (rendered output, emitted events).

### Modules to test

**1. Subtitle Parser** — Pure function, highest test priority. Test cases:
- Valid SRT with multiple entries → correct segment list with timestamps
- Valid VTT with multiple entries → correct segment list
- Mixed Chinese/English content preserved correctly
- Formatting tags (`<i>`, `<b>`, `{\an8}`) stripped from output
- Malformed SRT (missing timestamps, empty blocks) → clear error messages
- Empty file → error
- GBK-encoded file → parsed correctly (encoding auto-detection)
- UTF-8 BOM file → parsed correctly
- Single-entry subtitle → one segment

**2. Video File Store** — File system operations. Test cases:
- Upload video → file exists on disk with correct name
- Upload video with existing name → conflict detected
- Delete material with video → file removed from disk
- Delete material without video → no file operation
- Serve video → correct Content-Type, Range header support

**3. Video Player Component** — Vue component test. Test cases:
- Renders video element with correct source
- Receives start/end time → seeks and plays to correct position
- Pauses at end time (extended to next segment start)
- Emits `buffered` event when first segment is ready
- Volume control works
- Progress bar reflects playback position (read-only, no seeking)

**4. TypingSession Extension** — Vue component test (extend existing tests). Test cases:
- Video Material renders VideoPlayer above typing area
- Completing a segment passes correct timestamps to VideoPlayer
- Hint/Skip work identically for subtitle segments
- XP emission unchanged
- Progress save/load works for Video Materials

### Prior art

- **Subtitle Parser tests** → follow `test_splitter.py` pattern (class per format, pure function tests)
- **Video API tests** → follow `test_materials_api.py` pattern (FastAPI TestClient, tmp_path fixture)
- **Video Player tests** → follow `TypingSegment.test.ts` pattern (Vue TestUtils, emitted event assertions)
- **TypingSession tests** → extend existing `TypingSession.test.ts`

## Out of Scope

- **ASS/SSA subtitle format** — complex styling features unnecessary for typing practice; can add later if needed
- **Subtitle merge/split editing** — first version only supports delete and text modification
- **External video URLs** (YouTube, Bilibili) — only local file upload supported
- **Full video replay on completion** — standard completion screen only, no "watch full video" button
- **Video transcoding/conversion** — admin must upload browser-compatible formats (mp4, webm)
- **Multiple subtitle tracks** — one subtitle file per video
- **Video thumbnail generation** — video shows first frame or black until first play
- **Offline video caching** — not applicable for single-user local deployment
- **Video Material-specific settings** — uses same global settings as text Materials

## Further Notes

- This feature extends the existing Material model rather than creating a parallel system. The key insight is that subtitle text IS text content — it just happens to have timestamps attached. This minimizes code duplication across Progress, XP, Hint, Skip, and all gamification systems.
- The Subtitle Parser is designed as the deepest module — it encapsulates all format-specific parsing logic (SRT, VTT) behind a simple function interface. Adding a new format (e.g. ASS) later means adding a parser function, not touching any other code.
- CONTEXT.md has been updated with the Video Material domain vocabulary and relationships.
