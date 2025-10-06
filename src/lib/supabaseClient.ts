import { createClient } from "@supabase/supabase-js";
// export const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );
export const supabase = createClient(
  'https://omfjfnzkmrglzaytdzls.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tZmpmbnprbXJnbHpheXRkemxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3Mzc4OTMsImV4cCI6MjA3NTMxMzg5M30.tIzUZ3VxD8fynL3JZJ7zGqOIamYQZ5Wn-eCCfv7ud2M'
);
