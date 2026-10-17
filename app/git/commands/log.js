const { GitError } = require("../errors");
const { readObject, parseCommit } = require("../objects");
const { resolve } = require("../refs");

// log [--oneline] [<commit>]
// Walks the history from <commit> (default HEAD) back through first parents.
class LogCommand {
  constructor(args) {
    this.oneline = args.includes("--oneline");
    this.start = args.find((a) => !a.startsWith("-")) ?? "HEAD";
  }

  execute({ out, repo }) {
    const { gitDir } = repo();
    let sha = resolve(gitDir, this.start);
    while (sha) {
      const obj = readObject(gitDir, sha);
      if (obj.type !== "commit") throw new GitError(`${sha} is not a commit`);
      const c = parseCommit(obj.content);
      const subject = c.message.split("\n")[0];
      if (this.oneline) {
        out(`${sha.slice(0, 7)} ${subject}\n`);
      } else {
        const { who, date } = splitSignature(c.author);
        const body = c.message.trimEnd().split("\n").map((l) => `    ${l}`).join("\n");
        out(`commit ${sha}\nAuthor: ${who}\nDate:   ${date}\n\n${body}\n\n`);
      }
      sha = c.parents[0];
    }
  }
}

// "Name <email> 1760000000 +0530" -> who: "Name <email>", date: "2025-10-09 14:23:20 +0530"
function splitSignature(sig) {
  const m = sig.match(/^(.*) (\d+) ([+-])(\d{2})(\d{2})$/);
  if (!m) return { who: sig, date: "" };
  const [, who, seconds, sign, hh, mm] = m;
  const offsetMin = (sign === "-" ? -1 : 1) * (Number(hh) * 60 + Number(mm));
  // Shift to the author's own time zone, then format the shifted time as UTC.
  const local = new Date((Number(seconds) + offsetMin * 60) * 1000);
  const date = local.toISOString().replace("T", " ").slice(0, 19);
  return { who, date: `${date} ${sign}${hh}${mm}` };
}

module.exports = LogCommand;
