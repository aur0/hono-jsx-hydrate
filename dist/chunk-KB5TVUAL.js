import {
  Fragment
} from "./chunk-MC2LGV2Z.js";
import {
  DOM_ERROR_HANDLER
} from "./chunk-V4X66CWH.js";

// src/jsx/dom/components.ts
var ErrorBoundary = (({ children, fallback, fallbackRender, onError }) => {
  const res = Fragment({ children });
  res[DOM_ERROR_HANDLER] = (err) => {
    if (err instanceof Promise) {
      throw err;
    }
    onError?.(err);
    return fallbackRender?.(err) || fallback;
  };
  return res;
});
var Suspense = (({
  children,
  fallback
}) => {
  const res = Fragment({ children });
  res[DOM_ERROR_HANDLER] = (err, retry) => {
    if (!(err instanceof Promise)) {
      throw err;
    }
    err.then(retry, retry);
    return fallback;
  };
  return res;
});

export {
  ErrorBoundary,
  Suspense
};
