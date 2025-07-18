
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the user from the authorization header
    const authHeader = req.headers.get('Authorization');
    let userEmail = null;

    console.log('🔍 All headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));

    if (authHeader) {
      console.log('✅ Authorization header found:', authHeader.substring(0, 20) + '...');

      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );

      const token = authHeader.replace('Bearer ', '');
      console.log('🔑 Token (first 20 chars):', token.substring(0, 20) + '...');

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

      if (!userError && user) {
        userEmail = user.email;
        console.log('🔐 User email retrieved:', userEmail);
        console.log('🔐 User ID:', user.id);
      } else {
        console.log('❌ Failed to get user:', userError);
        console.log('❌ Error details:', JSON.stringify(userError, null, 2));
      }
    } else {
      console.log('❌ No authorization header found');
    }

    console.log('🔍 Final userEmail value:', userEmail);

    const {
      phase,
      video_idea_id,
      video_idea,
      selected_platforms,
      upload_targets,
      social_accounts,
      use_ai_voice,
      preview_video_url,
      voice_file_url
    } = await req.json();

    console.log(`🎬 N8N Webhook called for ${phase} phase`, {
      video_idea_id,
      video_idea: video_idea?.substring(0, 50) + '...',
      selected_platforms: selected_platforms || upload_targets,
      social_accounts_provided: !!social_accounts,
      phase
    });

    // Get the webhook URL from environment
    const webhookUrl = Deno.env.get("VIDEO_GENERATION_WEBHOOK_URL");
    if (!webhookUrl) {
      throw new Error("VIDEO_GENERATION_WEBHOOK_URL not configured");
    }

    // Get the test API key from environment
    const testApiKey = Deno.env.get("TEST_API_KEY");

    // Prepare the payload based on the phase
    let payload;
    if (phase === 'preview') {
      // Phase 1: Generate preview with social account info
      payload = {
        phase: 'preview',
        video_idea_id,
        video_idea,
        upload_targets: upload_targets || selected_platforms, // Support both formats
        selected_platforms: selected_platforms || upload_targets,
        social_accounts: social_accounts || {},
        use_ai_voice: use_ai_voice || true,
        voice_file_url: voice_file_url || null,
        user_email: userEmail || null, // Explicitly include even if null
        test_api_key: testApiKey // Include the test API key
      };
    } else if (phase === 'publish') {
      // Phase 2: Publish to platforms with tokens
      payload = {
        phase: 'publish',
        video_idea_id,
        video_idea,
        upload_targets: upload_targets || selected_platforms,
        selected_platforms: selected_platforms || upload_targets,
        social_accounts: social_accounts || {},
        preview_video_url,
        user_email: userEmail || null // Explicitly include even if null
      };
    } else {
      throw new Error(`Invalid phase: ${phase}. Must be 'preview' or 'publish'`);
    }

    console.log("🚀 Calling N8N webhook:", webhookUrl);
    console.log("📦 Payload:", JSON.stringify(payload, null, 2));
    console.log("🔍 User email in payload:", payload.user_email);

    // Call the N8N webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ N8N webhook failed (${response.status}):`, errorText);
      throw new Error(`N8N webhook failed with status: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log("✅ N8N webhook success:", responseData);

    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error("💥 Error in call-n8n-webhook:", error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Webhook call failed', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
