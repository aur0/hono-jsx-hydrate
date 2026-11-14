import {
  buildNode,
  hydrateNode,
  nodeIdScopes,
  renderNode,
  useState
} from "./chunk-SAPHTOIM.js";
import "./chunk-V4X66CWH.js";
import "./chunk-MLKGABMK.js";

// src/jsx/dom/client.ts
var createRootInternal = (element, options = {}, hydrate = false) => {
  let hydration;
  let setJsxNode = (
    // unmounted
    void 0
  );
  if (Object.keys(options).some((key) => key !== "identifierPrefix" && key !== "onRecoverableError")) {
    console.warn("createRoot options are not supported yet");
  }
  return {
    render(jsxNode) {
      if (setJsxNode === null) {
        throw new Error("Cannot update an unmounted root");
      }
      if (hydration?.pending) {
        hydration.cancelled = true;
        setJsxNode = void 0;
      }
      if (setJsxNode) {
        setJsxNode(jsxNode);
      } else {
        const node = buildNode({
          tag: () => {
            const [_jsxNode, _setJsxNode] = useState(jsxNode);
            setJsxNode = _setJsxNode;
            return _jsxNode;
          },
          props: {}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        });
        nodeIdScopes.set(node, { prefix: options.identifierPrefix || "", next: 0 });
        if (hydrate) {
          hydration = { pending: false, cancelled: false, onRecoverableError: options.onRecoverableError };
          hydrateNode(node, element, hydration);
          hydrate = false;
        } else renderNode(node, element);
      }
    },
    unmount() {
      if (hydration?.pending) {
        hydration.cancelled = true;
        element.replaceChildren();
      } else setJsxNode?.(null);
      setJsxNode = null;
    }
  };
};
var createRoot = (element, options = {}) => createRootInternal(element, options);
var hydrateRoot = (element, reactNode, options = {}) => {
  const root = createRootInternal(element, options, true);
  root.render(reactNode);
  return root;
};
var client_default = {
  createRoot,
  hydrateRoot
};
export {
  createRoot,
  client_default as default,
  hydrateRoot
};
