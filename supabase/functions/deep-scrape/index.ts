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
    
    // Clean the markdown to get readable text
    const cleanedContent = markdown
      .replace(/^#{1,6}\s+[^\n]+\n?/gm, '') // Remove headings
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/^\s*[-*•]\s+/gm, '') // Remove list markers
      .replace(/\n{3,}/g, '\n\n') // Normalize newlines
      .replace(/^\s+|\s+$/gm, '') // Trim each line
      .trim();
    
    // Get the full content (up to 5000 chars for deep scrape)
    return cleanedContent.substring(0, 5000);
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
