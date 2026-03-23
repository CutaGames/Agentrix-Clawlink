import {
  claimDesktopCommand,
  completeDesktopCommand,
  fetchDesktopSyncState,
  fetchPendingDesktopCommands,
  syncDesktopHeartbeat,
  syncDesktopTask,
  type DesktopRemoteCommand,
} from "./desktopSync";
import {
  getActiveDesktopWindow,
  getDesktopContext,
  getDesktopDeviceId,
  listDesktopWindows,
  openDesktopBrowser,
  readDesktopFile,
  runDesktopCommand,
  writeDesktopFile,
} from "./desktop";

const HEARTBEAT_MS = 15_000;
const STATE_POLL_MS = 5_000;
const COMMAND_POLL_MS = 3_000;

let activeToken: string | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let stateTimer: ReturnType<typeof setInterval> | null = null;
let commandTimer: ReturnType<typeof setInterval> | null = null;
let commandInFlight = new Set<string>();
let socketListenerAttached = false;

function dispatchDesktopState(detail: unknown) {
  window.dispatchEvent(new CustomEvent("agentrix:desktop-sync-state", { detail }));
}

function dispatchDesktopCommand(detail: unknown) {
  window.dispatchEvent(new CustomEvent("agentrix:desktop-command-updated", { detail }));
}

async function refreshState() {
  if (!activeToken) return;
  const state = await fetchDesktopSyncState(activeToken);
  dispatchDesktopState(state);
}

async function executeRemoteCommand(command: DesktopRemoteCommand) {
  if (!activeToken || commandInFlight.has(command.commandId)) return;
  commandInFlight.add(command.commandId);

  const startedAt = Date.now();
  const timelineBase = {
    id: command.commandId,
    title: command.title,
    detail: typeof command.payload?.path === "string"
      ? command.payload.path
      : typeof command.payload?.command === "string"
        ? command.payload.command
        : undefined,
    kind: command.kind,
    riskLevel: command.kind === "run-command" ? "L2" : command.kind === "write-file" ? "L1" : "L0",
  } as const;

  try {
    await claimDesktopCommand(activeToken, command.commandId);
    await syncDesktopTask(activeToken, {
      taskId: command.commandId,
      title: command.title,
      summary: `Remote ${command.kind}`,
      sessionId: command.sessionId,
      status: "executing",
      startedAt,
      timeline: [{ ...timelineBase, status: "running", startedAt }],
    });

    const payload = command.payload || {};
    let result: Record<string, unknown>;

    switch (command.kind) {
      case "context":
        result = { context: await getDesktopContext() };
        break;
      case "active-window":
        result = { activeWindow: await getActiveDesktopWindow() };
        break;
      case "list-windows":
        result = { windows: await listDesktopWindows() };
        break;
      case "run-command":
        result = await runDesktopCommand(
          String(payload.command || ""),
          typeof payload.workingDirectory === "string" ? payload.workingDirectory : undefined,
          typeof payload.timeoutMs === "number" ? payload.timeoutMs : 60_000,
        ) as unknown as Record<string, unknown>;
        break;
      case "read-file":
        result = await readDesktopFile(String(payload.path || "")) as unknown as Record<string, unknown>;
        break;
      case "write-file":
        result = await writeDesktopFile(
          String(payload.path || ""),
          String(payload.content || ""),
        ) as unknown as Record<string, unknown>;
        break;
      case "open-browser":
        result = { opened: await openDesktopBrowser(String(payload.url || "")) };
        break;
      default:
        throw new Error(`Unsupported desktop command: ${command.kind}`);
    }

    await completeDesktopCommand(activeToken, command.commandId, {
      status: "completed",
      result,
    });
    await syncDesktopTask(activeToken, {
      taskId: command.commandId,
      title: command.title,
      summary: `Remote ${command.kind}`,
      sessionId: command.sessionId,
      status: "completed",
      startedAt,
      finishedAt: Date.now(),
      timeline: [{ ...timelineBase, status: "completed", startedAt, finishedAt: Date.now() }],
    });
    dispatchDesktopCommand({ ...command, status: "completed", result });
  } catch (error: any) {
    const message = error?.message || String(error);
    if (activeToken) {
      await completeDesktopCommand(activeToken, command.commandId, {
        status: "failed",
        error: message,
      }).catch(() => {});
      await syncDesktopTask(activeToken, {
        taskId: command.commandId,
        title: command.title,
        summary: `Remote ${command.kind}`,
        sessionId: command.sessionId,
        status: "failed",
        startedAt,
        finishedAt: Date.now(),
        timeline: [{ ...timelineBase, status: "failed", startedAt, finishedAt: Date.now(), output: message }],
      }).catch(() => {});
    }
    dispatchDesktopCommand({ ...command, status: "failed", error: message });
  } finally {
    commandInFlight.delete(command.commandId);
    void refreshState();
  }
}

async function pollCommands() {
  if (!activeToken) return;
  const { commands } = await fetchPendingDesktopCommands(activeToken, getDesktopDeviceId());
  for (const command of commands) {
    void executeRemoteCommand(command);
  }
}

async function heartbeat() {
  if (!activeToken) return;
  await syncDesktopHeartbeat(activeToken);
}

function attachSocketListener() {
  if (socketListenerAttached) return;
  socketListenerAttached = true;
  window.addEventListener("agentrix:socket-event", ((event: Event) => {
    const detail = (event as CustomEvent).detail || {};
    if (detail.event === "desktop-sync:command") {
      void pollCommands();
    }
    if (
      detail.event === "desktop-sync:command-updated" ||
      detail.event === "desktop-sync:task" ||
      detail.event === "desktop-sync:approval" ||
      detail.event === "desktop-sync:approval-response" ||
      detail.event === "desktop-sync:presence"
    ) {
      void refreshState();
    }
  }) as EventListener);
}

export function startDesktopAgentSync(token: string) {
  activeToken = token;
  attachSocketListener();

  if (!heartbeatTimer) {
    heartbeatTimer = setInterval(() => {
      void heartbeat();
    }, HEARTBEAT_MS);
  }

  if (!stateTimer) {
    stateTimer = setInterval(() => {
      void refreshState();
    }, STATE_POLL_MS);
  }

  if (!commandTimer) {
    commandTimer = setInterval(() => {
      void pollCommands();
    }, COMMAND_POLL_MS);
  }

  void heartbeat();
  void refreshState();
  void pollCommands();
}

export function stopDesktopAgentSync() {
  activeToken = null;
  commandInFlight = new Set<string>();
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (stateTimer) {
    clearInterval(stateTimer);
    stateTimer = null;
  }
  if (commandTimer) {
    clearInterval(commandTimer);
    commandTimer = null;
  }
}