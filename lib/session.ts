import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const secretKey = process.env.JWT_SECRET || 'gridguard-southwestacademy-2026';
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

export async function createSession(response: NextResponse, user: any) {
  const expires = new Date(Date.now() + 8 * 3600 * 1000); // 8 hours
  const session = await encrypt({ id: user.id, username: user.username, role: user.role, name: user.name });

  response.cookies.set('gridguard_session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expires,
    sameSite: 'lax',
    path: '/',
  });
}

export function getSession() {
  const session = cookies().get('gridguard_session')?.value;
  if (!session) return null;
  return decrypt(session);
}

export function clearSession(response: NextResponse) {
  response.cookies.set('gridguard_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
    sameSite: 'lax',
    path: '/',
  });
}
