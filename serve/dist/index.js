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

Object.defineProperty(exports, '__esModule', { value: true });

var express = require('express');
var compression = require('compression');
var morgan = require('morgan');
var express$1 = require('@remix-run/express');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var express__default = /*#__PURE__*/_interopDefaultLegacy(express);
var compression__default = /*#__PURE__*/_interopDefaultLegacy(compression);
var morgan__default = /*#__PURE__*/_interopDefaultLegacy(morgan);

function createApp(buildPath, mode = "production", publicPath = "/build/", assetsBuildDirectory = "public/build/") {
  let app = express__default["default"]();
  app.disable("x-powered-by");
  app.use(compression__default["default"]());
  app.use(publicPath, express__default["default"].static(assetsBuildDirectory, {
    immutable: true,
    maxAge: "1y"
  }));
  app.use(express__default["default"].static("public", {
    maxAge: "1h"
  }));
  app.use(morgan__default["default"]("tiny"));
  app.all("*", mode === "production" ? express$1.createRequestHandler({
    build: require(buildPath),
    mode
  }) : (req, res, next) => {
    // require cache is purged in @remix-run/dev where the file watcher is
    let build = require(buildPath);
    return express$1.createRequestHandler({
      build,
      mode
    })(req, res, next);
  });
  return app;
}

exports.createApp = createApp;
