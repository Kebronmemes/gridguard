// ============================================
// GridGuard — Resend Email Utility
// ============================================

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_fallback');

export interface OutageAlertEmail {
  to: string;
  userName: string;
  area: string;
  cause: string;
  estimatedRestoreTime: string;
  startTime: string;
  status: string;
  type: 'outage' | 'maintenance' | 'resolved';
}

export async function sendOutageAlert(data: OutageAlertEmail): Promise<boolean> {
  const subjectMap = {
    outage: `GridGuard Alert – Power Outage in ${data.area}`,
    maintenance: `GridGuard Notice – Scheduled Maintenance in ${data.area}`,
    resolved: `GridGuard Update – Power Restored in ${data.area}`,
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
    .container { max-width: 500px; margin: 20px auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; }
    .header { padding: 24px; background: linear-gradient(135deg, ${data.type === 'resolved' ? '#059669' : data.type === 'maintenance' ? '#d97706' : '#ef4444'}22, #1e293b); border-bottom: 1px solid #334155; }
    .header h1 { margin: 0; color: #f8fafc; font-size: 18px; }
    .header p { margin: 4px 0 0; color: #94a3b8; font-size: 13px; }
    .body { padding: 24px; }
    .field { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #334155; }
    .field-label { color: #94a3b8; font-size: 13px; }
    .field-value { color: #f1f5f9; font-size: 13px; font-weight: 600; }
    .footer { padding: 16px 24px; background: #0f172a; text-align: center; color: #475569; font-size: 11px; }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .status-active { background: #ef444422; color: #f87171; }
    .status-maintenance { background: #f59e0b22; color: #fbbf24; }
    .status-resolved { background: #22c55e22; color: #4ade80; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${subjectMap[data.type]}</h1>
      <p>GridGuard Monitoring System – Ethiopian Electric Utility</p>
    </div>
    <div class="body">
      <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 16px;">Hi ${data.userName},</p>
      <div class="field"><span class="field-label">Area</span><span class="field-value">${data.area}</span></div>
      <div class="field"><span class="field-label">Status</span><span class="status-badge status-${data.type === 'resolved' ? 'resolved' : data.type === 'maintenance' ? 'maintenance' : 'active'}">${data.status}</span></div>
      <div class="field"><span class="field-label">Cause</span><span class="field-value">${data.cause}</span></div>
      <div class="field"><span class="field-label">Started</span><span class="field-value">${data.startTime}</span></div>
      <div class="field"><span class="field-label">Est. Restoration</span><span class="field-value">${data.estimatedRestoreTime}</span></div>
    </div>
    <div class="footer">
      GridGuard – Ethiopian Electric Utility Monitoring Platform<br/>
      Emergency Hotline: 939
    </div>
  </div>
</body>
</html>`;

  try {
    const { data: res, error } = await resend.emails.send({
      from: 'GridGuard Alerts <alerts@gridguard.app>',
      to: data.to,
      subject: subjectMap[data.type],
      html,
    });

    if (error) {
      console.error('Email send error:', error);
      return false;
    }

    console.log(`Email sent to ${data.to} via Resend. ID: ${res?.id}`);
    return true;
  } catch (error) {
    console.error('Resend catch error:', error);
    return false;
  }
}

// Send to all subscribers for an area
export async function notifyAreaSubscribers(
  area: string,
  subscribers: Array<{ email: string; name?: string }>,
  details: { cause: string; estimatedRestoreTime: string; startTime: string; status: string; type: 'outage' | 'maintenance' | 'resolved' }
): Promise<number> {
  let sent = 0;
  for (const sub of subscribers) {
    const success = await sendOutageAlert({
      to: sub.email,
      userName: sub.name || 'Subscriber',
      area,
      ...details,
    });
    if (success) sent++;
  }
  console.log(`Notified ${sent}/${subscribers.length} subscribers in ${area}`);
  return sent;
}
