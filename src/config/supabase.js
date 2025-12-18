import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Client for read operations (uses anon key)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'sb-anon-auth-token'
  }
});

// Client for write operations (uses service key)
export const supabaseServiceClient = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        storageKey: 'sb-service-auth-token'
      }
    })
  : supabaseClient; // Fallback to anon key if service key not provided

export default supabaseClient;
