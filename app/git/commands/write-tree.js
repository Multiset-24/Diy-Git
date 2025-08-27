const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

class WriteTreeCommand {
  constructor(dir) {
    this.dir = dir || process.cwd();
    this.gitDir = path.join(process.cwd(), '.git');
    // console.log(`Writing tree for ${this.dir}`);
  }

  objectPath(sha) {
    return path.join(this.gitDir, 'objects', sha.slice(0, 2), sha.slice(2));
  }

  ensureObjectDir(sha) {
    fs.mkdirSync(path.join(this.gitDir, 'objects', sha.slice(0, 2)), { recursive: true });
  }

  sha1(buffer) {
    const h = crypto.createHash('sha1');
    h.update(buffer);
    return h.digest('hex');
  }

  writeObject(buffer) {
    const sha = this.sha1(buffer);
    const compressed = zlib.deflateSync(buffer);
    this.ensureObjectDir(sha);
    fs.writeFileSync(this.objectPath(sha), compressed);
    return sha;
  }

  hashFileAsBlob(filePath) {
    const content = fs.readFileSync(filePath);
    const header = Buffer.from(`blob ${content.length}\0`);
    const blob = Buffer.concat([header, content]);
    return this.writeObject(blob);
  }

  writeTreeDir(dir) {
    const entries = fs.readdirSync(dir)
      .filter(name => name !== '.git') // skip .git
      .map(name => {
        const full = path.join(dir, name);
        const stat = fs.lstatSync(full);
        return { name, full, stat };
      });

    entries.sort((a, b) => a.name.localeCompare(b.name));

    let contentBuffers = [];

    for (const e of entries) {
      if (e.stat.isDirectory()) {
        const treeSha = this.writeTreeDir(e.full);
        const header = Buffer.from(`40000 ${e.name}\0`);
        const shaBuf = Buffer.from(treeSha, 'hex'); // 20 raw bytes
        contentBuffers.push(header, shaBuf);
      } else if (e.stat.isFile() || e.stat.isSymbolicLink()) {
        const fileSha = this.hashFileAsBlob(e.full);
        const isExec = (e.stat.mode & 0o100) !== 0; // owner execute bit
        const modeStr = isExec ? '100755' : '100644';
        const header = Buffer.from(`${modeStr} ${e.name}\0`);
        const shaBuf = Buffer.from(fileSha, 'hex');
        contentBuffers.push(header, shaBuf);
      }
    }

    const content = Buffer.concat(contentBuffers);
    const treeHeader = Buffer.from(`tree ${content.length}\0`);
    const treeBlob = Buffer.concat([treeHeader, content]);
    const treeSha = this.writeObject(treeBlob);
    return treeSha;
  }

  execute() {
    try {
      if (!fs.existsSync(this.gitDir)) {
        console.error(`.git directory not found in ${process.cwd()}. Run 'init' first or run from repo root.`);
        return;
      }
      const sha = this.writeTreeDir(this.dir);
      process.stdout.write(sha);
    } catch (err) {
      console.error(`Error: ${err.message}`);
    }
  }
}

module.exports = WriteTreeCommand;
