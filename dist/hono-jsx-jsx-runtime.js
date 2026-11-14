import {
  jsxDEV
} from "./chunk-TRKYGBOI.js";
import {
  Fragment,
  PERMALINK,
  attributeToBuffer,
  escapeToBuffer,
  html,
  isValidAttributeName,
  markRenderedJSX,
  raw,
  stringBufferToString
} from "./chunk-V4X66CWH.js";
import "./chunk-MLKGABMK.js";

// src/jsx/jsx-runtime.ts
var jsxTemplate = (strings, ...values) => {
  const result = html(strings, ...values);
  return result instanceof Promise ? result.then(markRenderedJSX) : markRenderedJSX(result);
};
var jsxAttr = (key, v) => {
  if (!isValidAttributeName(key)) {
    return raw("");
  }
  if (typeof v === "string") {
    const buffer2 = [`${key}="`];
    escapeToBuffer(v, buffer2);
    return raw(buffer2[0] + '"');
  }
  let value = v;
  if (typeof value === "function" && (key === "action" || key === "formaction")) {
    value = PERMALINK in value ? value[PERMALINK] : void 0;
  }
  const buffer = [""];
  attributeToBuffer(buffer, "", key, value);
  return buffer.length === 1 ? raw(buffer[0]) : stringBufferToString(buffer, void 0);
};
var jsxEscape = (value) => value;
export {
  Fragment,
  jsxDEV as jsx,
  jsxAttr,
  jsxEscape,
  jsxTemplate,
  jsxDEV as jsxs
};
