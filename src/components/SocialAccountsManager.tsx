
import { useState, useEffect } from "react";
import { SocialPlatformButton } from "./SocialPlatformButton";
import { ConnectedAccountCard } from "./ConnectedAccountCard";
import { useSocialTokens } from "@/hooks/useSocialTokens";
import { initiateOAuth } from "@/utils/oauthUtils";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

type SocialPlatform = Database["public"]["Enums"]["social_platform"];

const platforms: { platform: SocialPlatform; name: string; color: string; icon: string; locked?: boolean; customFlow?: boolean; tier?: string }[] = [
  { platform: "youtube", name: "YouTube", color: "bg-red-600 hover:bg-red-700", icon: "/lovable-uploads/cd7cb743-01ad-4a0d-a56b-f5e956d0f595.png", tier: "free" },
  { platform: "tiktok", name: "TikTok", color: "bg-black hover:bg-gray-800", icon: "/lovable-uploads/bab6eff1-1fa1-4a04-b442-3d1c40472cef.png", customFlow: true, tier: "pro" },
  { platform: "instagram", name: "Instagram", color: "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600", icon: "/lovable-uploads/ddef2800-d5db-4e6d-8e87-e8d228c761a1.png", customFlow: true, tier: "pro" },
  { platform: "facebook", name: "Facebook", color: "bg-blue-600 hover:bg-blue-700", icon: "/lovable-uploads/60a3a2a1-4e39-46b3-8d72-382997a7b692.png", locked: true, tier: "premium" },
  { platform: "x", name: "X (Twitter)", color: "bg-gray-900 hover:bg-black", icon: "/lovable-uploads/e602472a-fd56-45af-9504-e325e09c74f3.png", locked: true, tier: "premium" },
  { platform: "linkedin", name: "LinkedIn", color: "bg-blue-700 hover:bg-blue-800", icon: "/lovable-uploads/34be507c-e645-4c1e-bbb1-b9a922babca0.png", locked: true, tier: "premium" },
];

export const SocialAccountsManager = () => {
  const { connectedAccounts, loading, refreshAccounts, disconnectAccount } = useSocialTokens();
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<string>('free');
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

  const handleConnect = async (platform: SocialPlatform) => {
    const platformConfig = platforms.find(p => p.platform === platform);
    
    console.log(`🎯 User clicked connect for: ${platform}`);
    
    // Check if platform requires pro tier
    if (platformConfig?.tier === 'pro' && (userTier === 'free' || userTier === 'premium')) {
      console.log(`🔒 Platform ${platform} requires pro tier`);
      toast({
        title: "Pro Feature",
        description: `${platformConfig.name} is a pro feature. Upgrade your account to connect this platform.`,
        variant: "destructive",
      });
      return;
    }
    
    if (platformConfig?.locked) {
      console.log(`🔒 Platform ${platform} is locked`);
      toast({
        title: "Coming Soon",
        description: `${platformConfig.name} integration is coming soon! Stay tuned for updates.`,
        variant: "default",
      });
      return;
    }

    setIsConnecting(platform);
    
    try {
      console.log(`🚀 Initiating OAuth for ${platform}`);
      await initiateOAuth(platform);
      
      toast({
        title: "Connecting...",
        description: `Redirecting to ${platformConfig?.name} for authorization...`,
      });
      
    } catch (error) {
      console.error(`💥 Error connecting to ${platform}:`, error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : `Failed to connect to ${platform}. Please try again.`,
        variant: "destructive",
      });
      setIsConnecting(null);
    }
  };

  const isConnected = (platform: SocialPlatform) => {
    const connected = connectedAccounts.some(account => account.platform === platform);
    console.log(`🔍 Checking if ${platform} is connected:`, connected);
    return connected;
  };

  console.log('📊 Current connected accounts:', connectedAccounts);

  return (
    <div className="space-y-6">
      {/* Configuration Notice for TikTok/Instagram */}
      <div className="bg-cool-gray/20 border border-cool-gray rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-cool-charcoal mb-2">Setup Required for TikTok & Instagram</h3>
        <div className="text-sm text-cool-charcoal/80 space-y-2">
          <p><strong>TikTok:</strong> Update your TikTok client key in the code and add <code>https://video-spark-publish.vercel.app/oauth-callback</code> as a redirect URI in your TikTok developer portal.</p>
          <p><strong>Instagram:</strong> Update your Instagram client ID in the code and configure the redirect URI in your Facebook Developer portal.</p>
        </div>
      </div>

      {/* Available Platforms */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 justify-items-center">
        {platforms.map((platformConfig) => (
          <SocialPlatformButton
            key={platformConfig.platform}
            platform={platformConfig.platform}
            name={platformConfig.name}
            color={platformConfig.color}
            icon={platformConfig.icon}
            isConnected={isConnected(platformConfig.platform)}
            isConnecting={isConnecting === platformConfig.platform}
            isLocked={platformConfig.locked}
            isPremiumRequired={platformConfig.tier === 'pro' && (userTier === 'free' || userTier === 'premium')}
            onConnect={() => handleConnect(platformConfig.platform)}
          />
        ))}
      </div>

      {/* Connected Accounts */}
      {connectedAccounts.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-cool-charcoal mb-4">Connected Accounts</h3>
          <div className="space-y-3">
            {connectedAccounts.map((account) => {
              const platformConfig = platforms.find(p => p.platform === account.platform);
              return (
                <ConnectedAccountCard
                  key={account.id}
                  account={account}
                  platformName={platformConfig?.name || account.platform}
                  onDisconnect={() => disconnectAccount(account.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {connectedAccounts.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-cool-charcoal/70">No accounts connected yet. Start by connecting your first social media account above.</p>
        </div>
      )}
    </div>
  );
};
