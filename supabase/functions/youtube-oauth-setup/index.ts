
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const requestId = crypto.randomUUID().substring(0, 8);
  
  try {
    console.log(`🚀 [${requestId}] YouTube OAuth setup request started`)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Get user from JWT with enhanced validation
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error(`❌ [${requestId}] Missing or invalid authorization header`)
      throw new Error('Invalid authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    if (!token || token.length < 10) {
      console.error(`❌ [${requestId}] Invalid JWT token`)
      throw new Error('Invalid JWT token')
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      console.error(`❌ [${requestId}] User authentication failed:`, userError)
      throw new Error('Unauthorized: ' + (userError?.message || 'Invalid user'))
    }

    console.log(`👤 [${requestId}] Authenticated user: ${user.id}`)

    // Enhanced environment variable validation
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    if (!clientId || clientId.length < 10) {
      console.error(`❌ [${requestId}] Invalid GOOGLE_CLIENT_ID`)
      throw new Error('OAuth configuration error: Invalid client ID')
    }

    // Validate redirect URI format
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/youtube-oauth-callback`
    if (!redirectUri.startsWith('https://')) {
      console.error(`❌ [${requestId}] Invalid redirect URI: ${redirectUri}`)
      throw new Error('Invalid redirect URI configuration')
    }

    // Generate cryptographically secure state parameter
    const stateData = {
      user_id: user.id,
      timestamp: Date.now(), // Store as milliseconds
      nonce: crypto.randomUUID()
    }
    
    const state = btoa(JSON.stringify(stateData))
    console.log(`🔐 [${requestId}] Generated secure state for user ${user.id}`)

    // Enhanced YouTube OAuth URL with comprehensive scopes
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ].join(' ')

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('include_granted_scopes', 'true')

    console.log(`🔗 [${requestId}] OAuth URL generated: ${authUrl.origin}${authUrl.pathname}`)
    console.log(`📊 [${requestId}] Scopes requested: ${scopes}`)

    return new Response(
      JSON.stringify({ 
        auth_url: authUrl.toString(),
        state: state,
        expires_in: 2700 // 45 minutes
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        } 
      }
    )

  } catch (error) {
    console.error(`💥 [${requestId}] OAuth setup error:`, error)
    
    return new Response(
      JSON.stringify({ 
        error: 'OAuth setup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        request_id: requestId
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
