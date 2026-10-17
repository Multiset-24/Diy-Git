const fs = require("fs");
const path = require("path");
const { GitError } = require("./errors");
const { expandSha } = require("./objects");

// HEAD normally holds "ref: refs/heads/main" (a symbolic ref). A branch file
// such as .git/refs/heads/main holds the SHA of its latest commit.

function headTarget(gitDir) {
  const head = fs.readFileSync(path.join(gitDir, "HEAD"), "utf8").trim();
  return head.startsWith("ref: ") ? { ref: head.slice(5) } : { sha: head };
}

function readRef(gitDir, ref) {
  const file = path.join(gitDir, ref);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim() : null;
}

function updateRef(gitDir, ref, sha) {
  const file = path.join(gitDir, ref);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Write to a temp file and rename, so a crash never leaves a half-written ref.
  fs.writeFileSync(file + ".lock", sha + "\n");
  fs.renameSync(file + ".lock", file);
}

// The commit HEAD points at, or null on a fresh repo with no commits yet.
function headCommit(gitDir) {
  const head = headTarget(gitDir);
  return head.sha ?? readRef(gitDir, head.ref);
}

// Accepts HEAD, a branch name, a tag name, or a full or short SHA.
function resolve(gitDir, name) {
  if (!name) throw new GitError("missing object name");
  if (name === "HEAD") {
    const sha = headCommit(gitDir);
    if (!sha) throw new GitError("HEAD does not point to a commit yet");
    return sha;
  }
  for (const ref of [name, `refs/heads/${name}`, `refs/tags/${name}`]) {
    if (!ref.startsWith("refs/")) continue;
    const sha = readRef(gitDir, ref);
    if (sha) return sha;
  }
  if (/^[0-9a-f]{4,40}$/.test(name)) {
    const sha = expandSha(gitDir, name);
    if (sha) return sha;
  }
  throw new GitError(`not a valid object name: ${name}`);
}

module.exports = { headTarget, headCommit, updateRef, resolve };
