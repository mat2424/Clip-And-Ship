-- Drop the existing trigger that's causing recursion
DROP TRIGGER IF EXISTS update_youtube_tokens_updated_at_trigger ON public.youtube_tokens;

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.update_youtube_tokens_updated_at();

-- Create a new function that properly handles the updated_at field
CREATE OR REPLACE FUNCTION public.update_youtube_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Set the updated_at field directly on NEW record instead of doing UPDATE
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger with BEFORE UPDATE to avoid recursion
CREATE TRIGGER update_youtube_tokens_updated_at_trigger
  BEFORE UPDATE ON public.youtube_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_youtube_tokens_updated_at();