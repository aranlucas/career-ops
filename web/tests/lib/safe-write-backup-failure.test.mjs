import { afterEach, onTestFinished, test, vi } from "vitest";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { atomicWriteWithBackup } from "../../src/lib/core/safe-write.ts";

function fixture(content = "ORIGINAL\n") {
  const dir = fs.mkdtempSync(path.join(tmpdir(), "web-backup-failure-"));
  onTestFinished(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "cv.md");
  if (content !== undefined) fs.writeFileSync(file, content);
  return { dir, file };
}

afterEach(() => vi.restoreAllMocks());

for (const code of ["EACCES", "ENOSPC", "ENOENT"]) {
  test(`backup write ${code} preserves the original and propagates`, () => {
    const { dir, file } = fixture();
    const originalWrite = fs.writeFileSync;
    const error = Object.assign(new Error(`backup ${code}`), { code });
    vi.spyOn(fs, "writeFileSync").mockImplementation((target, ...args) => {
      if (String(target).startsWith(`${file}.bak-`)) throw error;
      return originalWrite(target, ...args);
    });
    assert.throws(() => atomicWriteWithBackup(file, "REPLACED"), (e) => e === error);
    assert.equal(fs.readFileSync(file, "utf8"), "ORIGINAL\n");
    assert.deepEqual(fs.readdirSync(dir), ["cv.md"]);
  });
}

test("an unreadable existing source is not treated as missing", () => {
  const { dir, file } = fixture();
  const originalRead = fs.readFileSync;
  const error = Object.assign(new Error("source EACCES"), { code: "EACCES" });
  vi.spyOn(fs, "readFileSync").mockImplementation((target, ...args) => {
    if (target === file) throw error;
    return originalRead(target, ...args);
  });
  assert.throws(() => atomicWriteWithBackup(file, "REPLACED"), (e) => e === error);
  assert.equal(originalRead(file, "utf8"), "ORIGINAL\n");
  assert.deepEqual(fs.readdirSync(dir), ["cv.md"]);
});

test("a missing source is created without a backup", () => {
  const { dir, file } = fixture();
  fs.unlinkSync(file);
  assert.equal(atomicWriteWithBackup(file, "CREATED"), null);
  assert.equal(fs.readFileSync(file, "utf8"), "CREATED");
  assert.deepEqual(fs.readdirSync(dir), ["cv.md"]);
});

test("an empty source keeps the existing no-backup behavior", () => {
  const { file } = fixture("");
  assert.equal(atomicWriteWithBackup(file, "CREATED"), null);
  assert.equal(fs.readFileSync(file, "utf8"), "CREATED");
});

test("successful replacement backs up the exact original bytes", () => {
  const original = Buffer.from("# Fixture\r\n\r\nOriginal \xfftext.\n", "latin1");
  const { file } = fixture(original);
  const backup = atomicWriteWithBackup(file, "REPLACED");
  assert.ok(backup);
  assert.deepEqual(fs.readFileSync(backup), original);
  assert.equal(fs.readFileSync(file, "utf8"), "REPLACED");
});
