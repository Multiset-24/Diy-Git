#!/usr/bin/env node
const GitClient = require("./git/client");
const { GitError } = require("./git/errors");

const [name, ...args] = process.argv.slice(2);

try {
  new GitClient().run(name, args);
} catch (err) {
  if (!(err instanceof GitError)) throw err; // a real bug: keep the stack trace
  process.stderr.write(`fatal: ${err.message}\n`);
  process.exitCode = 1;
}
