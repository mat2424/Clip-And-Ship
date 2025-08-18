import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from request
    const authorization = req.headers.get('Authorization');
    if (!authorization) {
      throw new Error('Missing authorization header');
    }

    const token = authorization.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    // Check if user already has a referral code
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error('Failed to fetch user profile');
    }

    if (existingProfile.referral_code) {
      return new Response(
        JSON.stringify({ 
          referral_code: existingProfile.referral_code,
          message: 'Referral code already exists'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Generate new referral code using the database function
    const { data: codeResult, error: codeError } = await supabase
      .rpc('generate_referral_code');

    if (codeError || !codeResult) {
      throw new Error('Failed to generate referral code');
    }

    // Update user profile with the new referral code
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ referral_code: codeResult })
      .eq('id', user.id);

    if (updateError) {
      throw new Error('Failed to save referral code');
    }

    console.log(`Generated referral code ${codeResult} for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        referral_code: codeResult,
        message: 'Referral code generated successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-referral-code function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});