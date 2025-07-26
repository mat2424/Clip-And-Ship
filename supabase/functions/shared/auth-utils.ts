import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Shared authentication utility for edge functions
 * Provides consistent user validation and authorization
 */
export const createAuthenticatedSupabaseClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
};

/**
 * Validates user authentication from request headers
 * Returns user ID if valid, throws error if not
 */
export const validateUserAuth = async (req: Request): Promise<string> => {
  const authorization = req.headers.get('Authorization');
  
  if (!authorization) {
    throw new Error('Missing authorization header');
  }
  
  const token = authorization.replace('Bearer ', '');
  const supabase = createAuthenticatedSupabaseClient();
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid or expired token');
  }
  
  return user.id;
};

/**
 * Standard security headers for API responses
 */
export const getSecurityHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
});