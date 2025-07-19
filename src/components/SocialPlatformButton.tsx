
import { Lock, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Database } from "@/integrations/supabase/types";

type SocialPlatform = Database["public"]["Enums"]["social_platform"];

interface SocialPlatformButtonProps {
  platform: SocialPlatform;
  name: string;
  color: string;
  icon: string;
  isConnected: boolean;
  isConnecting: boolean;
  isLocked?: boolean;
  isPremiumRequired?: boolean;
  onConnect: () => void;
}

export const SocialPlatformButton = ({
  platform,
  name,
  color,
  icon,
  isConnected,
  isConnecting,
  isLocked,
  isPremiumRequired,
  onConnect
}: SocialPlatformButtonProps) => {
  const isImageIcon = icon.startsWith('/lovable-uploads/') || icon.startsWith('http');
  
  // Determine badge type and styling
  const getBadgeConfig = () => {
    if (isLocked) {
      return { show: true, text: "Coming Soon", bgColor: "bg-muted", textColor: "text-muted-foreground" };
    }
    if (isPremiumRequired) {
      // Check if it's pro tier (based on platform)
      const proTierPlatforms = ['x', 'tiktok', 'linkedin'];
      const isPro = proTierPlatforms.includes(platform);
      return {
        show: true,
        text: isPro ? "Pro" : "Premium",
        bgColor: isPro ? "bg-purple-600" : "bg-blue-600",
        textColor: "text-white"
      };
    }
    return { show: false };
  };

  const badgeConfig = getBadgeConfig();

  const getButtonState = () => {
    if (isConnected) {
      return {
        disabled: false,
        variant: "default" as const,
        className: "w-full h-20 bg-green-50 hover:bg-green-100 border-green-200 text-green-800 transition-all duration-200 p-3"
      };
    }
    
    if (isConnecting) {
      return {
        disabled: true,
        variant: "outline" as const,
        className: "w-full h-20 bg-card hover:bg-accent transition-all duration-200 p-3 opacity-75"
      };
    }
    
    if (isPremiumRequired || isLocked) {
      return {
        disabled: true,
        variant: "outline" as const,
        className: "w-full h-20 bg-muted hover:bg-muted transition-all duration-200 p-3 opacity-60"
      };
    }
    
    return {
      disabled: false,
      variant: "outline" as const,
      className: "w-full h-20 bg-card hover:bg-accent transition-all duration-200 p-3"
    };
  };

  const buttonState = getButtonState();

  return (
    <div className="relative w-full">
      <Button 
        onClick={onConnect} 
        disabled={buttonState.disabled}
        variant={buttonState.variant}
        className={buttonState.className}
      >
        <div className="flex flex-col items-center justify-center space-y-2 w-full h-full">
          {/* Icon Section */}
          <div className="flex-shrink-0">
            {isConnecting ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            ) : isConnected ? (
              <div className="relative">
                {isImageIcon ? (
                  <img src={icon} alt={name} className="w-8 h-8 object-contain" />
                ) : (
                  <div className="w-8 h-8 flex items-center justify-center bg-muted rounded-full">
                    <span className="text-lg font-bold text-muted-foreground">
                      {icon === 'facebook' ? 'f' : icon === 'x' ? 'X' : 'in'}
                    </span>
                  </div>
                )}
                <CheckCircle className="w-4 h-4 text-green-600 absolute -top-1 -right-1 bg-white rounded-full" />
              </div>
            ) : isImageIcon ? (
              <img src={icon} alt={name} className="w-8 h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 flex items-center justify-center bg-muted rounded-full">
                <span className="text-lg font-bold text-muted-foreground">
                  {icon === 'facebook' ? 'f' : icon === 'x' ? 'X' : 'in'}
                </span>
              </div>
            )}
          </div>
          
          {/* Text Section */}
          <div className="text-center min-h-[2rem] flex items-center">
            <span className="text-xs font-medium leading-tight">
              {isConnected ? (
                <span className="text-green-700 font-semibold">✓ Connected</span>
              ) : isConnecting ? (
                <span className="text-blue-600">Connecting...</span>
              ) : isPremiumRequired || isLocked ? (
                <span className="text-muted-foreground">{name}</span>
              ) : (
                <span className="text-foreground">Connect {name}</span>
              )}
            </span>
          </div>
        </div>
      </Button>
      
      {/* Badge - Clean positioning */}
      {badgeConfig.show && (
        <div className="absolute -top-1 -right-1 z-10">
          <div className={`flex items-center space-x-1 ${badgeConfig.bgColor} ${badgeConfig.textColor} text-xs px-2 py-1 rounded-full font-medium shadow-md`}>
            {isLocked && <Lock className="w-3 h-3" />}
            <span>{badgeConfig.text}</span>
          </div>
        </div>
      )}
    </div>
  );
};
