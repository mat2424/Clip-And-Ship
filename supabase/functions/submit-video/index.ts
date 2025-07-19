
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

// Enhanced input sanitization
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 5000); // Limit length
}

function validateUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

function containsInappropriateContent(text: string): boolean {
  const inappropriatePatterns = [
    /\b(spam|scam|phishing)\b/gi,
    /\b(hack|exploit|malware)\b/gi,
    /\b(porn|adult|xxx)\b/gi,
  ];
  
  return inappropriatePatterns.some(pattern => pattern.test(text));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse and validate request body
    const body = await req.json()
    console.log('📝 Video submission request:', { 
      userId: user.id, 
      platforms: body.selected_platforms,
      hasVoiceFile: !!body.voice_file_url 
    })

    // Enhanced input validation and sanitization
    if (!body.idea_text || typeof body.idea_text !== 'string') {
      throw new Error('Invalid idea_text')
    }

    if (!body.selected_platforms || !Array.isArray(body.selected_platforms) || body.selected_platforms.length === 0) {
      throw new Error('Invalid selected_platforms')
    }

    const allowedPlatforms = ['youtube', 'tiktok', 'instagram'];
    const validPlatforms = body.selected_platforms.filter((p: string) => 
      allowedPlatforms.includes(p)
    );

    if (validPlatforms.length === 0) {
      throw new Error('No valid platforms selected')
    }

    // Sanitize all text inputs
    const sanitizedIdeaText = sanitizeInput(body.idea_text);
    const sanitizedEnvironmentPrompt = body.environment_prompt ? sanitizeInput(body.environment_prompt) : '';
    const sanitizedSoundPrompt = body.sound_prompt ? sanitizeInput(body.sound_prompt) : '';

    // Check for inappropriate content
    if (containsInappropriateContent(sanitizedIdeaText) || 
        containsInappropriateContent(sanitizedEnvironmentPrompt) || 
        containsInappropriateContent(sanitizedSoundPrompt)) {
      throw new Error('Content contains inappropriate material')
    }

    // Validate voice file URL if provided
    if (body.voice_file_url && !validateUrl(body.voice_file_url)) {
      throw new Error('Invalid voice file URL')
    }

    // Validate boolean fields
    const useAiVoice = body.use_ai_voice === true;

    // Check user's credit balance
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('❌ Profile fetch error:', profileError)
      throw new Error('Failed to fetch user profile')
    }

    if (!profile || profile.credits < 1) {
      throw new Error('Insufficient credits')
    }

    console.log(`💰 User has ${profile.credits} credits`)

    // Create video idea with sanitized data
    const { data: videoIdea, error: insertError } = await supabaseClient
      .from('video_ideas')
      .insert({
        user_id: user.id,
        idea_text: sanitizedIdeaText,
        selected_platforms: validPlatforms,
        use_ai_voice: useAiVoice,
        voice_file_url: body.voice_file_url || null,
        environment_prompt: sanitizedEnvironmentPrompt || null,
        sound_prompt: sanitizedSoundPrompt || null,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Insert error:', insertError)
      throw new Error('Failed to create video idea: ' + insertError.message)
    }

    console.log('✅ Video idea created:', videoIdea.id)

    // Deduct 1 credit from user
    const { error: creditError } = await supabaseClient
      .from('profiles')
      .update({ credits: profile.credits - 1 })
      .eq('id', user.id)

    if (creditError) {
      console.error('❌ Credit deduction error:', creditError)
      // Don't throw here as the video idea is already created
    } else {
      console.log('💸 Deducted 1 credit, new balance:', profile.credits - 1)
      
      // Log the credit transaction
      await supabaseClient
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          amount: -1,
          transaction_type: 'video_generation',
          description: `Video generation for idea: ${sanitizedIdeaText.substring(0, 50)}...`
        })
    }

    // Call the video generation webhook
    const webhookUrl = Deno.env.get('VIDEO_GENERATION_WEBHOOK_URL')
    if (webhookUrl) {
      console.log('🔗 Calling video generation webhook...')
      
      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_idea_id: videoIdea.id,
            user_id: user.id,
            idea_text: sanitizedIdeaText,
            selected_platforms: validPlatforms,
            use_ai_voice: useAiVoice,
            voice_file_url: body.voice_file_url || null,
            environment_prompt: sanitizedEnvironmentPrompt || null,
            sound_prompt: sanitizedSoundPrompt || null,
          }),
        })

        if (!webhookResponse.ok) {
          console.error('❌ Webhook call failed:', webhookResponse.status, webhookResponse.statusText)
          
          // Update video idea status to failed
          await supabaseClient
            .from('video_ideas')
            .update({ 
              status: 'failed',
              upload_errors: { webhook_error: 'Failed to trigger video generation' }
            })
            .eq('id', videoIdea.id)
        } else {
          console.log('✅ Webhook called successfully')
          
          // Update video idea status to processing
          await supabaseClient
            .from('video_ideas')
            .update({ status: 'processing' })
            .eq('id', videoIdea.id)
        }
      } catch (webhookError) {
        console.error('❌ Webhook error:', webhookError)
        
        // Update video idea status to failed
        await supabaseClient
          .from('video_ideas')
          .update({ 
            status: 'failed',
            upload_errors: { webhook_error: webhookError.message }
          })
          .eq('id', videoIdea.id)
      }
    } else {
      console.warn('⚠️ No webhook URL configured')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        video_idea_id: videoIdea.id,
        remaining_credits: profile.credits - 1
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('💥 Submit video error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to submit video idea' 
      }),
      { 
        status: 400, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
