import { NextResponse } from 'next/server';

// In-memory store for demo (to be replaced by Supabase DB in next phase)
let outages = [
  { id: 1, pos: [8.98, 38.75], area: "Bole", type: "Emergency", status: "Unverified" },
  { id: 2, pos: [9.02, 38.74], area: "Piassa", type: "Planned", status: "Verified" }
];

let polygons = [
  { id: 'p1', positions: [[8.99, 38.76], [8.99, 38.78], [8.97, 38.77]], type: "Emergency" }
];

export async function GET() {
  return NextResponse.json({ outages, polygons });
}
