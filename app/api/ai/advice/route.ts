import { NextResponse } from 'next/server';
import { getOutageAdvice } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { area, severity, reason } = await request.json();
    if (!area) return NextResponse.json({ error: 'Area is required' }, { status: 400 });

    const advice = await getOutageAdvice(area, severity || 'moderate', reason || 'Maintenance');
    return NextResponse.json({ advice });
  } catch (err) {
    console.error('[AI Advice API] Failed:', err);
    return NextResponse.json({ error: 'Failed to fetch AI advice' }, { status: 500 });
  }
}
