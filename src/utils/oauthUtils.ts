
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type SocialPlatform = Database["public"]["Enums"]["social_platform"];

// Platform to Supabase OAuth provider mapping (only supported platforms)
const platformProviderMap: Record<string, string> = {
  youtube: "google", // YouTube uses Google OAuth
  facebook: "facebook",
  x: "twitter",
  linkedin: "linkedin_oidc"
};

// Platform-specific OAuth scopes
const platformScopes: Record<string, string> = {
  youtube: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube",
  facebook: "pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish",
  x: "tweet.read tweet.write users.read offline.access",
  linkedin: "r_liteprofile w_member_social",
  tiktok: "user.info.basic,video.publish",
  instagram: "user_profile,user_media"
};

export const initiateOAuth = async (platform: SocialPlatform) => {
  try {
    console.log(`🚀 Starting OAuth for platform: ${platform}`);
    
    // Check session first, then get user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('❌ No active session');
      throw new Error("Please log in to connect your social accounts");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ User not authenticated');
      throw new Error("Authentication failed. Please refresh and try again.");
    }

    console.log(`✅ User authenticated: ${user.id}`);

    // Handle YouTube with popup OAuth flow
    if (platform === 'youtube') {
      console.log('🎬 Using YouTube popup OAuth flow');
      const { openYouTubeAuthPopup } = await import('./youtubeAuth');
      return await openYouTubeAuthPopup();
    }

    // Handle custom OAuth flows for TikTok and Instagram
    if (platform === 'tiktok' || platform === 'instagram') {
      console.log(`🔀 Using custom OAuth flow for ${platform}`);
      return await initiateCustomOAuth(platform);
    }

    // Check if platform is supported by Supabase
    if (!platformProviderMap[platform]) {
      console.error(`❌ Platform ${platform} not supported`);
      throw new Error(`${platform} OAuth is not currently supported`);
    }

    const provider = platformProviderMap[platform];
    const scopes = platformScopes[platform];

    // Use the actual domain for redirect instead of preview URL
    const redirectTo = `${window.location.origin}/oauth-callback`;

    console.log(`🔗 OAuth config:`, {
      provider,
      scopes,
      redirectTo,
      currentUrl: window.location.href
    });

    // Use Supabase's built-in OAuth with platform-specific scopes
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: redirectTo,
        scopes: scopes,
        queryParams: {
          platform: platform // Pass platform info for later identification
        }
      }
    });

    if (error) {
      console.error(`❌ OAuth initiation failed:`, error);
      throw error;
    }

    console.log(`✅ OAuth initiated successfully:`, data);
    return data;
  } catch (error) {
    console.error(`💥 Error initiating OAuth for ${platform}:`, error);
    throw error;
  }
};

// Custom OAuth flow for TikTok and Instagram
const initiateCustomOAuth = async (platform: 'tiktok' | 'instagram') => {
  try {
    console.log(`🔧 Setting up custom OAuth for ${platform}`);
    
    // For now, show a message that these platforms require API keys
    if (platform === 'tiktok') {
      throw new Error('TikTok integration requires API keys. Please contact support to set up TikTok publishing.');
    }
    
    if (platform === 'instagram') {
      throw new Error('Instagram integration requires API keys. Please contact support to set up Instagram publishing.');
    }
    
    return { data: null, error: null };
  } catch (error) {
    console.error(`💥 Error initiating custom OAuth for ${platform}:`, error);
    throw error;
  }
};

// Handle OAuth callback for custom flows
export const handleCustomOAuthCallback = async () => {
  try {
    console.log('🔄 Processing custom OAuth callback...');
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    
    console.log('📋 Callback parameters:', { 
      hasCode: !!code, 
      hasState: !!state, 
      error: error 
    });
    
    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }
    
    if (!code || !state) {
      throw new Error('Missing authorization code or state parameter');
    }
    
    // Determine platform from stored state
    const tiktokState = localStorage.getItem('tiktok_oauth_state');
    const instagramState = localStorage.getItem('instagram_oauth_state');
    
    let platform: 'tiktok' | 'instagram' | null = null;
    
    if (state === tiktokState) {
      platform = 'tiktok';
      localStorage.removeItem('tiktok_oauth_state');
    } else if (state === instagramState) {
      platform = 'instagram';
      localStorage.removeItem('instagram_oauth_state');
    }
    
    if (!platform) {
      throw new Error('Invalid state parameter');
    }
    
    console.log(`✅ Identified platform: ${platform}`);
    
    // For now, we'll create a mock token since server-side exchange isn't implemented yet
    const mockTokenData = {
      access_token: `mock_${platform}_token_${Date.now()}`,
      token_type: 'bearer',
      expires_in: 3600
    };
    
    // Store the connection in our database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log(`💾 Storing ${platform} connection for user:`, user.id);
      await storePlatformConnection(platform, user.id, mockTokenData);
    }
    
    return { platform, tokenData: mockTokenData };
  } catch (error) {
    console.error('💥 Error handling OAuth callback:', error);
    throw error;
  }
};

const storePlatformConnection = async (platform: SocialPlatform, userId: string, tokenData?: any) => {
  try {
    console.log(`💾 Storing connection for ${platform}...`);
    
    // Store a record of the platform connection
    const { data, error } = await supabase
      .from('social_tokens')
      .upsert(
        {
          user_id: userId,
          platform,
          access_token: tokenData?.access_token || 'managed_by_supabase',
          refresh_token: tokenData?.refresh_token || null,
          expires_at: tokenData?.expires_in ? 
            new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
        },
        {
          onConflict: 'user_id,platform'
        }
      )
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    console.log(`✅ Successfully stored ${platform} connection:`, data);
    return data;
  } catch (error) {
    console.error('💥 Error storing platform connection:', error);
    throw error;
  }
};

// YouTube OAuth flow using edge function for proper authentication (DEPRECATED - use openYouTubeAuthPopup instead)
const initiateYouTubeOAuth = async () => {
  throw new Error('This function is deprecated. Use openYouTubeAuthPopup from youtubeAuth.ts instead');
};

// Generate random state for OAuth security
const generateRandomState = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};
