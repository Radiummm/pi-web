import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./AppShell.tsx", import.meta.url), "utf8");

test("keeps every terminal tab mounted while chat remains visible", () => {
  assert.match(source, /\{terminalTabs\.map\(\(tab\) => \(/);
  assert.match(source, /hidden=\{tab\.id !== activeFileTabId\}/);
  assert.match(source, /active=\{rightPanelOpen && tab\.id === activeFileTabId\}/);
  assert.doesNotMatch(source, /const \[mainView, setMainView\]/);
});
