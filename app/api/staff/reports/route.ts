import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: reports, error } = await supabase
      .from('citizen_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase reports error:', error);
      return NextResponse.json({ reports: [] });
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (err) {
    console.error('Reports API error:', err);
    return NextResponse.json({ reports: [] });
  }
}
