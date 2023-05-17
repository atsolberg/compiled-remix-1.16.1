/**
 * @remix-run/server-runtime v1.16.1
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

var router = require('@remix-run/router');
var entry = require('./entry.js');
var errors = require('./errors.js');
var headers = require('./headers.js');
var invariant = require('./invariant.js');
var mode = require('./mode.js');
var routeMatching = require('./routeMatching.js');
var routes = require('./routes.js');
var responses = require('./responses.js');
var serverHandoff = require('./serverHandoff.js');

const createRequestHandler = (build, mode$1) => {
  let routes$1 = routes.createRoutes(build.routes);
  let dataRoutes = routes.createStaticHandlerDataRoutes(build.routes, build.future);
  let serverMode = mode.isServerMode(mode$1) ? mode$1 : mode.ServerMode.Production;
  let staticHandler = router.createStaticHandler(dataRoutes);
  return async function requestHandler(request, loadContext = {}) {
    let url = new URL(request.url);
    let matches = routeMatching.matchServerRoutes(routes$1, url.pathname);
    let response;
    if (url.searchParams.has("_data")) {
      let routeId = url.searchParams.get("_data");
      response = await handleDataRequestRR(serverMode, staticHandler, routeId, request, loadContext);
      if (build.entry.module.handleDataRequest) {
        let match = matches.find(match => match.route.id == routeId);
        response = await build.entry.module.handleDataRequest(response, {
          context: loadContext,
          params: match ? match.params : {},
          request
        });
      }
    } else if (matches && matches[matches.length - 1].route.module.default == null) {
      response = await handleResourceRequestRR(serverMode, staticHandler, matches.slice(-1)[0].route.id, request, loadContext);
    } else {
      response = await handleDocumentRequestRR(serverMode, build, staticHandler, request, loadContext);
    }
    if (request.method === "HEAD") {
      return new Response(null, {
        headers: response.headers,
        status: response.status,
        statusText: response.statusText
      });
    }
    return response;
  };
};
async function handleDataRequestRR(serverMode, staticHandler, routeId, request, loadContext) {
  try {
    let response = await staticHandler.queryRoute(request, {
      routeId,
      requestContext: loadContext
    });
    if (responses.isRedirectResponse(response)) {
      // We don't have any way to prevent a fetch request from following
      // redirects. So we use the `X-Remix-Redirect` header to indicate the
      // next URL, and then "follow" the redirect manually on the client.
      let headers = new Headers(response.headers);
      headers.set("X-Remix-Redirect", headers.get("Location"));
      headers.set("X-Remix-Status", response.status);
      headers.delete("Location");
      if (response.headers.get("Set-Cookie") !== null) {
        headers.set("X-Remix-Revalidate", "yes");
      }
      return new Response(null, {
        status: 204,
        headers
      });
    }
    if (router.UNSAFE_DEFERRED_SYMBOL in response) {
      let deferredData = response[router.UNSAFE_DEFERRED_SYMBOL];
      let body = responses.createDeferredReadableStream(deferredData, request.signal, serverMode);
      let init = deferredData.init || {};
      let headers = new Headers(init.headers);
      headers.set("Content-Type", "text/remix-deferred");
      init.headers = headers;
      return new Response(body, init);
    }
    return response;
  } catch (error) {
    if (responses.isResponse(error)) {
      error.headers.set("X-Remix-Catch", "yes");
      return error;
    }
    let status = router.isRouteErrorResponse(error) ? error.status : 500;
    let errorInstance = router.isRouteErrorResponse(error) && error.error ? error.error : error instanceof Error ? error : new Error("Unexpected Server Error");
    logServerErrorIfNotAborted(errorInstance, request, serverMode);
    return responses.json(errors.serializeError(errorInstance, serverMode), {
      status,
      headers: {
        "X-Remix-Error": "yes"
      }
    });
  }
}
function findParentBoundary(routes, routeId, error) {
  // Fall back to the root route if we don't match any routes, since Remix
  // has default error/catch boundary handling.  This handles the case where
  // react-router doesn't have a matching "root" route to assign the error to
  // so it returns context.errors = { __shim-error-route__: ErrorResponse }
  let route = routes[routeId] || routes["root"];
  // Router-thrown ErrorResponses will have the error instance.  User-thrown
  // Responses will not have an error. The one exception here is internal 404s
  // which we handle the same as user-thrown 404s
  let isCatch = router.isRouteErrorResponse(error) && (!error.error || error.status === 404);
  if (isCatch && route.module.CatchBoundary || !isCatch && route.module.ErrorBoundary || !route.parentId) {
    return route.id;
  }
  return findParentBoundary(routes, route.parentId, error);
}

// Re-generate a remix-friendly context.errors structure.  The Router only
// handles generic errors and does not distinguish error versus catch.  We
// may have a thrown response tagged to a route that only exports an
// ErrorBoundary or vice versa.  So we adjust here and ensure that
// data-loading errors are properly associated with routes that have the right
// type of boundaries.
function differentiateCatchVersusErrorBoundaries(build, context) {
  if (!context.errors) {
    return;
  }
  let errors = {};
  for (let routeId of Object.keys(context.errors)) {
    let error = context.errors[routeId];
    let handlingRouteId = findParentBoundary(build.routes, routeId, error);
    errors[handlingRouteId] = error;
  }
  context.errors = errors;
}
async function handleDocumentRequestRR(serverMode, build, staticHandler, request, loadContext) {
  let context;
  try {
    context = await staticHandler.query(request, {
      requestContext: loadContext
    });
  } catch (error) {
    logServerErrorIfNotAborted(error, request, serverMode);
    return new Response(null, {
      status: 500
    });
  }
  if (responses.isResponse(context)) {
    return context;
  }

  // Sanitize errors outside of development environments
  if (context.errors) {
    context.errors = errors.sanitizeErrors(context.errors, serverMode);
  }

  // Restructure context.errors to the right Catch/Error Boundary
  if (build.future.v2_errorBoundary !== true) {
    differentiateCatchVersusErrorBoundaries(build, context);
  }
  let headers$1 = headers.getDocumentHeadersRR(build, context);
  let entryContext = {
    manifest: build.assets,
    routeModules: entry.createEntryRouteModules(build.routes),
    staticHandlerContext: context,
    serverHandoffString: serverHandoff.createServerHandoffString({
      state: {
        loaderData: context.loaderData,
        actionData: context.actionData,
        errors: errors.serializeErrors(context.errors, serverMode)
      },
      future: build.future,
      dev: build.dev
    }),
    future: build.future
  };
  let handleDocumentRequestFunction = build.entry.module.default;
  try {
    return await handleDocumentRequestFunction(request, context.statusCode, headers$1, entryContext, loadContext);
  } catch (error) {
    // Get a new StaticHandlerContext that contains the error at the right boundary
    context = router.getStaticContextFromError(staticHandler.dataRoutes, context, error);

    // Sanitize errors outside of development environments
    if (context.errors) {
      context.errors = errors.sanitizeErrors(context.errors, serverMode);
    }

    // Restructure context.errors to the right Catch/Error Boundary
    if (build.future.v2_errorBoundary !== true) {
      differentiateCatchVersusErrorBoundaries(build, context);
    }

    // Update entryContext for the second render pass
    entryContext = {
      ...entryContext,
      staticHandlerContext: context,
      serverHandoffString: serverHandoff.createServerHandoffString({
        state: {
          loaderData: context.loaderData,
          actionData: context.actionData,
          errors: errors.serializeErrors(context.errors, serverMode)
        },
        future: build.future
      })
    };
    try {
      return await handleDocumentRequestFunction(request, context.statusCode, headers$1, entryContext, loadContext);
    } catch (error) {
      logServerErrorIfNotAborted(error, request, serverMode);
      return returnLastResortErrorResponse(error, serverMode);
    }
  }
}
async function handleResourceRequestRR(serverMode, staticHandler, routeId, request, loadContext) {
  try {
    // Note we keep the routeId here to align with the Remix handling of
    // resource routes which doesn't take ?index into account and just takes
    // the leaf match
    let response = await staticHandler.queryRoute(request, {
      routeId,
      requestContext: loadContext
    });
    // callRouteLoader/callRouteAction always return responses
    invariant["default"](responses.isResponse(response), "Expected a Response to be returned from queryRoute");
    return response;
  } catch (error) {
    if (responses.isResponse(error)) {
      // Note: Not functionally required but ensures that our response headers
      // match identically to what Remix returns
      error.headers.set("X-Remix-Catch", "yes");
      return error;
    }
    logServerErrorIfNotAborted(error, request, serverMode);
    return returnLastResortErrorResponse(error, serverMode);
  }
}
function logServerErrorIfNotAborted(error, request, serverMode) {
  if (serverMode !== mode.ServerMode.Test && !request.signal.aborted) {
    console.error(error);
  }
}
function returnLastResortErrorResponse(error, serverMode) {
  let message = "Unexpected Server Error";
  if (serverMode !== mode.ServerMode.Production) {
    message += `\n\n${String(error)}`;
  }

  // Good grief folks, get your act together 😂!
  return new Response(message, {
    status: 500,
    headers: {
      "Content-Type": "text/plain"
    }
  });
}

exports.createRequestHandler = createRequestHandler;
exports.differentiateCatchVersusErrorBoundaries = differentiateCatchVersusErrorBoundaries;
