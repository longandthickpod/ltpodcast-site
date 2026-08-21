// Stripe webhook: on checkout.session.completed, decrement stock for the
// purchased SKU in KV. Requires env.STRIPE_WEBHOOK_SECRET (Cloudflare secret)
// and env.STOCK_KV (KV namespace binding).
// Map Stripe Price IDs to our internal SKUs — fill these in once the two
// Payment Links / Prices exist in the Stripe dashboard.
const PRICE_TO_SKU = {
  "price_1U6b6iBn6q2OqjaasnnZNQv1": "shirt_s",
  "price_1U6c2sBn6q2Oqjaalvk9EC3X": "shirt_m",
  "price_1U70pxBn6q2OqjaaNjeOjFnF": "shirt_m",
  "price_1U6c3SBn6q2OqjaaBVBhJUys": "shirt_l",
  "price_1U70vBBn6q2OqjaabPmiYuym": "shirt_l",
  "price_1U6c46Bn6q2OqjaahAUlALik": "shirt_xl",
  "price_1U713TBn6q2OqjaaD42Uf0uk": "shirt_xl",
  "price_1U6c4UBn6q2OqjaaXvuSutX8": "shirt_xxl",
  "price_1U710OBn6q2Oqjaa34so0Lvn": "shirt_xxl",
  "price_1U6b7XBn6q2OqjaaaQ4TYNoF": "hat",
};

const INITIAL_STOCK = { shirt_s: 7, shirt_m: 0, shirt_l: 0, shirt_xl: 0, shirt_xxl: 0, hat: 12 };

async function verifyStripeSignature(payload, sigHeader, secret) {
  const parts = Object.fromEntries(sigHeader.split(",").map(p => p.split("=")));
  const signedPayload = `${parts.t}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = [...new Uint8Array(sigBuf)].map(b => b.toString(16).padStart(2, "0")).join("");
  return expected === parts.v1;
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const payload = await request.text();
  const sig = request.headers.get("stripe-signature") || "";

  if (env.STRIPE_WEBHOOK_SECRET) {
    const ok = await verifyStripeSignature(payload, sig, env.STRIPE_WEBHOOK_SECRET).catch(() => false);
    if (!ok) return new Response("Invalid signature", { status: 400 });
  }

  let event;
  try { event = JSON.parse(payload); } catch { return new Response("Bad payload", { status: 400 }); }

  if (event.type === "checkout.session.completed" && env.STOCK_KV) {
    const sessionId = event.data.object.id;
    const lineItemsRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}/line_items`,
      { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } }
    );
    const lineItems = await lineItemsRes.json();
    for (const item of lineItems.data || []) {
      const sku = PRICE_TO_SKU[item.price?.id];
      if (!sku) continue;
      const current = parseInt((await env.STOCK_KV.get(sku)) ?? INITIAL_STOCK[sku], 10);
      const next = Math.max(0, current - (item.quantity || 1));
      await env.STOCK_KV.put(sku, String(next));
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "content-type": "application/json" } });
}
