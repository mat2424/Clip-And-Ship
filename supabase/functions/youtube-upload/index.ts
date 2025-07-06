import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YouTubeUploadRequest {
  user_id: string;
  video_url: string;
  title: string;
  description: string;
  tags?: string[];
  privacy_status?: 'private' | 'public' | 'unlisted';
  category_id?: string;
  is_short?: boolean;
}

interface YouTubeUploadResult {
  video_id: string;
  video_url: string;
  upload_status: string;
  processing_status?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const uploadId = crypto.randomUUID().substring(0, 8);
  
  try {
    const {
      user_id,
      video_url,
      title,
      description,
      tags = ['shorts', 'ai'],
      privacy_status = 'public',
      category_id = '22', // People & Blogs
      is_short = true
    }: YouTubeUploadRequest = await req.json();

    console.log(`🎬 [${uploadId}] YouTube upload started for user: ${user_id}`);

    if (!user_id || !video_url || !title) {
      throw new Error('Missing required fields: user_id, video_url, title');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get fresh access token
    const tokenResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/youtube-token-refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ user_id }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error(`❌ [${uploadId}] Failed to get access token:`, error);
      throw new Error(`Authentication failed: ${error}`);
    }

    const { access_token } = await tokenResponse.json();
    console.log(`✅ [${uploadId}] Access token obtained`);

    // Download video file
    console.log(`📥 [${uploadId}] Downloading video from: ${video_url}`);
    const videoResponse = await fetch(video_url);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.blob();
    const videoSize = videoBlob.size;
    console.log(`📦 [${uploadId}] Video downloaded, size: ${(videoSize / 1024 / 1024).toFixed(2)}MB`);

    // Prepare video metadata
    const metadata = {
      snippet: {
        title: title.length > 100 ? title.substring(0, 97) + '...' : title,
        description: description,
        tags: tags,
        categoryId: category_id,
        defaultLanguage: 'en'
      },
      status: {
        privacyStatus: privacy_status,
        selfDeclaredMadeForKids: false
      }
    };

    // Add YouTube Shorts indicator if applicable
    if (is_short) {
      metadata.snippet.title = `${metadata.snippet.title} #Shorts`;
    }

    console.log(`🚀 [${uploadId}] Initiating YouTube upload`);

    // Initialize resumable upload
    const initResponse = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': videoBlob.type || 'video/mp4',
          'X-Upload-Content-Length': videoSize.toString(),
        },
        body: JSON.stringify(metadata)
      }
    );

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      console.error(`❌ [${uploadId}] Upload initialization failed:`, errorText);
      throw new Error(`Upload initialization failed: ${errorText}`);
    }

    const uploadUrl = initResponse.headers.get('location');
    if (!uploadUrl) {
      throw new Error('No upload URL received from YouTube');
    }

    console.log(`📤 [${uploadId}] Uploading video content`);

    // Upload video content
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': videoBlob.type || 'video/mp4',
      },
      body: videoBlob
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error(`❌ [${uploadId}] Video upload failed:`, errorText);
      throw new Error(`Video upload failed: ${errorText}`);
    }

    const result = await uploadResponse.json();
    const videoId = result.id;
    
    if (!videoId) {
      throw new Error('No video ID returned from YouTube');
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    console.log(`✅ [${uploadId}] Upload successful! Video ID: ${videoId}`);

    // Store upload record
    const { error: dbError } = await supabaseClient
      .from('youtube_uploads')
      .insert({
        user_id: user_id,
        video_id: videoId,
        video_url: youtubeUrl,
        title: title,
        description: description,
        privacy_status: privacy_status,
        upload_status: 'completed',
        processing_status: result.status?.uploadStatus || 'uploaded',
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.warn(`⚠️ [${uploadId}] Failed to store upload record:`, dbError);
    }

    const uploadResult: YouTubeUploadResult = {
      video_id: videoId,
      video_url: youtubeUrl,
      upload_status: 'completed',
      processing_status: result.status?.uploadStatus || 'uploaded'
    };

    return new Response(
      JSON.stringify(uploadResult),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`💥 [${uploadId}] Upload error:`, error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        upload_id: uploadId
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Utility function for external webhook calls
export async function uploadVideoToYouTube(params: YouTubeUploadRequest): Promise<YouTubeUploadResult> {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/youtube-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`YouTube upload failed: ${error}`);
  }

  return await response.json();
}