const fs = require("fs");
const path = require("path");
const { GitError } = require("./errors");

// Walk up from `start` until a directory containing .git is found,
// so commands work from any subfolder, like real git.
function findRepoRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(dir, ".git", "objects"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new GitError("not a git repository (or any of the parent directories): .git");
    dir = parent;
  }
}

function initRepo(dir) {
  const gitDir = path.join(path.resolve(dir), ".git");
  for (const sub of ["objects", "refs/heads", "refs/tags"]) {
    fs.mkdirSync(path.join(gitDir, sub), { recursive: true });
  }
  const head = path.join(gitDir, "HEAD");
  if (!fs.existsSync(head)) fs.writeFileSync(head, "ref: refs/heads/main\n");
  return gitDir;
}

module.exports = { findRepoRoot, initRepo };
