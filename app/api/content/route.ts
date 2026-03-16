// Public content API — blogs, safety guides, alerts
import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // blog, safety_guide, news, alert

  const store = getStore();
  let content = store.content.filter(c => c.published);

  if (type) {
    content = content.filter(c => c.type === type);
  }

  return NextResponse.json({
    content: content.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    total: content.length,
  });
}
