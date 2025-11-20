const crypto = require("crypto");

// Convert UUID string to binary(16) matching UUID_TO_BIN(uuid, 1)
function uuidToBin(uuid) {
  const hex = uuid.replace(/-/g, "");
  const buffer = Buffer.from(hex, "hex");

  // Reorder bytes to match MySQL UUID_TO_BIN(uuid, 1) (time-optimized)
  const reordered = Buffer.alloc(16);
  // swap first 4 + next 2 + next 2 (time components)
  reordered.set(buffer.subarray(6, 8), 0);
  reordered.set(buffer.subarray(4, 6), 2);
  reordered.set(buffer.subarray(0, 4), 4);
  // the rest stay as-is
  reordered.set(buffer.subarray(8), 8);

  return reordered;
}

// Generate a new binary(16) UUID
async function generateBinaryUuid() {
  const uuid = crypto.randomUUID(); // generates RFC4122 v4
  return uuidToBin(uuid);
}

module.exports = { generateBinaryUuid };
