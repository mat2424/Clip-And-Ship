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
 * Open YouTube OAuth in popup window (fallback method)
 */
export function openYouTubeAuthPopup(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    let popup: Window | null = null;
    let checkInterval: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let resolved = false;

    const cleanup = () => {
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      window.removeEventListener('message', messageHandler);
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', broadcastHandler);
        broadcastChannel.close();
        broadcastChannel = null;
      }
    };

    const messageHandler = (event: MessageEvent) => {
      console.log('📨 Received message in parent:', event.data);
      console.log('📨 Message origin:', event.origin);
      console.log('📨 Expected message type: YOUTUBE_AUTH_SUCCESS');

      if (event.data?.type === 'YOUTUBE_AUTH_SUCCESS' && !resolved) {
        resolved = true;
        console.log('✅ YouTube auth success received!');
        cleanup();

        // Don't close popup immediately, let the callback handle it
        setTimeout(() => {
          if (popup && !popup.closed) {
            console.log('🔒 Closing popup window');
            popup.close();
          }
        }, 3000);

        resolve();
      } else {
        console.log('📨 Message ignored:', {
          type: event.data?.type,
          resolved,
          isCorrectType: event.data?.type === 'YOUTUBE_AUTH_SUCCESS'
        });
      }
    };

    // BroadcastChannel handler for cross-tab communication
    let broadcastChannel: BroadcastChannel | null = null;
    const broadcastHandler = (event: MessageEvent) => {
      console.log('📡 Received broadcast message:', event.data);
      if (event.data?.type === 'YOUTUBE_AUTH_SUCCESS' && !resolved) {
        resolved = true;
        console.log('✅ YouTube auth success received via broadcast!');
        cleanup();

        setTimeout(() => {
          if (popup && !popup.closed) {
            console.log('🔒 Closing popup window');
            popup.close();
          }
        }, 3000);

        resolve();
      }
    };

    // Function to check auth status by polling the database
    const checkAuthStatus = async () => {
      try {
        const status = await getYouTubeAuthStatus();
        if (status.isConnected && !resolved) {
          resolved = true;
          console.log('✅ YouTube auth detected via polling!');
          cleanup();

          if (popup && !popup.closed) {
            console.log('🔒 Closing popup window');
            popup.close();
          }

          resolve();
        }
      } catch (error) {
        console.log('📊 Auth status check failed:', error);
      }
    };

    try {
      const authUrl = await initiateYouTubeAuth();
      console.log('Opening YouTube auth popup with URL:', authUrl);

      popup = window.open(
        authUrl,
        'youtube-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Failed to open popup window');
      }

      // Listen for messages (primary method)
      window.addEventListener('message', messageHandler);

      // Setup BroadcastChannel for cross-tab communication
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          broadcastChannel = new BroadcastChannel('youtube-auth');
          broadcastChannel.addEventListener('message', broadcastHandler);
          console.log('📡 BroadcastChannel setup for YouTube auth');
        } catch (e) {
          console.log('📡 BroadcastChannel not available:', e);
        }
      }

      // Poll for auth status (backup method) - reduced frequency
      checkInterval = setInterval(() => {
        if (popup && popup.closed && !resolved) {
          resolved = true;
          cleanup();
          reject(new Error('Authentication cancelled'));
          return;
        }

        // Check auth status every 5 seconds (reduced from 2 seconds)
        checkAuthStatus();
      }, 5000);

      // Set a timeout for the entire auth process (5 minutes)
      timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          if (popup && !popup.closed) {
            popup.close();
          }
          reject(new Error('Authentication timeout'));
        }
      }, 5 * 60 * 1000);

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

    // Exchange code for tokens
    const success = await exchangeCodeForTokens(code);

    if (success) {
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
    } else {
      throw new Error('Failed to exchange code for tokens');
    }
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