import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data: posts, error } = await supabase
    .from('blog_content')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (error || !posts) {
    return NextResponse.json({ posts: [] });
  }

  return NextResponse.json({ posts });
}
