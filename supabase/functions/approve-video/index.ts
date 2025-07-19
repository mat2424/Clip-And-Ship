
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2.45.0";

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
      }
    }

    const {
      video_idea_id,
      approved,
      rejection_reason,
      social_accounts,
      selected_platforms
    } = await req.json();

    if (!video_idea_id || typeof approved !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: video_idea_id and approved' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the video idea to check current status
    const { data: videoIdea, error: fetchError } = await supabase
      .from('video_ideas')
      .select('*')
      .eq('id', video_idea_id)
      .single();

    if (fetchError || !videoIdea) {
      throw new Error('Video idea not found');
    }

    if (approved) {
      console.log(`Approving video ${video_idea_id} for publishing`);
      
      // Update status to approved and publishing
      const { error: updateError } = await supabase
        .from('video_ideas')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          status: 'publishing'
        })
        .eq('id', video_idea_id);

      if (updateError) throw updateError;

      // Check user tier before processing uploads
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', videoIdea.user_id)
        .single();

      if (profileError || !profile) {
        console.error('Profile fetch error:', profileError);
        throw new Error('User profile not found');
      }

      // Filter platforms based on user tier
      let allowedPlatforms = selected_platforms || videoIdea.selected_platforms;
      const premiumPlatforms = ['Instagram', 'Facebook', 'Threads'];
      const proPlatforms = ['TikTok', 'X', 'LinkedIn'];
      
      if (profile.subscription_tier === 'free') {
        const originalCount = allowedPlatforms.length;
        allowedPlatforms = allowedPlatforms.filter(platform => 
          !premiumPlatforms.includes(platform) && !proPlatforms.includes(platform)
        );
        
        if (allowedPlatforms.length < originalCount) {
          console.log(`🔒 Filtered out premium/pro platforms for free user during approval. Original: ${selected_platforms || videoIdea.selected_platforms}, Allowed: ${allowedPlatforms}`);
        }
      } else if (profile.subscription_tier === 'premium') {
        const originalCount = allowedPlatforms.length;
        allowedPlatforms = allowedPlatforms.filter(platform => 
          !proPlatforms.includes(platform)
        );
        
        if (allowedPlatforms.length < originalCount) {
          console.log(`🔒 Filtered out pro platforms for premium user during approval. Original: ${selected_platforms || videoIdea.selected_platforms}, Allowed: ${allowedPlatforms}`);
        }
      }

      if (allowedPlatforms.length === 0) {
        throw new Error('No platforms available for upload with current subscription tier');
      }

      // Send all video data to webhook for processing
      const webhookData = {
        video_idea_id: video_idea_id,
        video_url: videoIdea.video_url,
        selected_platforms: allowedPlatforms,
        social_accounts: social_accounts || {},
        user_email: userEmail,
        video_data: {
          id: videoIdea.id,
          idea_text: videoIdea.idea_text,
          caption: videoIdea.caption,
          youtube_title: videoIdea.youtube_title,
          tiktok_title: videoIdea.tiktok_title,
          instagram_title: videoIdea.instagram_title,
          environment_prompt: videoIdea.environment_prompt,
          sound_prompt: videoIdea.sound_prompt,
          created_at: videoIdea.created_at,
          user_id: videoIdea.user_id,
          use_ai_voice: videoIdea.use_ai_voice,
          voice_file_url: videoIdea.voice_file_url
        }
      };

      console.log('Sending video approval data to webhook:', webhookData);

      // Get the webhook URL from secrets (gracefully handle if missing)
      const webhookUrl = Deno.env.get('Test-Approval-Response-Webhook');
      
      if (webhookUrl) {
        console.log('🔗 Using webhook URL for processing');

        // Send to webhook
        try {
          const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookData)
          });

          if (!webhookResponse.ok) {
            console.error('Webhook failed:', await webhookResponse.text());
            throw new Error('Failed to send video approval to webhook for processing');
          }

          console.log('✅ Video approval sent to webhook successfully');
        } catch (webhookError) {
          console.error('Webhook error:', webhookError);
          // Don't fail the entire operation if webhook fails
          console.log('⚠️ Webhook failed but continuing with approval process');
        }
      } else {
        console.log('⚠️ No webhook URL configured, skipping webhook call');
        // For now, we'll just mark as published since no webhook is configured
        await supabase
          .from('video_ideas')
          .update({
            status: 'published',
            published_at: new Date().toISOString()
          })
          .eq('id', video_idea_id);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Video approved and processing started'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } else {
      console.log(`Rejecting and deleting video ${video_idea_id}`);
      
      // Delete the video idea completely
      const { error: deleteError } = await supabase
        .from('video_ideas')
        .delete()
        .eq('id', video_idea_id);

      if (deleteError) throw deleteError;

      console.log(`✅ Video rejected and deleted successfully`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Video rejected and deleted from database' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in approve-video function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
