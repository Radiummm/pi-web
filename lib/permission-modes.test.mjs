import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildPermissionModeConfig, inferPermissionMode, isPermissionMode } = await jiti.import("./permission-modes.ts");

test("builds the three approval profiles", () => {
  const workspace = buildPermissionModeConfig("workspace");
  assert.equal(workspace.permission.external_directory, "ask");
  assert.equal(workspace.permission.web_search, "ask");
  assert.equal(workspace.permission.bash["*"], "ask");

  const risk = buildPermissionModeConfig("risk");
  assert.equal(risk.permission.web_search, "allow");
  assert.equal(risk.permission.bash["*"], "allow");
  assert.equal(risk.permission.bash["rm *"], "ask");

  const full = buildPermissionModeConfig("full");
  assert.equal(full.yoloMode, true);
  assert.equal(full.permission.external_directory, "allow");
});

test("infers saved profiles and rejects unknown mode names", () => {
  for (const mode of ["workspace", "risk", "full"]) {
    assert.equal(inferPermissionMode(buildPermissionModeConfig(mode)), mode);
    assert.equal(isPermissionMode(mode), true);
  }
  assert.equal(isPermissionMode("custom"), false);
});
