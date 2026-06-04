import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config, assertSupabaseConfig } from './config.js';

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    assertSupabaseConfig();
    adminClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

export function getSupabaseForUser(accessToken: string): SupabaseClient {
  assertSupabaseConfig();
  return createClient(config.supabaseUrl, config.supabaseAnonKey || config.supabaseServiceKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
