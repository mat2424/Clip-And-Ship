import { LoadingDots } from "@/components/ui/loading-dots";
import { Card } from "@/components/ui/card";

interface VideoGenerationPlaceholderProps {
  status: string;
  ideaText: string;
}

export const VideoGenerationPlaceholder = ({ status, ideaText }: VideoGenerationPlaceholderProps) => {
  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'processing':
        return 'Analyzing your idea...';
      case 'generating':
        return 'Creating your video...';
      case 'rendering':
        return 'Finalizing video...';
      default:
        return 'Processing...';
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-dashed border-2 border-primary/30">
      <div className="text-center space-y-4">
        <div className="w-full h-48 bg-muted/20 rounded-lg flex items-center justify-center">
          <div className="space-y-4">
            <LoadingDots size="lg" />
            <p className="text-muted-foreground font-medium">
              {getStatusMessage(status)}
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Generating Video</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            "{ideaText}"
          </p>
        </div>
      </div>
    </Card>
  );
};