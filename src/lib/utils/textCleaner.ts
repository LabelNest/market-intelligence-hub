// Patterns to filter out from body text display
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
  
  // Bylines and metadata
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

export function cleanBodyText(bodyText: string | null | undefined): string {
  if (!bodyText) return '';
  
  let cleaned = bodyText;
  
  // Apply all unwanted patterns
  for (const pattern of unwantedPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Clean up whitespace
  cleaned = cleaned
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .trim();
  
  return cleaned;
}
