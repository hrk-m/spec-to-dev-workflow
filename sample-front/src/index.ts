import { serve } from "bun";

import index from "./index.html";

const server = serve({
  routes: {
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

process.stdout.write(`🚀 Server running at ${server.url}\n`);
