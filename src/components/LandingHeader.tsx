
import { Link, useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { useEffect } from "react";
import { AuthModal } from "./AuthModal";
import { useAuthModal } from "@/hooks/useAuthModal";

interface LandingHeaderProps {
  user: User | null;
}

export const LandingHeader = ({ user }: LandingHeaderProps) => {
  const { isOpen, setIsOpen, registerGlobalControl } = useAuthModal();
  const navigate = useNavigate();

  useEffect(() => {
    registerGlobalControl();
  }, [registerGlobalControl]);

  const handleAuthSuccess = () => {
    navigate('/app');
  };

  return (
    <>
      <AuthModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    <header className="bg-cool-navy shadow-lg border-b border-cool-turquoise/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <img 
              src="/lovable-uploads/02ed2fe3-1ff8-4c39-86c1-1c2c8e1be28c.png" 
              alt="Clip & Ship AI Logo" 
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0"
            />
            <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Clip & Ship AI</h1>
          </div>
          <div className="flex items-center">
            {user ? (
              <Link
                to="/app"
                className="bg-cool-turquoise text-cool-charcoal px-3 py-2 sm:px-6 sm:py-2 rounded-md hover:bg-cool-turquoise-hover transition-colors font-medium text-sm sm:text-base whitespace-nowrap"
              >
                <span className="hidden sm:inline">Go to Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </Link>
            ) : (
              <button
                onClick={() => setIsOpen(true)}
                className="bg-cool-turquoise text-cool-charcoal px-3 py-2 sm:px-6 sm:py-2 rounded-md hover:bg-cool-turquoise-hover transition-colors font-medium text-sm sm:text-base whitespace-nowrap"
              >
                <span className="hidden sm:inline">Get Started</span>
                <span className="sm:hidden">Start</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
    </>
  );
};
