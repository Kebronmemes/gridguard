import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate request...
    if (!data.area || !data.type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Normally insert into DB here
    const newOutage = {
      id: Date.now(),
      ...data,
      status: 'Verified',
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({ success: true, outage: newOutage }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create outage' }, { status: 500 });
  }
}
