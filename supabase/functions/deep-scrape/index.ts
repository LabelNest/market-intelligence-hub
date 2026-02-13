const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface DeepScrapeRequest {
  articleIds: string[];
}

interface ArticleContent {
  id: string;
  body_text: string | null;
  success: boolean;
  error?: string;
}

// Scrape full article content using Firecrawl
async function scrapeFullArticle(url: string, apiKey: string): Promise<string | null> {
  try {
    console.log(`[DeepScrape] Scraping: ${url}`);
    
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
        waitFor: 2000,
      }),
    });

    if (!response.ok) {
      console.error(`[DeepScrape] Failed to scrape ${url}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const markdown = data.data?.markdown || data.markdown || '';
    
    // Aggressively clean the markdown before extracting content
    let cleaned = markdown
      // Remove markdown formatting
      .replace(/^#{1,6}\s+[^\n]+\n?/gm, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^\s*[-*•]\s+/gm, '')
      // Collapse all whitespace into single spaces
      .replace(/\s+/g, ' ')
      .trim();
    
    // Remove junk phrases inline (since content may not have clean line breaks)
    const junkPatterns = [
      /skip to (content|main|navigation)\s*!?/gi,
      /accessibility:?\s*skip\s*topnav/gi,
      /share on (facebook|x|linkedin|reddit|email)/gi,
      /share over email/gi,
      /copy share link/gi,
      /image credits?:?\s*[^.]{0,50}/gi,
      /view bio\s*(see more)?/gi,
      /subscribe for .{0,60}(news|updates|digest)/gi,
      /every weekday .{0,80}coverage/gi,
      /subscribe now\s*!?/gi,
      /sign up for .{0,40}newsletter/gi,
      /get daily update.{0,40}newsletter/gi,
      /stay up to date with .{0,60}daily/gi,
      /become a premium member/gi,
      /already a member\??\s*click here to log in/gi,
      /more releases from this source/gi,
      /personnel announcements/gi,
      /forward-looking statements/gi,
      /about the company/gi,
      /for more information,?\s*(please\s*)?(contact|visit|call)/gi,
      /media contact:?/gi,
      /remove ad\.{0,3}/gi,
      /advertisement/gi,
      /sponsored content/gi,
      /follow us on/gi,
      /connect with us/gi,
      /read more\s*$/gi,
      /see more\s*!?/gi,
      /in brief\s*$/gi,
      /\b(he|she) can be reached at [^\s]+@[^\s]+[^\.]*/gi,
      /on signal at [\d\-]+/gi,
      /photo by [^.)]+(\)|\.)/gi,
      /\(photo[^)]*\)/gi,
      // Navigation/tracker junk commonly from Crunchbase and similar sites
      /unicorn board/gi,
      /tech layoffs tracker/gi,
      /billion-dollar exits/gi,
      /largest funding deals tracker/gi,
      /web3 tracker/gi,
      /venture funding reports/gi,
      /Q\d 20\d{2}( global| north america| europe| latin america| asia)?/gi,
      /20\d{2}( global| north america| europe| latin america| asia)/gi,
      // Event/conference promos
      /techcrunch event[^.]*register now/gi,
      /tickets are live .{0,100}building what's next/gi,
      /\d+ sessions/gi,
      /\d+ startups building/gi,
      // Author bios at end
      /\b\w+ on twitter\b/gi,
      /you can contact or verify outreach.{0,100}signal/gi,
      /!event logo[^.]*$/gi,
      // Markdown image references
      /!\[.*?\]\(.*?\)/gi,
      // Tags sections
      /^tags\s+\w/gim,
      // Pipe-separated metadata tables
      /\|\s*---\s*\|/g,
      /\|\s*phone:\s*\|/gi,
      /\|\s*fax:\s*\|/gi,
      // Author name + handle + shares patterns
      /\b\w+\s+\w+\s+\d+shares/gi,
      /\bjglasner\b/gi,
      // "Email Facebook Twitter LinkedIn" share bars
      /\bemail\s+facebook\s+twitter\s+linkedin\b/gi,
      // Short year references that are nav items
      /\b20\d{2}\b(?=\s+20\d{2})/g,
    ];
    
    for (const pattern of junkPatterns) {
      cleaned = cleaned.replace(pattern, ' ');
    }
    
    // Split into sentences
    const sentences = cleaned
      .split(/(?<=[.!?])\s+/)
      .map((s: string) => s.trim())
      .filter((s: string) => {
        if (s.length < 40) return false;
        if (s.split(/\s+/).length < 6) return false;
        // Too many special chars = metadata
        const specialRatio = (s.match(/[^a-zA-Z\s.,'"$%\-()]/g) || []).length / s.length;
        if (specialRatio > 0.25) return false;
        // Skip navigation/chrome
        if (/^(newsroom|services|contact|english|sign in|register|menu|home|search)\b/i.test(s)) return false;
        if (/newsletter|subscribe|premium member|cookie|privacy policy|terms of (use|service)/i.test(s)) return false;
        if (/globe newswire|pr newswire|business wire/i.test(s)) return false;
        // Skip bylines and timestamps at start
        if (/^\w[\w\s]{0,30}\d{1,2}:\d{2}\s*(AM|PM)\s*(PST|EST|CST|UTC)/i.test(s)) return false;
        // Skip "Illustration:" or "Tags" sections
        if (/^(illustration|tags|topics|related|previous|next)\s*:/i.test(s)) return false;
        // Skip author bio patterns
        if (/is a (senior\s+)?(reporter|writer|editor|journalist|correspondent)\s+at/i.test(s)) return false;
        return true;
      });
    
    // Join all clean sentences - no scoring, just take all quality content
    const bodyText = sentences.join(' ').replace(/\s{2,}/g, ' ').trim().substring(0, 5000);
    return bodyText || null;
  } catch (error) {
    console.error(`[DeepScrape] Error scraping ${url}:`, error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl API key not configured. Please enable the Firecrawl connector.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { articleIds }: DeepScrapeRequest = await req.json();
    
    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'articleIds array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (articleIds.length > 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'Maximum 10 articles can be deep scraped at once' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[DeepScrape] Processing ${articleIds.length} articles`);

    // Fetch article URLs from database
    const fetchResponse = await fetch(
      `${supabaseUrl}/rest/v1/news_raw?id=in.(${articleIds.join(',')})&select=id,url`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    if (!fetchResponse.ok) {
      const error = await fetchResponse.text();
      console.error('Error fetching articles:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch articles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const articles: { id: string; url: string }[] = await fetchResponse.json();
    console.log(`[DeepScrape] Found ${articles.length} articles to scrape`);

    const results: ArticleContent[] = [];
    let successCount = 0;
    let failCount = 0;

    // Process articles in batches of 3 to avoid rate limits
    for (let i = 0; i < articles.length; i += 3) {
      const batch = articles.slice(i, i + 3);
      
      const batchResults = await Promise.all(
        batch.map(async (article) => {
          const bodyText = await scrapeFullArticle(article.url, firecrawlApiKey);
          
          if (bodyText) {
            // Update the article in database
            const updateResponse = await fetch(
              `${supabaseUrl}/rest/v1/news_raw?id=eq.${article.id}`,
              {
                method: 'PATCH',
                headers: {
                  'apikey': supabaseServiceKey,
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal',
                },
                body: JSON.stringify({ body_text: bodyText }),
              }
            );

            if (updateResponse.ok) {
              successCount++;
              return { id: article.id, body_text: bodyText, success: true };
            } else {
              failCount++;
              return { id: article.id, body_text: null, success: false, error: 'Failed to update database' };
            }
          } else {
            failCount++;
            return { id: article.id, body_text: null, success: false, error: 'Failed to scrape article' };
          }
        })
      );
      
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + 3 < articles.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[DeepScrape] Completed: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deep scraped ${successCount} articles successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
        results,
        stats: { success: successCount, failed: failCount },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[DeepScrape] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to deep scrape articles' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
