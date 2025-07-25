
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type SocialToken = Database["public"]["Tables"]["social_tokens"]["Row"];

interface SocialAccountsPayload {
  [platform: string]: {
    access_token: string;
    refresh_token?: string;
    user_id?: string;
  };
}

export const useVideoSubmissionWithTokens = () => {
  const [connectedTokens, setConnectedTokens] = useState<SocialToken[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConnectedTokens();
  }, []);

  const fetchConnectedTokens = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch both social tokens and YouTube tokens
      const [socialTokensResponse, youtubeTokensResponse] = await Promise.all([
        supabase
          .from('social_tokens')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('youtube_tokens')
          .select('*')
          .eq('user_id', user.id)
      ]);

      const socialTokens = socialTokensResponse.data || [];
      const youtubeTokens = youtubeTokensResponse.data || [];

      // Convert YouTube tokens to social token format for compatibility
      const convertedYoutubeTokens = youtubeTokens.map(token => ({
        id: token.id,
        user_id: token.user_id,
        platform: 'youtube' as const,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: token.expires_at,
        username: token.channel_name,
        created_at: token.created_at,
        updated_at: token.updated_at
      }));

      // Combine both token types, excluding YouTube from social_tokens to avoid duplicates
      const filteredSocialTokens = socialTokens.filter(token => token.platform !== 'youtube');
      const allTokens = [...filteredSocialTokens, ...convertedYoutubeTokens];

      setConnectedTokens(allTokens);

      if (socialTokensResponse.error || youtubeTokensResponse.error) {
        console.error('Error fetching social tokens:', socialTokensResponse.error || youtubeTokensResponse.error);
      }
    } catch (error) {
      console.error('Error fetching connected tokens:', error);
    }
  };

  const validatePlatformConnections = (selectedPlatforms: string[]): { valid: boolean; missingPlatforms: string[] } => {
    const connectedPlatforms = connectedTokens.map(token => token.platform);
    const missingPlatforms = selectedPlatforms.filter(platform => 
      !connectedPlatforms.includes(platform.toLowerCase() as any)
    );

    return {
      valid: missingPlatforms.length === 0,
      missingPlatforms
    };
  };

  const buildSocialAccountsPayload = (selectedPlatforms: string[]): SocialAccountsPayload => {
    const socialAccounts: SocialAccountsPayload = {};

    selectedPlatforms.forEach(platform => {
      const token = connectedTokens.find(t => t.platform === platform.toLowerCase());
      if (token) {
        socialAccounts[platform.toLowerCase()] = {
          access_token: token.access_token,
          refresh_token: token.refresh_token || undefined,
        };

        // Add Instagram user_id if available (required for publishing reels)
        if (platform.toLowerCase() === 'instagram' && token.refresh_token) {
          socialAccounts[platform.toLowerCase()].user_id = token.refresh_token; // Using refresh_token field to store user_id
        }
      }
    });

    return socialAccounts;
  };

  const submitVideoWithTokens = async (
    videoIdea: string,
    selectedPlatforms: string[],
    useCustomVoice: boolean,
    voiceFile?: File | null
  ) => {
    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user profile to check tier
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits, subscription_tier')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Validate tier-based platform access
      const premiumPlatforms = ['TikTok', 'Instagram', 'Facebook', 'X', 'LinkedIn'];
      const selectedPremiumPlatforms = selectedPlatforms.filter(platform => 
        premiumPlatforms.includes(platform)
      );

      if (selectedPremiumPlatforms.length > 0 && profile.subscription_tier === 'free') {
        toast({
          title: "Premium Feature Required",
          description: `${selectedPremiumPlatforms.join(', ')} require${selectedPremiumPlatforms.length === 1 ? 's' : ''} a premium subscription. Please upgrade your account.`,
          variant: "destructive",
        });
        return false;
      }

      // Validate platform connections
      const validation = validatePlatformConnections(selectedPlatforms);
      if (!validation.valid) {
        toast({
          title: "Missing Platform Connections",
          description: `Please connect your ${validation.missingPlatforms.join(', ')} account(s) before submitting.`,
          variant: "destructive",
        });
        return false;
      }

      // Check credits
      if (profile.credits < 1) {
        toast({
          title: "Insufficient Credits",
          description: "You need at least 1 credit to generate a video. Please purchase credits.",
          variant: "destructive",
        });
        return false;
      }

      // Handle voice file upload if needed
      let voiceFileUrl = null;
      if (useCustomVoice && voiceFile) {
        const fileExt = voiceFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error } = await supabase.storage
          .from('voice-files')
          .upload(fileName, voiceFile);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('voice-files')
          .getPublicUrl(fileName);

        voiceFileUrl = publicUrl;
      }

      // Build social accounts payload
      const socialAccounts = buildSocialAccountsPayload(selectedPlatforms);

      // Call the new submit-video edge function
      const { data: response, error: submitError } = await supabase.functions.invoke('submit-video', {
        body: {
          video_idea: videoIdea,
          upload_targets: selectedPlatforms.map(p => p.toLowerCase()),
          social_accounts: socialAccounts,
          use_ai_voice: !useCustomVoice,
          voice_file_url: voiceFileUrl
        }
      });

      if (submitError) {
        throw new Error(submitError.message || "Failed to submit video for generation");
      }

      // Create video idea record
      const { data: videoIdeaRecord, error: dbError } = await supabase
        .from('video_ideas')
        .insert({
          user_id: user.id,
          idea_text: videoIdea,
          use_ai_voice: !useCustomVoice,
          voice_file_url: voiceFileUrl,
          selected_platforms: selectedPlatforms,
          status: 'processing',
          approval_status: 'pending'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Deduct credit
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: profile.credits - 1 })
        .eq('id', user.id);

      if (creditError) throw creditError;

      // Record credit transaction
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          amount: -1,
          transaction_type: 'usage',
          description: 'Video generation with social media integration'
        });

      toast({
        title: "Video Submitted Successfully!",
        description: "Your video is being generated with social media integration. You'll be notified when it's ready for review.",
      });

      return true;
    } catch (error: any) {
      console.error('Error submitting video:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit video. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    connectedTokens,
    loading,
    validatePlatformConnections,
    submitVideoWithTokens,
    refreshTokens: fetchConnectedTokens
  };
};
