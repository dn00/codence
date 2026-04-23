import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import "./index.css";

export function getRootElement(doc: Document = document): HTMLElement {
  const root = doc.getElementById("root");

  if (!(root instanceof HTMLElement)) {
    throw new Error("Missing root mount element");
  }

  return root;
}

export function mountApp(doc: Document = document): Root {
  const root = createRoot(getRootElement(doc));
  root.render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
  return root;
}

if (typeof document !== "undefined" && document.getElementById("root")) {
  mountApp(document);
}
