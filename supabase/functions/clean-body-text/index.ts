const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Patterns to filter out from body text
const unwantedPatterns = [
  // Newsletter/subscription prompts
  /get daily update with our newsletter/gi,
  /subscribe now\s*!?/gi,
  /subscribe to newsletter/gi,
  /subscribe to our newsletter/gi,
  /sign up for our newsletter/gi,
  /join our newsletter/gi,
  /daily digest/gi,
  /weekly digest/gi,
  /get the latest news/gi,
  /stay updated/gi,
  /never miss a story/gi,
  
  // Premium member messages
  /become a premium member/gi,
  /already a member\??\s*click here to log in/gi,
  /click here to log in/gi,
  /premium member/gi,
  /unlock premium/gi,
  /subscribe for full access/gi,
  /members only/gi,
  /exclusive content/gi,
  
  // Press release boilerplate
  /more releases from this source/gi,
  /personnel announcements/gi,
  /about the company/gi,
  /for more information/gi,
  /media contact/gi,
  /press release/gi,
  /forward-looking statements/gi,
  /safe harbor/gi,
  /about \w+ (inc|corp|llc|ltd)/gi,
  
  // Ad-related text
  /remove ad\.{0,3}/gi,
  /advertisement/gi,
  /sponsored content/gi,
  /promoted content/gi,
  /partner content/gi,
  /paid post/gi,
  /affiliate link/gi,
  
  // Social media prompts
  /share this (article|story|post)/gi,
  /follow us on/gi,
  /like us on/gi,
  /join us on/gi,
  /connect with us/gi,
  /find us on/gi,
  /follow @\w+/gi,
  
  // Navigation/UI elements
  /read more/gi,
  /continue reading/gi,
  /click here/gi,
  /tap here/gi,
  /learn more/gi,
  /see also/gi,
  /related articles?/gi,
  /recommended for you/gi,
  
  // Bylines and metadata (often at start/end)
  /^by\s+[\w\s,]+\s*$/gim,
  /^written by\s+[\w\s,]+\s*$/gim,
  /^author:\s*[\w\s,]+\s*$/gim,
  /^published:?\s*[\w\s,:\-]+\s*$/gim,
  /^updated:?\s*[\w\s,:\-]+\s*$/gim,
  /^date:?\s*[\w\s,:\-]+\s*$/gim,
  /photo:?\s*(credit|by|courtesy)/gi,
  /image:?\s*(credit|by|courtesy)/gi,
  /credit:\s*[\w\s,]+/gi,
  /source:\s*[\w\s,]+/gi,
];

function cleanBodyText(bodyText: string | null): string | null {
  if (!bodyText) return null;
  
  let cleaned = bodyText;
  
  // Apply all unwanted patterns
  for (const pattern of unwantedPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Split into sentences and filter
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  const filteredSentences = sentences.filter(sentence => {
    const trimmed = sentence.trim();
    // Skip very short sentences (likely fragments)
    if (trimmed.length < 30) return false;
    // Skip sentences with too many special characters
    const specialCharRatio = (trimmed.match(/[^a-zA-Z\s]/g) || []).length / trimmed.length;
    if (specialCharRatio > 0.25) return false;
    return true;
  });
  
  // Rejoin and clean up whitespace
  cleaned = filteredSentences.join(' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .trim();
  
  // Return null if too short after cleaning
  if (cleaned.length < 100) return null;
  
  return cleaned;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CleanBodyText] Fetching articles with body_text...');

    // Fetch all articles with body_text
    const fetchResponse = await fetch(
      `${supabaseUrl}/rest/v1/news_raw?body_text=not.is.null&select=id,body_text`,
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

    const articles: { id: string; body_text: string }[] = await fetchResponse.json();
    console.log(`[CleanBodyText] Found ${articles.length} articles to clean`);

    let updatedCount = 0;
    let clearedCount = 0;

    // Process each article
    for (const article of articles) {
      const cleanedText = cleanBodyText(article.body_text);
      
      // Only update if content changed
      if (cleanedText !== article.body_text) {
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
            body: JSON.stringify({ body_text: cleanedText }),
          }
        );

        if (updateResponse.ok) {
          if (cleanedText) {
            updatedCount++;
          } else {
            clearedCount++;
          }
        }
      }
    }

    console.log(`[CleanBodyText] Completed: ${updatedCount} updated, ${clearedCount} cleared`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned ${updatedCount} articles, cleared ${clearedCount} articles with insufficient content`,
        stats: { updated: updatedCount, cleared: clearedCount, total: articles.length },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[CleanBodyText] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to clean body text' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
