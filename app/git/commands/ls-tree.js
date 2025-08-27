const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

class lsTreeCommand {
  constructor(flag, sha) {
    this.flag = flag;
    this.sha = sha;
    this.nameOnly = flag === true || flag === "--name-only" || flag === "-n";
    this.gitDir = path.join(process.cwd(), ".git");
  }

  _objectPath(sha) {
    return path.join(this.gitDir, "objects", sha.slice(0, 2), sha.slice(2));
  }

  readObjectRaw(sha) {
    const objectFile = this._objectPath(sha);
    if (!fs.existsSync(objectFile)) {
      throw new Error(`Object file not found: ${objectFile}`);
    }
    const compressed = fs.readFileSync(objectFile);
    return zlib.inflateSync(compressed);
  }

  parseObject(sha) {
    const raw = this.readObjectRaw(sha);
    const headerEnd = raw.indexOf(0);
    if (headerEnd === -1)
      throw new Error("Invalid object: missing header null byte");
    const header = raw.slice(0, headerEnd).toString();
    const [type, sizeStr] = header.split(" ");
    const size = parseInt(sizeStr, 10);
    const content = raw.slice(headerEnd + 1);
    return { type, size, content };
  }

  parseTreeContent(content) {
    const entries = [];
    let offset = 0;
    while (offset < content.length) {
      const modeEnd = content.indexOf(0x20 /* space */, offset);
      if (modeEnd === -1) break;
      const mode = content.slice(offset, modeEnd).toString();

      const nameEnd = content.indexOf(0x00 /* null */, modeEnd + 1);
      if (nameEnd === -1) break;
      const name = content.slice(modeEnd + 1, nameEnd).toString();

      const shaStart = nameEnd + 1;
      const shaEnd = shaStart + 20;
      if (shaEnd > content.length) {
        throw new Error("Invalid tree data: missing SHA bytes");
      }
      const sha = content.slice(shaStart, shaEnd).toString("hex");

      entries.push({ mode, name, sha });
      offset = shaEnd;
    }
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  }

  execute() {
    try {
      if (!fs.existsSync(this.gitDir)) {
        console.error(
          `.git directory not found in ${process.cwd()}. Run from repo root.`
        );
        return;
      }

      let obj = this.parseObject(this.sha);

      if (obj.type === "commit") {
        const text = obj.content.toString();
        const m = text.match(/^tree ([0-9a-f]{40})/m);
        if (!m) {
          console.error(`Commit ${this.sha} does not contain a tree line.`);
          return;
        }
        const treeSha = m[1];
        obj = this.parseObject(treeSha);
        if (obj.type !== "tree") {
          console.error(
            `Object ${treeSha} referenced by commit is not a tree (type=${obj.type}).`
          );
          return;
        }
      } else if (obj.type !== "tree") {
        console.error(
          `Object ${this.sha} is of type '${obj.type}', not a tree.`
        );
        return;
      }

      const entries = this.parseTreeContent(obj.content);

      if (!entries.length) {
        return;
      }

      entries.forEach((entry) => {
        if (this.nameOnly) {
          console.log(entry.name);
        } else {
          // decide type from mode: modes that start with '04' are trees in git
          const type = entry.mode.startsWith("04") ? "tree" : "blob";
          console.log(`${entry.mode} ${type} ${entry.sha} ${entry.name}`);
        }
      });
    } catch (err) {
      console.error(`Error: ${err.message}`);
    }
  }
}

module.exports = lsTreeCommand;
