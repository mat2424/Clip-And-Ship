-- Create function to automatically delete rejected video ideas
CREATE OR REPLACE FUNCTION delete_rejected_video_ideas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete video ideas that have been rejected
  DELETE FROM public.video_ideas 
  WHERE approval_status = 'rejected';
  
  RAISE NOTICE 'Deleted rejected video ideas';
END;
$$;