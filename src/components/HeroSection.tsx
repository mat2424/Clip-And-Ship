
import { Play, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openGlobalAuthModal } from "@/hooks/useAuthModal";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export const HeroSection = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleWatchDemo = () => {
    window.open("https://youtu.be/Reg6D9ge3Dw", "_blank");
  };

  const handleStartCreating = () => {
    if (user) {
      navigate('/app');
    } else {
      openGlobalAuthModal();
    }
  };

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-cool-turquoise to-cool-aqua bg-clip-text text-transparent">
            Create & Publish Videos with AI
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-8">
            Transform your ideas into engaging videos and automatically publish them across all your social media platforms. 
            No video editing skills required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              className="bg-cool-turquoise hover:bg-cool-turquoise-hover text-cool-charcoal px-8 py-4 text-lg font-medium rounded-lg transition-colors"
              onClick={handleStartCreating}
            >
              {user ? "Go to Dashboard" : "Start Creating Videos"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              variant="outline" 
              className="border-cool-turquoise text-cool-turquoise hover:bg-cool-turquoise/10 px-8 py-4 text-lg font-medium rounded-lg"
              onClick={handleWatchDemo}
            >
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
