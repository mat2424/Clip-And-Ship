
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadCompletePayload {
  video_idea_id: string;
  youtube_video_id: string;
  youtube_video_url: string;
  title?: string;
  description?: string;
  status: 'success' | 'failed';
  error_message?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const completionId = crypto.randomUUID().substring(0, 8);
  
  try {
    const payload: UploadCompletePayload = await req.json();
    
    console.log(`🎬 [${completionId}] Upload completion received for video: ${payload.video_idea_id}`);

    if (!payload.video_idea_id) {
      throw new Error('Missing required field: video_idea_id');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    if (payload.status === 'success' && payload.youtube_video_url) {
      // Update video idea with YouTube link and mark as published
      const { error: updateError } = await supabaseClient
        .from('video_ideas')
        .update({
          youtube_link: payload.youtube_video_url,
          youtube_video_id: payload.youtube_video_id,
          status: 'completed',
          approval_status: 'published',
          upload_status: { youtube: 'completed' },
          upload_progress: { youtube: 100 },
        })
        .eq('id', payload.video_idea_id);

      if (updateError) {
        console.error(`❌ [${completionId}] Failed to update video idea:`, updateError);
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      console.log(`✅ [${completionId}] Video idea updated successfully with YouTube link: ${payload.youtube_video_url}`);
    } else {
      // Handle upload failure
      const { error: updateError } = await supabaseClient
        .from('video_ideas')
        .update({
          status: 'failed',
          upload_status: { youtube: 'failed' },
          upload_errors: { youtube: payload.error_message || 'Upload failed' },
        })
        .eq('id', payload.video_idea_id);

      if (updateError) {
        console.error(`❌ [${completionId}] Failed to update failed video:`, updateError);
      }

      console.log(`❌ [${completionId}] Upload failed for video: ${payload.video_idea_id}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Upload completion processed successfully',
        completion_id: completionId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`💥 [${completionId}] Upload completion error:`, error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Upload completion processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        completion_id: completionId
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
