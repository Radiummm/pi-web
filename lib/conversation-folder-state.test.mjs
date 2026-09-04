import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const {
  deleteConversationFolder,
  emptyConversationFolderState,
  loadConversationFolderState,
  resolveConversationFolderAssignments,
  saveConversationFolderState,
} = await jiti.import("./conversation-folder-state.ts");

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
}

test("saves and restores conversation folders", () => {
  const storage = createStorage();
  const state = {
    folders: [{ id: "folder-1", name: "Research", projectRoot: "/repo", collapsed: false }],
    assignments: { child: "folder-1", unfiled: null },
  };

  saveConversationFolderState(state, storage);
  assert.deepEqual(loadConversationFolderState(storage), state);
});

test("inherits a parent folder while allowing an explicit unfiled override", () => {
  const sessions = [
    { id: "root" },
    { id: "child", parentSessionId: "root" },
    { id: "grandchild", parentSessionId: "child" },
  ];
  const resolved = resolveConversationFolderAssignments(
    sessions,
    { root: "folder-1", child: null },
    new Set(["folder-1"]),
  );

  assert.equal(resolved.get("root"), "folder-1");
  assert.equal(resolved.get("child"), null);
  assert.equal(resolved.get("grandchild"), null);
});

test("deleting a folder keeps its sessions as explicitly unfiled", () => {
  const state = {
    folders: [{ id: "folder-1", name: "Research", projectRoot: "/repo", collapsed: false }],
    assignments: { root: "folder-1" },
  };

  assert.deepEqual(deleteConversationFolder(state, "folder-1"), {
    folders: [],
    assignments: { root: null },
  });
});

test("falls back safely for unavailable or malformed storage", () => {
  assert.deepEqual(loadConversationFolderState(null), emptyConversationFolderState());
  assert.deepEqual(loadConversationFolderState(createStorage({ "pi-web:conversation-folders": "{" })), emptyConversationFolderState());
});
