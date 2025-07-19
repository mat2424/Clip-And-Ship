
import DOMPurify from 'dompurify';

// XSS Protection - sanitize HTML content
export const sanitizeHtml = (content: string): string => {
  if (typeof window === 'undefined') {
    // Server-side fallback - basic HTML entity encoding
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
  
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: []
  });
};

// Enhanced text sanitization for user inputs
export const sanitizeUserInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 5000); // Limit length
};

// File validation utilities
export const validateFileName = (filename: string): boolean => {
  const allowedExtensions = ['.mp3', '.wav', '.m4a', '.ogg'];
  const extension = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  
  // Check extension
  if (!allowedExtensions.includes(extension)) {
    return false;
  }
  
  // Check for dangerous characters
  const dangerousChars = /[<>:"|?*\x00-\x1f]/;
  if (dangerousChars.test(filename)) {
    return false;
  }
  
  return true;
};

export const validateFileSize = (file: File, maxSizeMB: number = 10): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

// URL validation
export const isValidUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
};

// Rate limiting helper (client-side tracking)
export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  const requests: number[] = [];
  
  return {
    isAllowed(): boolean {
      const now = Date.now();
      // Remove old requests outside the window
      while (requests.length > 0 && requests[0] <= now - windowMs) {
        requests.shift();
      }
      
      if (requests.length >= maxRequests) {
        return false;
      }
      
      requests.push(now);
      return true;
    },
    getRemainingRequests(): number {
      const now = Date.now();
      // Remove old requests
      while (requests.length > 0 && requests[0] <= now - windowMs) {
        requests.shift();
      }
      return Math.max(0, maxRequests - requests.length);
    }
  };
};

// Content filtering for inappropriate content
export const containsInappropriateContent = (text: string): boolean => {
  // Basic content filtering - you can expand this list
  const inappropriatePatterns = [
    /\b(spam|scam|phishing)\b/gi,
    /\b(hack|exploit|vulnerability)\b/gi,
    // Add more patterns as needed
  ];
  
  return inappropriatePatterns.some(pattern => pattern.test(text));
};

// Security headers for API responses
export const getSecurityHeaders = () => ({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
});
