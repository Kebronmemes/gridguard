import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function bootstrapStaff() {
  const authAdmin = supabase.auth.admin;
  if (!authAdmin) throw new Error('Supabase Service Role Key is missing on Vercel.');

  const email = 'staff1@gridguard.app';
  const password = 'StaffPass123!';
  const name = 'Test Staff Member';
  const role = 'field_tech';

  console.log(`[Bootstrap] Synchronizing staff: ${email}...`);

  // 1. Try to create the user
  const { data, error } = await authAdmin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name: name }
  });

  let userId = data?.user?.id;

  // 2. If already exists, update the password and metadata instead
  if (error && (error.message.includes('already registered') || error.message.includes('already exists'))) {
    const { data: users } = await authAdmin.listUsers();
    const existing = users?.users.find(u => u.email === email);
    if (existing) {
      userId = existing.id;
      await authAdmin.updateUserById(existing.id, {
        password: password,
        user_metadata: { role, full_name: name }
      });
    }
  } else if (error) {
    throw error;
  }

  // 3. Ensure record exists in the public.staff_users table
  if (userId) {
    const { error: dbError } = await supabase.from('staff_users').upsert({
      id: userId,
      username: email,
      name: name,
      role: role,
      email: email
    });
    if (dbError) throw new Error(`Database error mirroring staff: ${dbError.message}`);
  }

  return { email, password };
}

export async function GET() {
  try {
    const creds = await bootstrapStaff();
    return NextResponse.json({ 
      success: true, 
      message: 'Test Staff account is READY.',
      credentials: creds,
      login_url: '/staff/login'
    });
  } catch (err: any) {
    console.error('[Bootstrap Error]', err);
    return NextResponse.json({ 
      error: 'Staff Bootstrap Failed', 
      message: err.message,
      tip: 'Check your Vercel Environment Variables and Supabase Tables.'
    }, { status: 500 });
  }
}
