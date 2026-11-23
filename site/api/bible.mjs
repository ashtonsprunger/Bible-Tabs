const API_BIBLE_BASE = "https://rest.api.bible/v1";

const ALLOWED_BIBLES = {
  niv: "78a9f6124f344018-01",
  nlt: "d6e14a625393b4da-01",
  nasb: "b8ee27bcd1cae43a-01",
};

const CHAPTER_ID_RE = /^[1-3]?[A-Z]{2,3}\.\d{1,3}$/;

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/bibletabs\.sprungerstudios\.app$/i,
  /^https:\/\/www\.bibletabs\.sprungerstudios\.app$/i,
  /^https:\/\/bible-tabs(?:-[a-z0-9-]+)?\.vercel\.app$/i,
  /^http:\/\/localhost(?::\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/i,
];

function isAllowedOrigin(origin) {
  if (!origin) return true; // Native mobile clients do not send Origin
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

function buildCorsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Bible-Tabs-Client",
    "Cache-Control": "private, no-store",
    Vary: "Origin",
  };
  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...buildCorsHeaders(origin),
    },
  });
}

export function OPTIONS(request) {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(origin),
  });
}

export async function GET(request) {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return jsonResponse({ error: "Origin not allowed." }, 403, null);
  }

  const apiKey = process.env.API_BIBLE_KEY;
  if (!apiKey) {
    console.error("[api/bible] Missing API_BIBLE_KEY environment variable.");
    return jsonResponse(
      { error: "Scripture service is not configured." },
      500,
      origin
    );
  }

  const url = new URL(request.url);
  const action = (url.searchParams.get("action") || "chapter").toLowerCase();
  const translation = (url.searchParams.get("translation") || "").toLowerCase();
  const bibleId = ALLOWED_BIBLES[translation];

  if (!bibleId) {
    return jsonResponse(
      { error: "Unsupported translation. Use niv, nlt, or nasb." },
      400,
      origin
    );
  }

  try {
    if (action === "chapter") {
      const chapterId = (url.searchParams.get("chapterId") || "")
        .trim()
        .toUpperCase();
      if (!CHAPTER_ID_RE.test(chapterId)) {
        return jsonResponse({ error: "Invalid chapterId format." }, 400, origin);
      }

      const upstreamParams = new URLSearchParams({
        "content-type": "json",
        "include-notes": "true",
        "include-titles": "true",
        "include-chapter-numbers": "false",
        "include-verse-numbers": "true",
        "include-verse-spans": "true",
        "fums-version": "3",
      });

      const upstreamUrl = `${API_BIBLE_BASE}/bibles/${bibleId}/chapters/${encodeURIComponent(
        chapterId
      )}?${upstreamParams.toString()}`;

      const upstreamRes = await fetch(upstreamUrl, {
        headers: {
          "api-key": apiKey,
          Accept: "application/json",
        },
        signal: request.signal,
      });

      if (!upstreamRes.ok) {
        const errText = await upstreamRes.text().catch(() => "");
        console.error(
          `[api/bible] Upstream chapter error ${upstreamRes.status} for ${translation}/${chapterId}: ${errText.slice(0, 300)}`
        );
        return jsonResponse(
          {
            error:
              upstreamRes.status === 429
                ? "Monthly Scripture API limit reached. Please try again later."
                : "Could not load Scripture chapter from API.Bible.",
          },
          upstreamRes.status === 429 ? 429 : 502,
          origin
        );
      }

      const payload = await upstreamRes.json();
      return jsonResponse(
        {
          translation,
          bibleId,
          chapterId: payload.data?.id ?? chapterId,
          reference: payload.data?.reference ?? chapterId,
          copyright: payload.data?.copyright ?? "",
          content: Array.isArray(payload.data?.content)
            ? payload.data.content
            : [],
          fumsToken: payload.meta?.fumsToken ?? null,
        },
        200,
        origin
      );
    }

    if (action === "search") {
      const query = (url.searchParams.get("query") || "").trim();
      if (query.length < 2 || query.length > 120) {
        return jsonResponse(
          { error: "Search query must be between 2 and 120 characters." },
          400,
          origin
        );
      }

      const rawLimit = Number.parseInt(
        url.searchParams.get("limit") || "40",
        10
      );
      const limit = Number.isFinite(rawLimit)
        ? Math.max(1, Math.min(50, rawLimit))
        : 40;

      const upstreamParams = new URLSearchParams({
        query,
        limit: String(limit),
        sort: "canonical",
        "fums-version": "3",
      });

      const upstreamUrl = `${API_BIBLE_BASE}/bibles/${bibleId}/search?${upstreamParams.toString()}`;

      const upstreamRes = await fetch(upstreamUrl, {
        headers: {
          "api-key": apiKey,
          Accept: "application/json",
        },
        signal: request.signal,
      });

      if (!upstreamRes.ok) {
        const errText = await upstreamRes.text().catch(() => "");
        console.error(
          `[api/bible] Upstream search error ${upstreamRes.status} for ${translation}: ${errText.slice(0, 300)}`
        );
        return jsonResponse(
          {
            error:
              upstreamRes.status === 429
                ? "Monthly Scripture API limit reached. Please try again later."
                : "Could not search Scripture from API.Bible.",
          },
          upstreamRes.status === 429 ? 429 : 502,
          origin
        );
      }

      const payload = await upstreamRes.json();
      const rawVerses = Array.isArray(payload.data?.verses)
        ? payload.data.verses
        : [];

      return jsonResponse(
        {
          translation,
          query: payload.data?.query ?? query,
          total: payload.data?.total ?? rawVerses.length,
          verses: rawVerses.map((v) => ({
            id: v.id ?? "",
            bookId: v.bookId ?? "",
            chapterId: v.chapterId ?? "",
            reference: v.reference ?? "",
            text: v.text ?? "",
          })),
          fumsToken: payload.meta?.fumsToken ?? null,
        },
        200,
        origin
      );
    }

    return jsonResponse({ error: "Invalid action." }, 400, origin);
  } catch (err) {
    console.error("[api/bible] Unexpected proxy error:", err);
    return jsonResponse(
      { error: "Temporary network error contacting Scripture service." },
      502,
      origin
    );
  }
}
