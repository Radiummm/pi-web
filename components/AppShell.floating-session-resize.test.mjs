import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./AppShell.tsx", import.meta.url), "utf8");

test("resizes the floating session from all four edges within the viewport", () => {
  for (const edge of ["top", "right", "bottom", "left"]) {
    assert.match(source, new RegExp(`\\["${edge}", \\{`));
  }

  assert.match(source, /data-floating-resize-edge=\{edge\}/);
  assert.match(source, /const minWidth = Math\.min\(320, window\.innerWidth - 16\)/);
  assert.match(source, /const minHeight = Math\.min\(360, window\.innerHeight - 16\)/);
  assert.match(source, /window\.innerWidth - drag\.x - 8/);
  assert.match(source, /window\.innerHeight - drag\.y - 8/);
});
