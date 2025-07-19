
import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Mic, Crown } from "lucide-react";
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
  const [userTier, setUserTier] = useState<string>('free');

  useEffect(() => {
    fetchUserTier();
  }, []);

  const fetchUserTier = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserTier(profile.subscription_tier || 'free');
      }
    } catch (error) {
      console.error('Error fetching user tier:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if user has premium access
    if (userTier === 'free') {
      toast({
        title: "Premium Feature Required",
        description: "Custom voice files are only available for Premium and Pro subscribers. Please upgrade your account.",
        variant: "destructive",
      });
      return;
    }

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

  const handleVoiceToggle = (checked: boolean) => {
    if (!checked && userTier === 'free') {
      toast({
        title: "Premium Feature Required",
        description: "Custom voice files are only available for Premium and Pro subscribers. Please upgrade your account.",
        variant: "destructive",
      });
      return;
    }
    onVoiceChange('use_ai_voice', checked);
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-medium flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Voice Settings
              {userTier === 'free' && <Crown className="h-4 w-4 text-yellow-500" />}
            </Label>
            <p className="text-sm text-muted-foreground">
              Choose between AI voice or upload your own
              {userTier === 'free' && (
                <span className="text-yellow-600 font-medium"> (Premium Feature)</span>
              )}
            </p>
          </div>
          <Switch
            checked={useAiVoice}
            onCheckedChange={handleVoiceToggle}
          />
        </div>

        {!useAiVoice && (
          <div className="space-y-3">
            {userTier === 'free' ? (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  <h3 className="font-semibold text-yellow-800">Premium Feature</h3>
                </div>
                <p className="text-sm text-yellow-700 mb-3">
                  Custom voice files are available for Premium and Pro subscribers. Upgrade to unlock this feature!
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                  onClick={() => window.location.href = '#pricing'}
                >
                  Upgrade Now
                </Button>
              </div>
            ) : (
              <>
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
              </>
            )}
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
