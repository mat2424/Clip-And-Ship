import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Zap } from "lucide-react";

export const DemoHeader = () => {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-card-foreground">Clip & Ship AI</span>
            </div>
            <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground border-0">
              DEMO MODE
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/', '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Full Version
            </Button>
          </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground text-center py-2">
        <p className="text-sm">
          🎉 You're trying our free demo! No signup required - just connect YouTube and publish your video.
        </p>
      </div>
    </header>
  );
};