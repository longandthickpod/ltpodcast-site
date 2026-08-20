// Cloudflare Worker entry point.
// This deployment serves the site as static assets via the ASSETS binding,
// and routes the two live-data API paths to their handlers in functions/api/.
import { onRequest as episodesHandler } from "./functions/api/episodes.js";
import { onRequest as articlesHandler } from "./functions/api/articles.js";
import { onRequest as stockHandler } from "./functions/api/stock.js";
import { onRequest as stripeWebhookHandler } from "./functions/api/stripe-webhook.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/episodes") {
      return episodesHandler({ request, env, ctx });
    }
    if (url.pathname === "/api/articles") {
      return articlesHandler({ request, env, ctx });
    }
    if (url.pathname === "/api/stock") {
      return stockHandler({ request, env, ctx });
    }
    if (url.pathname === "/api/stripe-webhook") {
      return stripeWebhookHandler({ request, env, ctx });
    }
    return env.ASSETS.fetch(request);
  },
};
