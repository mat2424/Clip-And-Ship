import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, ChevronRight } from "lucide-react";

interface DemoVideo {
  id: string;
  title: string;
  caption: string;
  videoUrl: string;
}

interface DemoVideoCardProps {
  video: DemoVideo;
  onSelect: (video: DemoVideo) => void;
}

export const DemoVideoCard = ({ video, onSelect }: DemoVideoCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-0">
        <div className="relative aspect-video bg-muted rounded-t-lg overflow-hidden">
          <video
            src={video.videoUrl}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            muted
            loop
            playsInline
            onMouseEnter={(e) => {
              const videoElement = e.target as HTMLVideoElement;
              videoElement.play().catch(() => {});
            }}
            onMouseLeave={(e) => {
              const videoElement = e.target as HTMLVideoElement;
              videoElement.pause();
              videoElement.currentTime = 0;
            }}
          />
          
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="bg-card/90 rounded-full p-3">
              <Play className="h-6 w-6 text-card-foreground" />
            </div>
          </div>

          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-card/90 text-card-foreground border-border">
              Demo Video
            </Badge>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-lg leading-tight line-clamp-2 text-card-foreground">
            {video.title}
          </h3>
          
          <p className="text-sm text-muted-foreground line-clamp-3">
            {video.caption}
          </p>

          <Button
            onClick={() => onSelect(video)}
            className="w-full group-hover:bg-primary/90 transition-colors duration-300"
            size="sm"
          >
            Use This Video
            <ChevronRight className={`ml-2 h-4 w-4 transition-transform duration-300 ${
              isHovered ? 'translate-x-1' : ''
            }`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};