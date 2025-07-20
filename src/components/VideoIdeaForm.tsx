import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PlatformSelector } from "@/components/PlatformSelector";
import { VoiceSettings } from "@/components/VoiceSettings";
import { useVideoIdeaForm } from "@/hooks/useVideoIdeaForm";
import { Loader2 } from "lucide-react";
import { sanitizeUserInput, containsInappropriateContent } from "@/lib/security";
import { useToast } from "@/hooks/use-toast";

export const VideoIdeaForm = () => {
  const { toast } = useToast();
  const {
    ideaText,
    setIdeaText,
    useCustomVoice,
    setUseCustomVoice,
    voiceFile,
    setVoiceFile,
    selectedPlatforms,
    setSelectedPlatforms,
    userTier,
    loading,
    handleSubmit
  } = useVideoIdeaForm();

  const handleInputChange = (value: string) => {
    // Simple length check only
    if (value.length <= 5000) {
      setIdeaText(value);
    }
  };

  const handleSecureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation before submission
    const sanitizedIdeaText = sanitizeUserInput(ideaText);
    
    // Check for inappropriate content one more time
    if (containsInappropriateContent(sanitizedIdeaText)) {
      toast({
        title: "Content Blocked",
        description: "Your content contains inappropriate material. Please revise and try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Submit with sanitized data
    await handleSubmit(e);
  };

  const canSubmit = ideaText.trim().length >= 10;

  return (
    <form onSubmit={handleSecureSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="idea_text">Your Video Idea</Label>
        <Textarea
          id="idea_text"
          placeholder="Describe your video idea in detail... (10-5000 characters)"
          value={ideaText}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            // Allow spacebar to work normally in the textarea
            if (e.key === ' ') {
              e.stopPropagation();
            }
          }}
          className="min-h-[100px] resize-none"
          maxLength={5000}
          required
        />
        <div className="text-sm text-muted-foreground text-right">
          {ideaText.length}/5000 characters
        </div>
      </div>

      <PlatformSelector
        selectedPlatforms={selectedPlatforms}
        onPlatformChange={setSelectedPlatforms}
        userTier={userTier}
      />

      <VoiceSettings
        useAiVoice={!useCustomVoice}
        voiceFileUrl={voiceFile ? URL.createObjectURL(voiceFile) : ""}
        onVoiceChange={(field: string, value: any) => {
          if (field === 'use_ai_voice') {
            setUseCustomVoice(!value);
          }
        }}
      />

      <Button 
        type="submit" 
        disabled={!canSubmit || loading}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Your Video...
          </>
        ) : (
          "Create Video"
        )}
      </Button>
    </form>
  );
};