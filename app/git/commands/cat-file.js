const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

class catFileCommand {
  constructor(flag, commitSHA) {
    this.flag = flag;
    this.commitSHA = commitSHA;
  }

  execute() {
    const flag = this.flag;
    const commitSHA = this.commitSHA;
    switch (flag) {
      case "-p": {
        const folder = commitSHA.slice(0, 2);
        const file = commitSHA.slice(2);
        const completePath = path.join(
          process.cwd(),
          ".git",
          "objects",
          folder,
          file
        );
        // console.log(completePath);
        if (!fs.existsSync(completePath)) {
          throw new Error(`Object ${commitSHA} does not exist.`);
        }

        const fileContents = fs.readFileSync(completePath);

        const outputBuffer = zlib.inflateSync(fileContents);
        const output = outputBuffer.toString();
        const nullIndex = output.indexOf("\0");
        const content = output.slice(nullIndex + 1);
        process.stdout.write(content);
      }
    }
  }
}

module.exports = catFileCommand;
