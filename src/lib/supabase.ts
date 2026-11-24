import { createClient } from '@supabase/supabase-js';

// Anon key is safe in the browser and at build time: RLS limits it to published content.
export const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
);
