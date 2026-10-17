const path = require("path");
const { GitError } = require("./errors");
const { findRepoRoot } = require("./repo");

// Command pattern: each command is a class that parses its own arguments in
// the constructor and does its work in execute(). The client only maps a name
// to a class, so adding a command means adding one file and one line here.
const COMMANDS = {
  init: require("./commands/init"),
  "hash-object": require("./commands/hash-object"),
  "cat-file": require("./commands/cat-file"),
  "ls-tree": require("./commands/ls-tree"),
  "write-tree": require("./commands/write-tree"),
  "commit-tree": require("./commands/commit-tree"),
  commit: require("./commands/commit"),
  log: require("./commands/log"),
};

class GitClient {
  constructor(out = (data) => process.stdout.write(data)) {
    this.out = out;
  }

  run(name, args) {
    const Command = COMMANDS[name];
    if (!Command) throw new GitError(`'${name ?? ""}' is not a command. Commands: ${Object.keys(COMMANDS).join(", ")}`);
    const command = new Command(args);

    // Found lazily, so commands like init and hash-object work outside a repository.
    let found;
    const repo = () => {
      if (!found) {
        const root = findRepoRoot();
        found = { root, gitDir: path.join(root, ".git") };
      }
      return found;
    };
    command.execute({ out: this.out, repo });
  }
}

module.exports = GitClient;
