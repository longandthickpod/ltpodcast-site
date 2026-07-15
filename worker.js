// Cloudflare Worker entry point.
// This deployment serves the site as static assets via the ASSETS binding,
// and routes the two live-data API paths to their handlers in functions/api/.
import { onRequest as episodesHandler } from "./functions/api/episodes.js";
import { onRequest as articlesHandler } from "./functions/api/articles.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/episodes") {
      return episodesHandler({ request, env, ctx });
    }
    if (url.pathname === "/api/articles") {
      return articlesHandler({ request, env, ctx });
    }
    return env.ASSETS.fetch(request);
  },
};
