#!/usr/bin/env node
/**
 * @remix-run/serve v1.16.1
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
'use strict';

require('./env');
var path = require('path');
var os = require('os');
var node = require('@remix-run/node');
var index = require('./index');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var os__default = /*#__PURE__*/_interopDefaultLegacy(os);

let port = process.env.PORT ? Number(process.env.PORT) : 3000;
if (Number.isNaN(port)) port = 3000;
let buildPathArg = process.argv[2];
if (!buildPathArg) {
  console.error(`
  Usage: remix-serve <build-dir>`);
  process.exit(1);
}
let buildPath = path__default["default"].resolve(process.cwd(), buildPathArg);
let build = require(buildPath);
let onListen = () => {
  var _Object$values$flat$f, _build$future;
  let address = process.env.HOST || ((_Object$values$flat$f = Object.values(os__default["default"].networkInterfaces()).flat().find(ip => String(ip === null || ip === void 0 ? void 0 : ip.family).includes("4") && !(ip !== null && ip !== void 0 && ip.internal))) === null || _Object$values$flat$f === void 0 ? void 0 : _Object$values$flat$f.address);
  if (!address) {
    console.log(`Remix App Server started at http://localhost:${port}`);
  } else {
    console.log(`Remix App Server started at http://localhost:${port} (http://${address}:${port})`);
  }
  if (((_build$future = build.future) === null || _build$future === void 0 ? void 0 : _build$future.unstable_dev) !== false && process.env.NODE_ENV === "development") {
    node.broadcastDevReady(build);
  }
};
let app = index.createApp(buildPath, process.env.NODE_ENV, build.publicPath, build.assetsBuildDirectory);
let server = process.env.HOST ? app.listen(port, process.env.HOST, onListen) : app.listen(port, onListen);
["SIGTERM", "SIGINT"].forEach(signal => {
  process.once(signal, () => server === null || server === void 0 ? void 0 : server.close(console.error));
});
