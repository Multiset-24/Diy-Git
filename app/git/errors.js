// An expected failure (bad input, missing object). main.js prints it as
// "fatal: <message>" and exits with code 1, like git does.
class GitError extends Error {}

module.exports = { GitError };
