import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useDemoYouTubeAuth = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [channelName, setChannelName] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      // Check if there's a stored demo YouTube connection in sessionStorage
      const demoConnection = sessionStorage.getItem('demo_youtube_connected');
      const demoChannelName = sessionStorage.getItem('demo_youtube_channel');
      
      if (demoConnection === 'true') {
        setIsConnected(true);
        setChannelName(demoChannelName || 'Demo Channel');
        return;
      }

      // Also check if user has actual YouTube connection (in case they're logged in)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: tokens } = await supabase
          .from('youtube_tokens')
          .select('channel_name, expires_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (tokens) {
          const expiresAt = new Date(tokens.expires_at);
          const now = new Date();
          
          if (expiresAt > now) {
            setIsConnected(true);
            setChannelName(tokens.channel_name || 'Your Channel');
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error checking demo YouTube connection:', error);
    }
  };

  const connect = async () => {
    setLoading(true);
    try {
      console.log('🚀 Initiating demo YouTube OAuth...');

      const { data, error } = await supabase.functions.invoke('youtube-oauth-setup', {
        body: { demo_mode: true },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) {
        console.error('❌ OAuth setup error:', error);
        throw new Error(error.message);
      }

      if (!data?.auth_url || !data?.session_id) {
        console.error('❌ No auth URL or session ID received:', data);
        throw new Error('No auth URL or session ID received');
      }

      const sessionId = data.session_id;
      console.log('✅ Opening YouTube OAuth popup for demo with session:', sessionId);
      
      // Set up communication listeners BEFORE opening popup
      let resolved = false;
      
      // Method 1: BroadcastChannel
      let channel: BroadcastChannel | null = null;
      try {
        channel = new BroadcastChannel(`youtube_auth_${sessionId}`);
        channel.addEventListener('message', (event) => {
          if (resolved) return;
          handleAuthResult(event.data);
        });
      } catch (e) {
        console.log('BroadcastChannel not available');
      }
      
      // Method 2: localStorage polling
      const pollStorage = () => {
        try {
          const result = localStorage.getItem(`youtube_auth_result_${sessionId}`);
          if (result && !resolved) {
            const data = JSON.parse(result);
            localStorage.removeItem(`youtube_auth_result_${sessionId}`);
            handleAuthResult(data);
          }
        } catch (e) {
          console.log('localStorage polling failed');
        }
      };
      
      const storageInterval = setInterval(pollStorage, 1000);
      
      // Method 3: PostMessage (fallback)
      const messageListener = (event: MessageEvent) => {
        if (resolved || event.origin !== window.location.origin) return;
        
        if (event.data.type === 'YOUTUBE_OAUTH_SUCCESS' || event.data.type === 'YOUTUBE_AUTH_ERROR') {
          handleAuthResult(event.data);
        }
      };
      
      window.addEventListener('message', messageListener);
      
      const handleAuthResult = (data: any) => {
        if (resolved) return;
        resolved = true;
        
        // Close popup immediately
        if (popup && !popup.closed) {
          popup.close();
        }
        
        // Cleanup
        clearInterval(storageInterval);
        window.removeEventListener('message', messageListener);
        if (channel) {
          channel.close();
        }
        
        if (data.type === 'YOUTUBE_OAUTH_SUCCESS') {
          // Store demo connection
          sessionStorage.setItem('demo_youtube_connected', 'true');
          sessionStorage.setItem('demo_youtube_channel', data.channelName || 'Demo Channel');
          
          setIsConnected(true);
          setChannelName(data.channelName || 'Demo Channel');
          
          toast({
            title: "YouTube Connected!",
            description: "You can now upload videos to YouTube.",
          });
        } else if (data.type === 'YOUTUBE_AUTH_ERROR') {
          throw new Error(data.error || 'OAuth failed');
        }
      };
      
      // Open OAuth in popup
      const popup = window.open(
        data.auth_url,
        'youtube_oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );
      
      // Cleanup after 5 minutes
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          clearInterval(storageInterval);
          window.removeEventListener('message', messageListener);
          if (channel) {
            channel.close();
          }
          if (popup && !popup.closed) {
            popup.close();
          }
          
          toast({
            title: "Connection Timeout",
            description: "OAuth process timed out. Please try again.",
            variant: "destructive",
          });
        }
      }, 300000);

    } catch (error) {
      console.error('💥 Demo YouTube auth failed:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect YouTube",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    sessionStorage.removeItem('demo_youtube_connected');
    sessionStorage.removeItem('demo_youtube_channel');
    setIsConnected(false);
    setChannelName('');
    
    toast({
      title: "YouTube Disconnected",
      description: "You'll need to reconnect to upload videos.",
    });
  };

  return {
    isConnected,
    channelName,
    loading,
    connect,
    disconnect,
    refresh: checkConnection,
  };
};