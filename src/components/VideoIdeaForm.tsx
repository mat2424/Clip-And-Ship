
import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PlatformSelector } from "@/components/PlatformSelector";
import { VoiceSettings } from "@/components/VoiceSettings";
import { useVideoIdeaForm } from "@/hooks/useVideoIdeaForm";
import { Loader2 } from "lucide-react";
import { sanitizeUserInput, containsInappropriateContent } from "@/lib/security";
import { useToast } from "@/hooks/use-toast";

export const VideoIdeaForm = () => {
  const { toast } = useToast();
  const {
    formData,
    isSubmitting,
    handleInputChange,
    handlePlatformChange,
    handleVoiceChange,
    handleSubmit,
    canSubmit
  } = useVideoIdeaForm();

  const handleSecureInputChange = (field: string, value: string) => {
    // Sanitize input before processing
    const sanitizedValue = sanitizeUserInput(value);
    
    // Check for inappropriate content
    if (containsInappropriateContent(sanitizedValue)) {
      toast({
        title: "Content Warning",
        description: "Please ensure your content follows our community guidelines.",
        variant: "destructive",
      });
      return;
    }
    
    handleInputChange(field, sanitizedValue);
  };

  const handleSecureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation before submission
    const sanitizedIdeaText = sanitizeUserInput(formData.idea_text);
    const sanitizedEnvironmentPrompt = sanitizeUserInput(formData.environment_prompt || '');
    const sanitizedSoundPrompt = sanitizeUserInput(formData.sound_prompt || '');
    
    // Check for inappropriate content one more time
    if (containsInappropriateContent(sanitizedIdeaText) || 
        containsInappropriateContent(sanitizedEnvironmentPrompt) || 
        containsInappropriateContent(sanitizedSoundPrompt)) {
      toast({
        title: "Content Blocked",
        description: "Your content contains inappropriate material. Please revise and try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Update form data with sanitized values
    const secureFormData = {
      ...formData,
      idea_text: sanitizedIdeaText,
      environment_prompt: sanitizedEnvironmentPrompt,
      sound_prompt: sanitizedSoundPrompt
    };
    
    // Submit with sanitized data
    await handleSubmit(e, secureFormData);
  };

  return (
    <form onSubmit={handleSecureSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="idea_text">Your Video Idea</Label>
        <Textarea
          id="idea_text"
          placeholder="Describe your video idea in detail... (10-5000 characters)"
          value={formData.idea_text}
          onChange={(e) => handleSecureInputChange('idea_text', e.target.value)}
          className="min-h-[100px] resize-none"
          maxLength={5000}
          required
        />
        <div className="text-sm text-muted-foreground text-right">
          {formData.idea_text.length}/5000 characters
        </div>
      </div>

      <PlatformSelector
        selectedPlatforms={formData.selected_platforms}
        onPlatformChange={handlePlatformChange}
      />

      <VoiceSettings
        useAiVoice={formData.use_ai_voice}
        voiceFileUrl={formData.voice_file_url}
        onVoiceChange={handleVoiceChange}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="environment_prompt">Environment Description (Optional)</Label>
          <Input
            id="environment_prompt"
            placeholder="Describe the setting or background..."
            value={formData.environment_prompt}
            onChange={(e) => handleSecureInputChange('environment_prompt', e.target.value)}
            maxLength={500}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sound_prompt">Sound Description (Optional)</Label>
          <Input
            id="sound_prompt"
            placeholder="Describe any background music or sounds..."
            value={formData.sound_prompt}
            onChange={(e) => handleSecureInputChange('sound_prompt', e.target.value)}
            maxLength={500}
          />
        </div>
      </div>

      <Button 
        type="submit" 
        disabled={!canSubmit || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? (
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
