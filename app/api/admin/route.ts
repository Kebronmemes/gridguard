import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { decrypt } from '@/lib/session';
import { RATE_LIMITS, getClientIP } from '@/lib/rate-limit';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function validateAdmin(authHeader: string | null): Promise<{ valid: boolean; user?: any }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { valid: false };
  const token = authHeader.split(' ')[1];
  const payload = await decrypt(token);
  if (!payload) return { valid: false };
  if (payload.role !== 'admin') return { valid: false };
  return { valid: true, user: payload };
}

export async function GET(request: Request) {
  const auth = await validateAdmin(request.headers.get('authorization'));
  if (!auth.valid) return NextResponse.json({ error: 'Admin access required' }, { status: 401 });

  const [
    { count: staffCount },
    { data: staffList }, // Added to get full list
    { count: activeOutages },
    { count: totalReports },
    { count: totalSubs },
    { count: contentCount },
    { data: recentFeed },
    { data: rawSubscriptions },
    { data: staffLocationsData },
    { data: eeuRawData },
    { data: citizenReports }
  ] = await Promise.all([
    supabase.from('staff_users').select('*', { count: 'exact', head: true }),
    supabase.from('staff_users').select('*').order('created_at', { ascending: false }), // Fetch actual users
    supabase.from('district_history').select('*', { count: 'exact', head: true }).is('end_time', null),
    supabase.from('citizen_reports').select('*', { count: 'exact', head: true }),
    supabase.from('subscribers').select('*', { count: 'exact', head: true }),
    supabase.from('blog_content').select('*', { count: 'exact', head: true }),
    supabase.from('system_feed').select('*').order('timestamp', { ascending: false }).limit(20),
    supabase.from('subscribers').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('staff_locations').select('*'),
    supabase.from('district_history').select('*').order('start_time', { ascending: false }).limit(50),
    supabase.from('citizen_reports').select('*').order('created_at', { ascending: false }).limit(200)
  ]);

  const staffLocations = staffLocationsData?.reduce((acc: any, row) => {
    acc[row.staff_id] = { lat: row.lat, lng: row.lng, updatedAt: row.updated_at };
    return acc;
  }, {}) || {};

  const eeuData = (eeuRawData || []).map((row: any) => ({
    id: row.id,
    subcity: row.subcity || row.district || 'Unknown',
    district: row.area && row.area !== row.district ? row.area : row.district,
    reason: row.reason || 'Scheduled maintenance',
    active: !row.end_time,
    fetchedAt: row.start_time || row.created_at,
    translatedFrom: row.translated_from || null,
  }));

  // Build report clusters grouped by area
  const reportClusters: Record<string, { count: number; priority: string }> = {};
  for (const report of (citizenReports || [])) {
    const area = report.area || report.location || 'Unknown';
    if (!reportClusters[area]) {
      reportClusters[area] = { count: 0, priority: 'low' };
    }
    reportClusters[area].count++;
  }
  // Assign priority based on count
  for (const area of Object.keys(reportClusters)) {
    const c = reportClusters[area].count;
    reportClusters[area].priority = c >= 10 ? 'critical' : c >= 5 ? 'high' : c >= 3 ? 'medium' : 'low';
  }

  return NextResponse.json({
    stats: {
      totalStaff: staffCount || 0,
      activeOutages: activeOutages || 0,
      totalReports: totalReports || 0,
      totalSubscribers: totalSubs || 0,
      contentItems: contentCount || 0,
      eeuInterruptions: eeuData.length,
    },
    staffList: staffList || [], // Return list of staff
    staffLocations,
    recentFeed: recentFeed || [],
    rawSubscriptions: rawSubscriptions || [],
    eeuData,
    reportClusters,
  });
}

export async function POST(request: Request) {
  const auth = await validateAdmin(request.headers.get('authorization'));
  if (!auth.valid) return NextResponse.json({ error: 'Admin access required' }, { status: 401 });

  const ip = getClientIP(request);
  const rl = RATE_LIMITS.api(ip);
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  try {
    const data = await request.json();
    const { action } = data;

    switch (action) {
      case 'create_staff': {
        const { username, password, name, role, email } = data;
        if (!username || !password || !name || !role) return NextResponse.json({ error: 'Missing logic' }, { status: 400 });

        const { data: newStaff, error } = await supabase.from('staff_users').insert({
          username, password_hash: password, name, role, email
        }).select().single();

        if (error) {
          if (error.code === '23505') return NextResponse.json({ error: 'Username taken' }, { status: 409 });
          throw error;
        }

        await supabase.from('system_feed').insert({ type: 'grid_update', message: `New staff created: ${name}`, area: 'Admin' });
        return NextResponse.json({ success: true, staff: { username, name, role } }, { status: 201 });
      }

      case 'delete_staff': {
        const { staffId } = data;
        if (!staffId) return NextResponse.json({ error: 'Missing staffId' }, { status: 400 });

        // Prevent self-deletion if logged in as admin
        if (staffId === auth.user.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });

        const { error } = await supabase.from('staff_users').delete().eq('id', staffId);
        if (error) throw error;

        await supabase.from('system_feed').insert({ type: 'grid_update', message: `Staff deleted by admin`, area: 'Admin' });
        return NextResponse.json({ success: true });
      }

      case 'add_content': {
        const { type, title, body } = data;
        if (!type || !title || !body) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

        const { data: content, error } = await supabase.from('blog_content').insert({
          title, type, body, created_by: auth.user.name, published: true
        }).select().single();

        if (error) throw error;

        await supabase.from('system_feed').insert({ type: 'grid_update', message: `New ${type} published: ${title}`, area: 'System' });
        return NextResponse.json({ success: true, content }, { status: 201 });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    console.error('Admin API error:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
