
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cross-Origin-Opener-Policy': 'unsafe-none',
  'Cross-Origin-Embedder-Policy': 'unsafe-none',
  'Referrer-Policy': 'no-referrer-when-downgrade',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().substring(0, 8);
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    console.log(`🔍 [${requestId}] Environment variables check:`, {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasGoogleClientId: !!googleClientId,
      hasGoogleClientSecret: !!googleClientSecret,
    });

    const missingVars = [];
    if (!supabaseUrl) missingVars.push('SUPABASE_URL');
    if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
    if (!googleClientId) missingVars.push('GOOGLE_CLIENT_ID');
    if (!googleClientSecret) missingVars.push('GOOGLE_CLIENT_SECRET');

    if (missingVars.length > 0) {
      const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}`;
      console.error(`❌ [${requestId}] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, { 
      auth: { persistSession: false } 
    });

    const { searchParams } = new URL(req.url);
    const authCode = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const sessionId = searchParams.get('session_id');

    console.log(`📋 [${requestId}] OAuth callback received`, {
      hasCode: !!authCode,
      hasState: !!state,
      error: error,
      sessionId: sessionId,
    });

    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }

    if (!authCode || !state) {
      throw new Error('Missing required OAuth parameters');
    }

    // Extract and validate user ID from state (Base64 encoded JSON)
    let stateData;
    try {
      const decodedState = atob(state);
      stateData = JSON.parse(decodedState);
      console.log(`🔍 [${requestId}] Decoded state data:`, { hasUserId: !!stateData.user_id, hasTimestamp: !!stateData.timestamp, hasNonce: !!stateData.nonce });
    } catch (decodeError) {
      console.error(`❌ [${requestId}] Failed to decode state: ${state}`, decodeError);
      throw new Error('Invalid state parameter format');
    }

    const userId = stateData.user_id;
    const timestamp = stateData.timestamp;

    if (!userId || !timestamp) {
      console.error(`❌ [${requestId}] Missing userId or timestamp in state data:`, stateData);
      throw new Error('Invalid state parameter');
    }

    // Check state age (45 minutes for better UX)
    const stateAge = Date.now() - timestamp; // timestamp is already in milliseconds
    const maxAge = 45 * 60 * 1000; // 45 minutes
    console.log(`🕐 [${requestId}] State age: ${Math.round(stateAge / 1000)}s (max: ${Math.round(maxAge / 1000)}s)`);

    if (stateAge > maxAge) {
      console.error(`❌ [${requestId}] OAuth session expired`);
      return createErrorPage('Session Expired', 'Please try connecting to YouTube again', sessionId);
    }

    console.log(`🔄 [${requestId}] Processing OAuth for user: ${userId}`);

    // Exchange authorization code for tokens
    const redirectUri = `${supabaseUrl}/functions/v1/youtube-oauth-callback`;
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        code: authCode,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`❌ [${requestId}] Token exchange failed (${tokenResponse.status}):`, errorText);
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token || !tokenData.refresh_token) {
      throw new Error('Incomplete token response from Google');
    }

    console.log(`✅ [${requestId}] Tokens received successfully`);

    // Get channel info from YouTube API
    let channelName = 'YouTube Channel';
    
    try {
      const channelResponse = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,id&mine=true',
        {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/json',
          },
        }
      );

      if (channelResponse.ok) {
        const channelData = await channelResponse.json();
        if (channelData.items && channelData.items.length > 0) {
          channelName = channelData.items[0].snippet?.title || 'YouTube Channel';
          console.log(`✅ [${requestId}] Channel verified: ${channelName}`);
        }
      }
    } catch (apiError) {
      console.error(`💥 [${requestId}] YouTube API call failed:`, apiError);
    }

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

    // Store tokens in database
    const { error: dbError } = await supabaseClient
      .from('youtube_tokens')
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        channel_name: channelName,
        token_type: tokenData.token_type || 'Bearer',
        scope: tokenData.scope || 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly'
      }, {
        onConflict: 'user_id'
      });

    if (dbError) {
      console.error(`❌ [${requestId}] Database error:`, dbError);
      throw new Error(`Failed to save tokens: ${dbError.message}`);
    }

    console.log(`✅ [${requestId}] YouTube connection saved for user ${userId}`);

    // Return success page with multiple communication methods
    return createSuccessPage(channelName, sessionId);

  } catch (error) {
    console.error(`💥 [${requestId}] OAuth callback error:`, error);
    // Extract sessionId from URL params if available
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');
    return createErrorPage('Connection Failed', error instanceof Error ? error.message : 'Unknown error', sessionId);
  }
});

function createSuccessPage(channelName: string, sessionId?: string): Response {
  const successHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>YouTube Connected Successfully</title>
        <style>
          body { 
            font-family: system-ui, sans-serif; 
            text-align: center; 
            padding: 60px 20px;
            background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
            color: white;
            min-height: 100vh;
            margin: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .container {
            max-width: 400px;
            margin: 0 auto;
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 12px;
            backdrop-filter: blur(10px);
          }
          .success-icon { font-size: 48px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: 600; margin-bottom: 10px; }
          .subtitle { font-size: 16px; opacity: 0.9; margin-bottom: 30px; }
          .loading { font-size: 14px; opacity: 0.8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <div class="title">YouTube Connected!</div>
          <div class="subtitle">Channel: ${channelName}</div>
          <div class="loading">Redirecting...</div>
        </div>
        <script>
          console.log('YouTube OAuth success page loaded');
          
          const sessionId = '${sessionId || ''}';
          const channelName = '${channelName}';
          const successData = {
            type: 'YOUTUBE_AUTH_SUCCESS',
            channelName: channelName,
            timestamp: Date.now(),
            sessionId: sessionId
          };

          // Immediately communicate success and redirect
          console.log('Communicating success to parent window');
          
          // Method 1: PostMessage to opener
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage(successData, '*');
              console.log('✅ Success message sent to opener');
            }
          } catch (e) {
            console.log('📊 Cannot communicate with opener due to COOP:', e.message);
          }

          // Method 2: PostMessage to parent (for iframe scenarios)
          try {
            if (window.parent && window.parent !== window) {
              window.parent.postMessage(successData, '*');
              console.log('✅ Success message sent to parent');
            }
          } catch (e) {
            console.log('📊 Cannot communicate with parent due to COOP:', e.message);
          }

          // Method 3: BroadcastChannel API
          try {
            if (typeof BroadcastChannel !== 'undefined' && sessionId) {
              const channel = new BroadcastChannel(\`youtube_auth_\${sessionId}\`);
              channel.postMessage(successData);
              console.log('✅ Success message broadcast via BroadcastChannel');
              channel.close();
            }
          } catch (e) {
            console.log('📊 BroadcastChannel failed:', e.message);
          }

          // Method 4: LocalStorage (cross-tab communication)
          try {
            if (sessionId) {
              localStorage.setItem(\`youtube_auth_result_\${sessionId}\`, JSON.stringify({
                success: true,
                channelName: channelName,
                timestamp: Date.now()
              }));
              console.log('✅ Success stored in localStorage');
              
              // Trigger storage event
              window.dispatchEvent(new StorageEvent('storage', {
                key: \`youtube_auth_result_\${sessionId}\`,
                newValue: JSON.stringify({ success: true, channelName: channelName })
              }));
            }
          } catch (e) {
            console.log('📊 localStorage communication failed:', e.message);
          }

          // Immediately try to close popup or redirect to app
          console.log('Attempting to close popup window');
          try {
            window.close();
          } catch (e) {
            console.log('📊 Cannot close window, redirecting immediately...');
            // Redirect directly to /app
            window.location.href = 'https://clipandship.ca/app';
          }
        </script>
      </body>
    </html>
  `;

  return new Response(successHtml, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html',
    },
  });
}

function createErrorPage(title: string, message: string, sessionId?: string): Response {
  const errorHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>YouTube Connection Failed</title>
        <style>
          body { 
            font-family: system-ui, sans-serif; 
            text-align: center; 
            padding: 60px 20px;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            color: white;
            min-height: 100vh;
            margin: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .container {
            max-width: 400px;
            margin: 0 auto;
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 12px;
            backdrop-filter: blur(10px);
          }
          .error-icon { font-size: 48px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: 600; margin-bottom: 10px; }
          .subtitle { font-size: 16px; opacity: 0.9; margin-bottom: 30px; }
          .retry-btn { 
            background: rgba(255,255,255,0.2); 
            border: none; 
            color: white; 
            padding: 12px 24px; 
            border-radius: 6px; 
            cursor: pointer;
            font-size: 14px;
            text-decoration: none;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">❌</div>
          <div class="title">${title}</div>
          <div class="subtitle">${message}</div>
          <a href="https://clipandship.ca/#/app" class="retry-btn">Return to App</a>
        </div>
        <script>
          console.log('YouTube OAuth error page loaded');
          
          const sessionId = '${sessionId || ''}';
          const errorData = {
            type: 'YOUTUBE_AUTH_ERROR',
            error: '${message}',
            timestamp: Date.now(),
            sessionId: sessionId
          };

          // Communicate error to parent window using multiple methods
          setTimeout(() => {
            // Method 1: PostMessage (may not work due to COOP)
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage(errorData, '*');
              }
            } catch (e) {
              console.log('Cannot communicate with opener due to COOP');
            }

            // Method 2: BroadcastChannel
            try {
              if (typeof BroadcastChannel !== 'undefined' && sessionId) {
                const channel = new BroadcastChannel(\`youtube_auth_\${sessionId}\`);
                channel.postMessage(errorData);
                channel.close();
              }
            } catch (e) {
              console.log('BroadcastChannel failed');
            }

            // Method 3: LocalStorage
            try {
              if (sessionId) {
                localStorage.setItem(\`youtube_auth_result_\${sessionId}\`, JSON.stringify({
                  success: false,
                  error: '${message}',
                  timestamp: Date.now()
                }));
              }
            } catch (e) {
              console.log('localStorage failed');
            }
          }, 500);
        </script>
      </body>
    </html>
  `;

  return new Response(errorHtml, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html',
    },
  });
}
