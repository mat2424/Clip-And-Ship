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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    const envStatus = {
      SUPABASE_URL: {
        exists: !!supabaseUrl,
        length: supabaseUrl?.length || 0,
        preview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'NOT_SET'
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        exists: !!supabaseServiceKey,
        length: supabaseServiceKey?.length || 0,
        preview: supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : 'NOT_SET'
      },
      GOOGLE_CLIENT_ID: {
        exists: !!googleClientId,
        length: googleClientId?.length || 0,
        preview: googleClientId ? `${googleClientId.substring(0, 20)}...` : 'NOT_SET'
      },
      GOOGLE_CLIENT_SECRET: {
        exists: !!googleClientSecret,
        length: googleClientSecret?.length || 0,
        preview: googleClientSecret ? `${googleClientSecret.substring(0, 20)}...` : 'NOT_SET'
      }
    };

    return new Response(JSON.stringify(envStatus, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});
