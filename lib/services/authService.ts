import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

const DUMMY_HASH = '$2a$12$invalidsaltinvalidsaltinuLQ2p1n3mF8kQhq6d8w0nQ0m2u3q6e';

/**
 * Verifies an admin's email/password and returns the admin row if valid, or
 * null otherwise. Always runs bcrypt.compare (even against a dummy hash when
 * no such admin exists) so the response takes the same time either way —
 * avoids leaking which emails are registered via response timing.
 */
export async function verifyAdminCredentials(email: string, password: string) {
  const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
  const hashToCompare = admin?.passwordHash || DUMMY_HASH;
  const valid = await bcrypt.compare(password, hashToCompare);
  return admin && valid ? admin : null;
}

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: 'wrongPassword' | 'accountNotFound' };

/**
 * Changes an already-logged-in admin's own password, stored hashed in the
 * database — this is the supported alternative to editing ADMIN_PASSWORD in
 * .env (which only ever seeds the *first* account, on first run). Requires
 * the correct current password first, exactly like changing a password on
 * any normal account, so a stolen/left-open admin session alone still isn't
 * enough to lock the real owner out.
 */
export async function updateAdminPassword(
  adminId: string,
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResult> {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) return { ok: false, error: 'accountNotFound' };

  const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!valid) return { ok: false, error: 'wrongPassword' };

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash } });
  return { ok: true };
}
