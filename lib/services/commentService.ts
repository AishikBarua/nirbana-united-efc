import { prisma } from '@/lib/db';
import type { z } from 'zod';
import type { commentSchema } from '@/lib/validation';
import { getNewsPost } from '@/lib/services/newsService';
import { getGalleryImage } from '@/lib/services/galleryService';

type CommentInput = z.infer<typeof commentSchema>;
type TargetType = 'NEWS' | 'GALLERY';

/** Approved comments for one news post or gallery photo, oldest first (a
 * normal conversation reading order) — the public comment thread. */
export function listApprovedComments(targetType: TargetType, targetId: string) {
  return prisma.comment.findMany({
    where: { targetType, targetId, status: 'APPROVED' },
    orderBy: { createdAt: 'asc' },
  });
}

/** Every comment across the whole site for the admin moderation queue,
 * newest first. Pass `status` to narrow to just PENDING (the default
 * queue view) or APPROVED (an audit/history view); omit for everything. */
export function listCommentsForAdmin(status?: 'PENDING' | 'APPROVED') {
  return prisma.comment.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
  });
}

export function countPendingComments() {
  return prisma.comment.count({ where: { status: 'PENDING' } });
}

/** Same as listCommentsForAdmin, but with a human-readable `targetLabel`
 * attached to each row (the post's title, or the photo's caption) so the
 * moderation page never has to show a bare News/GalleryImage id. */
export async function listCommentsForAdminWithLabels(status?: 'PENDING' | 'APPROVED') {
  const comments = await listCommentsForAdmin(status);
  return Promise.all(
    comments.map(async (comment) => {
      if (comment.targetType === 'NEWS') {
        const post = await getNewsPost(comment.targetId);
        return { ...comment, targetLabel: post ? post.title : 'Deleted post' };
      }
      const image = await getGalleryImage(comment.targetId);
      return { ...comment, targetLabel: image ? image.caption || 'Gallery photo' : 'Deleted photo' };
    })
  );
}

export function createComment(input: CommentInput) {
  return prisma.comment.create({ data: { ...input, status: 'PENDING' } });
}

export function approveComment(id: string) {
  return prisma.comment.update({ where: { id }, data: { status: 'APPROVED', approvedAt: new Date() } });
}

export function deleteComment(id: string) {
  return prisma.comment.delete({ where: { id } });
}
