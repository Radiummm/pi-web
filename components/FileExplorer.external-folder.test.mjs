import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const explorerSource = await readFile(new URL("./FileExplorer.tsx", import.meta.url), "utf8");
const pickerSource = await readFile(new URL("./DirectoryPicker.tsx", import.meta.url), "utf8");

test("the file explorer can authorize and browse a folder outside the workspace", () => {
  assert.match(explorerSource, /const \[browseRoot, setBrowseRoot\] = useState\(cwd\)/);
  assert.match(explorerSource, /fetch\("\/api\/cwd\/validate"/);
  assert.match(explorerSource, /setBrowseRoot\(data\.cwd \?\? directory\)/);
  assert.match(explorerSource, /fetchEntries\(browseRoot\)/);
  assert.match(explorerSource, /fetchGitStatus\(browseRoot\)/);
  assert.match(explorerSource, /initialDirectory=\{browseRoot\}/);
});

test("the directory picker opens at the folder currently shown by the explorer", () => {
  assert.match(pickerSource, /initialDirectory\?: string/);
  assert.match(pickerSource, /navigateTo\(initialDirectory\)/);
});

test("the file explorer can navigate directly to its parent folder", () => {
  assert.match(explorerSource, /const parentBrowseRoot = getFileDirectory\(browseRoot\)/);
  assert.match(explorerSource, /if \(canBrowseParent\) void selectBrowseRoot\(parentBrowseRoot\)/);
  assert.match(explorerSource, /disabled=\{!canBrowseParent \|\| directoryPickerBusy\}/);
});

test("external file mentions stay relative to the agent workspace only", () => {
  assert.match(
    explorerSource,
    /getRelativeFilePath\(joinFilePath\(browseRoot, name\), cwd\)/,
  );
  assert.match(explorerSource, /onAtMention\(getRelativeFilePath\(node\.fullPath, cwd\)/);
});
