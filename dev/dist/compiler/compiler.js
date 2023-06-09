/**
 * @remix-run/dev v1.16.1
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

var path = require('path');
var compiler = require('./css/compiler.js');
var bundle = require('./css/bundle.js');
var compiler$1 = require('./js/compiler.js');
var compiler$2 = require('./server/compiler.js');
var write = require('./server/write.js');
var channel = require('../channel.js');
var manifest = require('./manifest.js');
var result = require('../result.js');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n["default"] = e;
  return Object.freeze(n);
}

var path__namespace = /*#__PURE__*/_interopNamespace(path);

let create = async ctx => {
  // channels _should_ be scoped to a build, not a compiler
  // but esbuild doesn't have an API for passing build-specific arguments for rebuilds
  // so instead use a mutable reference (`channels`) that is compiler-scoped
  // and gets reset on each build
  let channels = {
    cssBundleHref: undefined,
    manifest: undefined
  };
  let subcompiler = {
    css: await compiler.create(ctx),
    js: await compiler$1.create(ctx, channels),
    server: await compiler$2.create(ctx, channels)
  };
  let cancel = async () => {
    // resolve channels with error so that downstream tasks don't hang waiting for results from upstream tasks
    channels.cssBundleHref.err();
    channels.manifest.err();

    // optimization: cancel tasks
    await Promise.all([subcompiler.css.cancel(), subcompiler.js.cancel(), subcompiler.server.cancel()]);
  };
  let compile = async (options = {}) => {
    var _options$onManifest;
    let error = undefined;
    let errCancel = thrown => {
      if (error === undefined) {
        error = thrown;
      }
      cancel();
      return result.err(thrown);
    };

    // reset channels
    channels.cssBundleHref = channel.create();
    channels.manifest = channel.create();

    // kickoff compilations in parallel
    let tasks = {
      css: subcompiler.css.compile().then(result.ok, errCancel),
      js: subcompiler.js.compile().then(result.ok, errCancel),
      server: subcompiler.server.compile().then(result.ok, errCancel)
    };

    // keep track of manually written artifacts
    let writes = {};

    // css compilation
    let css = await tasks.css;
    if (!css.ok) throw error ?? css.error;

    // css bundle
    let cssBundleHref = css.value.bundle && ctx.config.publicPath + path__namespace.relative(ctx.config.assetsBuildDirectory, path__namespace.resolve(css.value.bundle.path));
    channels.cssBundleHref.ok(cssBundleHref);
    if (css.value.bundle) {
      writes.cssBundle = bundle.write(ctx, css.value.outputFiles);
    }

    // js compilation (implicitly writes artifacts/js)
    let js = await tasks.js;
    if (!js.ok) throw error ?? js.error;
    let {
      metafile,
      hmr
    } = js.value;

    // artifacts/manifest
    let manifest$1 = await manifest.create({
      config: ctx.config,
      cssBundleHref,
      metafile,
      hmr
    });
    channels.manifest.ok(manifest$1);
    (_options$onManifest = options.onManifest) === null || _options$onManifest === void 0 ? void 0 : _options$onManifest.call(options, manifest$1);
    writes.manifest = manifest.write(ctx.config, manifest$1);

    // server compilation
    let server = await tasks.server;
    if (!server.ok) throw error ?? server.error;
    // artifacts/server
    writes.server = write.write(ctx.config, server.value);
    await Promise.all(Object.values(writes));
    return manifest$1;
  };
  return {
    compile,
    cancel,
    dispose: async () => {
      await Promise.all(Object.values(subcompiler).map(sub => sub.dispose()));
    }
  };
};

exports.create = create;
