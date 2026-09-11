import { NextResponse } from 'next/server';

/**
 * Standardizes how an API route responds when something unexpected goes
 * wrong, so a database hiccup or bug never turns into a raw, unhandled
 * crash for whatever called the route (an admin form's fetch, a public
 * page's data loader). Every route's catch blocks should funnel through
 * this instead of assuming any thrown error means "not found" — that used
 * to mislabel a real server problem (e.g. a lost database connection) as a
 * 404, which is misleading and makes real issues harder to diagnose.
 *
 * - Prisma "record to update/delete not found" (P2025) -> 404. This is the
 *   one case where blaming "not found" is actually correct.
 * - Prisma unique-constraint violation (P2002) -> 409 Conflict.
 * - Anything else -> 500, logged server-side (so it's diagnosable from the
 *   terminal running `npm run dev`) with a generic, safe message sent to
 *   the client — never the raw error, which could leak internal details
 *   like table/column names or file paths.
 */
export function apiErrorResponse(error: unknown, notFoundMessage = 'Not found') {
  const code = prismaErrorCode(error);

  if (code === 'P2025') {
    return NextResponse.json({ error: notFoundMessage }, { status: 404 });
  }
  if (code === 'P2002') {
    return NextResponse.json(
      { error: 'A record with these details already exists.' },
      { status: 409 }
    );
  }

  console.error(error);
  return NextResponse.json(
    { error: 'Something went wrong on our end. Please try again shortly.' },
    { status: 500 }
  );
}

function prismaErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}
