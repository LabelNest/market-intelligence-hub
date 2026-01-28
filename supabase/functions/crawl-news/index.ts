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

// News sources with their RSS/scrape endpoints
const NEWS_SOURCES = [
  { name: 'TechCrunch', rssUrl: 'https://techcrunch.com/feed/', type: 'rss' },
  { name: 'Crunchbase News', rssUrl: 'https://news.crunchbase.com/feed/', type: 'rss' },
  { name: 'Moneycontrol', rssUrl: 'https://www.moneycontrol.com/rss/business.xml', type: 'rss' },
  { name: 'LiveMint', rssUrl: 'https://www.livemint.com/rss/companies', type: 'rss' },
  { name: 'ET', rssUrl: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms', type: 'rss' },
  { name: 'PR Newswire', rssUrl: 'https://www.prnewswire.com/rss/financial-services-latest-news/financial-services-latest-news-list.rss', type: 'rss' },
  { name: 'BusinessWire', rssUrl: 'https://feed.businesswire.com/rss/home/?rss=G1QFDERJXkJeEFpRWQ==', type: 'rss' },
  { name: 'VCCircle', baseUrl: 'https://www.vccircle.com', type: 'scrape' },
  { name: 'DealStreetAsia', baseUrl: 'https://www.dealstreetasia.com', type: 'scrape' },
  { name: 'PEI', baseUrl: 'https://www.privateequityinternational.com', type: 'scrape' },
];

interface NewsArticle {
  url: string;
  source_name: string;
  published_at: string | null;
  headline: string;
  body_text: string | null;
}

function isEnglish(text: string): boolean {
  // Simple check: if more than 80% ASCII characters, likely English
  const asciiCount = (text.match(/[\x00-\x7F]/g) || []).length;
  return asciiCount / text.length > 0.8;
}

function matchesKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

function isWithinDateRange(publishedAt: string | null, startDate: string, endDate: string): boolean {
  if (!publishedAt) return true; // Include if no date
  const pubDate = new Date(publishedAt);
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Include entire end day
  return pubDate >= start && pubDate <= end;
}

async function parseRssFeed(rssUrl: string, sourceName: string): Promise<NewsArticle[]> {
  try {
    console.log(`Fetching RSS from ${sourceName}: ${rssUrl}`);
    const response = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch RSS from ${sourceName}: ${response.status}`);
      return [];
    }
    
    const xml = await response.text();
    const articles: NewsArticle[] = [];
    
    // Simple XML parsing for RSS items
    const itemMatches = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
    
    for (const item of itemMatches.slice(0, 20)) { // Limit to 20 per source
      const titleMatch = item.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const linkMatch = item.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      const pubDateMatch = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
      const descMatch = item.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      
      if (titleMatch && linkMatch) {
        const headline = titleMatch[1].replace(/<[^>]+>/g, '').trim();
        const url = linkMatch[1].replace(/<[^>]+>/g, '').trim();
        const publishedAt = pubDateMatch ? new Date(pubDateMatch[1].trim()).toISOString() : null;
        const body = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim().substring(0, 500) : null;
        
        if (headline && url) {
          articles.push({
            url,
            source_name: sourceName,
            published_at: publishedAt,
            headline,
            body_text: body,
          });
        }
      }
    }
    
    console.log(`Parsed ${articles.length} articles from ${sourceName}`);
    return articles;
  } catch (error) {
    console.error(`Error parsing RSS from ${sourceName}:`, error);
    return [];
  }
}

async function scrapeWithFirecrawl(baseUrl: string, sourceName: string, apiKey: string): Promise<NewsArticle[]> {
  try {
    console.log(`Scraping ${sourceName} via Firecrawl: ${baseUrl}`);
    
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: baseUrl,
        formats: ['markdown', 'links'],
        onlyMainContent: true,
      }),
    });

    if (!response.ok) {
      console.error(`Firecrawl error for ${sourceName}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const articles: NewsArticle[] = [];
    
    // Extract article links from the page
    const links = data.data?.links || data.links || [];
    const markdown = data.data?.markdown || data.markdown || '';
    
    // Parse headlines from markdown content
    const headlineMatches = markdown.match(/#{1,3}\s+([^\n]+)/g) || [];
    
    for (let i = 0; i < Math.min(links.length, 10); i++) {
      const link = links[i];
      if (link && (link.includes('/news/') || link.includes('/article/') || link.includes('/story/'))) {
        articles.push({
          url: link,
          source_name: sourceName,
          published_at: null,
          headline: headlineMatches[i]?.replace(/^#{1,3}\s+/, '') || `Article from ${sourceName}`,
          body_text: null,
        });
      }
    }
    
    console.log(`Scraped ${articles.length} articles from ${sourceName}`);
    return articles;
  } catch (error) {
    console.error(`Error scraping ${sourceName}:`, error);
    return [];
  }
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.208.0/crypto/mod.ts';

// Timing-safe string comparison to prevent timing attacks
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Check for service role key in Authorization header (for cron jobs)
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const isServiceRole = token && safeCompare(token, supabaseServiceKey);
    
    if (isServiceRole) {
      console.log('Authenticated via service role key (cron job)');
    } else {
      // For regular requests, just log - no strict auth required for this dashboard
      console.log('Processing request with anon key');
    }

    const { startDate, endDate } = await req.json();
    
    // Validate presence
    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ success: false, error: 'startDate and endDate are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate date format and parse
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate logical order
    if (start > end) {
      return new Response(
        JSON.stringify({ success: false, error: 'startDate must be before endDate' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate range (max 90 days to prevent resource abuse)
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 90) {
      return new Response(
        JSON.stringify({ success: false, error: 'Date range cannot exceed 90 days' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate minimum date (January 2025)
    const minDate = new Date('2025-01-01');
    if (start < minDate) {
      return new Response(
        JSON.stringify({ success: false, error: 'startDate cannot be before January 2025' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    
    console.log(`Starting crawl from ${startDate} to ${endDate}`);
    
    // Collect all articles from all sources
    const allArticles: NewsArticle[] = [];
    
    // Process RSS sources in parallel
    const rssPromises = NEWS_SOURCES
      .filter(s => s.type === 'rss')
      .map(source => parseRssFeed(source.rssUrl!, source.name));
    
    const rssResults = await Promise.all(rssPromises);
    rssResults.forEach(articles => allArticles.push(...articles));
    
    // Process scrape sources if Firecrawl is available
    if (firecrawlApiKey) {
      const scrapePromises = NEWS_SOURCES
        .filter(s => s.type === 'scrape')
        .map(source => scrapeWithFirecrawl(source.baseUrl!, source.name, firecrawlApiKey));
      
      const scrapeResults = await Promise.all(scrapePromises);
      scrapeResults.forEach(articles => allArticles.push(...articles));
    } else {
      console.log('Firecrawl API key not found, skipping scrape sources');
    }
    
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
    
    // Insert into Supabase using REST API
    const insertResults = { newsRaw: 0, newsToProcess: 0, errors: [] as string[] };
    
    if (newsRaw.length > 0) {
      const response = await fetch(`${supabaseUrl}/rest/v1/news_raw`, {
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
      const response = await fetch(`${supabaseUrl}/rest/v1/news_to_process`, {
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
        message: `Crawled ${allArticles.length} articles`,
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
