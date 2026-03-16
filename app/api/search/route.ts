import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const store = getStore();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], message: 'Query too short' });
  }

  const results = store.searchOutages(q);
  return NextResponse.json({ results: results.slice(0, 20), total: results.length });
}
