const fs = require("fs");
const path = require("path");
const GitClient = require("./git/client");

const {
  catFileCommand,
  hashObjectCommand,
  lsTreeCommand,
  WriteTreeCommand,
  CommitTreeCommand,
} = require("./git/commands/index");

const command = process.argv[2];

const gitClient = new GitClient();

switch (command) {
  case "init":
    createGitDirectory();
    break;
  case "cat-file":
    headleCatFileCommand();
    break;
  case "hash-object":
    handleHashObjectCommand();
    break;
  case "ls-tree":
    handleLsTreeCommand();
    break;
  case "write-tree":
    handleWriteTreeCommand();
    break;
  case "commit-tree":
    handleCommitTreeCommand();
    break;
  default:
    throw new Error(`Unknown command ${command}`);
}

function createGitDirectory() {
  fs.mkdirSync(path.join(process.cwd(), ".git"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), ".git", "objects"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(process.cwd(), ".git", "refs"), { recursive: true });

  fs.writeFileSync(
    path.join(process.cwd(), ".git", "HEAD"),
    "ref: refs/heads/main\n"
  );
  console.log("Initialized git directory");
}

function headleCatFileCommand() {
  const flag = process.argv[3];
  const commitSHA = process.argv[4];
  // console.log(flag, commitSHA);
  // console.log(process.argv);
  const command = new catFileCommand(flag, commitSHA);
  gitClient.run(command);
}

function handleHashObjectCommand() {
  let flag = process.argv[3];
  let filePath = process.argv[4];
  if (!filePath) {
    filePath = flag;
    flag = null;
  }
  const command = new hashObjectCommand(flag, filePath);
  gitClient.run(command);
}

function handleLsTreeCommand() {
  let flag = process.argv[3];
  let commitSHA = process.argv[4];
  if (!commitSHA) {
    commitSHA = flag;
    flag = null;
  }
  const command = new lsTreeCommand(flag, commitSHA);
  gitClient.run(command);
}

function handleWriteTreeCommand() {
  const dir = process.argv[3];
  const command = new WriteTreeCommand(dir);
  gitClient.run(command);
}


function handleCommitTreeCommand(){
    const treeSHA = process.argv[3];
    const parentSHA = process.argv[4];
    const message = process.argv[5];
    const command = new CommitTreeCommand(treeSHA, parentSHA, message);
    gitClient.run(command);
}