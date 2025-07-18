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
  const { videoIdeas, loading, refetchVideoIdeas } = useVideoIdeas();
  const [selectedVideoForPreview, setSelectedVideoForPreview] = useState<VideoIdea | null>(null);
  const [selectedVideoForPublish, setSelectedVideoForPublish] = useState<VideoIdea | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'ready_for_approval': true,
    'approved': true,
    'processing': true,
    'completed': true,
    'rejected': false
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
      'completed': videoIdeas.filter(v => v.approval_status === 'published' || (v.youtube_link || v.instagram_link || v.tiktok_link)),
      'rejected': videoIdeas.filter(v => v.approval_status === 'rejected')
    };
    return categories;
  };

  const getSectionTitle = (section: string, count: number) => {
    const titles = {
      'ready_for_approval': `Ready for Approval (${count})`,
      'approved': `Approved Videos (${count})`,
      'processing': `Processing (${count})`,
      'completed': `Published Videos (${count})`,
      'rejected': `Rejected Videos (${count})`
    };
    return titles[section] || section;
  };

  const getSectionColor = (section: string) => {
    const colors = {
      'ready_for_approval': 'bg-yellow-50 border-yellow-200',
      'approved': 'bg-green-50 border-green-200',
      'processing': 'bg-blue-50 border-blue-200',
      'completed': 'bg-purple-50 border-purple-200',
      'rejected': 'bg-red-50 border-red-200'
    };
    return colors[section] || 'bg-gray-50 border-gray-200';
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>;
  }

  const categorizedVideos = categorizeVideos();

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 md:p-6 border-b bg-cool-turquoise">
          <div className="flex justify-between items-center">
            <h2 className="text-lg md:text-xl font-semibold text-cool-charcoal">Your Videos</h2>
            <Button
              size="sm"
              variant="outline"
              className="border-cool-charcoal text-cool-charcoal hover:bg-cool-charcoal hover:text-white"
              onClick={() => {
                // Scroll to the form to create a new video
                const form = document.querySelector('form');
                if (form) {
                  form.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              disabled={videoIdeas.length === 0}
            >
              <Plus className="w-4 h-4 mr-1" />
              Create Video
            </Button>
          </div>
        </div>
        <div className="space-y-2 overflow-hidden">
          {videoIdeas.length === 0 ? (
            <div className="p-4 md:p-6 text-center text-gray-500">
              No videos yet. Create your first video above!
            </div>
          ) : (
            Object.entries(categorizedVideos).map(([section, videos]) => {
              if (videos.length === 0) return null;

              return (
                <Collapsible
                  key={section}
                  open={expandedSections[section]}
                  onOpenChange={() => toggleSection(section)}
                >
                  <CollapsibleTrigger asChild>
                    <div className={`p-3 border rounded-lg cursor-pointer hover:bg-opacity-80 transition-colors ${getSectionColor(section)}`}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800">
                          {getSectionTitle(section, videos.length)}
                        </h3>
                        {expandedSections[section] ? (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1">
                    {videos.map((idea) => (
                      <VideoIdeaItem
                        key={idea.id}
                        idea={idea}
                        onPreviewClick={setSelectedVideoForPreview}
                        onApprovalChange={refetchVideoIdeas}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>
      </div>

      {/* Video Preview Modal */}
      {selectedVideoForPreview && (
        <VideoPreviewModal
          isOpen={!!selectedVideoForPreview}
          onClose={() => setSelectedVideoForPreview(null)}
          videoIdea={selectedVideoForPreview}
          onApprovalChange={refetchVideoIdeas}
        />
      )}

      {/* Publish Video Modal */}
      {selectedVideoForPublish && (
        <PublishVideoModal
          isOpen={!!selectedVideoForPublish}
          onClose={() => setSelectedVideoForPublish(null)}
          videoIdea={selectedVideoForPublish}
        />
      )}
    </>
  );
};
