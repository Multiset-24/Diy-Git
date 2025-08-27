const path = require("path");
const fs = require("fs");
const zlib = require("zlib");
const crypto = require("crypto");

class hashObjectCommand {
  constructor(flag, filePath) {
    this.flag = flag;
    this.filePath = filePath;
  }

  execute() {
    const { flag, filePath } = this;
    //now we need to get the total file path -> get content-> make data to be store-> hash it
    const resolvedFilePath = path.resolve(filePath);
    if (!fs.existsSync(resolvedFilePath)) {
      throw new Error(`File ${filePath} does not exist.`);
    }
    const content = fs.readFileSync(resolvedFilePath);

    const header = Buffer.from(`blob ${content.length}\0`);
    const blob = Buffer.concat([header, content]);
    const hash = crypto.createHash("sha1").update(blob).digest("hex");
    process.stdout.write(hash + "\n");
    // console.log(hash);
    // now we need to create the object file
    const objectDirectory = path.join(
      process.cwd(),
      ".git",
      "objects",
      hash.slice(0, 2)
    );
    const objectFile = path.join(objectDirectory, hash.slice(2));

    if (flag) {
      fs.mkdirSync(objectDirectory, { recursive: true });
      fs.writeFileSync(objectFile, zlib.deflateSync(blob));
    }
  }
}

module.exports = hashObjectCommand;
