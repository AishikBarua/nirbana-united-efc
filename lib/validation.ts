import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

export const playerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  inGameId: z.string().trim().min(1).max(100),
  photoUrl: z.string().trim().max(500).optional().nullable(),
  joinDate: z.coerce.date(),
  position: z.string().trim().min(1).max(60),
  divisionRank: z.string().trim().min(1).max(60),
  goals: z.coerce.number().int().min(0).max(100000).default(0),
  matchesPlayed: z.coerce.number().int().min(0).max(100000).default(0),
  wins: z.coerce.number().int().min(0).max(100000).default(0),
  draws: z.coerce.number().int().min(0).max(100000).default(0),
  losses: z.coerce.number().int().min(0).max(100000).default(0),
  squad: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  favoritePlayer: z.string().trim().max(60).optional().nullable(),
  favoritePlayerImage: z.string().trim().max(500).optional().nullable(),
  bio: z.string().trim().max(2000).optional().nullable(),
  featured: z.coerce.boolean().default(false),
});

export const matchSchema = z.object({
  opponent: z.string().trim().min(1).max(100),
  opponentCrest: z.string().trim().max(500).optional().nullable(),
  date: z.coerce.date(),
  ourScore: z.coerce.number().int().min(0).max(999).optional().nullable(),
  opponentScore: z.coerce.number().int().min(0).max(999).optional().nullable(),
  status: z.enum(['UPCOMING', 'COMPLETED']),
  competition: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  // Admin-pasted tracker match-report link/id (e.g.
  // "https://cobegbd.com/match/?id=59198", or just "59198") — lets an admin
  // manually attach a full match report to ANY match, including one that
  // completed before this feature existed (the automatic capture in
  // trackerSync.ts only ever sees a match's id while it's still an upcoming
  // fixture — see the Match model's `cobegMatchId` comment). Accepts either
  // a full tracker URL or a bare number; anything else is treated as "not
  // provided" rather than rejecting the whole match save over one optional
  // field. Once saved, the next tracker sync (automatic or the dashboard
  // button) fetches and caches the full report for it, same as an
  // automatically-captured one — see lib/matchReportSync.ts.
  cobegMatchId: z
    .string()
    .trim()
    .max(300)
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      const idParam = /[?&]id=(\d+)/.exec(val);
      if (idParam) return parseInt(idParam[1], 10);
      const bareNumber = /^\d+$/.exec(val);
      if (bareNumber) return parseInt(val, 10);
      return null;
    }),
});

export const newsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20000),
  imageUrl: z.string().trim().max(500).optional().nullable(),
  publishedDate: z.coerce.date().optional(),
});

export const standingSchema = z.object({
  teamName: z.string().trim().min(1).max(100),
  position: z.coerce.number().int().min(1).max(1000),
  points: z.coerce.number().int().min(0).max(100000).default(0),
  played: z.coerce.number().int().min(0).max(100000).default(0),
  won: z.coerce.number().int().min(0).max(100000).default(0),
  drawn: z.coerce.number().int().min(0).max(100000).default(0),
  lost: z.coerce.number().int().min(0).max(100000).default(0),
  isUs: z.coerce.boolean().default(false),
});

export const commentSchema = z.object({
  targetType: z.enum(['NEWS', 'GALLERY']),
  targetId: z.string().trim().min(1).max(100),
  authorName: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(1000),
});

export const galleryImageSchema = z.object({
  imageUrl: z.string().trim().min(1).max(500),
  caption: z.string().trim().max(300).optional().nullable(),
});

export const playerHighlightSchema = z.object({
  inGameId: z.string().trim().min(1).max(100),
  playerName: z.string().trim().min(1).max(100),
  imageUrl: z.string().trim().min(1).max(500),
  caption: z.string().trim().max(300).optional().nullable(),
  matchOpponent: z.string().trim().max(100).optional().nullable(),
  matchDate: z.coerce.date().optional().nullable(),
  matchScore: z.string().trim().max(20).optional().nullable(),
  matchCompetition: z.string().trim().max(100).optional().nullable(),
});

export const clubInfoSchema = z.object({
  clubName: z.string().trim().min(1).max(150),
  tagline: z.string().trim().max(200).optional().nullable(),
  founded: z.string().trim().max(20).optional().nullable(),
  history: z.string().trim().max(20000).optional().nullable(),
  achievements: z.array(z.string().trim().min(1).max(200)).max(100).default([]),
});
