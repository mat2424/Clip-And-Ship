import { useState } from "react";
import { VideoPreviewModal } from "./VideoPreviewModal";
import { PublishVideoModal } from "./PublishVideoModal";
import { VideoIdeaItem } from "./VideoIdea/VideoIdeaItem";
import { useVideoIdeas } from "@/hooks/useVideoIdeas";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  caption?: string | null;
  youtube_title?: string | null;
  tiktok_title?: string | null;
  instagram_title?: string | null;
  environment_prompt?: string | null;
  sound_prompt?: string | null;
}
export const VideoIdeasList = () => {
  const {
    videoIdeas,
    loading,
    refetchVideoIdeas
  } = useVideoIdeas();
  const [selectedVideoForPreview, setSelectedVideoForPreview] = useState<VideoIdea | null>(null);
  const [selectedVideoForPublish, setSelectedVideoForPublish] = useState<VideoIdea | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'ready_for_approval': true,
    'approved': true,
    'processing': true,
    'completed': true
  });
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  const categorizeVideos = () => {
    const categories = {
      'ready_for_approval': videoIdeas.filter(v => v.approval_status === 'ready_for_approval'),
      'approved': videoIdeas.filter(v => v.approval_status === 'approved'),
      'processing': videoIdeas.filter(v => v.status === 'processing' || v.status === 'generating'),
      'completed': videoIdeas.filter(v => v.approval_status === 'published' || v.youtube_link || v.instagram_link || v.tiktok_link)
    };
    return categories;
  };
  const getSectionTitle = (section: string, count: number) => {
    const titles = {
      'ready_for_approval': `Ready for Approval (${count})`,
      'approved': `Approved Videos (${count})`,
      'processing': `Processing (${count})`,
      'completed': `Published Videos (${count})`
    };
    return titles[section] || section;
  };
  const getSectionColor = (section: string) => {
    // Use dark background color to match the theme
    return 'bg-cool-charcoal border-cool-charcoal text-white';
  };
  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>;
  }
  const categorizedVideos = categorizeVideos();
  return <>
      <div className="bg-cool-charcoal rounded-lg shadow overflow-hidden">
        <div className="p-4 md:p-6 border-b bg-cool-turquoise bg-gray-50">
          <div className="flex justify-between items-center">
            <h2 className="text-lg md:text-xl font-semibold text-cool-charcoal">Your Videos</h2>
          </div>
        </div>
        <div className="space-y-2 overflow-hidden">
          {videoIdeas.length === 0 ? <div className="p-4 md:p-6 text-center text-gray-500">
              No videos yet. Create your first video above!
            </div> : Object.entries(categorizedVideos).map(([section, videos]) => {
          if (videos.length === 0) return null;
          return <Collapsible key={section} open={expandedSections[section]} onOpenChange={() => toggleSection(section)}>
                  <CollapsibleTrigger asChild>
                    <div className={`p-3 border rounded-lg cursor-pointer hover:bg-opacity-80 transition-colors ${getSectionColor(section)}`}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">
                          {getSectionTitle(section, videos.length)}
                        </h3>
                        {expandedSections[section] ? <ChevronDown className="w-5 h-5 text-white" /> : <ChevronRight className="w-5 h-5 text-white" />}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1">
                    {videos.map(idea => <VideoIdeaItem key={idea.id} idea={idea} onPreviewClick={setSelectedVideoForPreview} onApprovalChange={refetchVideoIdeas} />)}
                  </CollapsibleContent>
                </Collapsible>;
        })}
        </div>
      </div>

      {/* Video Preview Modal */}
      {selectedVideoForPreview && <VideoPreviewModal isOpen={!!selectedVideoForPreview} onClose={() => setSelectedVideoForPreview(null)} videoIdea={selectedVideoForPreview} onApprovalChange={refetchVideoIdeas} />}

      {/* Publish Video Modal */}
      {selectedVideoForPublish && <PublishVideoModal isOpen={!!selectedVideoForPublish} onClose={() => setSelectedVideoForPublish(null)} videoIdea={selectedVideoForPublish} />}
    </>;
};