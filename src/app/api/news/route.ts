import { NextResponse } from "next/server";

type NewsArticle = {
  title?: string;
  description?: string | null;
  url?: string;
  urlToImage?: string | null;
  source?: {
    name?: string;
  };
  publishedAt?: string;
};

const fallbackGlobalHeadlines = [
  {
    id: "fallback-global-markets",
    title: "US business headlines track rates, earnings, and market momentum",
    source: "Placeholder",
    url: "https://newsapi.org/",
    imageUrl: null,
    publishedAt: new Date().toISOString()
  },
  {
    id: "fallback-global-tech",
    title: "Technology earnings remain a key driver for global equity sentiment",
    source: "Placeholder",
    url: "https://newsapi.org/",
    imageUrl: null,
    publishedAt: new Date().toISOString()
  },
  {
    id: "fallback-global-banks",
    title: "Banking and consumer data shape the latest business outlook",
    source: "Placeholder",
    url: "https://newsapi.org/",
    imageUrl: null,
    publishedAt: new Date().toISOString()
  }
];

const fallbackIndonesiaHeadlines = [
  {
    id: "fallback-id-market",
    title: "Berita Indonesia memantau IHSG, rupiah, dan emiten utama",
    source: "Placeholder",
    url: "https://newsapi.org/",
    imageUrl: null,
    publishedAt: new Date().toISOString()
  },
  {
    id: "fallback-id-policy",
    title: "Kebijakan ekonomi domestik menjadi perhatian pelaku pasar",
    source: "Placeholder",
    url: "https://newsapi.org/",
    imageUrl: null,
    publishedAt: new Date().toISOString()
  },
  {
    id: "fallback-id-business",
    title: "Sektor perbankan, komoditas, dan teknologi lokal tetap dipantau",
    source: "Placeholder",
    url: "https://newsapi.org/",
    imageUrl: null,
    publishedAt: new Date().toISOString()
  }
];

function mapArticles(articles: NewsArticle[], prefix: string) {
  return articles.slice(0, 5).map((article, index) => ({
    id: `${prefix}-${article.source?.name ?? "news"}-${index}`,
    title: article.title ?? "Untitled headline",
    source: article.source?.name ?? "NewsAPI",
    url: article.url ?? "https://newsapi.org/",
    imageUrl: article.urlToImage ?? null,
    publishedAt: article.publishedAt ?? new Date().toISOString()
  }));
}

function fallbackNews(message: string) {
  return NextResponse.json(
    {
      headlines: fallbackGlobalHeadlines,
      globalHeadlines: fallbackGlobalHeadlines,
      indonesiaHeadlines: fallbackIndonesiaHeadlines,
      updatedAt: new Date().toISOString(),
      status: "fallback",
      message
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET() {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    return fallbackNews("Isi NEWS_API_KEY untuk mengambil headline terbaru.");
  }

  try {
    const requestOptions = {
      cache: "no-store" as const,
      headers: {
        "User-Agent": "couple-hub/1.0"
      },
      signal: AbortSignal.timeout(6500)
    };
    const [globalResponse, indonesiaResponse] = await Promise.all([
      fetch(
        `https://newsapi.org/v2/top-headlines?country=us&category=business&pageSize=5&apiKey=${apiKey}`,
        requestOptions
      ),
      fetch(
        `https://newsapi.org/v2/top-headlines?country=id&pageSize=5&apiKey=${apiKey}`,
        requestOptions
      )
    ]);

    if (!globalResponse.ok || !indonesiaResponse.ok) {
      return fallbackNews("NewsAPI gagal dimuat.");
    }

    const [globalData, indonesiaData] = (await Promise.all([
      globalResponse.json(),
      indonesiaResponse.json()
    ])) as Array<{ articles?: NewsArticle[] }>;
    const globalArticles = Array.isArray(globalData.articles)
      ? globalData.articles
      : [];
    const indonesiaArticles = Array.isArray(indonesiaData.articles)
      ? indonesiaData.articles
      : [];
    const globalHeadlines = mapArticles(globalArticles, "global");
    const indonesiaHeadlines = mapArticles(indonesiaArticles, "id");

    return NextResponse.json(
      {
        headlines: globalHeadlines,
        globalHeadlines,
        indonesiaHeadlines,
        updatedAt: new Date().toISOString(),
        status: "live"
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return fallbackNews("NewsAPI gagal dimuat.");
  }
}
