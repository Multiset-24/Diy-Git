const path = require("path");
const { initRepo } = require("../repo");

// init [directory]
class InitCommand {
  constructor(args) {
    this.dir = args[0] ?? ".";
  }

  execute({ out }) {
    const gitDir = initRepo(this.dir);
    out(`Initialized empty Git repository in ${path.resolve(gitDir)}\n`);
  }
}

module.exports = InitCommand;
