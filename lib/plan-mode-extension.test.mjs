import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const { getPlanToolNames, isPlanBlockedTool } = await createJiti(import.meta.url).import("./plan-mode-extension.ts");

test("plan mode keeps extension tools and enables only read-only built-ins", () => {
  assert.deepEqual(
    getPlanToolNames(
      ["read", "bash", "edit", "write", "questionnaire"],
      ["read", "bash", "edit", "write", "grep", "find", "ls", "questionnaire"],
    ),
    ["read", "questionnaire", "grep", "find", "ls"],
  );
});

test("plan mode blocks built-in mutation paths", () => {
  assert.equal(isPlanBlockedTool("bash"), true);
  assert.equal(isPlanBlockedTool("edit"), true);
  assert.equal(isPlanBlockedTool("write"), true);
  assert.equal(isPlanBlockedTool("read"), false);
});
