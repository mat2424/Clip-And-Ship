import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');

    console.log('🔍 Environment variables check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasGoogleClientId: !!googleClientId,
      supabaseUrlLength: supabaseUrl?.length || 0,
      googleClientIdLength: googleClientId?.length || 0
    });

    // More detailed error reporting
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('SUPABASE_URL');
    if (!googleClientId) missingVars.push('GOOGLE_CLIENT_ID');

    if (missingVars.length > 0) {
      const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate secure state parameter with current timestamp
    const timestamp = Math.floor(Date.now() / 1000); // Current time in seconds
    const state = `${user.id}-${timestamp}-${crypto.randomUUID()}`;
    
    // Build OAuth URL with required parameters for offline access
    const redirectUri = `${supabaseUrl}/functions/v1/youtube-oauth-callback`;
    const scopes = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly';
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', googleClientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    console.log(`🚀 YouTube OAuth initiated for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        authUrl: authUrl.toString(),
        state,
        message: 'Redirect user to authUrl for YouTube authorization'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ OAuth setup error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to setup OAuth',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});