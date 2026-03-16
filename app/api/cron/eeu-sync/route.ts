// ============================================
// GridGuard — EEU Sync Cron Job
// ============================================

import { NextResponse } from 'next/server';
import { crawlEEUInterruptions, deactivateOldInterruptions } from '@/lib/eeu-crawler';
import { supabase } from '@/lib/supabase';
import { notifyAreaSubscribers } from '@/lib/mailer';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[EEU Sync] Starting crawl...');

    await deactivateOldInterruptions(48);

    const result = await crawlEEUInterruptions();

    let notificationsCount = 0;

    for (const interruption of result.interruptions) {
      const area = interruption.subcity.toLowerCase();
      
      const { data: subs } = await supabase.from('subscribers')
        .select('*')
        .ilike('district', `%${area}%`);

      if (subs && subs.length > 0) {
        try {
          await notifyAreaSubscribers(
            interruption.subcity,
            subs.map(s => ({ email: s.email, name: s.area })),
            {
              cause: interruption.reason,
              estimatedRestoreTime: interruption.endTime || 'TBD',
              startTime: interruption.startTime,
              status: 'EEU Scheduled Interruption',
              type: 'maintenance',
            }
          );
          notificationsCount += subs.length;
        } catch (err) {
          console.error(`[EEU Sync] Failed email ${interruption.subcity}:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      crawledAt: new Date().toISOString(),
      total: result.total,
      newEntries: result.newEntries,
      notificationsSent: notificationsCount,
      errors: result.errors,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
