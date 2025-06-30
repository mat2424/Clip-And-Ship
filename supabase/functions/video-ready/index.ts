
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoReadyPayload {
  video_idea_id: string;
  idea: string;
  caption: string;
  final_output: string;
  youtube_title?: string;
  tiktok_title?: string;
  instagram_title?: string;
  environment_prompt?: string; 
  sound_prompt?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: VideoReadyPayload = await req.json();
    console.log('🎬 Video ready payload received:', payload);

    if (!payload.video_idea_id || !payload.final_output) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: video_idea_id and final_output' }),
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

    // Update the video_ideas record with the new metadata
    const { error: updateError } = await supabase
      .from('video_ideas')
      .update({
        video_url: payload.final_output,
        caption: payload.caption,
        youtube_title: payload.youtube_title,
        tiktok_title: payload.tiktok_title,
        instagram_title: payload.instagram_title,
        environment_prompt: payload.environment_prompt,
        sound_prompt: payload.sound_prompt,
        approval_status: 'ready_for_approval',
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', payload.video_idea_id);

    if (updateError) {
      console.error('❌ Error updating video idea:', updateError);
      throw updateError;
    }

    console.log('✅ Video idea updated successfully with ready_for_approval status');

    return new Response(
      JSON.stringify({ success: true, message: 'Video ready for approval' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 Error processing video-ready webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Video ready processing failed', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
