import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { newsSchema } from '@/lib/validation';
import { listNews, createNewsPost } from '@/lib/services/newsService';
import { createNotification } from '@/lib/services/notificationService';
import { apiErrorResponse } from '@/lib/apiErrors';

export async function GET() {
  try {
    const posts = await listNews();
    return NextResponse.json(posts);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = newsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let post;
  try {
    post = await createNewsPost(parsed.data);
  } catch (error) {
    return apiErrorResponse(error);
  }

  // Best-effort: the post itself is already saved successfully at this
  // point, so a failure putting it on the notification feed shouldn't turn
  // into an error response for the person who just published it.
  try {
    await createNotification({
      type: 'NEWS',
      title: post.title,
      body: post.body.length > 140 ? `${post.body.slice(0, 140).trimEnd()}…` : post.body,
      href: `/news/${post.id}`,
    });
  } catch (error) {
    console.error('Failed to create notification for news post', post.id, error);
  }

  return NextResponse.json(post, { status: 201 });
}
