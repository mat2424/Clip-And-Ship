-- Fix the recursive trigger issue by modifying the function to set updated_at directly
-- instead of doing an UPDATE query that triggers the function again

CREATE OR REPLACE FUNCTION public.update_youtube_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Set the updated_at field directly on NEW record instead of doing UPDATE
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;