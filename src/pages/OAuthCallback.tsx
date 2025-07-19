
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const OAuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const platform = urlParams.get('platform');
    const success = urlParams.get('success');
    const error = urlParams.get('error');

    console.log('OAuth callback received:', { platform, success, error });

    // Show success page for a moment, then redirect
    const timer = setTimeout(() => {
      navigate('/app');
    }, 2000);

    return () => clearTimeout(timer);
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
