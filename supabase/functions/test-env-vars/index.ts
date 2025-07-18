import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple public test function - no auth required

serve(async (req) => {
  // Allow CORS for all requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    // Get all environment variables for debugging
    const allEnvVars = {};
    for (const key of Deno.env.toObject()) {
      if (key[0].startsWith('SUPABASE_') || key[0].startsWith('GOOGLE_')) {
        allEnvVars[key[0]] = key[1] ? `${key[1].substring(0, 10)}...` : 'NOT_SET';
      }
    }

    const envStatus = {
      timestamp: new Date().toISOString(),
      SUPABASE_URL: {
        exists: !!supabaseUrl,
        length: supabaseUrl?.length || 0,
        preview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT_SET'
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        exists: !!supabaseServiceKey,
        length: supabaseServiceKey?.length || 0,
        preview: supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : 'NOT_SET'
      },
      SUPABASE_ANON_KEY: {
        exists: !!supabaseAnonKey,
        length: supabaseAnonKey?.length || 0,
        preview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'NOT_SET'
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
      },
      allEnvVars: allEnvVars
    };

    // Return as HTML for easy viewing
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Environment Variables Test</title>
          <style>
            body { font-family: monospace; padding: 20px; background: #f5f5f5; }
            .container { background: white; padding: 20px; border-radius: 8px; max-width: 800px; }
            .status { margin: 10px 0; padding: 10px; border-radius: 4px; }
            .exists { background: #d4edda; color: #155724; }
            .missing { background: #f8d7da; color: #721c24; }
            pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Environment Variables Status</h1>
            <div class="status ${envStatus.SUPABASE_URL.exists ? 'exists' : 'missing'}">
              SUPABASE_URL: ${envStatus.SUPABASE_URL.exists ? '✅ EXISTS' : '❌ MISSING'} (${envStatus.SUPABASE_URL.length} chars)
            </div>
            <div class="status ${envStatus.SUPABASE_SERVICE_ROLE_KEY.exists ? 'exists' : 'missing'}">
              SUPABASE_SERVICE_ROLE_KEY: ${envStatus.SUPABASE_SERVICE_ROLE_KEY.exists ? '✅ EXISTS' : '❌ MISSING'} (${envStatus.SUPABASE_SERVICE_ROLE_KEY.length} chars)
            </div>
            <div class="status ${envStatus.GOOGLE_CLIENT_ID.exists ? 'exists' : 'missing'}">
              GOOGLE_CLIENT_ID: ${envStatus.GOOGLE_CLIENT_ID.exists ? '✅ EXISTS' : '❌ MISSING'} (${envStatus.GOOGLE_CLIENT_ID.length} chars)
            </div>
            <div class="status ${envStatus.GOOGLE_CLIENT_SECRET.exists ? 'exists' : 'missing'}">
              GOOGLE_CLIENT_SECRET: ${envStatus.GOOGLE_CLIENT_SECRET.exists ? '✅ EXISTS' : '❌ MISSING'} (${envStatus.GOOGLE_CLIENT_SECRET.length} chars)
            </div>
            <h2>Full JSON Response:</h2>
            <pre>${JSON.stringify(envStatus, null, 2)}</pre>
          </div>
        </body>
      </html>
    `;

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
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
