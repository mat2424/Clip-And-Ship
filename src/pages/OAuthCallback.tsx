
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { handleCustomOAuthCallback } from "@/utils/oauthUtils";
import { handleYouTubeAuthCallback } from "@/utils/youtubeAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(true);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    const processCallback = async () => {
      // Prevent multiple processing attempts
      if (hasProcessedRef.current) {
        console.log('⚠️ OAuth callback already processed, skipping');
        return;
      }

      hasProcessedRef.current = true;

      try {
        console.log('🔄 OAuth callback started');
        console.log('📍 Current URL:', window.location.href);
        console.log('🔗 Hash params:', window.location.hash);
        console.log('🔗 Search params:', window.location.search);

        // First, check if this is a YouTube redirect auth callback
        try {
          const isYouTubeCallback = await handleYouTubeAuthCallback();
          if (isYouTubeCallback) {
            console.log('✅ YouTube redirect auth handled successfully');
            toast({
              title: "Success!",
              description: "Successfully connected your YouTube account.",
            });
            // The handleYouTubeAuthCallback function will handle the redirect
            return;
          }
        } catch (error) {
          console.error('❌ YouTube redirect auth failed:', error);
          toast({
            title: "Connection Failed",
            description: error instanceof Error ? error.message : "Failed to connect YouTube account",
            variant: "destructive",
          });
          setTimeout(() => navigate("/app"), 2000);
          return;
        }

        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const urlParams = new URLSearchParams(window.location.search);
        
        console.log('📋 Hash params object:', Object.fromEntries(hashParams.entries()));
        console.log('📋 URL params object:', Object.fromEntries(urlParams.entries()));
        
        // Check for OAuth errors first
        const error = urlParams.get('error') || hashParams.get('error');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
        const errorCode = urlParams.get('error_code') || hashParams.get('error_code');
        
        if (error) {
          console.error('❌ OAuth error detected:', { error, errorDescription, errorCode });
          
          let userMessage = "Failed to connect account. Please try again.";
          
          if (error === 'server_error' && errorCode === 'unexpected_failure') {
            userMessage = "There was an issue with the authentication server. Please try connecting again.";
          } else if (errorDescription) {
            userMessage = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
          }
          
          toast({
            title: "Connection Failed",
            description: userMessage,
            variant: "destructive",
          });
          
        setTimeout(() => navigate("/app"), 2000);
          return;
        }
        
        // Check for Supabase OAuth tokens in hash (for OAuth providers like Google/YouTube)
        const accessToken = hashParams.get('access_token');
        const providerToken = hashParams.get('provider_token');
        const refreshToken = hashParams.get('refresh_token');
        const expiresAt = hashParams.get('expires_at');
        const expiresIn = hashParams.get('expires_in');
        
        console.log('🎫 Token info:', {
          hasAccessToken: !!accessToken,
          hasProviderToken: !!providerToken,
          hasRefreshToken: !!refreshToken,
          expiresAt,
          expiresIn,
          providerTokenPreview: providerToken ? providerToken.substring(0, 20) + '...' : null
        });
        
        if (accessToken && providerToken) {
          console.log('✅ Processing OAuth tokens for YouTube connection...');
          
          // Get the current user to store the connection
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error('❌ Error getting user:', userError);
            throw userError;
          }
          
          if (user) {
            console.log('👤 Storing YouTube connection for user:', user.id);
            
            // Update profile with Google data if available
            if (user.user_metadata) {
              const { full_name, avatar_url, google_id } = user.user_metadata;
              console.log('📝 Updating profile with Google data:', { full_name, avatar_url, google_id });
              
              const { error: profileError } = await supabase
                .from('profiles')
                .update({
                  full_name: full_name || user.user_metadata.name,
                  avatar_url: avatar_url || user.user_metadata.avatar_url,
                  google_id: google_id || user.user_metadata.sub,
                  terms_accepted_at: new Date().toISOString()
                })
                .eq('id', user.id);
              
              if (profileError) {
                console.warn('⚠️ Failed to update profile with Google data:', profileError);
              } else {
                console.log('✅ Profile updated with Google data');
              }
            }
            
            // Calculate expiration date
            let expirationDate = null;
            if (expiresAt) {
              expirationDate = new Date(parseInt(expiresAt) * 1000).toISOString();
            } else if (expiresIn) {
              expirationDate = new Date(Date.now() + parseInt(expiresIn) * 1000).toISOString();
            }
            
            console.log('💾 Saving token with expiration:', expirationDate);
            console.log('🔑 Provider token length:', providerToken.length);
            
            // Test the token immediately to ensure it works
            const testResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
              headers: {
                'Authorization': `Bearer ${providerToken}`,
                'Accept': 'application/json',
              },
            });
            
            if (!testResponse.ok) {
              console.error('❌ YouTube API test failed:', testResponse.status, testResponse.statusText);
              throw new Error('YouTube token validation failed. The token may not have proper permissions.');
            }
            
            const channelData = await testResponse.json();
            console.log('✅ YouTube API test successful:', channelData);
            
            // Extract channel name from the response
            const channelName = channelData.items?.[0]?.snippet?.title || 'YouTube Channel';
            console.log('📺 YouTube channel name:', channelName);
            
            // Store the YouTube connection in our database with verified token and channel name
            // Use the new dedicated youtube_tokens table for YouTube connections
            const { data, error: dbError } = await supabase
              .from('youtube_tokens')
              .upsert(
                {
                  user_id: user.id,
                  access_token: providerToken, // Store the provider token for YouTube API calls
                  refresh_token: refreshToken || '',
                  expires_at: expirationDate || new Date(Date.now() + 3600000).toISOString(), // Default 1 hour if no expiry
                  channel_name: channelName, // Store the YouTube channel name
                  token_type: 'Bearer',
                  scope: 'https://www.googleapis.com/auth/youtube.upload'
                },
                {
                  onConflict: 'user_id'
                }
              )
              .select()
              .single();

            if (dbError) {
              console.error('❌ Error storing social token:', dbError);
              throw new Error('Failed to save connection: ' + dbError.message);
            }

            console.log('✅ YouTube connection saved successfully:', data);
            
            // Show enhanced success message with welcome credits for new users
            const { data: profile } = await supabase
              .from('profiles')
              .select('welcome_credits_given, credits')
              .eq('id', user.id)
              .single();
            
            const isNewUser = profile?.welcome_credits_given;
            const successMessage = isNewUser 
              ? `Welcome! You've received ${profile?.credits || 10} free credits and connected YouTube.`
              : "Successfully connected your YouTube account with upload permissions.";
            
            toast({
              title: "Success!",
              description: successMessage,
            });
            
            // Clear the URL hash to prevent reprocessing
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Redirect to /app instead of /connect-accounts so user can immediately use their connected account
            console.log('🚀 Redirecting to /app for immediate use');
            setTimeout(() => navigate("/app"), 1000);
          } else {
            console.error('❌ No authenticated user found');
            throw new Error('No authenticated user found');
          }
          return;
        }
        
        // Check for custom OAuth code (for TikTok/Instagram)
        const code = urlParams.get('code');
        if (code) {
          console.log('🔄 Processing custom OAuth callback with code');
          const result = await handleCustomOAuthCallback();
          
          toast({
            title: "Success!",
            description: `Successfully connected your ${result.platform} account.`,
          });
          
          // Redirect to /app for immediate use
          navigate("/app");
          return;
        }
        
        // No OAuth parameters found
        console.log('⚠️ No OAuth parameters found, redirecting to app');
        navigate("/app");
        
      } catch (error) {
        console.error("💥 OAuth callback error:", error);
        
        let errorMessage = "Failed to connect account. Please try again.";
        
        if (error instanceof Error) {
          if (error.message.includes('404') || error.message.includes('NOT_FOUND')) {
            errorMessage = "Authentication service temporarily unavailable. Please try again in a moment.";
          } else {
            errorMessage = error.message;
          }
        }
        
        toast({
          title: "Connection Failed",
          description: errorMessage,
          variant: "destructive",
        });
        
        setTimeout(() => navigate("/app"), 2000);
      } finally {
        setProcessing(false);
      }
    };

    // Use a small delay to ensure the component is fully mounted
    const timer = setTimeout(() => {
      processCallback();
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [navigate, toast]);

  if (processing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Processing Connection
          </h2>
          <p className="text-muted-foreground mb-6">
            Please wait while we process your connection...
          </p>
          
          <Link
            to="/app"
            className="inline-flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Redirecting...
        </h2>
        <p className="text-muted-foreground mb-6">
          Taking you back to your accounts page.
        </p>
        
        <Link
          to="/app"
          className="inline-flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};

export default OAuthCallback;
