
import { ArrowRight } from "lucide-react";
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

  const handleGetStarted = () => {
    if (user) {
      navigate('/app');
    } else {
      openGlobalAuthModal();
    }
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-cool-charcoal via-cool-navy to-cool-charcoal min-h-screen flex items-center">
      <div className="max-w-6xl mx-auto text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Create & Publish Videos with{" "}
          <span className="bg-gradient-to-r from-cool-turquoise to-cool-aqua bg-clip-text text-transparent">
            AI
          </span>
        </h1>
        <p className="text-gray-300 text-xl md:text-2xl mb-12 max-w-4xl mx-auto leading-relaxed">
          Transform your ideas into engaging videos and automatically publish them across all your social media platforms. No video editing skills required.
        </p>
        
        {/* YouTube Video */}
        <div className="relative w-full max-w-4xl mx-auto mb-12">
          <div className="aspect-video rounded-lg overflow-hidden shadow-2xl border border-cool-turquoise/30">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/Reg6D9ge3Dw"
              title="Clip & Ship AI Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Single centered button */}
        <Button 
          className="bg-cool-turquoise hover:bg-cool-turquoise-hover text-cool-charcoal px-8 py-4 text-lg font-medium rounded-lg transition-colors"
          onClick={handleGetStarted}
        >
          {user ? "Go to Dashboard" : "Start Creating Videos"}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </section>
  );
};
