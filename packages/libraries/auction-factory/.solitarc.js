// @ts-check
const path = require("path");
const programDir = path.join(
  __dirname,
  "..",
  "..",
  "contract",
  "auction-factory"
);
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "src", "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "auction_factory",
  programId: "2jbfTkQ4DgbSZtb8KTq61v2ox8s1GCuGebKa1EPq3tbY",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
  typeAliases: {
    UnixTimestamp: "i64",
  },
};
