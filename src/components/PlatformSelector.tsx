
import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PLATFORMS = [{
  name: "YouTube",
  tier: "free"
}, {
  name: "Instagram",
  tier: "premium"
}, {
  name: "Facebook", 
  tier: "premium"
}, {
  name: "Threads",
  tier: "premium"
}, {
  name: "X",
  tier: "pro"
}, {
  name: "LinkedIn",
  tier: "pro"
}, {
  name: "TikTok",
  tier: "pro"
}];

interface PlatformSelectorProps {
  selectedPlatforms: string[];
  onPlatformChange: (platforms: string[]) => void;
  userTier: string;
}

export const PlatformSelector = ({
  selectedPlatforms,
  onPlatformChange,
  userTier
}: PlatformSelectorProps) => {
  const { toast } = useToast();

  // Auto-select YouTube for free users if no platforms are selected
  React.useEffect(() => {
    if (userTier === 'free' && selectedPlatforms.length === 0) {
      onPlatformChange(['YouTube']);
    }
  }, [userTier, selectedPlatforms.length, onPlatformChange]);

  const canSelectPlatform = (platform: { name: string; tier: string }) => {
    if (platform.tier === "free") return true;
    if (platform.tier === "premium") return userTier === "premium" || userTier === "pro";
    if (platform.tier === "pro") return userTier === "pro";
    return false;
  };

  const handlePlatformChange = (platform: string, checked: boolean) => {
    const platformData = PLATFORMS.find(p => p.name === platform);
    
    if (checked && platformData && !canSelectPlatform(platformData)) {
      toast({
        title: "Premium Feature",
        description: `${platform} is available for premium users only. Upgrade your account to access this platform.`,
        variant: "destructive"
      });
      return;
    }

    if (checked) {
      onPlatformChange([...selectedPlatforms, platform]);
    } else {
      onPlatformChange(selectedPlatforms.filter(p => p !== platform));
    }
  };

  return (
    <div>
      <Label>Select Platforms (Optional)</Label>
      <p className="text-sm text-cool-gray mt-1 mb-2">Choose platforms to publish to, or leave empty to generate video only</p>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {PLATFORMS.map(platform => {
          const isLocked = !canSelectPlatform(platform);
          return (
            <div key={platform.name} className="flex items-center space-x-2 min-w-0">
              <Checkbox 
                id={platform.name} 
                checked={selectedPlatforms.includes(platform.name)} 
                onCheckedChange={checked => handlePlatformChange(platform.name, checked as boolean)} 
                disabled={isLocked} 
                className="flex-shrink-0"
              />
              <div className="flex flex-col min-w-0 flex-1">
                <Label 
                  htmlFor={platform.name} 
                  className={`flex items-center space-x-1 min-w-0 ${isLocked ? 'text-gray-400' : ''}`}
                >
                  <span className="text-white text-lg truncate">{platform.name}</span>
                  {isLocked && <Lock className="h-3 w-3 flex-shrink-0" />}
                </Label>
                 {isLocked && (
                   <span className="text-xs text-orange-600 font-medium self-start">
                     {PLATFORMS.find(p => p.name === platform.name)?.tier === "pro" ? "Pro" : "Premium"}
                   </span>
                 )}
              </div>
            </div>
          );
        })}
      </div>
      {userTier === 'free' && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-600">
            <strong>Upgrade to Premium</strong> to unlock Instagram, Facebook, and Threads platforms for wider reach!
          </p>
        </div>
      )}
      {userTier === 'premium' && (
        <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-md">
          <p className="text-sm text-blue-600">
            <strong>Upgrade to Pro</strong> to unlock X, TikTok, and LinkedIn platforms for maximum reach!
          </p>
        </div>
      )}
    </div>
  );
};
