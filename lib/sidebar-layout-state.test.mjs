import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { clampHistoryRatio, loadHistoryRatio, saveHistoryRatio } = await jiti.import("./sidebar-layout-state.ts");

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
}

test("clamps persisted sidebar ratios", () => {
  assert.equal(clampHistoryRatio(-1), 0.2);
  assert.equal(clampHistoryRatio(2), 0.8);
  assert.equal(clampHistoryRatio(Number.NaN), 0.5);
});

test("saves and restores the history panel ratio", () => {
  const storage = createStorage();
  saveHistoryRatio(0.63, storage);
  assert.equal(loadHistoryRatio(storage), 0.63);
});

test("uses the default ratio when storage is malformed", () => {
  assert.equal(loadHistoryRatio(createStorage({ "pi-web:sidebar:history-ratio": "not-a-number" })), 0.5);
});
