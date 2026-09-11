import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { approveComment, deleteComment } from '@/lib/services/commentService';
import { apiErrorResponse } from '@/lib/apiErrors';

// Admin-only for both methods — checked directly here rather than via
// middleware.ts's PROTECTED_API_PREFIXES, because /api/comments itself must
// stay open for the public POST (submitting a comment needs no login) and
// that list only gates whole prefixes, not individual methods on a
// dynamic sub-route. Same pattern as /api/admin/sync-tracker.

// Approves a pending comment so it becomes visible on the public site.
export async function PUT(_request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const comment = await approveComment(params.id);
    return NextResponse.json(comment);
  } catch (error) {
    return apiErrorResponse(error, 'Comment not found');
  }
}

// Removes a comment permanently — used for both rejecting a pending one and
// taking down an already-approved one later.
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await deleteComment(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Comment not found');
  }
}
