// Every test runs our implementation and real git on the same files and
// checks that the results are identical, byte for byte.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { MAIN, tempRepo, run, ours, git, write } = require("./helpers");

test("init creates a repository real git recognises", () => {
  const dir = tempRepo();
  ours(dir, "init", "nested/project");
  const gitDir = git(path.join(dir, "nested/project"), "rev-parse", "--git-dir").text.trim();
  assert.equal(gitDir, ".git");
  assert.ok(fs.existsSync(path.join(dir, "nested/project/.git/refs/heads")));
});

test("hash-object matches git for text, binary and empty files", () => {
  const dir = tempRepo();
  write(dir, "text.txt", "hello world\n");
  write(dir, "binary.bin", Buffer.from([0, 255, 10, 0, 13, 128]));
  write(dir, "empty", "");
  for (const file of ["text.txt", "binary.bin", "empty"]) {
    assert.equal(ours(dir, "hash-object", file).text, git(dir, "hash-object", file).text, file);
  }
});

test("hash-object -w stores an object that git can read", () => {
  const dir = tempRepo();
  write(dir, "a.txt", "stored\n");
  const sha = ours(dir, "hash-object", "-w", "a.txt").text.trim();
  assert.equal(git(dir, "cat-file", "-p", sha).text, "stored\n");
});

test("cat-file -p returns binary content unchanged, and -t / -s match git", () => {
  const dir = tempRepo();
  const bytes = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
  write(dir, "all-bytes.bin", bytes);
  const sha = ours(dir, "hash-object", "-w", "all-bytes.bin").text.trim();
  assert.deepEqual(ours(dir, "cat-file", "-p", sha).stdout, bytes);
  assert.equal(ours(dir, "cat-file", "-t", sha).text, git(dir, "cat-file", "-t", sha).text);
  assert.equal(ours(dir, "cat-file", "-s", sha).text, git(dir, "cat-file", "-s", sha).text);
});

// Names chosen to catch sorting bugs: case, "a" vs "a.txt" vs "a-b",
// plus an executable, a symlink and an empty directory (git skips it).
function trickyTree(dir) {
  write(dir, "a.txt", "1");
  write(dir, "a-b", "2");
  write(dir, "a/inner.txt", "3");
  write(dir, "B.txt", "4");
  write(dir, "b.txt", "5");
  write(dir, "deep/er/still/file", "6");
  write(dir, "run.sh", "#!/bin/sh\n", 0o755);
  fs.symlinkSync("a.txt", path.join(dir, "link"));
  fs.mkdirSync(path.join(dir, "empty-dir"));
}

test("write-tree produces the same tree SHA as git", () => {
  const dir = tempRepo();
  trickyTree(dir);
  const mine = ours(dir, "write-tree").text.trim();
  git(dir, "add", "-A");
  assert.equal(mine, git(dir, "write-tree").text.trim());
});

test("ls-tree and cat-file -p on a tree match git", () => {
  const dir = tempRepo();
  trickyTree(dir);
  const tree = ours(dir, "write-tree").text.trim();
  assert.equal(ours(dir, "ls-tree", tree).text, git(dir, "ls-tree", tree).text);
  assert.equal(ours(dir, "ls-tree", "--name-only", tree).text, git(dir, "ls-tree", "--name-only", tree).text);
  assert.equal(ours(dir, "cat-file", "-p", tree).text, git(dir, "cat-file", "-p", tree).text);
});

test("commit-tree produces the same commit SHA as git", () => {
  const dir = tempRepo();
  write(dir, "f.txt", "x");
  const tree = ours(dir, "write-tree").text.trim();
  const root = ours(dir, "commit-tree", tree, "-m", "first").text.trim();
  assert.equal(root, git(dir, "commit-tree", tree, "-m", "first").text.trim());

  const child = ours(dir, "commit-tree", tree, "-p", root, "-m", "second").text.trim();
  assert.equal(child, git(dir, "commit-tree", tree, "-p", root, "-m", "second").text.trim());
});

test("commit and log build a history that real git can read", () => {
  const dir = tempRepo();
  write(dir, "notes.md", "v1\n");
  assert.match(ours(dir, "commit", "-m", "first").text, /^\[main \(root-commit\) [0-9a-f]{7}\] first\n$/);
  write(dir, "notes.md", "v2\n");
  ours(dir, "commit", "-m", "second");

  assert.equal(git(dir, "log", "--format=%s").text, "second\nfirst\n");
  assert.equal(ours(dir, "log", "--oneline").text, git(dir, "log", "--oneline", "--abbrev=7").text);
  assert.equal(git(dir, "fsck", "--strict").code, 0);
  // We keep no index, so let git build one from HEAD, then check that the
  // working tree matches the commit exactly.
  git(dir, "read-tree", "HEAD");
  assert.equal(git(dir, "status", "--porcelain").text, "");

  const full = ours(dir, "log").text;
  assert.match(full, /Author: Test User <test@example.com>\nDate:   2023-11-15 03:43:20 \+0530/);
});

test("commit refuses when nothing changed", () => {
  const dir = tempRepo();
  write(dir, "a", "1");
  ours(dir, "commit", "-m", "one");
  const r = run(process.execPath, [MAIN, "commit", "-m", "again"], dir);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /nothing to commit/);
});

test("short SHAs, HEAD and branch names resolve", () => {
  const dir = tempRepo();
  write(dir, "a", "1");
  ours(dir, "commit", "-m", "one");
  const head = git(dir, "rev-parse", "HEAD").text.trim();
  for (const name of ["HEAD", "main", head.slice(0, 7)]) {
    assert.equal(ours(dir, "cat-file", "-t", name).text, "commit\n", name);
  }
  assert.equal(ours(dir, "ls-tree", "HEAD").text, git(dir, "ls-tree", "HEAD").text);
});

test("commands work from a subdirectory", () => {
  const dir = tempRepo();
  write(dir, "sub/inner/file", "x");
  ours(path.join(dir, "sub/inner"), "commit", "-m", "from below");
  assert.equal(git(dir, "log", "--format=%s").text, "from below\n");
});

test("errors print 'fatal:' and exit with code 1", () => {
  const dir = tempRepo();
  for (const args of [["frobnicate"], ["cat-file", "-p", "deadbeef"], ["cat-file", "-x", "abc"], ["log"]]) {
    const r = run(process.execPath, [MAIN, ...args], dir);
    assert.equal(r.code, 1, args.join(" "));
    assert.match(r.stderr, /^fatal: /, args.join(" "));
  }
});
