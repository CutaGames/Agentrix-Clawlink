# Agentrix Desktop v0.1.0 — Audit Report & Optimization Plan

> Generated: 2026-03-15  
> Stack: Tauri 2 (Rust) + React (TypeScript) + Vite  
> Platform: Windows (primary), macOS/Linux (secondary)

---

## 1. Architecture Overview

```
desktop/
├── src-tauri/           # Rust backend (Tauri 2)
│   ├── src/
│   │   ├── lib.rs       # Command registration, WebView2 permissions, auth token
│   │   ├── commands.rs  # 22 bridge commands (workspace, file I/O, shell, context)
│   │   └── main.rs      # Entry point
│   ├── capabilities/    # Tauri v2 permission declarations
│   ├── permissions/     # Custom command permissions
│   └── Cargo.toml       # Dependencies
├── src/                 # React frontend (TypeScript)
│   ├── App.tsx          # Window routing (floating-ball / chat-panel / dev)
│   ├── components/      # 10 UI components
│   │   ├── ChatPanel.tsx         # Main chat interface (AI conversation)
│   │   ├── FloatingBall.tsx      # Always-on-top floating ball
│   │   ├── SettingsPanel.tsx     # Settings (account, voice, workspace, shortcuts)
│   │   ├── LoginPanel.tsx        # Login (email/password + social OAuth via browser)
│   │   ├── OnboardingPanel.tsx   # First-run onboarding wizard
│   │   ├── MessageBubble.tsx     # Chat message rendering (markdown, code blocks)
│   │   ├── VoiceButton.tsx       # Push-to-talk voice input
│   │   ├── ProactivePanel.tsx    # Proactive suggestions based on desktop context
│   │   ├── ApprovalSheet.tsx     # Risk-level approval for desktop actions
│   │   └── TaskTimeline.tsx      # Task execution timeline
│   └── services/        # 12 service modules
│       ├── store.ts              # Auth store (Zustand) + API client
│       ├── desktop.ts            # Desktop bridge invoke wrappers
│       ├── workspace.ts          # Workspace folder management
│       ├── voice.ts              # Voice recording (MediaRecorder → Whisper)
│       ├── sessionSync.ts        # Cross-device session sync (Socket.IO)
│       ├── desktopSync.ts        # Desktop automation sync (context, timeline)
│       ├── desktopAgentSync.ts   # Agent-driven desktop task orchestration
│       ├── proactive.ts          # Proactive suggestion engine
│       ├── clipboard.ts          # Clipboard monitoring
│       ├── network.ts            # Network status monitoring
│       ├── analytics.ts          # Anonymous usage analytics
│       └── AudioQueuePlayer.ts   # TTS audio queue playback
```

---

## 2. Module Completion Status

| Module | Status | Score | Notes |
|--------|--------|-------|-------|
| **Floating Ball** | ✅ Complete | 95% | Draggable, edge-snap, multi-monitor, logo |
| **Chat Panel** | ✅ Complete | 90% | Streaming AI, markdown, code blocks, attachments, model selector |
| **Login** | ✅ Complete | 85% | Email/password + social OAuth (opens browser) |
| **Onboarding** | ✅ Complete | 80% | 3-step wizard, skippable |
| **Settings** | ⚠️ Partial | 70% | Voice/autostart/shortcuts work; workspace was broken (FIXED) |
| **Voice Input** | ✅ Complete | 85% | Push-to-talk, Whisper STT, TTS playback queue |
| **Workspace / Coding Agent** | ⚠️ Partial | 60% | Rust commands exist but were NOT registered (FIXED); no file tree UI |
| **Desktop Context** | ✅ Complete | 85% | Active window, clipboard, process detection |
| **Command Execution** | ✅ Complete | 90% | Shell exec with timeout, working dir, output capture |
| **File I/O** | ✅ Complete | 85% | Read/write with 2MB limit, path traversal guard |
| **Proactive Suggestions** | ✅ Complete | 80% | Context-aware suggestions (code, clipboard, browser) |
| **Approval System** | ✅ Complete | 85% | 4-tier risk classification (L0-L3), approval sheet UI |
| **Task Timeline** | ✅ Complete | 80% | Step-by-step execution visualization |
| **Session Sync** | ⚠️ Partial | 50% | Socket.IO client exists but relies on in-memory backend Maps |
| **Desktop Agent Sync** | ⚠️ Partial | 55% | Polls backend, but data is in-memory (lost on restart) |
| **Auth Token** | ⚠️ Was broken | → FIXED | Now persisted to `%APPDATA%/Agentrix Desktop/auth_token` |
| **Auto-updater** | ✅ Configured | 75% | Tauri updater plugin + endpoint configured |
| **Analytics** | ✅ Complete | 70% | Basic anonymous event tracking |
| **Network Monitor** | ✅ Complete | 85% | Online/offline detection, reconnect handling |

**Overall Desktop Completion: ~75%**

---

## 3. Bugs Fixed in This Session

### Bug 1: "Select Folder" button fails
- **Root cause**: `lib.rs` `invoke_handler` only registered 5 commands. The 6 workspace commands (`desktop_bridge_set_workspace_dir`, `desktop_bridge_pick_workspace_dir`, `desktop_bridge_get_workspace_dir`, `desktop_bridge_list_workspace_dir`, `desktop_bridge_read_workspace_file`, `desktop_bridge_write_workspace_file`) existed in `commands.rs` but had no `#[tauri::command]` wrappers and were NOT in the handler.
- **Fix**: Added all 6 workspace `#[tauri::command]` wrappers + registered in `invoke_handler`.

### Bug 2: Manual workspace path input cannot be saved  
- **Root cause**: Same as Bug 1 — `desktop_bridge_set_workspace_dir` was not registered.
- **Fix**: Same fix — now registered and accessible.

### Bug 3 (bonus): Auth token not persisted across restarts
- **Root cause**: `desktop.ts` calls `desktop_bridge_get_auth_token` / `desktop_bridge_set_auth_token` / `desktop_bridge_delete_auth_token`, but these commands had NO Rust implementation at all.
- **Fix**: Added file-based auth token persistence in `lib.rs` (`%APPDATA%/Agentrix Desktop/auth_token`).

### Summary of commands registered: 5 → 26
Previously only 5 commands were in `invoke_handler`. Now all 26 are registered:
- Chat panel: 2
- Ball/monitor: 6  
- Workspace: 6
- Desktop bridge (commands/files/context): 8
- Auth token: 4

---

## 4. Optimization Plan

### Phase 1: Critical Fixes (P0) — 1-2 days
| # | Task | Impact |
|---|------|--------|
| 1.1 | ✅ **DONE** — Register all 26 Tauri commands | Unlocks workspace, file I/O, shell, context |
| 1.2 | ✅ **DONE** — Auth token file persistence | Login survives app restart |
| 1.3 | Add `tauri-plugin-dialog` to `invoke_handler` setup (already in Cargo.toml) | Ensures native dialog plugin is initialized |
| 1.4 | Fix CSP to allow WebSocket connections: add `wss://api.agentrix.top` | Session sync currently blocked by CSP |

### Phase 2: UX Polish (P1) — 3-5 days
| # | Task | Impact |
|---|------|--------|
| 2.1 | Workspace file tree panel inside ChatPanel | Users can browse/edit files without leaving app |
| 2.2 | Diff view for file write operations | Show before/after when agent edits files |
| 2.3 | Settings → keyboard shortcut customization | Currently hardcoded Ctrl+Shift+A / Ctrl+Shift+S |
| 2.4 | System tray icon + menu (right-click: show/hide, monitor switch, quit) | Better discoverability than floating ball alone |
| 2.5 | SettingsPanel → add model/provider selector | Currently model is only in ChatPanel dropdown |
| 2.6 | Dark/light theme toggle in Settings | Currently dark-only |

### Phase 3: Persistence & Sync (P2) — 1-2 weeks  
| # | Task | Impact |
|---|------|--------|
| 3.1 | Migrate session sync from in-memory Maps to DB | Sessions survive backend restart |
| 3.2 | Desktop agent task history persistence | Task timeline survives app restart |
| 3.3 | Chat history stored locally (SQLite via `tauri-plugin-sql`) | Offline chat history |
| 3.4 | Bidirectional sync: desktop ↔ mobile ↔ web sessions | Core cross-device differentiator |

### Phase 4: Advanced Features (P3) — 2-4 weeks
| # | Task | Impact |
|---|------|--------|
| 4.1 | Multi-tab chat (multiple concurrent sessions) | Power users run parallel tasks |
| 4.2 | Screen capture + OCR for visual context | Agent sees what user sees |
| 4.3 | Git integration (diff, commit, PR from chat) | Developer workflow acceleration |
| 4.4 | Plugin system for workspace tools | Extensibility (linter, formatter, test runner) |
| 4.5 | Secure credential vault (replace plain-text auth_token) | Use OS keychain (Windows Credential Locker) |
| 4.6 | Notification center (system tray + in-app) | Task completion alerts, approval requests |

### Phase 5: Production Readiness (P4) — 1 week
| # | Task | Impact |
|---|------|--------|
| 5.1 | Code signing (Windows Authenticode + macOS notarization) | No "unknown publisher" warnings |
| 5.2 | Auto-update testing with staging endpoint | Safe rollouts |
| 5.3 | Crash reporting (Sentry or custom) | Bug visibility |
| 5.4 | E2E tests (Tauri test driver + Playwright for webview) | Regression prevention |
| 5.5 | Installer UX (NSIS wizard with license, install path) | Professional distribution |

---

## 5. Files Modified in This Session

| File | Change |
|------|--------|
| `desktop/src-tauri/src/lib.rs` | Added 21 `#[tauri::command]` wrappers, auth token persistence, registered all 26 commands |
| `desktop/src-tauri/permissions/desktop-commands.toml` | Added 15 missing command permissions |

---

## 6. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Auth token stored as plain text file | Medium | Phase 4.5: migrate to OS keychain |
| No code signing | High | Phase 5.1: Authenticode + notarization before public release |
| Session sync uses in-memory Maps on backend | High | Phase 3.1: DB persistence (same issue as mobile) |
| CSP may block some API calls | Low | Phase 1.4: audit and relax CSP for known endpoints |
| No crash reporting | Medium | Phase 5.3: add Sentry integration |
