// Cloudflare Pages Function — serves the podcast's latest episodes as JSON.
// Lives at  https://ltpodcast.com/api/episodes  once deployed.
// It fetches the Spotify for Creators (Anchor) RSS feed server-side so the
// browser never has to (which it can't, due to cross-origin rules), parses
// the items, and returns a small clean list the site can render.

const FEED_URL = "https://anchor.fm/s/1149378ac/podcast/rss";

export async function onRequest(context) {
  try {
    // cache-bust: Cloudflare's edge cache keys the upstream fetch by URL, so a
    // bad/empty upstream response (e.g. a transient block) can get stuck for
    // the full cacheTtl. Tying the key to a 30-min time bucket lets a bad
    // response self-heal on the next bucket instead of sticking around.
    const bucket = Math.floor(Date.now() / 1800000);
    const res = await fetch(`${FEED_URL}?_cb=${bucket}`, {
      cf: { cacheTtl: 1800, cacheEverything: true },
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; LTPodcastSite/1.0; +https://ltpodcast.com)",
        "accept": "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    const xml = await res.text();

    const items = [];
    const blocks = xml.split("<item>").slice(1);
    for (const block of blocks.slice(0, 15)) {
      const pick = (re) => {
        const m = block.match(re);
        if (!m) return "";
        return m[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
      };
      items.push({
        title: pick(/<title>([\s\S]*?)<\/title>/),
        link: "https://open.spotify.com/show/2UeHpUXYpt1Cd0QLHPg4cq",
        image: pick(/<itunes:image\s+href="([^"]+)"/),
        duration: pick(/<itunes:duration>([\s\S]*?)<\/itunes:duration>/),
        pubDate: pick(/<pubDate>([\s\S]*?)<\/pubDate>/),
      });
    }

    return new Response(JSON.stringify({ items }), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=1800",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ items: [], error: String(e) }), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}
