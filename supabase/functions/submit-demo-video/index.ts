import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DemoVideoRequest {
  title: string;
  caption: string;
  video_url: string;
  use_ai_voice: boolean;
  voice_file_url?: string;
  is_demo: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestId = crypto.randomUUID();
    console.log(`🎬 [${requestId}] Demo video submission started`);

    const body: DemoVideoRequest = await req.json();
    console.log(`📋 [${requestId}] Demo request data:`, {
      title: body.title,
      has_video_url: !!body.video_url,
      use_ai_voice: body.use_ai_voice,
      has_voice_file: !!body.voice_file_url,
      is_demo: body.is_demo
    });

    // Validate required fields
    if (!body.title || !body.caption || !body.video_url) {
      throw new Error('Missing required fields: title, caption, or video_url');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine which webhook to use based on voice settings
    let webhookUrl: string;
    
    if (body.use_ai_voice) {
      // Use existing approval webhook for AI voice
      webhookUrl = Deno.env.get('VIDEO_APPROVAL_WEBHOOK_URL')!;
      console.log(`🎙️ [${requestId}] Using AI voice - routing to approval webhook`);
    } else {
      // For demo purposes, we'll use the same webhook but with a flag
      // In production, you would use a different webhook URL for custom voice
      webhookUrl = Deno.env.get('VIDEO_APPROVAL_WEBHOOK_URL')!;
      console.log(`🎵 [${requestId}] Using custom voice file - routing to approval webhook`);
    }

    if (!webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    // Prepare webhook payload
    const webhookPayload = {
      title: body.title,
      caption: body.caption,
      video_url: body.video_url,
      use_ai_voice: body.use_ai_voice,
      voice_file_url: body.voice_file_url || null,
      is_demo: true,
      demo_mode: true,
      subscription_tier: "demo", // Add subscription tier for demo requests
      platforms: ['youtube'], // Demo only supports YouTube
      request_id: requestId,
      submitted_at: new Date().toISOString(),
    };

    console.log(`🌐 [${requestId}] Sending to webhook:`, webhookUrl);

    // Send to webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Functions',
      },
      body: JSON.stringify(webhookPayload),
    });

    const webhookResponseText = await webhookResponse.text();
    console.log(`📡 [${requestId}] Webhook response status:`, webhookResponse.status);

    if (!webhookResponse.ok) {
      console.error(`❌ [${requestId}] Webhook failed:`, {
        status: webhookResponse.status,
        response: webhookResponseText
      });
      throw new Error(`Webhook request failed: ${webhookResponse.status}`);
    }

    let webhookData;
    try {
      webhookData = JSON.parse(webhookResponseText);
    } catch {
      webhookData = { message: webhookResponseText };
    }

    console.log(`✅ [${requestId}] Demo video submitted successfully to webhook`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo video submitted successfully',
        request_id: requestId,
        webhook_response: webhookData,
        demo_mode: true,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Demo video submission error:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message,
        demo_mode: true,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});