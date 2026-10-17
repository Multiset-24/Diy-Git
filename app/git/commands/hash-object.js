const fs = require("fs");
const { GitError } = require("../errors");
const { hashObject, writeObject } = require("../objects");

// hash-object [-w] <file>
// Prints the blob SHA of a file. With -w, also stores it in .git/objects.
class HashObjectCommand {
  constructor(args) {
    this.write = args.includes("-w");
    const files = args.filter((a) => !a.startsWith("-"));
    const unknown = args.filter((a) => a.startsWith("-") && a !== "-w");
    if (unknown.length) throw new GitError(`unknown option ${unknown[0]}`);
    if (files.length !== 1) throw new GitError("usage: hash-object [-w] <file>");
    this.file = files[0];
  }

  execute({ out, repo }) {
    if (!fs.existsSync(this.file)) throw new GitError(`could not open '${this.file}'`);
    const content = fs.readFileSync(this.file);
    const sha = this.write ? writeObject(repo().gitDir, "blob", content) : hashObject("blob", content);
    out(sha + "\n");
  }
}

module.exports = HashObjectCommand;
