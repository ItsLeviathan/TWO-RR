/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS preload file */
// Test-only: lets server modules (guarded by `import "server-only"`) load in plain Node.
const Module = require("node:module");
const empty = require.resolve("./test-empty.cjs");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "server-only") return empty;
  return resolve.call(this, request, ...rest);
};
