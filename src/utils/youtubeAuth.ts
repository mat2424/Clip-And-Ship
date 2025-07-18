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
    const { data, error } = await supabase.functions.invoke('youtube-oauth-setup', {
      body: {}
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.authUrl) {
      throw new Error('No auth URL received');
    }

    return data.authUrl;
  } catch (error) {
    console.error('YouTube auth initiation failed:', error);
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
      .single();

    if (error || !tokens) {
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
 * Open YouTube OAuth in popup window
 */
export function openYouTubeAuthPopup(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    let popup: Window | null = null;
    let checkClosedInterval: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let resolved = false;

    const cleanup = () => {
      if (checkClosedInterval) {
        clearInterval(checkClosedInterval);
        checkClosedInterval = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      window.removeEventListener('message', messageHandler);
    };

    const messageHandler = (event: MessageEvent) => {
      console.log('Received message in parent:', event.data);

      if (event.data?.type === 'YOUTUBE_AUTH_SUCCESS' && !resolved) {
        resolved = true;
        console.log('YouTube auth success received');
        cleanup();

        // Don't close popup immediately, let the callback handle it
        setTimeout(() => {
          if (popup && !popup.closed) {
            popup.close();
          }
        }, 3000);

        resolve();
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

      window.addEventListener('message', messageHandler);

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

      // Check if popup was closed manually
      checkClosedInterval = setInterval(() => {
        if (popup && popup.closed && !resolved) {
          resolved = true;
          cleanup();
          reject(new Error('Authentication cancelled'));
        }
      }, 1000);

    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}