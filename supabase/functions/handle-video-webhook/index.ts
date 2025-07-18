
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoWebhookPayload {
  phase: 'preview' | 'upload' | 'completed' | 'approval';
  execution_id: string;
  user_id?: string;
  video_url?: string;
  idea?: string;
  caption?: string;
  titles_descriptions?: any;
  upload_targets?: string[];
  upload_results?: any;
  video_idea_id?: string;
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

function validatePayload(payload: VideoWebhookPayload): { valid: boolean; error?: string } {
  // Common validations
  if (!payload.execution_id?.trim()) {
    return { valid: false, error: "execution_id is required" };
  }

  // Phase-specific validations
  switch (payload.phase) {
    case 'preview':
      if (!payload.user_id?.trim()) {
        return { valid: false, error: "user_id is required for preview phase" };
      }
      if (!validateUUID(payload.user_id)) {
        return { valid: false, error: "user_id must be a valid UUID" };
      }
      if (!payload.video_url?.trim()) {
        return { valid: false, error: "video_url is required for preview phase" };
      }
      if (!payload.idea?.trim()) {
        return { valid: false, error: "idea is required for preview phase" };
      }
      break;

    case 'approval':
      if (!payload.video_url?.trim()) {
        return { valid: false, error: "video_url is required for approval phase" };
      }
      break;

    case 'completed':
      // No specific validation needed for completed phase
      break;

    default:
      return { valid: false, error: `Invalid phase: ${payload.phase}` };
  }

  return { valid: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: VideoWebhookPayload = await req.json();
    console.log('📹 Video webhook received:', payload);

    // Validate payload
    const validation = validatePayload(payload);
    if (!validation.valid) {
      console.error('❌ Validation failed:', validation.error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid payload', 
          details: validation.error 
        }),
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

    if (payload.phase === 'approval') {
      // Video has been generated and is ready for approval
      console.log('✅ Updating video_ideas for approval phase');

      // Find the most recent video idea instead of requiring video_idea_id
      const { data: recentVideoIdea, error: queryError } = await supabase
        .from('video_ideas')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (queryError || !recentVideoIdea) {
        console.error('❌ Error finding most recent video idea:', queryError);
        throw new Error('No video idea found to update');
      }

      console.log('🎯 Using most recent video idea ID:', recentVideoIdea.id);

      const updateData: any = {
        status: 'completed',
        approval_status: 'ready_for_approval',
        video_url: payload.video_url,
        preview_video_url: payload.video_url, // Same URL for both fields
        updated_at: new Date().toISOString()
      };

      // Add titles and descriptions if provided
      if (payload.titles_descriptions) {
        if (payload.titles_descriptions.youtube?.title) {
          updateData.youtube_title = payload.titles_descriptions.youtube.title;
        }
        if (payload.titles_descriptions.tiktok?.title) {
          updateData.tiktok_title = payload.titles_descriptions.tiktok.title;
        }
        if (payload.titles_descriptions.instagram?.title) {
          updateData.instagram_title = payload.titles_descriptions.instagram.title;
        }
        if (payload.titles_descriptions.environment_prompt) {
          updateData.environment_prompt = payload.titles_descriptions.environment_prompt;
        }
        if (payload.titles_descriptions.sound_prompt) {
          updateData.sound_prompt = payload.titles_descriptions.sound_prompt;
        }
      }

      // Add caption if provided
      if (payload.caption) {
        updateData.caption = payload.caption;
      }

      const { error } = await supabase
        .from('video_ideas')
        .update(updateData)
        .eq('id', recentVideoIdea.id);

      if (error) {
        console.error('❌ Error updating video_ideas:', error);
        throw error;
      }

      console.log('✅ Video_ideas updated successfully for approval phase');

    } else if (payload.phase === 'preview') {
      // Video has been generated and is ready for preview/approval
      console.log('📝 Creating pending video for approval');
      
      // Use fallback UUID for testing if configured
      let userId = payload.user_id;
      const fallbackUUID = Deno.env.get("FALLBACK_TEST_USER_ID");
      
      if (!userId && fallbackUUID) {
        console.log('⚠️ Using fallback test user ID for development');
        userId = fallbackUUID;
        
        // Validate fallback UUID
        if (!validateUUID(userId)) {
          console.error('❌ Fallback test user ID is not a valid UUID');
          return new Response(
            JSON.stringify({ 
              error: 'Configuration error', 
              details: 'Fallback test user ID is not a valid UUID' 
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }
      
      const { error } = await supabase
        .from('pending_videos')
        .insert({
          user_id: userId,
          execution_id: payload.execution_id,
          video_url: payload.video_url,
          idea: payload.idea,
          caption: payload.caption,
          titles_descriptions: payload.titles_descriptions,
          upload_targets: payload.upload_targets || [],
          status: 'pending_approval'
        });

      if (error) {
        console.error('❌ Error creating pending video:', error);
        throw error;
      }

      console.log('✅ Pending video created successfully');

    } else if (payload.phase === 'completed') {
      // Video has been uploaded to platforms
      console.log('🎉 Video upload completed');
      
      const { error } = await supabase
        .from('pending_videos')
        .update({
          status: 'completed',
          upload_results: payload.upload_results
        })
        .eq('execution_id', payload.execution_id);

      if (error) {
        console.error('❌ Error updating video status:', error);
        throw error;
      }

      console.log('✅ Video status updated to completed');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed successfully' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 Error processing video webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
