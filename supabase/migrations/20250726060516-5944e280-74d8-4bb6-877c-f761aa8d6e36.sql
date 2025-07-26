-- Fix search path vulnerabilities in database functions
CREATE OR REPLACE FUNCTION public.delete_rejected_video_ideas()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Delete video ideas that have been rejected
  DELETE FROM public.video_ideas 
  WHERE approval_status = 'rejected';
  
  RAISE NOTICE 'Deleted rejected video ideas';
END;
$function$;

-- Fix search path for the YouTube tokens trigger function
CREATE OR REPLACE FUNCTION public.update_youtube_tokens_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  -- Set the updated_at field directly on NEW record instead of doing UPDATE
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix search path for the general updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$function$;

-- Fix search path for the new user handler
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Insert new profile with welcome credits
  INSERT INTO public.profiles (id, email, credits, welcome_credits_given)
  VALUES (NEW.id, NEW.email, 10, true); -- Give 10 welcome credits
  
  -- Log the welcome credit transaction
  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description)
  VALUES (NEW.id, 10, 'welcome', 'Welcome credits for new user signup');
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;