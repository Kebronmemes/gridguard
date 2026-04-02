import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * ⚠️ SECRET BOOTSTRAP ROUTE
 * Use this to create your first admin using the OFFICIAL Supabase SDK.
 */
export async function GET() {
  // 1. Environment Check
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || url.includes('your-supabase-url')) {
    return NextResponse.json({ 
      error: 'Environment Variables Missing on Vercel!',
      diagnostic: {
        has_url: !!url && !url.includes('your-supabase-url'),
        has_service_key: !!key && !key.includes('your-supabase-service-key'),
        tip: 'Go to Vercel Settings > Environment Variables and add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
      }
    }, { status: 500 });
  }

  const email = 'admin1@gridguard.app';
  const password = 'Password123!';

  try {
    // 2. Access Admin API
    const authAdmin = supabase.auth.admin;
    if (!authAdmin) {
      throw new Error('Supabase Client was not initialized with a Service Role Key. Admin actions are unavailable.');
    }

    // 3. Create or Update User
    console.log(`[Bootstrap] Processing admin: ${email}`);

    const { data: userData, error: authError } = await authAdmin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        role: 'admin', 
        full_name: 'GridGuard Admin' 
      }
    });

    if (authError) {
       if (authError.message.includes('already exists')) {
          // If already exists, just update user_metadata to be safe
          const { data: users } = await authAdmin.listUsers();
          const existing = users?.users.find(u => u.email === email);
          if (existing) {
             await authAdmin.updateUserById(existing.id, {
                password: password,
                user_metadata: { role: 'admin', full_name: 'GridGuard Admin' }
             });
          }
       } else {
          throw authError;
       }
    }

    // --- STAFF USER BOOTSTRAP ---
    const staffEmail = 'staff1@gridguard.app';
    const staffPassword = 'StaffPass123!';

    const { data: staffData, error: staffError } = await authAdmin.createUser({
      email: staffEmail,
      password: staffPassword,
      email_confirm: true,
      user_metadata: { role: 'field_tech', full_name: 'Test Staff Member' }
    });

    if (staffError && staffError.message.includes('already exists')) {
       // Just update metadata
       const { data: users } = await authAdmin.listUsers();
       const existing = users?.users.find(u => u.email === staffEmail);
       if (existing) {
          await authAdmin.updateUserById(existing.id, {
             password: staffPassword,
             user_metadata: { role: 'field_tech', full_name: 'Test Staff' }
          });
       }
    }

    const currentStaffId = staffData?.user?.id || (await authAdmin.listUsers()).data.users.find(u => u.email === staffEmail)?.id;
    if (currentStaffId) {
      await supabase.from('staff_users').upsert({
        id: currentStaffId,
        username: staffEmail,
        name: 'Test Staff Member',
        role: 'field_tech',
        email: staffEmail
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Admin AND Staff accounts are READY.',
      admin: { email, password },
      staff: { email: staffEmail, password: staffPassword }
    });

  } catch (err: any) {
    console.error('[Bootstrap Error]', err);
    return NextResponse.json({ 
      error: 'Bootstrap Failed', 
      message: err.message,
      tip: 'Check your Supabase Service Role Key and Database tables.'
    }, { status: 500 });
  }
}
