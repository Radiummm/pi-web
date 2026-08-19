import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./PermissionControl.tsx", import.meta.url), "utf8");

test("plan mode matches the permission option card layout", () => {
  assert.match(source, /role="menuitemcheckbox"/);
  assert.match(source, /onTogglePlanMode/);
  assert.match(source, /permissions\.planModeDescription/);
  const planModeMarkup = source.slice(source.indexOf('role="menuitemcheckbox"'));
  assert.match(planModeMarkup, /gridTemplateColumns: "18px minmax\(0, 1fr\)"/);
  assert.doesNotMatch(planModeMarkup, /width: 32, height: 18/);
});
