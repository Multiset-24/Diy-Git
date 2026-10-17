const fs = require("fs");
const path = require("path");
const { writeObject, serializeTree } = require("../objects");

// write-tree
// Snapshots the working directory as tree and blob objects and prints the
// root tree's SHA. (Real git snapshots the index instead; this project has
// no index, so the working directory plays that role.)
class WriteTreeCommand {
  constructor() {}

  execute({ out, repo }) {
    const { root, gitDir } = repo();
    out(writeTree(gitDir, root) + "\n");
  }
}

// Returns the tree SHA for `dir`, or null if it holds no files. Git cannot
// store empty directories, so they are left out.
function writeTree(gitDir, dir) {
  const entries = [];
  for (const name of fs.readdirSync(dir)) {
    if (name === ".git") continue;
    const full = path.join(dir, name);
    const stat = fs.lstatSync(full); // lstat: look at symlinks, don't follow them

    if (stat.isSymbolicLink()) {
      // A symlink is stored as a blob holding the link's target path.
      const sha = writeObject(gitDir, "blob", Buffer.from(fs.readlinkSync(full)));
      entries.push({ mode: "120000", name, sha });
    } else if (stat.isDirectory()) {
      if (fs.existsSync(path.join(full, ".git"))) continue; // a nested repository
      const sha = writeTree(gitDir, full);
      if (sha) entries.push({ mode: "40000", name, sha });
    } else if (stat.isFile()) {
      const sha = writeObject(gitDir, "blob", fs.readFileSync(full));
      const executable = (stat.mode & 0o100) !== 0;
      entries.push({ mode: executable ? "100755" : "100644", name, sha });
    }
  }
  if (entries.length === 0) return null;
  return writeObject(gitDir, "tree", serializeTree(entries));
}

module.exports = WriteTreeCommand;
module.exports.writeTree = writeTree;
