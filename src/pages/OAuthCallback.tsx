
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const OAuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check for auth session after OAuth callback
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      console.log('OAuth callback - checking session:', { session: !!session, error });
      
      if (session) {
        console.log('OAuth successful, redirecting to app');
        // Small delay to show success message
        setTimeout(() => {
          navigate('/app');
        }, 1500);
      } else if (error) {
        console.error('OAuth error:', error);
        // Redirect to app anyway to show the sign in modal
        setTimeout(() => {
          navigate('/app');
        }, 2000);
      } else {
        // No session yet, wait a bit for Supabase to process
        setTimeout(checkSession, 1000);
      }
    };

    checkSession();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 text-center text-white max-w-md mx-4">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-2">Connection Successful!</h1>
        <p className="text-green-100 mb-4">
          Your account has been connected successfully.
        </p>
        <div className="text-sm opacity-80">
          Redirecting you back to the app...
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;
