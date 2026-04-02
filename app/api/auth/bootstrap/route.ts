import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * ⚠️ SECRET BOOTSTRAP ROUTE
 * Use this to create your first admin using the OFFICIAL Supabase SDK.
 */
export async function GET() {
  const email = 'admin1@gridguard.app';
  const password = 'Password123!';

  try {
    console.log(`[Bootstrap] Attempting to create: ${email}`);

    // 1. Official SignUp (Handles Hashing & Confirmation perfectly)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        role: 'admin', 
        full_name: 'GridGuard Master Admin' 
      }
    });

    if (error) {
       // If user already exists, we just update it
       if (error.message.includes('already exists')) {
          const { data: users } = await supabase.auth.admin.listUsers();
          const existing = users?.users.find(u => u.email === email);
          if (existing) {
             await supabase.auth.admin.updateUserById(existing.id, {
                password: password,
                user_metadata: { role: 'admin', full_name: 'GridGuard Admin' }
             });
             return NextResponse.json({ success: true, message: 'Admin account UPDATED with new password.' });
          }
       }
       throw error;
    }

    // 2. Ensure mirrored in staff_users table
    if (data.user) {
      await supabase.from('staff_users').upsert({
        id: data.user.id,
        username: email,
        name: 'GridGuard Admin',
        role: 'admin',
        email: email
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Admin account CREATED successfully using official SDK.',
      credentials: { email, password }
    });

  } catch (err: any) {
    console.error('[Bootstrap Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
