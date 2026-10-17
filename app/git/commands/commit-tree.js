const { GitError } = require("../errors");
const { readObject, writeObject } = require("../objects");
const { resolve } = require("../refs");
const { signature } = require("../signature");

// commit-tree <tree> [-p <parent>]... -m <message>
// Creates a commit object and prints its SHA. Does not move any branch.
class CommitTreeCommand {
  constructor(args) {
    this.parents = [];
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "-p") this.parents.push(args[++i]);
      else if (args[i] === "-m") this.message = args[++i];
      else if (!this.tree) this.tree = args[i];
      else throw new GitError(`unexpected argument ${args[i]}`);
    }
    if (!this.tree || this.message === undefined || this.parents.includes(undefined)) {
      throw new GitError("usage: commit-tree <tree> [-p <parent>]... -m <message>");
    }
  }

  execute({ out, repo }) {
    const { gitDir } = repo();
    out(createCommit(gitDir, this.tree, this.parents, this.message) + "\n");
  }
}

function createCommit(gitDir, treeName, parentNames, message) {
  const tree = resolve(gitDir, treeName);
  if (readObject(gitDir, tree).type !== "tree") throw new GitError(`${treeName} is not a tree`);
  const lines = [`tree ${tree}`];
  for (const name of parentNames) {
    const parent = resolve(gitDir, name);
    if (readObject(gitDir, parent).type !== "commit") throw new GitError(`${name} is not a commit`);
    lines.push(`parent ${parent}`);
  }
  lines.push(`author ${signature("AUTHOR")}`, `committer ${signature("COMMITTER")}`);
  const body = message.endsWith("\n") ? message : message + "\n";
  return writeObject(gitDir, "commit", Buffer.from(lines.join("\n") + "\n\n" + body));
}

module.exports = CommitTreeCommand;
module.exports.createCommit = createCommit;
