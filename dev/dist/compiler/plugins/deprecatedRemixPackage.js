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

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var path__default = /*#__PURE__*/_interopDefaultLegacy(path);

/**
 * A plugin to warn users when importing from the deprecated `remix` package
 */
function deprecatedRemixPackagePlugin(ctx) {
  return {
    name: "deprecated-remix-package",
    setup(build) {
      build.onResolve({
        filter: /.*/
      }, ({
        importer,
        path: filePath
      }) => {
        // Warn on deprecated imports from the remix package
        if (filePath === "remix") {
          var _ctx$options$onWarnin, _ctx$options;
          let relativePath = path__default["default"].relative(process.cwd(), importer);
          let warningMessage = `WARNING: All \`remix\` exports are considered deprecated as of v1.3.3. ` + `Please change your import in "${relativePath}" to come from the respective ` + `underlying \`@remix-run/*\` package. ` + `Run \`npx @remix-run/dev@latest codemod replace-remix-magic-imports\` ` + `to automatically migrate your code.`;
          (_ctx$options$onWarnin = (_ctx$options = ctx.options).onWarning) === null || _ctx$options$onWarnin === void 0 ? void 0 : _ctx$options$onWarnin.call(_ctx$options, warningMessage, importer);
        }
        return undefined;
      });
    }
  };
}

exports.deprecatedRemixPackagePlugin = deprecatedRemixPackagePlugin;
