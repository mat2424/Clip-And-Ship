
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

interface N8NWebhookPayload {
  user_id: string;
  video_url: string;
  title: string;
  description: string;
  tags?: string[];
  privacy_status?: 'private' | 'public' | 'unlisted';
  is_short?: boolean;
  webhook_id?: string;
  metadata?: Record<string, any>;
  video_idea_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const webhookId = crypto.randomUUID().substring(0, 8);
  
  try {
    // Verify webhook secret if provided
    const webhookSecret = req.headers.get('x-webhook-secret');
    const expectedSecret = Deno.env.get('N8N_WEBHOOK_SECRET');
    
    if (expectedSecret && webhookSecret !== expectedSecret) {
      console.warn(`🔒 [${webhookId}] Invalid webhook secret`);
      return new Response(
        JSON.stringify({ error: 'Invalid webhook secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: N8NWebhookPayload = await req.json();
    
    console.log(`🎯 [${webhookId}] N8N webhook received for user: ${payload.user_id}`);
    console.log(`📋 [${webhookId}] Video details: Title="${payload.title}", Description length=${payload.description?.length || 0}`);

    if (!payload.user_id || !payload.video_url || !payload.title) {
      throw new Error('Missing required fields: user_id, video_url, title');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Verify user exists and has valid YouTube tokens
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('youtube_tokens')
      .select('user_id, channel_name')
      .eq('user_id', payload.user_id)
      .single();

    if (tokenError || !tokenData) {
      console.error(`❌ [${webhookId}] No valid YouTube tokens for user: ${payload.user_id}`);
      return new Response(
        JSON.stringify({ 
          error: 'User not connected to YouTube',
          requires_auth: true,
          user_id: payload.user_id
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [${webhookId}] User verified: ${tokenData.channel_name}`);

    // Log webhook received
    const { error: logError } = await supabaseClient
      .from('webhook_logs')
      .insert({
        webhook_id: webhookId,
        user_id: payload.user_id,
        webhook_type: 'n8n_youtube_upload',
        payload: payload,
        status: 'received',
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.warn(`⚠️ [${webhookId}] Failed to log webhook:`, logError);
    }

    // Call YouTube upload function with comprehensive metadata
    const uploadResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/youtube-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        user_id: payload.user_id,
        video_url: payload.video_url,
        title: payload.title,
        description: payload.description || '',
        tags: payload.tags || ['shorts', 'ai-generated', 'automated'],
        privacy_status: payload.privacy_status || 'public',
        is_short: payload.is_short !== false, // Default to true
        video_idea_id: payload.video_idea_id,
      }),
    });

    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.text();
      console.error(`❌ [${webhookId}] Upload failed:`, uploadError);
      
      // Update webhook log with error
      await supabaseClient
        .from('webhook_logs')
        .update({
          status: 'failed',
          error_message: uploadError,
          completed_at: new Date().toISOString()
        })
        .eq('webhook_id', webhookId);

      return new Response(
        JSON.stringify({ 
          error: 'Upload failed',
          details: uploadError,
          webhook_id: webhookId
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uploadResult = await uploadResponse.json();
    
    console.log(`🎉 [${webhookId}] Upload successful: ${uploadResult.video_url}`);

    // Update webhook log with success
    await supabaseClient
      .from('webhook_logs')
      .update({
        status: 'completed',
        result: uploadResult,
        completed_at: new Date().toISOString()
      })
      .eq('webhook_id', webhookId);

    // Return comprehensive success response for n8n
    return new Response(
      JSON.stringify({
        success: true,
        webhook_id: webhookId,
        video_id: uploadResult.video_id,
        video_url: uploadResult.video_url,
        upload_status: uploadResult.upload_status,
        processing_status: uploadResult.processing_status,
        title: payload.title,
        description: payload.description,
        message: 'Video uploaded successfully to YouTube',
        // Include data that n8n can use in subsequent nodes
        youtube_data: {
          video_id: uploadResult.video_id,
          video_url: uploadResult.video_url,
          title: payload.title,
          description: payload.description,
          upload_status: uploadResult.upload_status
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`💥 [${webhookId}] Webhook error:`, error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        webhook_id: webhookId
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
