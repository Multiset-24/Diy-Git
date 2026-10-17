const { GitError } = require("../errors");
const { readObject, parseTree } = require("../objects");
const { resolve } = require("../refs");

// cat-file (-p | -t | -s) <object>
//   -p  pretty-print the content   -t  print the type   -s  print the size
class CatFileCommand {
  constructor(args) {
    [this.flag, this.name] = args;
    if (!["-p", "-t", "-s"].includes(this.flag) || !this.name) {
      throw new GitError("usage: cat-file (-p | -t | -s) <object>");
    }
  }

  execute({ out, repo }) {
    const { gitDir } = repo();
    const { type, content } = readObject(gitDir, resolve(gitDir, this.name));
    if (this.flag === "-t") return out(type + "\n");
    if (this.flag === "-s") return out(content.length + "\n");
    if (type === "tree") {
      for (const e of parseTree(content)) out(`${e.mode.padStart(6, "0")} ${e.type} ${e.sha}\t${e.name}\n`);
      return;
    }
    out(content); // a Buffer, so binary blobs come out unchanged
  }
}

module.exports = CatFileCommand;
