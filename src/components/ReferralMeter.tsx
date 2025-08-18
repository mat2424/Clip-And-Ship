import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

interface ReferralMeterProps {
  progress: number;
  count: number;
  maxProgress?: number;
}

export const ReferralMeter = ({ progress, count, maxProgress = 10 }: ReferralMeterProps) => {
  const percentage = (progress / maxProgress) * 100;
  const isComplete = progress >= maxProgress;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Referral Progress</span>
        </div>
        <Badge variant={isComplete ? "default" : "secondary"} className="text-xs">
          {progress}/{maxProgress}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <Progress value={percentage} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{count} successful referrals</span>
          <span>{maxProgress - progress} more to milestone</span>
        </div>
      </div>
      
      {isComplete && (
        <div className="text-xs text-center text-primary font-medium animate-pulse">
          🎉 Milestone reached! Keep referring to earn more!
        </div>
      )}
    </div>
  );
};