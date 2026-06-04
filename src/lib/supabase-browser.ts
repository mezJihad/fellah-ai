import { createBrowserClient as _createBrowserClient } from '@supabase/ssr';

let instance: ReturnType<typeof _createBrowserClient> | null = null;

export function createBrowserClient() {
  if (!instance) {
    instance = _createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return instance;
}
