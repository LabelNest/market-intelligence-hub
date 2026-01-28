const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Private market keywords for filtering
const KEYWORDS = [
  "private equity", "venture capital", "VC fund", "PE fund", "growth equity",
  "series A", "series B", "series C", "seed round", "angel investment",
  "fundraise", "capital raised", "acquisition", "merger", "buyout",
  "minority stake", "majority stake", "portfolio company", "investment firm",
  "fund manager", "limited partner", "general partner", "private markets",
  "investment round", "strategic investor", "financial sponsor"
];

// News sources configuration - Firecrawl primary, RSS fallback
const NEWS_SOURCES = [
  { name: 'TechCrunch', url: 'https://techcrunch.com', rssUrl: 'https://techcrunch.com/feed/' },
  { name: 'Crunchbase News', url: 'https://news.crunchbase.com', rssUrl: 'https://news.crunchbase.com/feed/' },
  { name: 'Moneycontrol', url: 'https://www.moneycontrol.com/news/business', rssUrl: 'https://www.moneycontrol.com/rss/business.xml' },
  { name: 'LiveMint', url: 'https://www.livemint.com/companies', rssUrl: 'https://www.livemint.com/rss/companies' },
  { name: 'ET', url: 'https://economictimes.indiatimes.com', rssUrl: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms' },
  { name: 'PR Newswire', url: 'https://www.prnewswire.com/news-releases/financial-services-latest-news', rssUrl: 'https://www.prnewswire.com/rss/financial-services-latest-news/financial-services-latest-news-list.rss' },
  { name: 'BusinessWire', url: 'https://www.businesswire.com/portal/site/home', rssUrl: 'https://feed.businesswire.com/rss/home/?rss=G1QFDERJXkJeEFpRWQ==' },
  { name: 'VCCircle', url: 'https://www.vccircle.com', rssUrl: null },
  { name: 'DealStreetAsia', url: 'https://www.dealstreetasia.com', rssUrl: null },
  { name: 'PEI', url: 'https://www.privateequityinternational.com', rssUrl: null },
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

// Primary method: Firecrawl scraping
async function scrapeWithFirecrawl(source: typeof NEWS_SOURCES[0], apiKey: string): Promise<NewsArticle[]> {
  try {
    console.log(`[Firecrawl] Scraping ${source.name}: ${source.url}`);
    
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: source.url,
        formats: ['markdown', 'links'],
        onlyMainContent: true,
      }),
    });

    if (!response.ok) {
      console.error(`[Firecrawl] Error for ${source.name}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const articles: NewsArticle[] = [];
    
    const markdown = data.data?.markdown || data.markdown || '';
    const links = data.data?.links || data.links || [];
    
    // Extract headlines from markdown (h1, h2, h3 tags become # ## ### in markdown)
    const headlineMatches = markdown.match(/^#{1,3}\s+([^\n]+)/gm) || [];
    const cleanedHeadlines = headlineMatches.map((h: string) => h.replace(/^#{1,3}\s+/, '').trim());
    
    // Filter links that look like article URLs
    const articleLinks = links.filter((link: string) => {
      if (!link || typeof link !== 'string') return false;
      const lowerLink = link.toLowerCase();
      return (
        lowerLink.includes('/news/') || 
        lowerLink.includes('/article/') || 
        lowerLink.includes('/story/') ||
        lowerLink.includes('/post/') ||
        lowerLink.includes('/20') // Year in URL like /2026/01/
      ) && !lowerLink.includes('/tag/') && !lowerLink.includes('/category/');
    });

    // Create articles from scraped data
    for (let i = 0; i < Math.min(articleLinks.length, 15); i++) {
      const link = articleLinks[i];
      const headline = cleanedHeadlines[i] || `Article from ${source.name}`;
      
      // Try to extract date from the link or use null
      const dateMatch = link.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
      const publishedAt = dateMatch 
        ? new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`).toISOString()
        : null;
      
      articles.push({
        url: link,
        source_name: source.name,
        published_at: publishedAt,
        headline: headline.substring(0, 500),
        body_text: null,
      });
    }
    
    console.log(`[Firecrawl] Scraped ${articles.length} articles from ${source.name}`);
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
