import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useReferralTracking = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const referralCode = searchParams.get('ref');
    
    if (referralCode) {
      // Store referral code in localStorage for signup process
      localStorage.setItem('referral_code', referralCode);
      
      // Clean up URL by removing the ref parameter
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('ref');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const getReferralCode = (): string | null => {
    return localStorage.getItem('referral_code');
  };

  const clearReferralCode = () => {
    localStorage.removeItem('referral_code');
  };

  return {
    getReferralCode,
    clearReferralCode
  };
};