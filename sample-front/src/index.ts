import { serve } from "bun";

import index from "./index.html";

const API_UPSTREAM = process.env.BUN_PUBLIC_API_URL || "http://localhost:8080";

const server = serve({
  routes: {
    "/api/*": (req) => {
      const url = new URL(req.url);
      const upstream = `${API_UPSTREAM}${url.pathname}${url.search}`;
      const headers = new Headers(req.headers);
      headers.delete("host");
      return fetch(upstream, {
        method: req.method,
        headers,
        body: req.body,
      });
    },
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

process.stdout.write(`Server running at ${server.url}\n`);
