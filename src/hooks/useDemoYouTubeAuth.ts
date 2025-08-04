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

      if (!data?.auth_url) {
        console.error('❌ No auth URL received:', data);
        throw new Error('No auth URL received');
      }

      console.log('✅ Opening YouTube OAuth popup for demo...');
      
      // Open OAuth in popup for demo
      const popup = window.open(
        data.auth_url,
        'youtube_oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // Listen for popup completion
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          // Check if connection was successful
          setTimeout(() => {
            checkConnection();
          }, 1000);
        }
      }, 1000);

      // Listen for messages from popup
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'YOUTUBE_OAUTH_SUCCESS') {
          popup?.close();
          clearInterval(checkClosed);
          
          // Store demo connection
          sessionStorage.setItem('demo_youtube_connected', 'true');
          sessionStorage.setItem('demo_youtube_channel', event.data.channelName || 'Demo Channel');
          
          setIsConnected(true);
          setChannelName(event.data.channelName || 'Demo Channel');
          
          toast({
            title: "YouTube Connected!",
            description: "You can now upload videos to YouTube.",
          });
        } else if (event.data.type === 'YOUTUBE_OAUTH_ERROR') {
          popup?.close();
          clearInterval(checkClosed);
          throw new Error(event.data.error || 'OAuth failed');
        }
      };

      window.addEventListener('message', messageListener);

      // Cleanup after 5 minutes
      setTimeout(() => {
        window.removeEventListener('message', messageListener);
        clearInterval(checkClosed);
        if (popup && !popup.closed) {
          popup.close();
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