
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { LandingHeader } from "@/components/LandingHeader";
import { HeroSection } from "@/components/HeroSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { BenefitsSection } from "@/components/BenefitsSection";
import { CallToActionSection } from "@/components/CallToActionSection";
import { YouTubeVideoSection } from "@/components/YouTubeVideoSection";
import { LandingFooter } from "@/components/LandingFooter";

const Landing = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if this is an OAuth callback by looking for OAuth parameters
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));

    const hasOAuthParams =
      urlParams.has('access_token') ||
      urlParams.has('code') ||
      urlParams.has('error') ||
      hashParams.has('access_token') ||
      hashParams.has('provider_token') ||
      hashParams.has('error');

    if (hasOAuthParams) {
      console.log('🔄 OAuth parameters detected on landing page, redirecting to OAuth callback');
      navigate('/oauth-callback', { replace: true });
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cool-charcoal">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cool-turquoise"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cool-charcoal text-white">
      <LandingHeader user={user} />
      <HeroSection />
      <FeaturesSection />
      <BenefitsSection />
      <YouTubeVideoSection />
      <CallToActionSection />
      <LandingFooter />
    </div>
  );
};

export default Landing;
