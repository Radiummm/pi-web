import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("terminal fills the final grid row and reserves one input row at the bottom", () => {
  assert.match(css, /\.terminal-xterm \{\s+grid-row: -2 \/ -1;/);
  assert.match(css, /padding: 10px 8px 22px 12px;/);
});
