
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
      } else {
        console.log('❌ Failed to get user:', userError);
      }
    }

    const { video_idea_id, video_idea, selected_platforms, use_ai_voice, voice_file_url } = await req.json();

    // Validate inputs
    if (!video_idea_id || typeof video_idea_id !== 'string') {
      throw new Error("Invalid video_idea_id");
    }
    if (!video_idea || typeof video_idea !== 'string' || video_idea.length > 5000) {
      throw new Error("Invalid video_idea");
    }
    if (!Array.isArray(selected_platforms) || selected_platforms.length === 0) {
      throw new Error("Invalid selected_platforms");
    }

    // Get the webhook URL from secrets
    const webhookUrl = Deno.env.get("VIDEO_GENERATION_WEBHOOK_URL");
    if (!webhookUrl) {
      throw new Error("VIDEO_GENERATION_WEBHOOK_URL not configured");
    }

    console.log("Calling video generation webhook:", webhookUrl);

    const webhookPayload = {
      video_idea,
      selected_platforms,
      user_email: userEmail,
      video_idea_id,
      use_ai_voice,
      voice_file_url
    };

    console.log("📦 Webhook payload:", JSON.stringify(webhookPayload, null, 2));

    // Call the external webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      throw new Error(`Webhook failed with status: ${webhookResponse.status}`);
    }

    const webhookData = await webhookResponse.json();
    console.log("Webhook response:", webhookData);

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Update the video idea with the response data
    const { error: updateError } = await supabase
      .from('video_ideas')
      .update({
        status: 'completed',
        video_url: webhookData.video_file || null,
        youtube_link: webhookData.youtube_link || null,
        instagram_link: webhookData.instagram_link || null,
        tiktok_link: webhookData.tiktok_link || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', video_idea_id);

    if (updateError) {
      console.error("Error updating video idea:", updateError);
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true, data: webhookData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in generate-video function:", error);
    
    // If we have a video_idea_id, mark it as failed
    if (req.body && JSON.parse(await req.text()).video_idea_id) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } }
        );
        
        await supabase
          .from('video_ideas')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', JSON.parse(await req.text()).video_idea_id);
      } catch (updateError) {
        console.error("Error updating failed status:", updateError);
      }
    }

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
