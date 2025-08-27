const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

class CommitTreeCommand {
  constructor(tree, parent, message) {
    this.treeSHA = tree;
    this.parentSHA = parent;
    this.message = message;
    this.gitDir = path.join(process.cwd(), '.git');
    this.author = 'mytv dor <mytvdor@gmail.com>';
  }

  _nowSeconds() {
    return Math.floor(Date.now() / 1000);
  }

  _objectPath(sha) {
    return path.join(this.gitDir, 'objects', sha.slice(0, 2), sha.slice(2));
  }

  _ensureObjectDir(hash) {
    fs.mkdirSync(path.join(this.gitDir, 'objects', hash.slice(0, 2)), { recursive: true });
  }

  _sha1(buffer) {
    const h = crypto.createHash('sha1');
    h.update(buffer);
    return h.digest('hex');
  }

  execute() {
    try {
      if (!fs.existsSync(this.gitDir)) {
        console.error(`.git directory not found in ${process.cwd()}`);
        return;
      }

      const parts = [];
      parts.push(`tree ${this.treeSHA}\n`);
      if (this.parentSHA) parts.push(`parent ${this.parentSHA}\n`);
      const ts = this._nowSeconds();
      parts.push(`author ${this.author} ${ts} +0000\n`);
      parts.push(`committer ${this.author} ${ts} +0000\n\n`);
      parts.push(`${this.message}\n`);

      const commitContentBuffer = Buffer.from(parts.join(''));
      const header = `commit ${commitContentBuffer.length}\0`;
      const data = Buffer.concat([Buffer.from(header), commitContentBuffer]);

      const hash = this._sha1(data);

      this._ensureObjectDir(hash);
      const compressedData = zlib.deflateSync(data);
      fs.writeFileSync(this._objectPath(hash), compressedData);
      process.stdout.write(hash);
    } catch (err) {
      console.error(`Error: ${err.message}`);
    }
  }
}

module.exports = CommitTreeCommand;
