import { useState, useCallback } from 'react';

// Global auth modal state
let globalSetIsOpen: ((open: boolean) => void) | null = null;

export const useAuthModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Register this instance as the global controller
  const registerGlobalControl = useCallback(() => {
    globalSetIsOpen = setIsOpen;
  }, []);

  // Function to open auth modal from anywhere
  const openAuthModal = useCallback(() => {
    if (globalSetIsOpen) {
      globalSetIsOpen(true);
    }
  }, []);

  return {
    isOpen,
    setIsOpen,
    registerGlobalControl,
    openAuthModal,
  };
};

// Global function to open auth modal from anywhere
export const openGlobalAuthModal = () => {
  if (globalSetIsOpen) {
    globalSetIsOpen(true);
  }
};