import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('infrastructure')
      .select('*');
      
    if (error) throw error;
    
    return NextResponse.json({ infrastructure: data || [] });
  } catch (err) {
    console.error('Infrastructure API Error:', err);
    return NextResponse.json({ infrastructure: [], error: 'Failed to fetch' }, { status: 500 });
  }
}
