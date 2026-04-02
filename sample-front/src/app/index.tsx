import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Theme } from "@radix-ui/themes";

import "@radix-ui/themes/styles.css";

import { App } from "./App";

const elem = document.getElementById("root");
if (!elem) throw new Error("Root element not found");
const app = (
  <StrictMode>
    <Theme appearance="light" accentColor="gray" grayColor="slate" radius="large">
      <App />
    </Theme>
  </StrictMode>
);

if (import.meta.hot) {
  const root = (import.meta.hot.data.root ??= createRoot(elem));
  root.render(app);
} else {
  createRoot(elem).render(app);
}
