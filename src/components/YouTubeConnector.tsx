
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Youtube, CheckCircle, AlertCircle, Loader2, RefreshCw, Bug } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  getYouTubeAuthStatus,
  openYouTubeAuthPopup,
  disconnectYouTube,
  testYouTubeConnection,
  debugYouTubeAuth,
  type YouTubeAuthStatus
} from '@/utils/youtubeAuth';

export const YouTubeConnector: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<YouTubeAuthStatus>({ isConnected: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  const checkAuthStatus = async () => {
    try {
      const status = await getYouTubeAuthStatus();
      setAuthStatus(status);
    } catch (error) {
      console.error('Failed to check auth status:', error);
      setAuthStatus({ isConnected: false, error: 'Failed to check connection status' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    setRetryCount(prev => prev + 1);
    
    try {
      console.log('🔄 Starting YouTube OAuth using enhanced popup...');

      // Show initial feedback
      toast({
        title: "Opening YouTube Authorization",
        description: "A popup window will open for YouTube authorization. Please allow popups if blocked.",
      });

      await openYouTubeAuthPopup();

      // Refresh auth status after successful connection
      await checkAuthStatus();
      
      toast({
        title: "YouTube Connected",
        description: "Your YouTube account has been connected successfully!",
      });

      setRetryCount(0); // Reset retry count on success

    } catch (error) {
      console.error('❌ YouTube connection failed:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to connect YouTube account";

      let userMessage = errorMessage;
      let variant: "default" | "destructive" = "destructive";

      // Provide specific guidance based on error type
      if (errorMessage.includes('popup')) {
        userMessage = "Please allow popups for this site and try again. Check your browser's popup blocker settings.";
      } else if (errorMessage.includes('timeout')) {
        userMessage = "Connection timed out. Please try again and complete the authorization quickly.";
      } else if (errorMessage.includes('cancelled')) {
        userMessage = "Authorization was cancelled. Please try again if you want to connect YouTube.";
        variant = "default";
      }

      toast({
        title: "Connection Failed",
        description: userMessage,
        variant: variant,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectYouTube();
      await checkAuthStatus();
      
      toast({
        title: "Disconnected",
        description: "Your YouTube account has been disconnected.",
      });
    } catch (error) {
      console.error('Disconnection failed:', error);
      toast({
        title: "Disconnection Failed",
        description: error instanceof Error ? error.message : "Failed to disconnect YouTube account",
        variant: "destructive",
      });
    }
  };

  const handleTest = async () => {
    try {
      const result = await testYouTubeConnection();
      if (result.success) {
        toast({
          title: "Connection Test Successful",
          description: `Channel: ${result.channelName}`,
        });
      } else {
        toast({
          title: "Connection Test Failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDebug = async () => {
    try {
      // Test the basic OAuth setup
      const { data, error } = await supabase.functions.invoke('test-youtube-oauth');
      
      if (error) {
        console.error('❌ OAuth diagnostics failed:', error);
        toast({
          title: "Diagnostics Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('🔍 OAuth Diagnostics:', data);
      
      // Also run the debug function
      await debugYouTubeAuth();
      
      toast({
        title: "Debug Complete",
        description: "Check the browser console for detailed logs and diagnostics.",
      });
    } catch (error) {
      console.error('Debug failed:', error);
      toast({
        title: "Debug Failed",
        description: error instanceof Error ? error.message : "Debug test failed",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Checking YouTube connection...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-600" />
          YouTube Integration
        </CardTitle>
        <CardDescription>
          Connect your YouTube account to enable video uploads
        </CardDescription>
        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>Note:</strong> You may see "Google hasn't verified this app" - this is normal for testing. 
          Click "Advanced" → "Go to {window.location.hostname} (unsafe)" to continue. After authorization, 
          the popup will close automatically and your connection status will update.
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {authStatus.isConnected ? (
          <>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Connected</span>
              <Badge variant="secondary">{authStatus.channelName}</Badge>
            </div>
            
            {authStatus.expiresAt && (
              <div className="text-xs text-muted-foreground">
                Token expires: {new Date(authStatus.expiresAt).toLocaleDateString()}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={handleTest}
                variant="outline"
                size="sm"
              >
                Test Connection
              </Button>
              <Button 
                onClick={handleDisconnect}
                variant="outline"
                size="sm"
              >
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">Not Connected</span>
              {authStatus.error && (
                <Badge variant="destructive" className="text-xs">
                  {authStatus.error}
                </Badge>
              )}
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Youtube className="mr-2 h-4 w-4" />
                    Connect YouTube {retryCount > 0 && `(Attempt ${retryCount + 1})`}
                  </>
                )}
              </Button>
              
              {retryCount > 0 && (
                <div className="text-sm text-muted-foreground bg-blue-50 p-2 rounded">
                  <strong>Tip:</strong> If the popup is blocked, please allow popups for this site in your browser settings.
                </div>
              )}
              
              <div className="flex gap-2">
                {authStatus.error && (
                  <Button
                    onClick={checkAuthStatus}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Refresh Status
                  </Button>
                )}
                <Button
                  onClick={handleDebug}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Bug className="mr-1 h-3 w-3" />
                  Debug OAuth
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
