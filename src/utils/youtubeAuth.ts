import { supabase } from "@/integrations/supabase/client";

export interface YouTubeAuthStatus {
  isConnected: boolean;
  channelName?: string;
  expiresAt?: string;
  error?: string;
}

/**
 * Initiate YouTube OAuth flow
 */
export async function initiateYouTubeAuth(): Promise<string> {
  try {
    console.log('🚀 Initiating YouTube OAuth...');

    const { data, error } = await supabase.functions.invoke('youtube-oauth-setup', {
      body: {}
    });

    console.log('📋 OAuth setup response:', { data, error });

    if (error) {
      console.error('❌ OAuth setup error:', error);
      throw new Error(error.message);
    }

    if (!data?.authUrl) {
      console.error('❌ No auth URL received:', data);
      throw new Error('No auth URL received');
    }

    console.log('✅ Auth URL received:', data.authUrl);
    return data.authUrl;
  } catch (error) {
    console.error('💥 YouTube auth initiation failed:', error);
    throw error;
  }
}

/**
 * Check YouTube connection status
 */
export async function getYouTubeAuthStatus(): Promise<YouTubeAuthStatus> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { isConnected: false, error: 'User not authenticated' };
    }

    const { data: tokens, error } = await supabase
      .from('youtube_tokens')
      .select('channel_name, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return { isConnected: false, error: 'Database error' };
    }

    if (!tokens) {
      return { isConnected: false };
    }

    // Check if token is expired
    const expiresAt = new Date(tokens.expires_at);
    const now = new Date();
    
    if (expiresAt <= now) {
      return { 
        isConnected: false, 
        error: 'Token expired, please reconnect' 
      };
    }

    return {
      isConnected: true,
      channelName: tokens.channel_name,
      expiresAt: tokens.expires_at
    };
  } catch (error) {
    console.error('Failed to check YouTube auth status:', error);
    return { 
      isConnected: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Disconnect YouTube account
 */
export async function disconnectYouTube(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('youtube_tokens')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to disconnect: ${error.message}`);
    }
  } catch (error) {
    console.error('Failed to disconnect YouTube:', error);
    throw error;
  }
}

/**
 * Refresh YouTube token and channel info
 */
export async function refreshYouTubeToken(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('youtube-token-refresh', {
      body: { userId: user.id }
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log('YouTube token refreshed successfully');
  } catch (error) {
    console.error('Failed to refresh YouTube token:', error);
    throw error;
  }
}

/**
 * Test YouTube API connection
 */
export async function testYouTubeConnection(): Promise<{ success: boolean; channelName?: string; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: tokens } = await supabase
      .from('youtube_tokens')
      .select('access_token, channel_name')
      .eq('user_id', user.id)
      .single();

    if (!tokens) {
      return { success: false, error: 'No YouTube tokens found' };
    }

    // Test API call
    const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const channelName = data.items?.[0]?.snippet?.title || 'Unknown Channel';
      return { success: true, channelName };
    } else {
      const errorText = await response.text();
      return { success: false, error: `API call failed: ${response.status} - ${errorText}` };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Debug function to test OAuth setup
 */
export async function debugYouTubeAuth(): Promise<void> {
  try {
    console.log('🔍 Testing YouTube OAuth setup...');
    const authUrl = await initiateYouTubeAuth();
    console.log('✅ OAuth setup successful, auth URL:', authUrl);

    // Test if we can reach the auth URL
    console.log('🌐 Testing auth URL accessibility...');

    // Just log the URL for manual testing
    console.log('📋 You can manually test this URL:', authUrl);

  } catch (error) {
    console.error('❌ OAuth setup failed:', error);
    throw error;
  }
}

/**
 * Open YouTube OAuth in current window (redirect-based)
 */
export function openYouTubeAuthRedirect(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const authUrl = await initiateYouTubeAuth();
      console.log('Redirecting to YouTube auth URL:', authUrl);

      // Store a flag to know we're in auth flow
      sessionStorage.setItem('youtube_auth_in_progress', 'true');
      sessionStorage.setItem('youtube_auth_return_url', window.location.href);

      // Redirect to auth URL
      window.location.href = authUrl;

      // This won't be reached due to redirect, but needed for Promise
      resolve();
    } catch (error) {
      console.error('❌ Failed to initiate YouTube auth:', error);
      reject(error);
    }
  });
}

/**
 * Enhanced YouTube OAuth popup with better COOP handling
 */
export function openYouTubeAuthPopup(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    let popup: Window | null = null;
    let checkInterval: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let broadcastChannel: BroadcastChannel | null = null;
    let resolved = false;
    const sessionId = Math.random().toString(36).substring(2);

    const cleanup = () => {
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (broadcastChannel) {
        broadcastChannel.close();
        broadcastChannel = null;
      }
      window.removeEventListener('message', messageHandler);
      window.removeEventListener('storage', storageHandler);
    };

    const finishAuth = (success: boolean, error?: string) => {
      if (resolved) return;
      resolved = true;
      
      console.log(success ? '✅ YouTube auth completed successfully!' : '❌ YouTube auth failed:', error);
      cleanup();
      
      // Attempt to close popup (will fail silently due to COOP)
      try {
        if (popup && !popup.closed) {
          popup.close();
        }
      } catch (e) {
        console.log('📊 Cannot close popup due to COOP restrictions');
      }
      
      if (success) {
        resolve();
      } else {
        reject(new Error(error || 'Authentication failed'));
      }
    };

    // Method 1: PostMessage handler (may not work due to COOP)
    const messageHandler = (event: MessageEvent) => {
      console.log('📨 Received message:', event.data);
      
      if (event.data?.type === 'YOUTUBE_AUTH_SUCCESS' && event.data?.sessionId === sessionId) {
        finishAuth(true);
      } else if (event.data?.type === 'YOUTUBE_AUTH_ERROR' && event.data?.sessionId === sessionId) {
        finishAuth(false, event.data.error);
      }
    };

    // Method 2: LocalStorage handler (cross-tab communication)
    const storageHandler = (event: StorageEvent) => {
      if (event.key === `youtube_auth_result_${sessionId}`) {
        const result = event.newValue ? JSON.parse(event.newValue) : null;
        if (result) {
          localStorage.removeItem(`youtube_auth_result_${sessionId}`);
          if (result.success) {
            finishAuth(true);
          } else {
            finishAuth(false, result.error);
          }
        }
      }
    };

    // Method 3: BroadcastChannel (modern browsers)
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel(`youtube_auth_${sessionId}`);
      broadcastChannel.onmessage = (event) => {
        console.log('📡 Received broadcast:', event.data);
        if (event.data?.type === 'YOUTUBE_AUTH_SUCCESS') {
          finishAuth(true);
        } else if (event.data?.type === 'YOUTUBE_AUTH_ERROR') {
          finishAuth(false, event.data.error);
        }
      };
    }

    // Function to check auth status by polling database
    const checkAuthStatus = async () => {
      try {
        const status = await getYouTubeAuthStatus();
        if (status.isConnected) {
          finishAuth(true);
        }
      } catch (error) {
        console.log('📊 Auth status check failed:', error);
      }
    };

    try {
      const authUrl = await initiateYouTubeAuth();
      
      // Add session ID to auth URL for tracking
      const urlWithSession = new URL(authUrl);
      urlWithSession.searchParams.set('session_id', sessionId);
      
      console.log('🚀 Opening YouTube auth popup with session:', sessionId);

      // Open popup with minimal restrictions
      popup = window.open(
        urlWithSession.toString(),
        'youtube-auth',
        'width=500,height=700,scrollbars=yes,resizable=yes,status=yes,toolbar=no,menubar=no,location=no'
      );

      if (!popup) {
        throw new Error('Failed to open popup window. Please allow popups for this site and try again.');
      }

      // Set up event listeners
      window.addEventListener('message', messageHandler);
      window.addEventListener('storage', storageHandler);

      // Poll for popup status and auth completion
      checkInterval = setInterval(() => {
        // Check if popup is still open (may not work due to COOP)
        try {
          if (popup && popup.closed && !resolved) {
            finishAuth(false, 'Authentication cancelled by user');
            return;
          }
        } catch (error) {
          // COOP prevents checking popup.closed, continue with other methods
        }

        // Check database for successful auth
        checkAuthStatus();
      }, 2000);

      // Set timeout for auth process (45 minutes for better UX)
      timeoutId = setTimeout(() => {
        finishAuth(false, 'Authentication timeout - please try again');
      }, 45 * 60 * 1000);

    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

/**
 * Handle YouTube OAuth callback after redirect
 */
export async function handleYouTubeAuthCallback(): Promise<boolean> {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    // Check if we're returning from auth
    const authInProgress = sessionStorage.getItem('youtube_auth_in_progress');
    if (!authInProgress) {
      return false; // Not an auth callback
    }

    // Clear the auth flag
    sessionStorage.removeItem('youtube_auth_in_progress');

    if (error) {
      console.error('❌ YouTube auth error:', error);
      throw new Error(`YouTube auth failed: ${error}`);
    }

    if (!code) {
      console.error('❌ No authorization code received');
      return false;
    }

    console.log('✅ Received YouTube auth code, exchanging for tokens...');

    // This function handles redirect-based auth, not used in current popup flow
    // The actual token exchange is handled by the oauth callback edge function
    console.log('✅ Auth code received, callback will handle token exchange');

    // For redirect-based auth, just return success and let the page handle the redirect
    console.log('✅ YouTube authentication successful!');

    // Get return URL and redirect back
    const returnUrl = sessionStorage.getItem('youtube_auth_return_url');
    sessionStorage.removeItem('youtube_auth_return_url');

    if (returnUrl) {
      // Clean up URL parameters and redirect
      const cleanUrl = new URL(returnUrl);
      window.location.href = cleanUrl.origin + cleanUrl.pathname;
    }

    return true;
  } catch (error) {
    console.error('❌ Error handling YouTube auth callback:', error);
    throw error;
  }
}

/**
 * Check if user is authenticated with YouTube
 */
export async function isYouTubeAuthenticated(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: tokens } = await supabase
      .from('youtube_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return !!tokens;
  } catch (error) {
    console.error('❌ Error checking YouTube auth status:', error);
    return false;
  }
}
