import { NextRequest, NextResponse } from 'next/server';
import { commentSchema } from '@/lib/validation';
import { listApprovedComments, createComment } from '@/lib/services/commentService';
import { getNewsPost } from '@/lib/services/newsService';
import { getGalleryImage } from '@/lib/services/galleryService';
import { isCurrentPlayerName } from '@/lib/services/playerService';
import { rateLimit } from '@/lib/rateLimit';
import { apiErrorResponse } from '@/lib/apiErrors';

// Public, read-only: only ever returns APPROVED comments — a pending
// comment is invisible here regardless of who's asking, since this route
// has no admin check at all. The admin moderation queue lives at
// /admin/comments (a server component reading the DB directly, not this
// route) and PUT/DELETE on a single comment is /api/comments/[id].
export async function GET(request: NextRequest) {
  const targetType = request.nextUrl.searchParams.get('targetType');
  const targetId = request.nextUrl.searchParams.get('targetId');

  if ((targetType !== 'NEWS' && targetType !== 'GALLERY') || !targetId) {
    return NextResponse.json({ error: 'targetType and targetId are required' }, { status: 400 });
  }

  try {
    const comments = await listApprovedComments(targetType, targetId);
    return NextResponse.json({ comments });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// Public: anyone can submit a comment without logging in — that's the
// point (the site has no visitor accounts). Every comment still has to
// name a real squad member (checked below) and lands PENDING, invisible to
// other visitors until an admin approves it from /admin/comments.
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const limit = rateLimit(`comment:${ip}`, { limit: 5, windowSeconds: 600 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many comments submitted. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { targetType, targetId, authorName } = parsed.data;

  try {
    const targetExists =
      targetType === 'NEWS' ? Boolean(await getNewsPost(targetId)) : Boolean(await getGalleryImage(targetId));
    if (!targetExists) {
      return NextResponse.json({ error: 'That post or photo no longer exists.' }, { status: 404 });
    }

    const validName = await isCurrentPlayerName(authorName);
    if (!validName) {
      return NextResponse.json(
        { error: 'Please pick your name from the @ list — that name is not on the current roster.' },
        { status: 400 }
      );
    }

    const comment = await createComment(parsed.data);
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
