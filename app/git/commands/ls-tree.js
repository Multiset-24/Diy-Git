const { GitError } = require("../errors");
const { readObject, parseTree, parseCommit } = require("../objects");
const { resolve } = require("../refs");

// ls-tree [--name-only] <tree-ish>
// <tree-ish> is a tree, or a commit (its tree is listed), by SHA or ref name.
class LsTreeCommand {
  constructor(args) {
    this.nameOnly = args.includes("--name-only");
    const rest = args.filter((a) => a !== "--name-only");
    if (rest.length !== 1) throw new GitError("usage: ls-tree [--name-only] <tree-ish>");
    this.name = rest[0];
  }

  execute({ out, repo }) {
    const { gitDir } = repo();
    let obj = readObject(gitDir, resolve(gitDir, this.name));
    if (obj.type === "commit") obj = readObject(gitDir, parseCommit(obj.content).tree);
    if (obj.type !== "tree") throw new GitError(`not a tree object: ${this.name}`);

    // Printed in stored order: git already keeps tree entries sorted.
    for (const e of parseTree(obj.content)) {
      out(this.nameOnly ? `${e.name}\n` : `${e.mode.padStart(6, "0")} ${e.type} ${e.sha}\t${e.name}\n`);
    }
  }
}

module.exports = LsTreeCommand;
