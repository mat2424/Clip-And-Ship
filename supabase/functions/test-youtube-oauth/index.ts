import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    const diagnostics = {
      environment: {
        hasSupabaseUrl: !!supabaseUrl,
        hasGoogleClientId: !!googleClientId,
        hasGoogleClientSecret: !!googleClientSecret,
        supabaseUrlLength: supabaseUrl?.length || 0,
        googleClientIdLength: googleClientId?.length || 0,
        googleClientSecretLength: googleClientSecret?.length || 0,
      },
      urls: {
        supabaseUrl: supabaseUrl,
        redirectUri: `${supabaseUrl}/functions/v1/youtube-oauth-callback`,
      },
      oauth: {
        scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
        authUrl: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(`${supabaseUrl}/functions/v1/youtube-oauth-callback`)}&scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly')}&response_type=code&access_type=offline&prompt=consent&state=test-123`,
      }
    };

    console.log('🔍 YouTube OAuth Diagnostics:', JSON.stringify(diagnostics, null, 2));

    return new Response(
      JSON.stringify(diagnostics, null, 2),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('❌ Diagnostics error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Diagnostics failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});