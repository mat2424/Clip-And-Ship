
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SocialPlatformButton } from "./SocialPlatformButton";
import { useSocialTokens } from "@/hooks/useSocialTokens";
import { initiateOAuth } from "@/utils/oauthUtils";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
              />
            );
          })}
        </div>

        {/* Upgrade Prompts */}
        {userTier === 'free' && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Upgrade Your Account</h3>
            <p className="text-sm text-blue-700 mb-3">
              <strong>Premium:</strong> Unlock Instagram, Facebook, and Threads for broader reach<br/>
              <strong>Pro:</strong> Get access to all platforms including X, LinkedIn, and TikTok
            </p>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
                Upgrade to Premium
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 transition-colors">
                Upgrade to Pro
              </button>
            </div>
          </div>
        )}

        {userTier === 'premium' && (
          <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-2">Unlock All Platforms</h3>
            <p className="text-sm text-purple-700 mb-3">
              <strong>Upgrade to Pro</strong> to access X, LinkedIn, and TikTok for maximum reach across all major platforms.
            </p>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 transition-colors">
              Upgrade to Pro
            </button>
          </div>
        )}

        {userTier === 'pro' && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">🎉 Pro Account Active</h3>
            <p className="text-sm text-green-700">
              You have access to all social media platforms. Connect your accounts to start publishing!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
