// Cloudflare Pages Function — serves the Substack newsletter's latest posts as JSON.
// Lives at  https://ltpodcast.com/api/articles  once deployed.
// Fetches the Substack RSS feed server-side (browser can't, cross-origin),
// parses the items, and returns a small clean list the site can render.

const FEED_URL = "https://longandthickpodcast.substack.com/feed";

export async function onRequest(context) {
  try {
    const res = await fetch(FEED_URL, {
      cf: { cacheTtl: 300 },
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; LTPodcastSite/1.0; +https://ltpodcast.com)",
        "accept": "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    const xml = await res.text();

    const items = [];
    const blocks = xml.split("<item>").slice(1);
    for (const block of blocks.slice(0, 12)) {
      const pick = (re) => {
        const m = block.match(re);
        if (!m) return "";
        return m[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
      };
      const stripTags = (s) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      const decodeEntities = (s) => s
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");
      const rawDesc = pick(/<description>([\s\S]*?)<\/description>/);
      items.push({
        title: decodeEntities(pick(/<title>([\s\S]*?)<\/title>/)),
        link: pick(/<link>([\s\S]*?)<\/link>/),
        image: pick(/<enclosure[^>]*url="([^"]+)"/) || pick(/<img[^>]*src="([^"]+)"/),
        description: decodeEntities(stripTags(rawDesc)).slice(0, 220),
        pubDate: pick(/<pubDate>([\s\S]*?)<\/pubDate>/),
      });
    }

    return new Response(JSON.stringify({ items, _debug: items.length ? undefined : { status: res.status, len: xml.length } }), {
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
