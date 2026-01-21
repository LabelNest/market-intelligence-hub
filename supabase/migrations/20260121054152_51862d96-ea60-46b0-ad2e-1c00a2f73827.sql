-- Create news_raw table for storing extracted news articles
CREATE TABLE public.news_raw (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  source_name TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  headline TEXT NOT NULL,
  body_text TEXT,
  ai_keywords TEXT[],
  ai_summary TEXT,
  extraction_status TEXT NOT NULL DEFAULT 'Pending' CHECK (extraction_status IN ('Extracted', 'Pending')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create news_to_process table for filtered/non-matching articles
CREATE TABLE public.news_to_process (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL UNIQUE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.news_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_to_process ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (no auth required for this dashboard)
CREATE POLICY "Anyone can read news_raw" 
ON public.news_raw 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert news_raw" 
ON public.news_raw 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update news_raw" 
ON public.news_raw 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can read news_to_process" 
ON public.news_to_process 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert news_to_process" 
ON public.news_to_process 
FOR INSERT 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_news_raw_updated_at
BEFORE UPDATE ON public.news_raw
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_news_raw_source ON public.news_raw(source_name);
CREATE INDEX idx_news_raw_published_at ON public.news_raw(published_at);
CREATE INDEX idx_news_raw_status ON public.news_raw(extraction_status);
CREATE INDEX idx_news_to_process_source ON public.news_to_process(source_name);
CREATE INDEX idx_news_to_process_published_at ON public.news_to_process(published_at);