const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

async function summarizeArticle(headline: string, bodyText: string, apiKey: string): Promise<{ summary: string; keywords: string[] }> {
  const prompt = `Analyze this news article and provide:
1. A concise 2-3 sentence summary focusing on private market implications
2. Extract 3-5 relevant keywords related to private equity, venture capital, M&A, or investments

Article headline: ${headline}
Article content: ${bodyText || 'No content available'}

Respond in JSON format:
{
  "summary": "your summary here",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}`;

  const response = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst specializing in private markets, venture capital, and M&A. Provide concise, insightful summaries.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('AI Gateway error:', error);
    throw new Error('AI summarization service unavailable');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  try {
    // Try to parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || 'Summary not available',
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      };
    }
  } catch {
    // If JSON parsing fails, extract text
    console.log('Failed to parse AI response as JSON, using raw content');
  }
  
  return {
    summary: content.substring(0, 500),
    keywords: [],
  };
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user: ${claimsData.claims.sub}`);

    const { articleIds, batchSize = 5 } = await req.json();
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI Gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Fetch pending articles
    let query = `${supabaseUrl}/rest/v1/news_raw?extraction_status=eq.Pending&select=id,headline,body_text&limit=${batchSize}`;
    
    if (articleIds && articleIds.length > 0) {
      query = `${supabaseUrl}/rest/v1/news_raw?id=in.(${articleIds.join(',')})&select=id,headline,body_text`;
    }
    
    console.log('Fetching pending articles...');
    const fetchResponse = await fetch(query, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });
    
    if (!fetchResponse.ok) {
      const error = await fetchResponse.text();
      console.error('Failed to fetch articles:', error);
      throw new Error('Failed to fetch articles from database');
    }
    
    const articles = await fetchResponse.json();
    console.log(`Found ${articles.length} articles to process`);
    
    if (articles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No pending articles to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Process each article
    const results = [];
    for (const article of articles) {
      try {
        console.log(`Processing article: ${article.id}`);
        const { summary, keywords } = await summarizeArticle(
          article.headline,
          article.body_text || '',
          lovableApiKey
        );
        
        // Update the article in database
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/news_raw?id=eq.${article.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            ai_summary: summary,
            ai_keywords: keywords,
            extraction_status: 'Extracted',
          }),
        });
        
        if (updateResponse.ok) {
          results.push({ id: article.id, success: true });
          console.log(`Successfully processed article: ${article.id}`);
        } else {
          const error = await updateResponse.text();
          results.push({ id: article.id, success: false, error: 'Failed to save summary' });
          console.error(`Failed to update article ${article.id}:`, error);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`Error processing article ${article.id}:`, err);
        results.push({ id: article.id, success: false, error: 'Processing failed' });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${successCount}/${articles.length} articles`,
        processed: successCount,
        failed: articles.length - successCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Summarization error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to summarize articles. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
