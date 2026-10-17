const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
const { GitError } = require("./errors");

// Every git object is stored as zlib("<type> <size>\0<content>") at
// .git/objects/<first 2 hex chars>/<remaining 38>, named by the SHA-1 of the
// uncompressed bytes.

function objectPath(gitDir, sha) {
  return path.join(gitDir, "objects", sha.slice(0, 2), sha.slice(2));
}

function encode(type, content) {
  return Buffer.concat([Buffer.from(`${type} ${content.length}\0`), content]);
}

function hashObject(type, content) {
  return crypto.createHash("sha1").update(encode(type, content)).digest("hex");
}

function writeObject(gitDir, type, content) {
  const sha = hashObject(type, content);
  const file = objectPath(gitDir, sha);
  // Objects are immutable: if it exists, it already has these exact bytes.
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, zlib.deflateSync(encode(type, content)));
  }
  return sha;
}

function readObject(gitDir, sha) {
  const file = objectPath(gitDir, sha);
  if (!fs.existsSync(file)) throw new GitError(`object ${sha} not found`);
  const raw = zlib.inflateSync(fs.readFileSync(file));
  const nul = raw.indexOf(0);
  if (nul === -1) throw new GitError(`object ${sha} is corrupt: no header`);
  const [type, size] = raw.subarray(0, nul).toString().split(" ");
  const content = raw.subarray(nul + 1); // kept as bytes: blobs can be binary
  if (content.length !== Number(size)) throw new GitError(`object ${sha} is corrupt: size mismatch`);
  return { type, content };
}

// Turn a short SHA (4+ hex chars) into the full 40-char one.
function expandSha(gitDir, prefix) {
  if (prefix.length === 40) return prefix;
  const dir = path.join(gitDir, "objects", prefix.slice(0, 2));
  const rest = prefix.slice(2);
  const matches = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.startsWith(rest)) : [];
  if (matches.length === 0) return null;
  if (matches.length > 1) throw new GitError(`short SHA ${prefix} is ambiguous`);
  return prefix.slice(0, 2) + matches[0];
}

// Tree format: repeated "<mode> <name>\0<20 raw SHA bytes>".
function parseTree(content) {
  const entries = [];
  let i = 0;
  while (i < content.length) {
    const space = content.indexOf(0x20, i);
    const nul = content.indexOf(0, space);
    if (space === -1 || nul === -1 || nul + 21 > content.length) throw new GitError("corrupt tree object");
    const mode = content.subarray(i, space).toString();
    entries.push({
      mode,
      type: entryType(mode),
      name: content.subarray(space + 1, nul).toString(),
      sha: content.subarray(nul + 1, nul + 21).toString("hex"),
    });
    i = nul + 21;
  }
  return entries;
}

function entryType(mode) {
  if (mode === "40000") return "tree";
  if (mode === "160000") return "commit"; // submodule
  return "blob";
}

// Git sorts tree entries by raw bytes, comparing a directory as if its name
// ended in "/". So "a.txt" sorts before directory "a", and "B" before "b".
function sortKey(entry) {
  return Buffer.from(entry.mode === "40000" ? entry.name + "/" : entry.name);
}

function serializeTree(entries) {
  const sorted = [...entries].sort((a, b) => Buffer.compare(sortKey(a), sortKey(b)));
  return Buffer.concat(
    sorted.flatMap((e) => [Buffer.from(`${e.mode} ${e.name}\0`), Buffer.from(e.sha, "hex")])
  );
}

// Commit format: header lines ("tree", "parent", "author", "committer"),
// a blank line, then the message.
function parseCommit(content) {
  const text = content.toString();
  const split = text.indexOf("\n\n");
  const headerText = split === -1 ? text : text.slice(0, split);
  const commit = { parents: [], message: split === -1 ? "" : text.slice(split + 2) };
  for (const line of headerText.split("\n")) {
    const sp = line.indexOf(" ");
    const key = line.slice(0, sp);
    const value = line.slice(sp + 1);
    if (key === "parent") commit.parents.push(value);
    else if (key === "tree" || key === "author" || key === "committer") commit[key] = value;
  }
  return commit;
}

module.exports = {
  hashObject,
  writeObject,
  readObject,
  expandSha,
  parseTree,
  serializeTree,
  parseCommit,
};
