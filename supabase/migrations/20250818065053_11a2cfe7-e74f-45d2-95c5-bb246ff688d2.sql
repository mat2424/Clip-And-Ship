-- Add referral system columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN referral_code TEXT UNIQUE,
ADD COLUMN referred_by UUID REFERENCES public.profiles(id),
ADD COLUMN referral_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN referral_progress INTEGER NOT NULL DEFAULT 0;

-- Create referrals tracking table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed'
  credits_awarded INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

-- Enable RLS on referrals table
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Create policies for referrals table
CREATE POLICY "Users can view their own referrals" 
ON public.referrals 
FOR SELECT 
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can insert their own referrals" 
ON public.referrals 
FOR INSERT 
WITH CHECK (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Service can manage referrals" 
ON public.referrals 
FOR ALL 
USING (true);

-- Create function to generate unique referral codes
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_code TEXT;
  attempts INTEGER := 0;
  max_attempts INTEGER := 100;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    new_code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code) THEN
      RETURN new_code;
    END IF;
    
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique referral code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- Create function to award referral credits
CREATE OR REPLACE FUNCTION public.award_referral_credits(referrer_id UUID, referred_id UUID, referral_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  referral_exists BOOLEAN;
  credits_per_referral INTEGER := 3;
BEGIN
  -- Check if referral already exists and is completed
  SELECT EXISTS(
    SELECT 1 FROM public.referrals 
    WHERE referrer_id = award_referral_credits.referrer_id 
    AND referred_id = award_referral_credits.referred_id 
    AND status = 'completed'
  ) INTO referral_exists;
  
  -- If referral already completed, return false
  IF referral_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Prevent self-referral
  IF referrer_id = referred_id THEN
    RETURN FALSE;
  END IF;
  
  -- Start transaction
  BEGIN
    -- Update or insert referral record
    INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status, credits_awarded, completed_at)
    VALUES (referrer_id, referred_id, referral_code, 'completed', credits_per_referral, now())
    ON CONFLICT (referrer_id, referred_id) 
    DO UPDATE SET 
      status = 'completed',
      credits_awarded = credits_per_referral,
      completed_at = now(),
      updated_at = now();
    
    -- Award credits to referrer
    UPDATE public.profiles 
    SET 
      credits = credits + credits_per_referral,
      referral_count = referral_count + 1,
      referral_progress = (referral_count + 1) % 10,
      updated_at = now()
    WHERE id = referrer_id;
    
    -- Log credit transaction
    INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description)
    VALUES (referrer_id, credits_per_referral, 'referral', 'Referral bonus for inviting new user');
    
    RETURN TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback will happen automatically
      RETURN FALSE;
  END;
END;
$$;

-- Update handle_new_user function to include referral code generation and referral processing
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_referral_code TEXT;
  referrer_id UUID;
BEGIN
  -- Generate unique referral code
  new_referral_code := public.generate_referral_code();
  
  -- Check if user was referred (from raw_user_meta_data)
  IF NEW.raw_user_meta_data ? 'referral_code' THEN
    -- Find the referrer
    SELECT id INTO referrer_id 
    FROM public.profiles 
    WHERE referral_code = (NEW.raw_user_meta_data ->> 'referral_code');
  END IF;
  
  -- Insert new profile with welcome credits and referral code
  INSERT INTO public.profiles (id, email, credits, welcome_credits_given, referral_code, referred_by)
  VALUES (NEW.id, NEW.email, 10, true, new_referral_code, referrer_id);
  
  -- Log the welcome credit transaction
  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description)
  VALUES (NEW.id, 10, 'welcome', 'Welcome credits for new user signup');
  
  -- If user was referred, award credits to referrer
  IF referrer_id IS NOT NULL THEN
    PERFORM public.award_referral_credits(referrer_id, NEW.id, (NEW.raw_user_meta_data ->> 'referral_code'));
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Add trigger for updating referrals updated_at
CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();