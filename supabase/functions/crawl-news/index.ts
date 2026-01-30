const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Private market keywords for filtering - expanded list
const KEYWORDS = [
  // Core PE/VC terms
  "private equity", "venture capital", "VC fund", "PE fund", "growth equity",
  "private credit", "private debt", "mezzanine financing", "leveraged buyout", "LBO",
  "management buyout", "MBO", "secondary buyout", "carve-out", "spin-off",
  
  // Funding rounds
  "series A", "series B", "series C", "series D", "series E", "series F",
  "seed round", "seed funding", "pre-seed", "angel investment", "angel round",
  "bridge round", "bridge financing", "extension round", "pre-IPO", "late-stage",
  "early-stage", "growth stage", "mega round",
  
  // Deal activity
  "fundraise", "fundraising", "capital raised", "raises funding", "raised funding",
  "secures funding", "closes funding", "funding round", "investment round",
  "acquisition", "acquires", "acquired", "merger", "M&A", "buyout",
  "takeover", "deal value", "deal size", "transaction value",
  
  // Stake and ownership
  "minority stake", "majority stake", "controlling stake", "equity stake",
  "strategic stake", "stake acquisition", "stake sale", "exits", "exit",
  "divestiture", "divestment", "partial sale",
  
  // Market participants
  "portfolio company", "investment firm", "asset manager", "fund manager",
  "limited partner", "LP", "general partner", "GP", "institutional investor",
  "strategic investor", "financial sponsor", "sovereign wealth fund", "SWF",
  "family office", "pension fund", "endowment", "hedge fund",
  
  // Fund terms
  "private markets", "alternative assets", "alternatives", "AUM", "assets under management",
  "fund closing", "first close", "final close", "fund size", "dry powder",
  "committed capital", "capital call", "distribution", "carried interest",
  "management fee", "hurdle rate", "IRR", "internal rate of return", "MOIC",
  
  // Valuation and metrics
  "valuation", "pre-money", "post-money", "unicorn", "decacorn",
  "down round", "up round", "flat round", "markup", "write-down",
  
  // Sectors commonly covered
  "fintech", "healthtech", "edtech", "proptech", "insurtech", "agritech",
  "cleantech", "deeptech", "biotech", "medtech", "SaaS", "enterprise software",
  
  // Geographic terms often in headlines
  "India startup", "Southeast Asia", "MENA", "emerging markets",
  "cross-border", "global fund", "regional fund"
];

// News sources configuration - optimized URLs for article discovery
const NEWS_SOURCES = [
  { 
    name: 'TechCrunch', 
    url: 'https://techcrunch.com/category/venture/', 
    rssUrl: 'https://techcrunch.com/feed/',
    urlPatterns: ['/20', '/venture/', '/startups/']
  },
  { 
    name: 'Crunchbase News', 
    url: 'https://news.crunchbase.com/venture/', 
    rssUrl: 'https://news.crunchbase.com/feed/',
    urlPatterns: ['/venture/', '/ma/', '/fintech/', '/news/']
  },
  { 
    name: 'Moneycontrol', 
    url: 'https://www.moneycontrol.com/news/business/companies/', 
    rssUrl: 'https://www.moneycontrol.com/rss/business.xml',
    urlPatterns: ['/news/', '/article-']
  },
  { 
    name: 'LiveMint', 
    url: 'https://www.livemint.com/companies/start-ups', 
    rssUrl: 'https://www.livemint.com/rss/companies',
    urlPatterns: ['/companies/', '/market/', '/money/']
  },
  { 
    name: 'ET', 
    url: 'https://economictimes.indiatimes.com/tech/startups', 
    rssUrl: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms',
    urlPatterns: ['/articleshow/', '/tech/startups/', '/small-biz/']
  },
  { 
    name: 'PR Newswire', 
    url: 'https://www.prnewswire.com/news-releases/financial-services-latest-news/', 
    rssUrl: 'https://www.prnewswire.com/rss/financial-services-latest-news/financial-services-latest-news-list.rss',
    urlPatterns: ['/news-releases/']
  },
  { 
    name: 'GlobeNewswire', 
    url: 'https://www.globenewswire.com/en/search/tag/Private%20Equity', 
    rssUrl: null,
    urlPatterns: ['/news-release/', 'globenewswire.com']
  },
  { 
    name: 'VCCircle', 
    url: 'https://www.vccircle.com/', 
    rssUrl: null, // VCCircle doesn't have public RSS
    urlPatterns: ['/vccircle.com/', '-funding', '-invest', '-acquisition', '-raises']
  },
  { 
    name: 'DealStreetAsia', 
    url: 'https://www.dealstreetasia.com/stories', 
    rssUrl: 'https://www.dealstreetasia.com/feed/',
    urlPatterns: ['/stories/', '/partner-content/']
  },
  { 
    name: 'PEI', 
    url: 'https://www.privateequityinternational.com/news/', 
    rssUrl: 'https://www.privateequityinternational.com/feed/',
    urlPatterns: ['/news/', '/analysis/']
  },
];

interface NewsArticle {
  url: string;
  source_name: string;
  published_at: string | null;
  headline: string;
  body_text: string | null;
}

function isEnglish(text: string): boolean {
  const asciiCount = (text.match(/[\x00-\x7F]/g) || []).length;
  return asciiCount / text.length > 0.8;
}

function matchesKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

function isWithinDateRange(publishedAt: string | null, startDate: string, endDate: string): boolean {
  if (!publishedAt) return true;
  const pubDate = new Date(publishedAt);
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return pubDate >= start && pubDate <= end;
}

// Parse date from various formats found in scraped content
function parseDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch {
    // Try common patterns
    const patterns = [
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i,
      /(\d{4})-(\d{2})-(\d{2})/,
    ];
    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        try {
          const parsed = new Date(match[0]);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString();
          }
        } catch {}
      }
    }
  }
  return null;
}

// Scrape individual article page to get proper headline and body
async function scrapeArticlePage(url: string, sourceName: string, apiKey: string): Promise<NewsArticle | null> {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 1500,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const markdown = data.data?.markdown || data.markdown || '';
    const metadata = data.data?.metadata || data.metadata || {};
    
    // Extract headline from metadata title or first markdown heading
    let headline = metadata.title || '';
    if (!headline || headline.length < 10) {
      const headlineMatch = markdown.match(/^#{1,2}\s+([^\n]+)/m);
      if (headlineMatch) {
        headline = headlineMatch[1].trim();
      }
    }
    
    // Clean up headline - remove site name suffixes
    headline = headline
      .replace(/\s*[\|\-–—]\s*(TechCrunch|Crunchbase|Moneycontrol|LiveMint|ET|PR Newswire|GlobeNewswire|VCCircle|DealStreetAsia|PEI).*$/i, '')
      .replace(/\s*[\|\-–—]\s*News$/i, '')
      .trim();
    
    // Extract body text - first 2-3 paragraphs (500 chars)
    const bodyContent = markdown
      .replace(/^#{1,6}\s+[^\n]+\n?/gm, '') // Remove headings
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/^\s*[-*•]\s+/gm, '') // Remove list markers
      .replace(/\n{3,}/g, '\n\n') // Normalize newlines
      .trim();
    
    const bodyText = bodyContent.substring(0, 500);
    
    // Extract date from metadata or content
    let publishedAt = metadata.publishedTime || metadata.datePublished || null;
    if (!publishedAt) {
      const dateMatch = url.match(/\/(\d{4})[-\/](\d{2})[-\/](\d{2})/);
      if (dateMatch) {
        publishedAt = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`).toISOString();
      }
    }
    if (!publishedAt) {
      publishedAt = new Date().toISOString();
    }
    
    if (!headline || headline.length < 10) {
      return null;
    }
    
    return {
      url,
      source_name: sourceName,
      published_at: publishedAt,
      headline: headline.substring(0, 500),
      body_text: bodyText || null,
    };
  } catch (error) {
    console.error(`Error scraping article ${url}:`, error);
    return null;
  }
}

// Primary method: Firecrawl scraping - get links first, then scrape each article
async function scrapeWithFirecrawl(source: typeof NEWS_SOURCES[0], apiKey: string): Promise<NewsArticle[]> {
  try {
    console.log(`[Firecrawl] Scraping ${source.name}: ${source.url}`);
    
    // First, get the list page to find article links
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: source.url,
        formats: ['links'],
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Firecrawl] Error for ${source.name}: ${response.status} - ${errorText}`);
      return [];
    }

    const data = await response.json();
    const links = data.data?.links || data.links || [];
    
    // Filter links using source-specific patterns
    const articleLinks = links.filter((link: string) => {
      if (!link || typeof link !== 'string') return false;
      const lowerLink = link.toLowerCase();
      
      const matchesPattern = source.urlPatterns.some(pattern => 
        lowerLink.includes(pattern.toLowerCase())
      );
      
      const isExcluded = (
        lowerLink.includes('/tag/') || 
        lowerLink.includes('/category/') ||
        lowerLink.includes('/author/') ||
        lowerLink.includes('/page/') ||
        lowerLink.includes('#') ||
        lowerLink.includes('/search') ||
        lowerLink.includes('/login') ||
        lowerLink.includes('/register') ||
        lowerLink.endsWith('.jpg') ||
        lowerLink.endsWith('.png') ||
        lowerLink.endsWith('.pdf')
      );
      
      return matchesPattern && !isExcluded;
    });

    const uniqueLinks: string[] = [...new Set(articleLinks as string[])];
    console.log(`[Firecrawl] Found ${uniqueLinks.length} article links from ${source.name}`);

    // Scrape individual articles (limit to 15 per source to avoid rate limits)
    const articlesToScrape = uniqueLinks.slice(0, 15);
    const articles: NewsArticle[] = [];
    
    // Scrape in batches of 5 to avoid overwhelming the API
    for (let i = 0; i < articlesToScrape.length; i += 5) {
      const batch = articlesToScrape.slice(i, i + 5);
      const batchResults = await Promise.all(
        batch.map(url => scrapeArticlePage(url, source.name, apiKey))
      );
      
      for (const article of batchResults) {
        if (article) {
          articles.push(article);
        }
      }
      
      // Small delay between batches
      if (i + 5 < articlesToScrape.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`[Firecrawl] Scraped ${articles.length} articles with full content from ${source.name}`);
    return articles;
  } catch (error) {
    console.error(`[Firecrawl] Error scraping ${source.name}:`, error);
    return [];
  }
}

// Fallback method: RSS parsing
async function parseRssFeed(source: typeof NEWS_SOURCES[0]): Promise<NewsArticle[]> {
  if (!source.rssUrl) {
    console.log(`[RSS] No RSS feed available for ${source.name}`);
    return [];
  }
  
  try {
    console.log(`[RSS Fallback] Fetching ${source.name}: ${source.rssUrl}`);
    const response = await fetch(source.rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' }
    });
    
    if (!response.ok) {
      console.error(`[RSS] Failed to fetch ${source.name}: ${response.status}`);
      return [];
    }
    
    const xml = await response.text();
    const articles: NewsArticle[] = [];
    
    const itemMatches = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
    
    for (const item of itemMatches.slice(0, 20)) {
      const titleMatch = item.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const linkMatch = item.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      const pubDateMatch = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
      const descMatch = item.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      
      if (titleMatch && linkMatch) {
        const headline = titleMatch[1].replace(/<[^>]+>/g, '').trim();
        const url = linkMatch[1].replace(/<[^>]+>/g, '').trim();
        const publishedAt = pubDateMatch ? parseDate(pubDateMatch[1].trim()) : null;
        const body = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim().substring(0, 500) : null;
        
        if (headline && url) {
          articles.push({
            url,
            source_name: source.name,
            published_at: publishedAt,
            headline,
            body_text: body,
          });
        }
      }
    }
    
    console.log(`[RSS] Parsed ${articles.length} articles from ${source.name}`);
    return articles;
  } catch (error) {
    console.error(`[RSS] Error parsing ${source.name}:`, error);
    return [];
  }
}

// Crawl a single source with Firecrawl primary, RSS fallback
async function crawlSource(source: typeof NEWS_SOURCES[0], firecrawlApiKey: string | undefined): Promise<NewsArticle[]> {
  // Try Firecrawl first if API key is available
  if (firecrawlApiKey) {
    const firecrawlArticles = await scrapeWithFirecrawl(source, firecrawlApiKey);
    if (firecrawlArticles.length > 0) {
      return firecrawlArticles;
    }
    console.log(`[Firecrawl] No articles found for ${source.name}, trying RSS fallback...`);
  }
  
  // Fallback to RSS if Firecrawl fails or returns no results
  return await parseRssFeed(source);
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Timing-safe string comparison
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    
    // Check for service role key in Authorization header (for cron jobs)
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const isServiceRole = token && safeCompare(token, supabaseServiceKey);
    
    if (isServiceRole) {
      console.log('Authenticated via service role key (cron job)');
    } else {
      console.log('Processing request with anon key');
    }

    const { startDate, endDate } = await req.json();
    
    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ success: false, error: 'startDate and endDate are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (start > end) {
      return new Response(
        JSON.stringify({ success: false, error: 'startDate must be before endDate' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 90) {
      return new Response(
        JSON.stringify({ success: false, error: 'Date range cannot exceed 90 days' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting crawl from ${startDate} to ${endDate}`);
    console.log(`Firecrawl API key: ${firecrawlApiKey ? 'Available (primary)' : 'Not available (RSS only)'}`);
    
    // Crawl all sources in parallel
    const crawlPromises = NEWS_SOURCES.map(source => crawlSource(source, firecrawlApiKey));
    const results = await Promise.all(crawlPromises);
    
    const allArticles = results.flat();
    console.log(`Total articles collected: ${allArticles.length}`);
    
    // Filter by date range
    const filteredByDate = allArticles.filter(a => 
      isWithinDateRange(a.published_at, startDate, endDate)
    );
    
    console.log(`Articles within date range: ${filteredByDate.length}`);
    
    // Separate matching and non-matching articles
    const newsRaw: any[] = [];
    const newsToProcess: any[] = [];
    
    for (const article of filteredByDate) {
      const textToCheck = `${article.headline} ${article.body_text || ''}`;
      const isEnglishText = isEnglish(textToCheck);
      const hasKeywordMatch = matchesKeywords(textToCheck);
      
      if (isEnglishText && hasKeywordMatch) {
        newsRaw.push({
          url: article.url,
          source_name: article.source_name,
          published_at: article.published_at,
          headline: article.headline,
          body_text: article.body_text,
          extraction_status: 'Pending',
        });
      } else {
        newsToProcess.push({
          source_name: article.source_name,
          source_url: article.url,
          published_at: article.published_at,
        });
      }
    }
    
    console.log(`News raw (matching): ${newsRaw.length}, To process (non-matching): ${newsToProcess.length}`);
    
    // Insert into Supabase
    const insertResults = { newsRaw: 0, newsToProcess: 0, errors: [] as string[] };
    
    if (newsRaw.length > 0) {
      const response = await fetch(`${supabaseUrl}/rest/v1/news_raw?on_conflict=url`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify(newsRaw),
      });
      
      if (response.ok) {
        insertResults.newsRaw = newsRaw.length;
      } else {
        const error = await response.text();
        console.error('Error inserting news_raw:', error);
        insertResults.errors.push('Failed to insert matching articles');
      }
    }
    
    if (newsToProcess.length > 0) {
      const response = await fetch(`${supabaseUrl}/rest/v1/news_to_process?on_conflict=source_url`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify(newsToProcess),
      });
      
      if (response.ok) {
        insertResults.newsToProcess = newsToProcess.length;
      } else {
        const error = await response.text();
        console.error('Error inserting news_to_process:', error);
        insertResults.errors.push('Failed to insert articles to process');
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Crawled ${allArticles.length} articles (Firecrawl: ${firecrawlApiKey ? 'primary' : 'unavailable'})`,
        inserted: insertResults,
        stats: {
          total: allArticles.length,
          withinDateRange: filteredByDate.length,
          matching: newsRaw.length,
          nonMatching: newsToProcess.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Crawl error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to crawl news sources. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
