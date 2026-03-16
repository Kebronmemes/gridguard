// ============================================
// GridGuard — EEU Interruptions Public API
// ============================================
// Returns active EEU power interruptions for map display

import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';

export async function GET() {
  const store = getStore();
  const active = store.eeuInterruptions.filter(e => e.active);
  const recent = store.eeuInterruptions.slice(-50); // last 50

  return NextResponse.json({
    active,
    recent,
    totalFetched: store.eeuInterruptions.length,
    lastSync: store.eeuInterruptions.length > 0
      ? store.eeuInterruptions[store.eeuInterruptions.length - 1].fetchedAt
      : null,
  });
}
