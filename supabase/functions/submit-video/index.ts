
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SocialAccount {
  access_token: string;
  refresh_token?: string;
  user_id?: string;
}

interface SocialAccounts {
  [platform: string]: SocialAccount;
}

interface SubmitVideoRequest {
  video_idea: string;
  upload_targets: string[];
  social_accounts: SocialAccounts;
  use_ai_voice?: boolean;
  voice_file_url?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the user from the authorization header
    const authHeader = req.headers.get('Authorization');
    let userEmail = null;

    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (!userError && user) {
        userEmail = user.email;
        console.log('🔐 User email retrieved:', userEmail);
        console.log('🔐 User object:', JSON.stringify(user, null, 2));
      } else {
        console.log('❌ Failed to get user:', userError);
        console.log('❌ Auth header:', authHeader ? 'Present' : 'Missing');
      }
    }

    const {
      video_idea,
      upload_targets,
      social_accounts,
      use_ai_voice = true,
      voice_file_url
    }: SubmitVideoRequest = await req.json();

    console.log('🎬 Submit Video Request:', {
      video_idea: video_idea?.substring(0, 50) + '...',
      upload_targets,
      social_accounts_platforms: Object.keys(social_accounts || {}),
      use_ai_voice
    });

    // Validation
    if (!video_idea || !upload_targets || upload_targets.length === 0) {
      throw new Error("Missing required fields: video_idea and upload_targets are required");
    }

    // Validate that all upload targets have corresponding social accounts
    const missingAccounts = upload_targets.filter(platform => !social_accounts[platform]);
    if (missingAccounts.length > 0) {
      throw new Error(`Missing social accounts for platforms: ${missingAccounts.join(', ')}`);
    }

    // Validate tokens exist for each platform
    for (const platform of upload_targets) {
      const account = social_accounts[platform];
      if (!account.access_token) {
        throw new Error(`Missing access token for ${platform}`);
      }
    }

    // Get the N8N webhook URL
    const webhookUrl = Deno.env.get("VIDEO_GENERATION_WEBHOOK_URL");
    if (!webhookUrl) {
      console.warn("⚠️ VIDEO_GENERATION_WEBHOOK_URL not configured, skipping webhook call");
      
      // Return success even without webhook - this allows the UI to work
      return new Response(
        JSON.stringify({
          success: true,
          message: "Video submission received (webhook not configured)",
          warning: "Webhook URL not configured - video processing may not work"
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prepare enhanced payload for N8N
    const enhancedPayload = {
      phase: 'preview',
      video_idea,
      upload_targets,
      social_accounts,
      use_ai_voice,
      voice_file_url,
      user_email: userEmail,
      timestamp: new Date().toISOString()
    };

    console.log("🚀 Calling N8N webhook with enhanced payload:", webhookUrl);
    console.log("📦 Enhanced payload being sent:", JSON.stringify(enhancedPayload, null, 2));

    try {
      // Call N8N webhook with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enhancedPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ N8N webhook failed (${response.status}):`, errorText);
        
        // If webhook fails, still return success to UI but with warning
        return new Response(
          JSON.stringify({
            success: true,
            message: "Video submission received (webhook error occurred)",
            warning: `Webhook returned ${response.status}: ${errorText}`,
            webhook_error: true
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const responseData = await response.json();
      console.log("✅ N8N webhook success:", responseData);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Video submission successful",
          data: responseData
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (webhookError) {
      console.error("💥 Webhook call failed:", webhookError);
      
      // Return success even if webhook fails - this prevents UI errors
      return new Response(
        JSON.stringify({
          success: true,
          message: "Video submission received (webhook unavailable)",
          warning: "Webhook call failed - video processing may not work",
          webhook_error: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error("💥 Error in submit-video function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Video submission failed', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
