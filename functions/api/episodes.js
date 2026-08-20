// Cloudflare Pages Function — serves the podcast's latest episodes as JSON.
// Lives at  https://ltpodcast.com/api/episodes  once deployed.
// It fetches the Spotify for Creators (Anchor) RSS feed server-side so the
// browser never has to (which it can't, due to cross-origin rules), parses
// the items, and returns a small clean list the site can render.

const FEED_URL = "https://anchor.fm/s/1149378ac/podcast/rss";

export async function onRequest(context) {
  try {
    const res = await fetch(FEED_URL, {
      cf: { cacheTtl: 300, cacheEverything: true },
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; LTPodcastSite/1.0; +https://ltpodcast.com)",
        "accept": "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    const xml = await res.text();
    const channelBlock = xml.split("<item>")[0];
    const channelImageMatch = channelBlock.match(/<itunes:image\s+href="([^"]+)"/) || channelBlock.match(/<image>[\s\S]*?<url>([^<]+)<\/url>/);
    const channelImage = channelImageMatch ? channelImageMatch[1].trim() : "";

    const items = [];
    const blocks = xml.split("<item>").slice(1).map(b => b.split("</item>")[0]);
    const totalCount = blocks.length;
    for (const block of blocks.slice(0, 15)) {
      const pick = (re) => {
        const m = block.match(re);
        if (!m) return "";
        return m[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
      };
      items.push({
        title: pick(/<title>([\s\S]*?)<\/title>/),
        link: "https://open.spotify.com/show/2UeHpUXYpt1Cd0QLHPg4cq",
        image: pick(/<itunes:image\s+href="([^"]+)"/) || channelImage,
        description: pick(/<description>([\s\S]*?)<\/description>/) || pick(/<itunes:summary>([\s\S]*?)<\/itunes:summary>/),
        duration: pick(/<itunes:duration>([\s\S]*?)<\/itunes:duration>/),
        pubDate: pick(/<pubDate>([\s\S]*?)<\/pubDate>/),
      });
    }

    items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    return new Response(JSON.stringify({ items, totalCount }), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=300",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ items: [], error: String(e) }), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}
