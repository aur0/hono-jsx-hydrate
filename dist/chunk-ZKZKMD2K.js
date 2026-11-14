import {
  ErrorBoundary,
  Suspense
} from "./chunk-KB5TVUAL.js";
import {
  Fragment,
  jsxDEV,
  useActionState,
  useFormStatus,
  useOptimistic
} from "./chunk-MC2LGV2Z.js";
import {
  createPortal,
  createRef,
  flushSync,
  forwardRef,
  startTransition,
  startViewTransition,
  use,
  useCallback,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  useViewTransition
} from "./chunk-SAPHTOIM.js";
import {
  Children,
  DOM_MEMO,
  createContext,
  isValidElement,
  reactAPICompatVersion,
  shallowEqual,
  useContext
} from "./chunk-V4X66CWH.js";

// src/jsx/dom/index.ts
var createElement = (tag, props, ...children) => {
  const jsxProps = props ? { ...props } : {};
  if (children.length) {
    jsxProps.children = children.length === 1 ? children[0] : children;
  }
  let key = void 0;
  if ("key" in jsxProps) {
    key = jsxProps.key;
    delete jsxProps.key;
  }
  return jsxDEV(tag, jsxProps, key);
};
var cloneElement = (element, props, ...children) => {
  return jsxDEV(
    element.tag,
    {
      ...element.props,
      ...props,
      children: children.length ? children : element.props.children
    },
    element.key
  );
};
var memo = (component, propsAreEqual = shallowEqual) => {
  const wrapper = ((props) => component(props));
  wrapper[DOM_MEMO] = propsAreEqual;
  return wrapper;
};
var dom_default = {
  version: reactAPICompatVersion,
  useState,
  useEffect,
  useRef,
  useCallback,
  use,
  startTransition,
  useTransition,
  useDeferredValue,
  startViewTransition,
  useViewTransition,
  useMemo,
  useLayoutEffect,
  useInsertionEffect,
  useReducer,
  useId,
  useDebugValue,
  createRef,
  forwardRef,
  useImperativeHandle,
  useSyncExternalStore,
  useFormStatus,
  useActionState,
  useOptimistic,
  Suspense,
  ErrorBoundary,
  createContext,
  useContext,
  memo,
  isValidElement,
  createElement,
  cloneElement,
  Children,
  Fragment,
  StrictMode: Fragment,
  flushSync,
  createPortal
};

export {
  createElement,
  cloneElement,
  memo,
  dom_default
};
