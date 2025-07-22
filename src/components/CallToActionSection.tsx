
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openGlobalAuthModal } from "@/hooks/useAuthModal";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export const CallToActionSection = () => {
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
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-cool-turquoise/20 to-cool-aqua/20">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-white mb-6">
          Start Creating Amazing Videos Today
        </h2>
        <p className="text-gray-300 text-lg mb-8">
          No credit card required. Get started in minutes and see the power of AI-driven video creation.
        </p>
        <Button 
          className="bg-cool-turquoise hover:bg-cool-turquoise-hover text-cool-charcoal px-8 py-4 text-lg font-medium rounded-lg transition-colors"
          onClick={handleGetStarted}
        >
          {user ? "Go to Dashboard" : "Get Started Free"}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </section>
  );
};
