import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// export const supabase = createClient(
//   'https://omfjfnzkmrglzaytdzls.supabase.co',
//   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tZmpmbnprbXJnbHpheXRkemxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3Mzc4OTMsImV4cCI6MjA3NTMxMzg5M30.tIzUZ3VxD8fynL3JZJ7zGqOIamYQZ5Wn-eCCfv7ud2M'
// );
