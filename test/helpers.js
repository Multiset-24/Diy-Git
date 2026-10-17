const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const MAIN = path.join(__dirname, "..", "app", "main.js");

// Fixed identity and dates, so both tools produce byte-identical commits,
// and no user config leaks into the tests.
const ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "Test User",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_AUTHOR_DATE: "1700000000 +0530",
  GIT_COMMITTER_NAME: "Test User",
  GIT_COMMITTER_EMAIL: "test@example.com",
  GIT_COMMITTER_DATE: "1700000000 +0530",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
};

function tempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "diy-git-"));
  ours(dir, "init");
  return dir;
}

function run(cmd, args, cwd, env = ENV) {
  const r = spawnSync(cmd, args, { cwd, env });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr.toString(), text: r.stdout.toString() };
}

// Run our implementation; throws on failure so tests read like scripts.
function ours(cwd, ...args) {
  const r = run(process.execPath, [MAIN, ...args], cwd);
  if (r.code !== 0) throw new Error(`diy-git ${args.join(" ")} failed: ${r.stderr}`);
  return r;
}

function git(cwd, ...args) {
  const r = run("git", args, cwd);
  if (r.code !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
  return r;
}

function write(dir, file, content, mode) {
  const full = path.join(dir, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  if (mode) fs.chmodSync(full, mode);
}

module.exports = { MAIN, ENV, tempRepo, run, ours, git, write };
