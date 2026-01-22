-- Remove overly permissive write policies that allow anyone to insert/update
-- Edge functions use service role key which bypasses RLS, so they will continue to work

-- Drop the permissive INSERT policy on news_raw
DROP POLICY IF EXISTS "Anyone can insert news_raw" ON public.news_raw;

-- Drop the permissive UPDATE policy on news_raw
DROP POLICY IF EXISTS "Anyone can update news_raw" ON public.news_raw;

-- Drop the permissive INSERT policy on news_to_process
DROP POLICY IF EXISTS "Anyone can insert news_to_process" ON public.news_to_process;

-- Keep SELECT policies for public read access (dashboard is for viewing news)