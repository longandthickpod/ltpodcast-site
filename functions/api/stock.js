// Returns current stock counts for the two live SKUs.
// Backed by a Cloudflare KV namespace (binding: STOCK_KV) so the
// stripe-webhook function can decrement it on each sale.
const INITIAL_STOCK = { shirt: 46, hat: 12 };

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
