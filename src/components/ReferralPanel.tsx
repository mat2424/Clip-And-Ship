import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Share2, Users, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ReferralMeter } from "./ReferralMeter";

interface ReferralData {
  referral_code: string;
  referral_count: number;
  referral_progress: number;
  credits: number;
}

export const ReferralPanel = () => {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const fetchReferralData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('referral_code, referral_count, referral_progress, credits')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (profile) {
        setReferralData({
          referral_code: profile.referral_code || '',
          referral_count: profile.referral_count || 0,
          referral_progress: profile.referral_progress || 0,
          credits: profile.credits || 0
        });
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
      toast({
        title: "Error",
        description: "Failed to load referral data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = async () => {
    if (referralData?.referral_code) return; // Already has code
    
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-referral-code');
      
      if (error) throw error;
      
      if (data?.referral_code) {
        setReferralData(prev => prev ? { ...prev, referral_code: data.referral_code } : null);
        toast({
          title: "Success!",
          description: "Your referral code has been generated"
        });
      }
    } catch (error) {
      console.error('Error generating referral code:', error);
      toast({
        title: "Error",
        description: "Failed to generate referral code",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchReferralData();

    // Set up real-time subscription for referral updates
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('referral-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          },
          () => {
            fetchReferralData(); // Refresh data when profile updates
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, []);

  const generateReferralLink = () => {
    if (!referralData?.referral_code) return '';
    return `${window.location.origin}?ref=${referralData.referral_code}`;
  };

  const copyReferralLink = async () => {
    const link = generateReferralLink();
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard"
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive"
      });
    }
  };

  const shareReferralLink = async () => {
    const link = generateReferralLink();
    if (!link) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Clip & Ship AI',
          text: 'Create amazing videos with AI! Get 10 free credits when you sign up.',
          url: link
        });
      } catch (error) {
        // User cancelled or error occurred
        copyReferralLink(); // Fallback to copy
      }
    } else {
      copyReferralLink(); // Fallback for browsers without Web Share API
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Refer & Earn</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!referralData?.referral_code) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Refer & Earn</span>
          </CardTitle>
          <CardDescription>
            Earn 3 credits for each friend who joins!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={generateReferralCode} 
            disabled={generating}
            className="w-full"
          >
            {generating ? "Generating..." : "Create Referral Link"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const referralLink = generateReferralLink();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Refer & Earn</span>
          </div>
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Gift className="w-3 h-3" />
            <span>+3 credits</span>
          </Badge>
        </CardTitle>
        <CardDescription>
          Share your link and earn credits when friends sign up!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Referral Progress */}
        <ReferralMeter 
          progress={referralData.referral_progress}
          count={referralData.referral_count}
        />

        {/* Referral Link */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Referral Link</label>
          <div className="flex space-x-2">
            <Input 
              value={referralLink} 
              readOnly 
              className="flex-1 text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={copyReferralLink}
              className="px-3"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Share Button */}
        <Button 
          onClick={shareReferralLink}
          className="w-full"
          variant="default"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share Link
        </Button>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{referralData.referral_count}</div>
            <div className="text-xs text-muted-foreground">Successful Referrals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{referralData.referral_count * 3}</div>
            <div className="text-xs text-muted-foreground">Credits Earned</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};