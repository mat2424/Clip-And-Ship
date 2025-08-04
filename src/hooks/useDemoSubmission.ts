import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DemoSubmissionData {
  title: string;
  caption: string;
  videoUrl: string;
}

export const useDemoSubmission = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const submitVideo = async (data: DemoSubmissionData) => {
    setLoading(true);
    
    try {
      // Check if YouTube is connected (demo or real)
      const demoConnection = sessionStorage.getItem('demo_youtube_connected');
      const { data: { user } } = await supabase.auth.getUser();
      
      let hasYouTubeConnection = demoConnection === 'true';
      
      if (!hasYouTubeConnection && user) {
        const { data: tokens } = await supabase
          .from('youtube_tokens')
          .select('expires_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (tokens) {
          const expiresAt = new Date(tokens.expires_at);
          hasYouTubeConnection = expiresAt > new Date();
        }
      }

      if (!hasYouTubeConnection) {
        throw new Error('YouTube account not connected');
      }

      // Submit to demo video edge function (always uses AI voice)
      const { data: response, error } = await supabase.functions.invoke('submit-demo-video', {
        body: {
          title: data.title,
          caption: data.caption,
          video_url: data.videoUrl,
          use_ai_voice: true,
          is_demo: true,
        }
      });

      if (error) {
        console.error('Demo submission error:', error);
        throw new Error(error.message || 'Failed to submit demo video');
      }

      console.log('Demo video submitted successfully:', response);

      toast({
        title: "Success!",
        description: "Your demo video has been submitted for processing and will be uploaded to YouTube.",
      });

      return response;

    } catch (error) {
      console.error('Demo submission failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Submission Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    submitVideo,
    loading,
  };
};