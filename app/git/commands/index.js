const catFileCommand=require("./cat-file");
const hashObjectCommand=require("./hash-object");
const lsTreeCommand=require("./ls-tree");   
const WriteTreeCommand=require("./write-tree");
const CommitTreeCommand=require("./commit-tree.js");

module.exports={
    catFileCommand,
    hashObjectCommand,
    lsTreeCommand,
    WriteTreeCommand,
    CommitTreeCommand
}