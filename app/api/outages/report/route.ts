// ============================================
// GridGuard — Outage Report API (Supabase)
// ============================================

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { findNearestArea, ETHIOPIAN_AREAS } from '@/lib/store';
import { RATE_LIMITS, getClientIP } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const rl = RATE_LIMITS.report(ip);
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited.' }, { status: 429 });

  try {
    const data = await request.json();
    const { area, description, severity, coordinates, subcity, district } = data;

    if (!area) return NextResponse.json({ error: 'Area is required' }, { status: 400 });

    const sanitizedDesc = (description || '').substring(0, 500).replace(/<[^>]+>/g, '');
    let lat = coordinates?.[0] || 9.0;
    let lng = coordinates?.[1] || 38.75;
    
    let detectedSubcity = subcity || '';
    if (!detectedSubcity && coordinates) {
      const nearest = findNearestArea(coordinates[0], coordinates[1]);
      detectedSubcity = nearest.subcity;
    }

    if (!detectedSubcity) {
      const match = ETHIOPIAN_AREAS.find(a =>
        a.area.toLowerCase() === area.toLowerCase() ||
        a.subcity.toLowerCase() === area.toLowerCase()
      );
      if (match) {
        lat = match.coords[0];
        lng = match.coords[1];
        detectedSubcity = match.subcity;
      }
    }

    // Insert Report
    const { data: newReport, error: rErr } = await supabase
      .from('citizen_reports')
      .insert({
        area,
        lat,
        lng,
        type: severity || 'moderate',
        description: sanitizedDesc,
        status: 'pending'
      })
      .select()
      .single();

    if (rErr) throw rErr;

    // Check cluster count for elevation
    const { count } = await supabase
      .from('citizen_reports')
      .select('*', { count: 'exact', head: true })
      .eq('area', area)
      .eq('status', 'pending');

    const totalReports = count || 1;

    // Insert Feed Event
    await supabase.from('system_feed').insert({
      type: 'citizen_report',
      message: `Citizen reported outage in ${area}${detectedSubcity ? ` (${detectedSubcity})` : ''} - Total ${totalReports} reports`,
      area,
    });

    // Auto-escalate if >= 5 reports
    if (totalReports >= 5) {
      // Check if outage already exists
      const { data: active } = await supabase
        .from('district_history')
        .select('*')
        .ilike('district', `%${area}%`)
        .is('end_time', null);

      if (!active || active.length === 0) {
        await supabase.from('district_history').insert({
          district: area,
          subcity: detectedSubcity,
          severity: 'critical',
          type: 'emergency',
          cause: 'Multiple citizen reports detected in this area',
          start_time: new Date().toISOString(),
          affected_count: totalReports,
          lat, lng
        });
      }
    }

    return NextResponse.json({ success: true, report: newReport }, { status: 201 });
  } catch (err) {
    console.error('Report Auth Error:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
