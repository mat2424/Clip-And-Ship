
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SocialConnections as SocialConnectionsComponent } from "@/components/SocialConnections";
import { CreditBalance } from "@/components/CreditBalance";
import { Button } from "@/components/ui/button";
import { User, LogOut, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { MobileDropdown } from "@/components/MobileDropdown";

const SocialConnections = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Redirect to login if not authenticated
      if (!session?.user) {
        navigate('/');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-700">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/app" className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Dashboard</span>
              </Link>
              <div className="w-px h-6 bg-border"></div>
              <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <img src="/lovable-uploads/02ed2fe3-1ff8-4c39-86c1-1c2c8e1be28c.png" alt="Clip & Ship AI Logo" className="w-8 h-8 object-contain" />
                <h1 className="text-xl font-bold text-foreground">Social Connections</h1>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <CreditBalance />
              
              {user && (
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{user.email}</span>
                  <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden">
              {user && <MobileDropdown user={user} onSignOut={handleSignOut} />}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <SocialConnectionsComponent />
      </main>
    </div>
  );
};

export default SocialConnections;
