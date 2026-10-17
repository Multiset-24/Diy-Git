const { GitError } = require("../errors");
const { readObject, parseCommit } = require("../objects");
const { headTarget, headCommit, updateRef } = require("../refs");
const { writeTree } = require("./write-tree");
const { createCommit } = require("./commit-tree");

// commit -m <message>
// The porcelain version of the three plumbing steps:
//   1. write-tree             snapshot the working directory
//   2. commit-tree -p HEAD     make a commit whose parent is the current one
//   3. update the branch      move refs/heads/<branch> to the new commit
class CommitCommand {
  constructor(args) {
    const i = args.indexOf("-m");
    if (i === -1 || args[i + 1] === undefined) throw new GitError("usage: commit -m <message>");
    this.message = args[i + 1];
  }

  execute({ out, repo }) {
    const { root, gitDir } = repo();
    const head = headTarget(gitDir);
    const parent = headCommit(gitDir);

    const tree = writeTree(gitDir, root);
    if (!tree) throw new GitError("nothing to commit (the directory is empty)");
    if (parent && parseCommit(readObject(gitDir, parent).content).tree === tree) {
      throw new GitError("nothing to commit, working tree unchanged");
    }

    const sha = createCommit(gitDir, tree, parent ? [parent] : [], this.message);
    updateRef(gitDir, head.ref ?? "HEAD", sha);

    const branch = head.ref ? head.ref.replace("refs/heads/", "") : "detached HEAD";
    const rootNote = parent ? "" : " (root-commit)";
    out(`[${branch}${rootNote} ${sha.slice(0, 7)}] ${this.message.split("\n")[0]}\n`);
  }
}

module.exports = CommitCommand;
