
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type SocialToken = Database["public"]["Tables"]["social_tokens"]["Row"];

// Cache for reducing API calls
const CACHE_DURATION = 30000; // 30 seconds
let lastFetchTime = 0;
let cachedAccounts: SocialToken[] = [];

export const useSocialTokens = () => {
  const [connectedAccounts, setConnectedAccounts] = useState<SocialToken[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchConnectedAccounts = async (forceRefresh = false) => {
    try {
      // Check cache first unless force refresh is requested
      const now = Date.now();
      if (!forceRefresh && cachedAccounts.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
        console.log('📋 Using cached social tokens');
        setConnectedAccounts(cachedAccounts);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch both social tokens and YouTube tokens
      const [socialTokensResponse, youtubeTokensResponse] = await Promise.all([
        supabase
          .from('social_tokens')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('youtube_tokens')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      const socialTokens = socialTokensResponse.data || [];
      const youtubeTokens = youtubeTokensResponse.data || [];

      // Convert YouTube tokens to social token format for compatibility
      const convertedYoutubeTokens = youtubeTokens.map(token => ({
        id: token.id,
        user_id: token.user_id,
        platform: 'youtube' as const,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: token.expires_at,
        username: token.channel_name,
        created_at: token.created_at,
        updated_at: token.updated_at
      }));

      // Combine both token types, excluding YouTube from social_tokens to avoid duplicates
      const filteredSocialTokens = socialTokens.filter(token => token.platform !== 'youtube');
      const allTokens = [...filteredSocialTokens, ...convertedYoutubeTokens];

      const { data, error } = { data: allTokens, error: socialTokensResponse.error || youtubeTokensResponse.error };

      if (error) {
        console.error('Error fetching social tokens:', error);
        toast({
          title: "Error",
          description: "Failed to fetch connected accounts.",
          variant: "destructive",
        });
      } else {
        console.log('📊 Fetched social tokens:', data?.length || 0);
        
        // Only validate tokens if they haven't been validated recently
        let validTokens = data || [];

        // Skip expensive validation if we just fetched recently
        if (forceRefresh || (now - lastFetchTime) > CACHE_DURATION) {
          console.log('🔍 Validating tokens...');

          // Clean up expired tokens and validate remaining ones
          const validatedAccounts = await Promise.all(
            (data || []).map(async (account) => {
              // Check if token is expired based on expires_at
              if (account.expires_at && new Date(account.expires_at) <= new Date()) {
                console.log(`⏰ Token expired for ${account.platform}, attempting refresh...`);
                if (account.platform === 'youtube') {
                  const refreshed = await refreshYouTubeToken(account);
                  return refreshed;
                }
                // For other platforms, remove expired token
                await supabase.from('social_tokens').delete().eq('id', account.id);
                return null;
              }

              // For YouTube, validate token with API less frequently
              if (account.platform === 'youtube' && forceRefresh) {
                const isValid = await validateYouTubeToken(account.access_token);
                if (!isValid) {
                  console.log('🔄 YouTube token invalid, attempting refresh...');
                  const refreshed = await refreshYouTubeToken(account);
                  return refreshed;
                }
              }

              return account;
            })
          );

          validTokens = validatedAccounts.filter(Boolean) as SocialToken[];
          console.log('✅ Valid tokens after validation:', validTokens.length);
        }

        // Update cache
        cachedAccounts = validTokens;
        lastFetchTime = now;
        setConnectedAccounts(validTokens);
      }
    } catch (error) {
      console.error('Error fetching connected accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateYouTubeToken = async (token: string): Promise<boolean> => {
    try {
      console.log('🔍 Validating YouTube token...');
      const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        console.log('✅ YouTube token is valid');
        return true;
      } else {
        console.log('❌ YouTube token validation failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('💥 Error validating YouTube token:', error);
      return false;
    }
  };

  const refreshYouTubeToken = async (account: SocialToken): Promise<SocialToken | null> => {
    try {
      console.log('🔄 Attempting to refresh YouTube token for account:', account.id);
      
      if (!account.refresh_token) {
        console.log('❌ No refresh token available, user needs to re-authenticate');
        // Remove expired token from database
        await supabase.from('social_tokens').delete().eq('id', account.id);
        return null;
      }

      // Try to refresh the token using Supabase edge function
      const { data, error } = await supabase.functions.invoke('refresh-social-tokens', {
        body: { 
          platform: 'youtube',
          refresh_token: account.refresh_token,
          token_id: account.id
        }
      });

      if (error || !data?.access_token) {
        console.error('❌ Failed to refresh YouTube token:', error);
        // Remove expired token from database
        await supabase.from('social_tokens').delete().eq('id', account.id);
        return null;
      }

      console.log('✅ Successfully refreshed YouTube token');
      return data as SocialToken;
    } catch (error) {
      console.error('💥 Error refreshing YouTube token:', error);
      // Remove expired token from database on error
      try {
        await supabase.from('social_tokens').delete().eq('id', account.id);
      } catch (dbError) {
        console.error('Error cleaning up expired token:', dbError);
      }
      return null;
    }
  };

  const disconnectAccount = async (tokenId: string) => {
    try {
      const { error } = await supabase
        .from('social_tokens')
        .delete()
        .eq('id', tokenId);

      if (error) {
        console.error('Error disconnecting account:', error);
        toast({
          title: "Error",
          description: "Failed to disconnect account.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Account disconnected successfully.",
        });
        fetchConnectedAccounts();
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect account.",
        variant: "destructive",
      });
    }
  };

  const getValidToken = async (platform: string): Promise<string | null> => {
    const account = connectedAccounts.find(acc => acc.platform === platform);
    if (!account) return null;

    if (platform === 'youtube') {
      const isValid = await validateYouTubeToken(account.access_token);
      if (isValid) {
        return account.access_token;
      }
      
      // Token is invalid, user needs to reconnect
      toast({
        title: "Token Expired",
        description: "Your YouTube connection has expired. Please reconnect your account.",
        variant: "destructive",
      });
      return null;
    }

    return account.access_token;
  };

  const refreshAccounts = (forceRefresh = false) => {
    fetchConnectedAccounts(forceRefresh);
  };

  useEffect(() => {
    fetchConnectedAccounts();
  }, []);

  return {
    connectedAccounts,
    loading,
    refreshAccounts,
    disconnectAccount,
    getValidToken,
  };
};
