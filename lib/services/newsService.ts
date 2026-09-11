import { prisma } from '@/lib/db';
import type { z } from 'zod';
import type { newsSchema } from '@/lib/validation';

type NewsInput = z.infer<typeof newsSchema>;

/** Pass `limit` to cap results (used by the homepage's "Latest News" preview). */
export function listNews(limit?: number) {
  return prisma.news.findMany({
    orderBy: { publishedDate: 'desc' },
    ...(limit ? { take: limit } : {}),
  });
}

export function getNewsPost(id: string) {
  return prisma.news.findUnique({ where: { id } });
}

/** Site search: news posts whose title or body contains `query`. */
export function searchNews(query: string, limit = 5) {
  return prisma.news.findMany({
    where: { OR: [{ title: { contains: query } }, { body: { contains: query } }] },
    take: limit,
    orderBy: { publishedDate: 'desc' },
  });
}

export function createNewsPost(input: NewsInput) {
  return prisma.news.create({
    data: { ...input, publishedDate: input.publishedDate || new Date() },
  });
}

export function updateNewsPost(id: string, input: NewsInput) {
  return prisma.news.update({ where: { id }, data: input });
}

export function deleteNewsPost(id: string) {
  return prisma.news.delete({ where: { id } });
}
