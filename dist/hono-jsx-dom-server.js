import {
  renderToReadableStream
} from "./chunk-IDWF2FVG.js";
import {
  dom_default
} from "./chunk-ZKZKMD2K.js";
import "./chunk-KB5TVUAL.js";
import "./chunk-LPQFXR7P.js";
import "./chunk-MC2LGV2Z.js";
import {
  withIdScope
} from "./chunk-SAPHTOIM.js";
import {
  renderChildren
} from "./chunk-V4X66CWH.js";
import "./chunk-MLKGABMK.js";

// src/jsx/dom/server.ts
var prepareRoot = (element) => typeof element === "string" || Array.isArray(element) ? renderChildren([element]) : element;
var renderToString = (element, options = {}) => {
  if (Object.keys(options).some((key) => key !== "identifierPrefix")) {
    console.warn("options are not supported yet");
  }
  const res = withIdScope({ prefix: options.identifierPrefix || "", next: 0 }, () => {
    element = prepareRoot(element);
    return element instanceof Promise ? element : element?.toString() ?? "";
  });
  if (typeof res !== "string") {
    throw new Error("Async component is not supported in renderToString");
  }
  return res;
};
var renderToReadableStream2 = async (element, options = {}) => {
  if (Object.keys(options).some((key) => key !== "onError")) {
    console.warn("options are not supported yet, except onError");
  }
  element = prepareRoot(element);
  if (!element || typeof element !== "object") {
    element = element?.toString() ?? "";
  }
  return renderToReadableStream(element, options.onError);
};
var server_default = {
  renderToString,
  renderToReadableStream: renderToReadableStream2,
  version: dom_default
};
export {
  server_default as default,
  renderToReadableStream2 as renderToReadableStream,
  renderToString,
  dom_default as version
};
