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
      supabaseUrlLength: supabaseUrl?.length || 0,
      googleClientIdLength: googleClientId?.length || 0
    });

    // More detailed error reporting
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

    console.log(`📋 [${requestId}] OAuth callback received`, {
      hasCode: !!authCode,
      hasState: !!state,
      error: error,
    });

    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }

    if (!authCode || !state) {
      throw new Error('Missing required OAuth parameters');
    }

    // Extract and validate user ID from state
    const [userId, timestamp] = state.split('-');
    if (!userId || !timestamp) {
      throw new Error('Invalid state parameter');
    }

    // Check state age (max 30 minutes)
    const stateAge = Date.now() - parseInt(timestamp);
    if (stateAge > 30 * 60 * 1000) {
      throw new Error('OAuth session expired');
    }

    console.log(`🔄 [${requestId}] Processing OAuth for user: ${userId}`);

    // Exchange authorization code for tokens
    const redirectUri = `${supabaseUrl}/functions/v1/youtube-oauth-callback`;
    console.log(`🔄 [${requestId}] Exchanging code for tokens with redirect URI: ${redirectUri}`);

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
      throw new Error(`Token exchange failed (${tokenResponse.status}): ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token || !tokenData.refresh_token) {
      throw new Error('Incomplete token response from Google');
    }

    console.log(`✅ [${requestId}] Tokens received successfully`);

    // Verify access token and get channel info with YouTube API
    let channelName = 'YouTube Channel';
    let channelId = null;
    
    try {
      console.log(`🔍 [${requestId}] Fetching channel info from YouTube API...`);
      
      const channelResponse = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,id&mine=true',
        {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/json',
          },
        }
      );

      console.log(`🔍 [${requestId}] YouTube API response status: ${channelResponse.status}`);
      
      if (channelResponse.ok) {
        const channelData = await channelResponse.json();
        console.log(`📋 [${requestId}] Channel API response:`, JSON.stringify(channelData, null, 2));
        
        if (channelData.items && channelData.items.length > 0) {
          const channel = channelData.items[0];
          channelName = channel.snippet?.title || 'YouTube Channel';
          channelId = channel.id;
          console.log(`✅ [${requestId}] Channel verified: ${channelName} (ID: ${channelId})`);
        } else {
          console.warn(`⚠️ [${requestId}] No channels found in API response`);
        }
      } else {
        const errorText = await channelResponse.text();
        console.error(`❌ [${requestId}] YouTube API error (${channelResponse.status}):`, errorText);
        
        // Try alternative API call for channel info
        console.log(`🔄 [${requestId}] Trying alternative API call...`);
        const altResponse = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet&forUsername=mine',
          {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Accept': 'application/json',
            },
          }
        );
        
        if (altResponse.ok) {
          const altData = await altResponse.json();
          if (altData.items && altData.items.length > 0) {
            channelName = altData.items[0].snippet?.title || 'YouTube Channel';
            channelId = altData.items[0].id;
            console.log(`✅ [${requestId}] Channel found via alternative API: ${channelName}`);
          }
        }
      }
    } catch (apiError) {
      console.error(`💥 [${requestId}] YouTube API call failed:`, apiError);
    }

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

    // Store tokens securely in database
    const { data: savedToken, error: dbError } = await supabaseClient
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
      })
      .select()
      .single();

    if (dbError) {
      console.error(`❌ [${requestId}] Database error:`, dbError);
      throw new Error(`Failed to save tokens: ${dbError.message}`);
    }

    console.log(`✅ [${requestId}] YouTube connection saved for user ${userId}`);

    // Return success page
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
            <div class="loading">Redirecting you back to the app...</div>
          </div>
          <script>
            console.log('YouTube OAuth success page loaded');

            // Wait a moment for the page to fully load, then notify parent
            setTimeout(() => {
              console.log('Sending success message to parent window');
              if (window.opener && !window.opener.closed) {
                try {
                  window.opener.postMessage({
                    type: 'YOUTUBE_AUTH_SUCCESS',
                    channelName: '${channelName}',
                    timestamp: Date.now()
                  }, '*');
                  console.log('Success message sent to parent');
                } catch (e) {
                  console.error('Failed to send message to parent:', e);
                }
              }

              // Close the popup after a longer delay to ensure message is received
              setTimeout(() => {
                console.log('Attempting to close popup window');
                try {
                  if (window.opener && !window.opener.closed) {
                    window.close();
                  } else {
                    // If no opener or opener is closed, redirect
                    console.log('No valid opener, redirecting...');
                    window.location.href = '${req.headers.get('origin') || 'https://clipandship.ca'}/app';
                  }
                } catch (e) {
                  console.error('Failed to close window:', e);
                  window.location.href = '${req.headers.get('origin') || 'https://clipandship.ca'}/app';
                }
              }, 2500);
            }, 500);
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

  } catch (error) {
    console.error(`💥 [${requestId}] OAuth callback error:`, error);
    
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
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">❌</div>
            <div class="title">Connection Failed</div>
            <div class="subtitle">${error instanceof Error ? error.message : 'Unknown error'}</div>
            <button class="retry-btn" onclick="window.close()">Close Window</button>
          </div>
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
});