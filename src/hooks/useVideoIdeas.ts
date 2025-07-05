
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface VideoIdea {
  id: string;
  idea_text: string;
  selected_platforms: string[];
  status: string;
  approval_status: string;
  video_url: string | null;
  preview_video_url: string | null;
  youtube_link: string | null;
  instagram_link: string | null;
  tiktok_link: string | null;
  rejected_reason: string | null;
  created_at: string;
  caption: string | null;
  youtube_title: string | null;
  tiktok_title: string | null;
  instagram_title: string | null;
  environment_prompt: string | null;
  sound_prompt: string | null;
}

export const useVideoIdeas = () => {
  const [videoIdeas, setVideoIdeas] = useState<VideoIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [previousVideoIdeas, setPreviousVideoIdeas] = useState<VideoIdea[]>([]);

  const fetchVideoIdeas = async () => {
    try {
      const { data, error } = await supabase
        .from('video_ideas')
        .select(`
          id, 
          idea_text, 
          selected_platforms, 
          status, 
          approval_status, 
          video_url, 
          preview_video_url, 
          youtube_link, 
          instagram_link, 
          tiktok_link, 
          rejected_reason, 
          created_at,
          caption,
          youtube_title,
          tiktok_title,
          instagram_title,
          environment_prompt,
          sound_prompt
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const newVideoIdeas = data || [];
      
      // Check for newly completed videos and show success toast
      if (previousVideoIdeas.length > 0) {
        newVideoIdeas.forEach(newVideo => {
          const oldVideo = previousVideoIdeas.find(v => v.id === newVideo.id);
          if (oldVideo && 
              oldVideo.status !== 'completed' && 
              newVideo.status === 'completed' && 
              newVideo.video_url) {
            // Import toast dynamically to avoid circular dependency
            import("@/hooks/use-toast").then(({ toast }) => {
              toast({
                title: "🎉 Video Ready!",
                description: `Your video "${newVideo.idea_text.substring(0, 50)}..." has been generated successfully!`,
              });
            });
          }
        });
      }
      
      setPreviousVideoIdeas([...newVideoIdeas]);
      setVideoIdeas(newVideoIdeas);
    } catch (error) {
      console.error('Error fetching video ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideoIdeas();

    // Subscribe to video ideas changes for real-time updates
    const channel = supabase.channel('video-ideas-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'video_ideas'
    }, () => fetchVideoIdeas()).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    videoIdeas,
    loading,
    refetchVideoIdeas: fetchVideoIdeas
  };
};
