
import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validateFileName, validateFileSize } from "@/lib/security";

interface VoiceSettingsProps {
  useAiVoice: boolean;
  voiceFileUrl: string;
  onVoiceChange: (field: string, value: any) => void;
}

export const VoiceSettings = ({ useAiVoice, voiceFileUrl, onVoiceChange }: VoiceSettingsProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Enhanced security validation
    if (!validateFileName(file.name)) {
      toast({
        title: "Invalid File",
        description: "Please upload only audio files (.mp3, .wav, .m4a, .ogg) with safe filenames.",
        variant: "destructive",
      });
      return;
    }

    if (!validateFileSize(file, 10)) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Check MIME type for additional security
    const allowedMimeTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 
      'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/ogg'
    ];
    
    if (!allowedMimeTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a valid audio file.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate a secure filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      const secureFileName = `voice_${timestamp}_${randomString}${fileExtension}`;

      const { data, error } = await supabase.storage
        .from('voice-files')
        .upload(secureFileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('voice-files')
        .getPublicUrl(data.path);

      onVoiceChange('voice_file_url', publicUrl);
      
      toast({
        title: "Success",
        description: "Voice file uploaded successfully!",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload voice file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const removeVoiceFile = () => {
    onVoiceChange('voice_file_url', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-medium flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Voice Settings
            </Label>
            <p className="text-sm text-muted-foreground">
              Choose between AI voice or upload your own
            </p>
          </div>
          <Switch
            checked={useAiVoice}
            onCheckedChange={(checked) => onVoiceChange('use_ai_voice', checked)}
          />
        </div>

        {!useAiVoice && (
          <div className="space-y-3">
            <Label>Upload Voice File</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Choose File
              </Button>
              
              {voiceFileUrl && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>File uploaded</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeVoiceFile}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.m4a,.ogg,audio/mpeg,audio/wav,audio/mp4,audio/ogg"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <p className="text-xs text-muted-foreground">
              Supported formats: MP3, WAV, M4A, OGG (max 10MB)
            </p>
          </div>
        )}

        {useAiVoice && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            AI voice will be automatically generated for your video content.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
