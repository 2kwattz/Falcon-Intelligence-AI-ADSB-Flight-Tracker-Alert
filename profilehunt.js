#!/usr/bin/env node
"use strict";

// Convenient entry point: `node profilehunt.js`
require("./test/osint-profile-hunt").main().catch((error) => {
  process.stderr.write(`Error: ${error.message}\n`);
  process.exitCode = 1;
});
