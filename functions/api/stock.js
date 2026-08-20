// Returns current stock counts for the two live SKUs.
// Backed by a Cloudflare KV namespace (binding: STOCK_KV) so the
// stripe-webhook function can decrement it on each sale.
const INITIAL_STOCK = { shirt_s: 7, shirt_m: 12, shirt_l: 13, shirt_xl: 8, shirt_xxl: 3, hat: 11 };

export async function onRequest({ request, env }) {
  const headers = { "content-type": "application/json", "cache-control": "no-store" };
  try {
    const out = {};
    for (const sku of Object.keys(INITIAL_STOCK)) {
      const raw = env.STOCK_KV ? await env.STOCK_KV.get(sku) : null;
      out[sku] = raw !== null ? parseInt(raw, 10) : INITIAL_STOCK[sku];
    }
    return new Response(JSON.stringify(out), { headers });
  } catch (err) {
    return new Response(JSON.stringify(INITIAL_STOCK), { headers });
  }
}
