
import { useState } from "react";
import { ExternalLink, Eye, Upload, Check, X, PlayCircle, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoIdeaStatusBadge } from "./VideoIdeaStatusBadge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExpandableCaption } from "@/components/ExpandableCaption";
import { UserPlanDisplay } from "@/components/UserPlanDisplay";
import { useSocialTokens } from "@/hooks/useSocialTokens";

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
  upload_status?: { [platform: string]: string } | null;
  upload_progress?: { [platform: string]: number } | null;
  upload_errors?: { [platform: string]: string } | null;
}

interface VideoIdeaItemProps {
  idea: VideoIdea;
  onPreviewClick: (idea: VideoIdea) => void;
  onApprovalChange: () => void;
}

const getPlatformLinks = (idea: VideoIdea) => {
  const links = [];
  if (idea.youtube_link) links.push({ platform: 'YouTube', url: idea.youtube_link });
  if (idea.instagram_link) links.push({ platform: 'Instagram', url: idea.instagram_link });
  if (idea.tiktok_link) links.push({ platform: 'TikTok', url: idea.tiktok_link });
  return links;
};

const getStatusDisplay = (idea: VideoIdea) => {
  if (idea.status === 'pending') return 'Generating...';
  if (idea.approval_status === 'ready_for_approval') return 'Completed';
  if (idea.approval_status === 'approved' || idea.status === 'publishing') return 'Publishing...';
  if (idea.approval_status === 'published') return 'Published';
  if (idea.approval_status === 'rejected') return 'Rejected';
  return 'Processing...';
};

const shouldShowPublishButton = (idea: VideoIdea) => {
  return idea.approval_status === 'ready_for_approval' && idea.video_url;
};

const shouldShowInlineApproval = (idea: VideoIdea) => {
  return idea.approval_status === 'ready_for_approval' && idea.video_url;
};

export const VideoIdeaItem = ({ idea, onPreviewClick, onApprovalChange }: VideoIdeaItemProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(idea.idea_text);
  const { toast } = useToast();
  const { connectedAccounts } = useSocialTokens();

  const videoUrl = idea.video_url || idea.preview_video_url;

  const handleApprove = async () => {
    // Check if user has connected at least one social account
    if (connectedAccounts.length === 0) {
      toast({
        title: "No Social Accounts Connected",
        description: "Please connect at least one social media account before approving videos.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Build social accounts object with OAuth tokens
      const socialAccounts: Record<string, any> = {};
      idea.selected_platforms.forEach(platform => {
        const token = connectedAccounts.find(t => t.platform === platform.toLowerCase());
        if (token) {
          socialAccounts[platform.toLowerCase()] = {
            access_token: token.access_token,
            refresh_token: token.refresh_token,
            expires_at: token.expires_at
          };
        }
      });

      console.log('Sending approval with social accounts:', socialAccounts);

      const { error } = await supabase.functions.invoke('approve-video', {
        body: {
          video_idea_id: idea.id,
          approved: true,
          social_accounts: socialAccounts,
          selected_platforms: idea.selected_platforms
        }
      });

      if (error) throw error;

      toast({
        title: "Video Approved!",
        description: "Your video is now being published to your selected platforms.",
      });

      onApprovalChange();
    } catch (error) {
      console.error('Error approving video:', error);
      toast({
        title: "Error",
        description: "Failed to approve video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('approve-video', {
        body: {
          video_idea_id: idea.id,
          approved: false,
          rejection_reason: rejectionReason || "Not satisfied with the result",
          selected_platforms: idea.selected_platforms
        }
      });

      if (error) throw error;

      toast({
        title: "Video Rejected",
        description: "The video has been rejected and will not be published.",
      });

      onApprovalChange();
      setShowRejectInput(false);
      setRejectionReason("");
    } catch (error) {
      console.error('Error rejecting video:', error);
      toast({
        title: "Error",
        description: "Failed to reject video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTitleEdit = async () => {
    if (!isEditingTitle) {
      setIsEditingTitle(true);
      return;
    }

    // Save the edited title
    try {
      const { error } = await supabase
        .from('video_ideas')
        .update({ idea_text: editedTitle })
        .eq('id', idea.id);

      if (error) throw error;

      toast({
        title: "Title Updated",
        description: "Video title has been updated successfully.",
      });

      setIsEditingTitle(false);
      onApprovalChange(); // Refresh the list
    } catch (error) {
      console.error('Error updating title:', error);
      toast({
        title: "Error",
        description: "Failed to update title. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTitleCancel = () => {
    setEditedTitle(idea.idea_text);
    setIsEditingTitle(false);
  };

  return (
    <div className="p-6 md:p-8 bg-cool-turquoise overflow-hidden border-b border-cool-gray/20">
      {/* Plan Display and Status Header */}
      <div className="flex justify-between items-center mb-4">
        <UserPlanDisplay />
        <div className="flex gap-2 items-center flex-shrink-0">
          <span className="text-xs md:text-sm px-2 py-1 rounded-full bg-blue-100 text-blue-800 whitespace-nowrap">
            {getStatusDisplay(idea)}
          </span>
        </div>
      </div>
      {/* Inline Approval Buttons */}
      {shouldShowInlineApproval(idea) && (
        <div className="mb-4 flex gap-2 items-center">
          <Button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            <Check className="w-4 h-4 mr-1" />
            {isSubmitting ? "Approving..." : "Approve"}
          </Button>
          
          <Button
            onClick={() => setShowRejectInput(!showRejectInput)}
            disabled={isSubmitting}
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
            size="sm"
          >
            <X className="w-4 h-4 mr-1" />
            Reject
          </Button>

          {videoUrl && (
            <Button
              onClick={() => setShowVideo(!showVideo)}
              variant="outline"
              size="sm"
              className="ml-2"
            >
              <PlayCircle className="w-4 h-4 mr-1" />
              {showVideo ? "Hide Video" : "Show Video"}
            </Button>
          )}
        </div>
      )}

      {/* Rejection Reason Input */}
      {showRejectInput && (
        <div className="mb-4 flex gap-2 items-center">
          <Input
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Reason for rejection (optional)"
            className="flex-1"
          />
          <Button
            onClick={handleReject}
            disabled={isSubmitting}
            variant="destructive"
            size="sm"
          >
            {isSubmitting ? "Rejecting..." : "Confirm Reject"}
          </Button>
          <Button
            onClick={() => {
              setShowRejectInput(false);
              setRejectionReason("");
            }}
            variant="outline"
            size="sm"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Video Preview */}
      {showVideo && videoUrl && (
        <div className="mb-4">
          <div className="bg-black rounded-lg overflow-hidden">
            <video
              src={videoUrl}
              controls
              className="w-full max-h-96 object-contain"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 flex-1 mr-4">
          {isEditingTitle ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-lg md:text-2xl font-semibold bg-white border-2 border-cool-charcoal"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTitleEdit();
                  } else if (e.key === 'Escape') {
                    handleTitleCancel();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleTitleEdit}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleTitleCancel}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <p className="text-cool-charcoal font-semibold text-lg md:text-2xl text-left break-words hyphens-auto leading-tight">
                {idea.idea_text}
              </p>
              <Edit3 
                className="h-6 w-6 text-white stroke-2 flex-shrink-0 cursor-pointer hover:text-gray-200 transition-colors" 
                onClick={handleTitleEdit}
              />
            </>
          )}
        </div>
        <div className="flex gap-2 items-center flex-shrink-0">
          {/* Preview Button for old approval system */}
          {idea.approval_status === 'preview_ready' && idea.preview_video_url && (
            <Button
              size="sm"
              onClick={() => onPreviewClick(idea)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Eye className="w-3 h-3 mr-1" />
              Review
            </Button>
          )}

        </div>
      </div>
      
      <div className="flex flex-wrap gap-1 mb-4 overflow-hidden">
        {idea.selected_platforms.map((platform) => (
          <span key={platform} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs md:text-sm whitespace-nowrap">
            {platform}
          </span>
        ))}
      </div>
      
      {/* Expandable Caption */}
      {idea.caption && (
        <div className="mb-4">
          <p className="text-sm font-medium text-black mb-2">Caption:</p>
          <ExpandableCaption 
            caption={idea.caption} 
            videoId={idea.id}
            onUpdate={() => {/* Caption updated, could refresh if needed */}}
          />
        </div>
      )}
      
      {/* Rejection Reason */}
      {idea.approval_status === 'rejected' && idea.rejected_reason && (
        <div className="mb-4">
          <p className="text-xs text-red-600 bg-red-50 p-3 rounded">
            <strong className="text-xs text-black">Rejection reason:</strong> {idea.rejected_reason}
          </p>
        </div>
      )}

      {/* Video file link */}
      {idea.video_url && (
        <div className="mb-4">
          <a
            href={idea.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
          >
            <ExternalLink className="h-3 w-3" />
            View Video File
          </a>
        </div>
      )}

      {/* Upload Progress */}
      {idea.upload_status && Object.keys(idea.upload_status).length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Upload Progress:</p>
          <div className="space-y-2">
            {Object.entries(idea.upload_status).map(([platform, status]) => (
              <div key={platform} className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded">
                 <span className="capitalize text-cool-charcoal font-medium truncate max-w-[80px] md:max-w-none">{platform}</span>
                 <div className="flex items-center space-x-2 flex-shrink-0">
                   {status === 'uploading' && (
                     <div className="flex items-center space-x-1">
                       <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                       <span className="text-blue-600 text-xs md:text-sm whitespace-nowrap">Uploading...</span>
                     </div>
                   )}
                   {status === 'completed' && (
                     <span className="text-green-600 font-medium text-xs md:text-sm whitespace-nowrap">✓ Completed</span>
                   )}
                   {status === 'failed' && (
                     <div className="flex items-center space-x-1">
                       <span className="text-red-600 font-medium text-xs md:text-sm whitespace-nowrap">✗ Failed</span>
                       {idea.upload_errors?.[platform] && (
                         <span className="text-xs text-red-500 truncate max-w-[60px]">({idea.upload_errors[platform]})</span>
                       )}
                     </div>
                   )}
                   {status === 'pending' && (
                     <span className="text-gray-500 text-xs md:text-sm whitespace-nowrap">Pending</span>
                   )}
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform links */}
      {getPlatformLinks(idea).length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1">Platform Links:</p>
          <div className="flex flex-wrap gap-2">
            {getPlatformLinks(idea).map((link) => (
              <a
                key={link.platform}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs bg-blue-50 px-2 py-1 rounded"
              >
                <ExternalLink className="h-3 w-3" />
                {link.platform}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-cool-charcoal">
        {new Date(idea.created_at).toLocaleDateString()}
      </div>
    </div>
  );
};
