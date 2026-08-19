import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./PwaRegistration.tsx", import.meta.url), "utf8");

test("development unregisters stale production service workers", () => {
  assert.match(source, /process\.env\.NODE_ENV !== "production"/);
  assert.match(source, /getRegistrations\(\)/);
  assert.match(source, /registration\.unregister\(\)/);
});
