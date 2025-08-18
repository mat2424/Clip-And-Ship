
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
    setIdeaText(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit && !loading) {
        handleSecureSubmit(e as any);
      }
    }
    
    // Allow spacebar to work normally in the textarea
    if (e.key === ' ') {
      e.stopPropagation();
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
        <Label htmlFor="idea_text">Your Video Idea (10 characters minimum)</Label>
        <Textarea
          id="idea_text"
          placeholder="Describe your video idea in detail... (Press Enter to generate)"
          value={ideaText}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[100px] resize-none"
          required
        />
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
