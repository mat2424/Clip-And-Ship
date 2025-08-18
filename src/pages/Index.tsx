
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { VideoIdeaForm } from "@/components/VideoIdeaForm";
import { VideoIdeasList } from "@/components/VideoIdeasList";
import { CreditBalance } from "@/components/CreditBalance";
import { PricingSection } from "@/components/PricingSection";
import { SocialConnections } from "@/components/SocialConnections";
import { ReferralPanel } from "@/components/ReferralPanel";

import { Button } from "@/components/ui/button";
import { User, LogOut, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { MobileDropdown } from "@/components/MobileDropdown";
import { AuthModal } from "@/components/AuthModal";
import { useReferralTracking } from "@/hooks/useReferralTracking";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Initialize referral tracking
  useReferralTracking();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    const {
      error
    } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive"
      });
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading...</div>;
  }

  return <div className="min-h-screen bg-slate-700">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <img src="/lovable-uploads/02ed2fe3-1ff8-4c39-86c1-1c2c8e1be28c.png" alt="Clip & Ship AI Logo" className="w-8 h-8 object-contain" />
                <h1 className="text-xl font-bold text-foreground">Clip & Ship AI</h1>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <CreditBalance />
              
              {user && (
                <>
                  <Link to="/social-connections">
                    <Button variant="outline" size="sm" className="flex items-center space-x-2">
                      <Settings className="w-4 h-4" />
                      <span>Social Connections</span>
                    </Button>
                  </Link>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{user.email}</span>
                    <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
              
              {!user && <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign In
                </Button>}
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden">
              {user ? <MobileDropdown user={user} onSignOut={handleSignOut} /> : <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign In
                </Button>}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Video Creation */}
          <div className="lg:col-span-2 space-y-8">
            <VideoIdeaForm />
            <VideoIdeasList />
          </div>

          {/* Right Column - Pricing, Referrals and Social Connections */}
          <div className="lg:col-span-1 space-y-8">
            <PricingSection />
            {user && <ReferralPanel />}
            {user && <SocialConnections />}
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </div>;
};

export default Index;
