
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SocialPlatformButton } from "./SocialPlatformButton";
import { useSocialTokens } from "@/hooks/useSocialTokens";
import { initiateOAuth } from "@/utils/oauthUtils";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Info } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type SocialPlatform = Database["public"]["Enums"]["social_platform"];

const PLATFORM_CONFIG = [
  {
    platform: "youtube" as SocialPlatform,
    name: "YouTube",
    color: "#FF0000",
    icon: "/lovable-uploads/cd7cb743-01ad-4a0d-a56b-f5e956d0f595.png",
    tier: "free"
  },
  {
    platform: "instagram" as SocialPlatform,
    name: "Instagram",
    color: "#E4405F",
    icon: "/lovable-uploads/ddef2800-d5db-4e6d-8e87-e8d228c761a1.png",
    tier: "premium"
  },
  {
    platform: "facebook" as SocialPlatform,
    name: "Facebook",
    color: "#1877F2",
    icon: "/lovable-uploads/60a3a2a1-4e39-46b3-8d72-382997a7b692.png",
    tier: "premium"
  },
  {
    platform: "x" as SocialPlatform,
    name: "X (Twitter)",
    color: "#000000",
    icon: "/lovable-uploads/e602472a-fd56-45af-9504-e325e09c74f3.png",
    tier: "pro"
  },
  {
    platform: "linkedin" as SocialPlatform,
    name: "LinkedIn",
    color: "#0077B5",
    icon: "/lovable-uploads/34be507c-e645-4c1e-bbb1-b9a922babca0.png",
    tier: "pro"
  },
  {
    platform: "tiktok" as SocialPlatform,
    name: "TikTok",
    color: "#000000",
    icon: "/lovable-uploads/bab6eff1-1fa1-4a04-b442-3d1c40472cef.png",
    tier: "pro"
  }
];

export const SocialConnections = () => {
  const [userTier, setUserTier] = useState<string>('free');
  const [connectingPlatforms, setConnectingPlatforms] = useState<Set<string>>(new Set());
  const { connectedAccounts, loading, refreshAccounts } = useSocialTokens();
  const { toast } = useToast();

  useEffect(() => {
    fetchUserTier();
  }, []);

  const fetchUserTier = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserTier(profile.subscription_tier);
      }
    } catch (error) {
      console.error('Error fetching user tier:', error);
    }
  };

  const canAccessPlatform = (tier: string) => {
    if (tier === "free") return true;
    if (tier === "premium") return userTier === "premium" || userTier === "pro";
    if (tier === "pro") return userTier === "pro";
    return false;
  };

  const isConnected = (platform: SocialPlatform) => {
    return connectedAccounts.some(account => account.platform === platform);
  };

  const handleConnect = async (platform: SocialPlatform) => {
    try {
      setConnectingPlatforms(prev => new Set(prev.add(platform)));
      
      await initiateOAuth(platform);
      
      toast({
        title: "Connecting to " + PLATFORM_CONFIG.find(p => p.platform === platform)?.name,
        description: "Please complete the authorization process in the popup window.",
      });

      // Refresh accounts after a delay to check for new connections
      setTimeout(() => {
        refreshAccounts(true);
        setConnectingPlatforms(prev => {
          const newSet = new Set(prev);
          newSet.delete(platform);
          return newSet;
        });
      }, 3000);

    } catch (error: any) {
      console.error('Error connecting platform:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to the platform. Please try again.",
        variant: "destructive",
      });
      
      setConnectingPlatforms(prev => {
        const newSet = new Set(prev);
        newSet.delete(platform);
        return newSet;
      });
    }
  };

  const handleDisconnect = async (platform: SocialPlatform) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find the account to disconnect
      const accountToDisconnect = connectedAccounts.find(acc => acc.platform === platform);
      if (!accountToDisconnect) {
        toast({
          title: "Error",
          description: "Account not found.",
          variant: "destructive",
        });
        return;
      }

      // Immediate UI feedback - remove from list
      const updatedAccounts = connectedAccounts.filter(acc => acc.platform !== platform);
      
      // For YouTube, delete from youtube_tokens table
      if (platform === 'youtube') {
        const { error } = await supabase
          .from('youtube_tokens')
          .delete()
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // For other platforms, delete from social_tokens table
        const { error } = await supabase
          .from('social_tokens')
          .delete()
          .eq('id', accountToDisconnect.id);

        if (error) throw error;
      }

      toast({
        title: "Disconnected",
        description: `Successfully disconnected from ${PLATFORM_CONFIG.find(p => p.platform === platform)?.name}.`,
      });

      // Force refresh to ensure data consistency
      refreshAccounts(true);

    } catch (error: any) {
      console.error('Error disconnecting platform:', error);
      toast({
        title: "Disconnection Failed",
        description: error.message || "Failed to disconnect from the platform. Please try again.",
        variant: "destructive",
      });
      // Force refresh in case of error to restore accurate state
      refreshAccounts(true);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Social Media Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading connections...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Media Connections</CardTitle>
        <p className="text-sm text-muted-foreground">
          Connect your social media accounts to publish videos directly to your platforms.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-6">
          <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> User must be logged in and have a valid YouTube account linked before proceeding.
            </AlertDescription>
          </Alert>
          
          <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Notice:</strong> When connecting accounts, your browser may show an "unsafe app" warning. This is normal for apps in development. Click "Advanced" and proceed to continue the authentication process.
            </AlertDescription>
          </Alert>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORM_CONFIG.map((platform) => {
            const hasAccess = canAccessPlatform(platform.tier);
            const connected = isConnected(platform.platform);
            const connecting = connectingPlatforms.has(platform.platform);
            
            return (
              <SocialPlatformButton
                key={platform.platform}
                platform={platform.platform}
                name={platform.name}
                color={platform.color}
                icon={platform.icon}
                isConnected={connected}
                isConnecting={connecting}
                isLocked={!hasAccess}
                isPremiumRequired={!hasAccess}
                onConnect={() => handleConnect(platform.platform)}
                onDisconnect={() => handleDisconnect(platform.platform)}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
