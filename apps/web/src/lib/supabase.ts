'use client';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Realtime Subscriptions ─────────────────────────────
export function subscribeToPositions(userId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`positions-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'positions',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
}

export function subscribeToTrades(userId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`trades-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trades',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
}
