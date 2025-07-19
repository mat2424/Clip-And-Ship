
-- Add new columns to profiles table for enhanced data collection
ALTER TABLE public.profiles 
ADD COLUMN full_name TEXT,
ADD COLUMN avatar_url TEXT,
ADD COLUMN google_id TEXT UNIQUE,
ADD COLUMN terms_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN welcome_credits_given BOOLEAN NOT NULL DEFAULT false;

-- Update the handle_new_user function to give welcome credits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
$$;
