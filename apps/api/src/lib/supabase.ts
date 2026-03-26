import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

const isMockMode = !process.env.SUPABASE_URL;
if (isMockMode) {
  console.warn('⚠️  SUPABASE_URL not set. Running in mock mode — DB calls will fail gracefully.');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export { isMockMode };
