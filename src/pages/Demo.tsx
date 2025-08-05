import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { DemoHeader } from "@/components/DemoHeader";
import { DemoVideoCard } from "@/components/DemoVideoCard";
import { VoiceSettings } from "@/components/VoiceSettings";
import { useDemoYouTubeAuth } from "@/hooks/useDemoYouTubeAuth";
import { useDemoSubmission } from "@/hooks/useDemoSubmission";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DemoVideo {
  id: string;
  title: string;
  caption: string;
  videoUrl: string;
}

const DEMO_VIDEOS: DemoVideo[] = [
  {
    id: "1",
    title: "Lady bug sliding down a snowy hill",
    caption: "You won't believe what happens next to this lady bug! #viral #shorts #wow #mustsee",
    videoUrl: "https://v3.fal.media/files/rabbit/HvXfHTwiNdo4_U4EqeplZ_output.mp4"
  },
  {
    id: "2", 
    title: "Blue sapphire sliced with a sharp knife",
    caption: "Slice the sapphire !  #sapphire #hardmaterials #satisfyingcut #oddlysatisfying #viral #trending #explore #foryou #asmtok #ultrafine #aesthetictok #satisfying",
    videoUrl: "https://v3.fal.media/files/rabbit/va1Fyi02YFT9K5iQOcqcE_output.mp4"
  },
  {
    id: "3",
    title: "Donuts rain from a glitched sky onto pixelated jelly creatures dancing.",
    caption: "Glitch donut rain in pixel world! 🍩 #adsdsadasd #absurd #randomness #weird #love #instagood #fun #explorepage #viral #trending #wtf #genzcore",
    videoUrl: "https://v3.fal.media/files/penguin/tlr-UihXnYKutc7EA0gAo_output.mp4"
  }
];

export default function Demo() {
  const [selectedVideo, setSelectedVideo] = useState<DemoVideo | null>(null);
  const [editedCaption, setEditedCaption] = useState("");
  
  const { toast } = useToast();
  const { isConnected, connect, loading: authLoading } = useDemoYouTubeAuth();
  const { submitVideo, loading: submissionLoading } = useDemoSubmission();

  const handleVideoSelect = (video: DemoVideo) => {
    setSelectedVideo(video);
    setEditedCaption(video.caption);
  };


  const handleSubmit = async () => {
    if (!selectedVideo) {
      toast({
        title: "No Video Selected",
        description: "Please select a video first.",
        variant: "destructive",
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: "YouTube Not Connected",
        description: "Please connect your YouTube account before uploading.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await submitVideo({
        title: selectedVideo.title,
        caption: editedCaption,
        videoUrl: selectedVideo.videoUrl,
      });

      // Reset selection and go back to video list after successful upload
      setTimeout(() => {
        setSelectedVideo(null);
        setEditedCaption("");
      }, 3000); // Give user time to read success message

    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An error occurred during upload.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DemoHeader />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {!selectedVideo ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Try Clip & Ship AI Demo
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Experience our AI video generation without creating an account. 
                Choose from our pre-made videos and publish directly to YouTube.
              </p>
            </div>

            <Alert className="mb-8 border-border bg-card">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-card-foreground">
                Demo mode allows free uploads without credits. Some features are limited compared to the full version.
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-3 gap-6">
              {DEMO_VIDEOS.map((video) => (
                <DemoVideoCard
                  key={video.id}
                  video={video}
                  onSelect={handleVideoSelect}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                onClick={() => setSelectedVideo(null)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Videos
              </Button>
              <Badge variant="outline" className="bg-card text-card-foreground border-border">
                DEMO MODE
              </Badge>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-xl font-semibold mb-4">Selected Video</h2>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium text-card-foreground">{selectedVideo.title}</h3>
                      </div>
                      
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                        <video
                          src={selectedVideo.videoUrl}
                          controls
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Edit Caption
                        </label>
                        <textarea
                          value={editedCaption}
                          onChange={(e) => setEditedCaption(e.target.value)}
                          className="w-full p-3 border border-input bg-background text-foreground rounded-lg resize-none"
                          rows={4}
                          placeholder="Edit your video caption..."
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-4">YouTube Connection</h3>
                    {isConnected ? (
                      <div className="flex items-center gap-2 text-green-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Connected to YouTube
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Connect your YouTube account to upload videos
                        </p>
                        <Button
                          onClick={connect}
                          disabled={authLoading}
                          className="w-full"
                        >
                          {authLoading ? "Connecting..." : "Connect to YouTube"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>


                <Button
                  onClick={handleSubmit}
                  disabled={!isConnected || submissionLoading}
                  className="w-full h-12 text-lg"
                  size="lg"
                >
                  {submissionLoading ? "Uploading..." : "Upload to YouTube"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}