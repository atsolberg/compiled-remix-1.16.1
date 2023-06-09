/**
 * @remix-run/react v1.16.1
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
// TODO: keep data around on resubmission?

const IDLE_TRANSITION = {
  state: "idle",
  submission: undefined,
  location: undefined,
  type: "idle"
};
const IDLE_FETCHER = {
  state: "idle",
  type: "init",
  data: undefined,
  formMethod: undefined,
  formAction: undefined,
  formData: undefined,
  formEncType: undefined,
  submission: undefined
};

export { IDLE_FETCHER, IDLE_TRANSITION };
