import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./SessionSidebar.tsx", import.meta.url), "utf8");
const sessionItemSource = source.slice(source.indexOf("function SessionItem("));

test("only Shift+click bypasses session deletion confirmation", () => {
  assert.match(
    sessionItemSource,
    /const handleDeleteClick[\s\S]*?if \(e\.shiftKey\) \{\s*void performDelete\(\);\s*\} else \{\s*setConfirmDelete\(true\);/,
  );
});

test("does not register row-level session deletion shortcuts", () => {
  assert.doesNotMatch(sessionItemSource, /const handleKeyDown/);
  assert.doesNotMatch(sessionItemSource, /onKeyDown=\{handleKeyDown\}/);
  assert.doesNotMatch(sessionItemSource, /tabIndex=\{0\}/);
});

test("polls running sessions only while the tab is visible", () => {
  assert.doesNotMatch(source, /new EventSource\("\/api\/agent\/running\/events"\)/);
  assert.match(source, /fetch\("\/api\/agent\/running"/);
  assert.match(source, /document\.visibilityState !== "visible"/);
  assert.match(source, /document\.addEventListener\("visibilitychange", onVisibilityChange\)/);
});

test("exposes the polled running-session set to the shell", () => {
  assert.match(source, /onRunningSessionIdsChange\?: \(ids: Set<string>\) => void/);
  assert.match(source, /onRunningSessionIdsChange\?\.\(runningSessionIds\)/);
});

test("includes project activity counts in accessible labels", () => {
  assert.match(
    source,
    /aria-label=\{`\$\{t\("sidebar\.agentRunning"\)\} \(\$\{activity\.running\}\)`\}/,
  );
  assert.match(
    source,
    /aria-label=\{`\$\{t\("sidebar\.newSessionActivity"\)\} \(\$\{activity\.unread\}\)`\}/,
  );
});

test("does not persist an unchanged fallback title ending in whitespace", () => {
  assert.match(
    sessionItemSource,
    /const name = renameValue\.trim\(\);[\s\S]*?if \(renameValue === title \|\| name === \(session\.name \?\? ""\)\) return;/,
  );
});

test("offers the downstream context-menu hook only on a normal session row", () => {
  assert.match(sessionItemSource, /const handleContextMenu[\s\S]*?dispatchSessionRowContextMenu\(\{/);
  assert.match(
    sessionItemSource,
    /onContextMenu=\{confirmDelete \|\| renaming \? undefined : handleContextMenu\}/,
  );
});

test("manual and lifecycle refreshes bypass the server session-list cache", () => {
  assert.match(source, /force \? "\/api\/sessions\?force=1" : "\/api\/sessions"/);
  assert.match(source, /cache: "no-store"/);
  assert.match(source, /loadSessions\(isFirst, !isFirst\)/);
  assert.match(source, /onClick=\{\(\) => loadSessions\(false, true\)\}/);
  assert.match(source, /loadSessions\(false, true\);[\s\S]*?onBackgroundTaskDone/);
});

test("does not expose disk-backed actions for transient sessions", () => {
  assert.match(sessionItemSource, /if \(session\.transient\) return;/);
  assert.match(sessionItemSource, /\{hovered && !session\.transient && \(/);
});

test("allows transient running sessions to be dragged into conversation folders", () => {
  assert.match(sessionItemSource, /draggable=\{!confirmDelete && !renaming\}/);
  assert.doesNotMatch(sessionItemSource, /draggable=\{[^}]*session\.transient/);
});

test("organizes sessions into persistent drag-and-drop folders", () => {
  assert.match(source, /loadConversationFolderState\(\)/);
  assert.match(source, /saveConversationFolderState\(next\)/);
  assert.match(source, /event\.dataTransfer\.getData\("text\/session-id"\)/);
  assert.match(source, /<ConversationFolderSection/);
  assert.match(source, /moveSessionToFolder\(sessionId, null\)/);
});

test("keeps folder drop targets visible while dragging older sessions", () => {
  assert.match(source, /draggingSessionId && projectFolders\.length > 0/);
  assert.match(source, /<ConversationFolderDropTray/);
  assert.match(source, /position: "sticky", top: 0, zIndex: 20/);
});

test("aggregates running and unread activity on conversation folders", () => {
  assert.match(source, /const folderSessions = flattenSessionTree\(nodes\)/);
  assert.match(source, /running: folderSessions\.filter\(\(session\) => runningSessionIds\.has\(session\.id\)\)\.length/);
  assert.match(source, /unread: folderSessions\.filter\(\(session\) => unreadSessionIds\.has\(session\.id\)\)\.length/);
  assert.match(source, /showProjectActivity\(folderActivity, t\)/);
});

test("resizes conversation history and the file explorer with an accessible separator", () => {
  assert.match(source, /role="separator"/);
  assert.match(source, /onPointerDown=\{beginSplitResize\}/);
  assert.match(source, /saveHistoryRatio\(latestRatio\)/);
  assert.match(source, /event\.key === "ArrowUp"/);
  assert.match(source, /event\.key === "ArrowDown"/);
});
