// Same factory as lib/supabase/client.js: the browser client is a singleton, so a second copy could set a different default schema.
export { createClient } from '@/lib/supabase/client'
