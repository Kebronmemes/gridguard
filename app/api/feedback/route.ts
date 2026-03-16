import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, email, message, category } = data;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 });
    }

    const store = getStore();
    const feedback = {
      id: 'FB-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      name,
      email,
      message,
      category: category || 'general',
      timestamp: new Date().toISOString(),
    };

    store.feedbacks.push(feedback);
    return NextResponse.json({ success: true, feedback }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
