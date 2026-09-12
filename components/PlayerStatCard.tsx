'use client';

/**
 * The downloadable, branded player stat card — modeled on cobegbd.com's own
 * "Download" cards (see the two reference images the club owner shared),
 * but restyled in Nirbana United's own dark/gold "gaming card" look rather
 * than a copy of the tracker's blue/white branding, and built only from
 * data this site actually has (see the field-by-field notes below).
 *
 * WHY THE SHAPES ARE DRAWN IN SVG, NOT CSS `clip-path`:
 * html2canvas (the library used to rasterize this into a PNG — see the
 * click handler below) does not support the CSS `clip-path` property, so
 * every angular/cut shape here (the slanted banner and panel, the stat
 * chips' parallelogram cut, the medallion's rings, the outer foil border)
 * is drawn as plain SVG polygons/lines/circles instead. Only ordinary boxes
 * (the photo, the crest circle via `border-radius`, and all text) are plain
 * HTML — those DO render correctly in html2canvas.
 *
 * WHAT'S REAL DATA VS. AN HONEST LIMITATION:
 *  - Photo, name, position, squad number, All-Time Rank, and every PL/W/D/L/
 *    GF/GA/GD number: straight off the `Player` row this site already
 *    stores (synced from the tracker — see lib/trackerSync.ts).
 *  - "Season" is only offered when `seasonMatchesPlayed` is set (a brand
 *    new player may have no season form yet), and its label comes from
 *    `ClubInfo.currentSeasonLabel` (read fresh off the tracker every sync —
 *    see parseSeasonLabel in trackerSync.ts) rather than a hardcoded year,
 *    so it keeps up on its own once the tracker rolls over.
 *  - Man of the Match count is NOT a full career total — we have no such
 *    data source. It only counts matches we've cached a full report for
 *    (see countManOfTheMatch in lib/services/matchService.ts), so the card
 *    always labels it "tracked reports" rather than presenting it as
 *    complete.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export interface PlayerStatCardData {
  slug: string;
  name: string;
  photoUrl: string | null;
  position: string;
  divisionRank: string; // e.g. "#7106" or "Unranked" — see playerService.ts
  squadNumber: string | null; // e.g. "Main #28"
  inGameId: string;
  crestUrl: string;
  siteHost: string;
  motmCount: number;
  allTime: { matchesPlayed: number; wins: number; draws: number; losses: number; goals: number };
  season: { matchesPlayed: number; wins: number; goalsFor: number; goalsAgainst: number; goalDiff: number } | null;
  seasonLabel: string | null;
}

type Kind = 'allTime' | 'season';

const GOLD_50 = '#fbf4e4';
const GOLD_100 = '#f5e6c2';
const GOLD_200 = '#eccf8c';
const GOLD_300 = '#e2b75a';
const GOLD_400 = '#d4a339';
const TEAL = '#2be3c4';
const GREEN = '#3ddc84';
const RED = '#ef4b5f';

const DESIGN_W = 1080;
const DESIGN_H = 1350;

function squadBadge(squadNumber: string | null, inGameId: string): string {
  if (squadNumber) {
    const m = /#\d+/.exec(squadNumber);
    if (m) return m[0];
    return squadNumber;
  }
  return `@${inGameId}`;
}

function formatFooterDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const yy = String(d.getFullYear()).slice(-2);
  return `${months[d.getMonth()]} ${d.getDate()}, ${yy}`;
}

function CrownIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      <polygon
        points="10,78 10,42 32,60 50,20 68,60 90,42 90,78"
        fill={color}
      />
      <rect x="8" y="80" width="84" height="12" fill={color} />
    </svg>
  );
}

/**
 * The card face itself, rendered at a given pixel `width` (height follows
 * the fixed 1080:1350 design ratio). Used twice: a small on-screen preview
 * inside the modal, and a full-resolution (width=1080) off-screen copy that
 * html2canvas actually captures — so what the user sees is always exactly
 * what gets downloaded, just at a different display size.
 */
function CardFace({
  width,
  kind,
  data,
  kindTagText,
  rankLabel,
  footerLabel,
  dateStr,
  t,
}: {
  width: number;
  kind: Kind;
  data: PlayerStatCardData;
  kindTagText: string;
  rankLabel: string;
  footerLabel: string;
  dateStr: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const u = width / DESIGN_W;
  const height = width * (DESIGN_H / DESIGN_W);
  const px = (v: number) => v * u;

  const stats: { label: string; value: string | number; color: string }[] =
    kind === 'allTime'
      ? [
          { label: 'PL', value: data.allTime.matchesPlayed, color: GOLD_300 },
          { label: 'W', value: data.allTime.wins, color: GREEN },
          { label: 'D', value: data.allTime.draws, color: GOLD_200 },
          { label: 'L', value: data.allTime.losses, color: RED },
          { label: 'GF', value: data.allTime.goals, color: TEAL },
        ]
      : data.season
        ? [
            { label: 'PL', value: data.season.matchesPlayed, color: GOLD_300 },
            { label: 'W', value: data.season.wins, color: GREEN },
            { label: 'GF', value: data.season.goalsFor, color: TEAL },
            { label: 'GA', value: data.season.goalsAgainst, color: RED },
            { label: 'GD', value: data.season.goalDiff > 0 ? `+${data.season.goalDiff}` : data.season.goalDiff, color: GOLD_200 },
          ]
        : [];

  // Stat strip geometry, in 1080-design-space (ported 1:1 from the approved
  // mockup — see /tmp scratch script this was designed from).
  const stripMargin = 56;
  const stripGap = 14;
  const stripTop = 1126;
  const stripH = 108;
  const stripW = DESIGN_W - stripMargin * 2;
  const n = stats.length || 1;
  const chipW = (stripW - stripGap * (n - 1)) / n;
  const cut = 16;

  const badge = squadBadge(data.squadNumber, data.inGameId);
  const subtitle = `${data.position}  ·  ${rankLabel}`;

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: px(36),
        overflow: 'hidden',
        background: '#0a0806',
        fontFamily: 'inherit',
      }}
    >
      {/* Photo */}
      {data.photoUrl ? (
        // Plain <img>, not next/image — html2canvas needs a direct,
        // already-loaded <img> element to rasterize; next/image's
        // proxy/srcset indirection isn't necessary here since this is
        // always rendered at a fixed pixel size anyway.
        <img
          src={data.photoUrl}
          alt={data.name}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: '50% 32%',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at 50% 38%, #3a2a0a 0%, #120d0a 70%)',
            color: 'rgba(212,163,57,0.35)',
            fontSize: px(220),
            fontWeight: 700,
          }}
        >
          {data.name.charAt(0)}
        </div>
      )}

      {/* Vignette for legibility */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 60% at 50% 38%, rgba(5,4,3,0) 35%, rgba(5,4,3,0.62) 100%)',
        }}
      />

      {/* All angular/decorative shapes — SVG, since html2canvas can't do CSS clip-path */}
      <svg
        viewBox={`0 0 ${DESIGN_W} ${DESIGN_H}`}
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0 }}
        preserveAspectRatio="none"
      >
        {/* top banner */}
        <polygon points="0,0 1080,0 1080,120 0,190" fill="#0a0806" fillOpacity={0.92} />
        <line x1={0} y1={190} x2={1080} y2={120} stroke={GOLD_400} strokeWidth={5} />
        <line x1={0} y1={180} x2={1080} y2={110} stroke={TEAL} strokeOpacity={0.5} strokeWidth={2} />

        {/* bottom panel */}
        <polygon points="0,1000 1080,940 1080,1350 0,1350" fill="#0a0806" fillOpacity={0.91} />
        <line x1={0} y1={1000} x2={1080} y2={940} stroke={GOLD_400} strokeWidth={5} />
        <line x1={0} y1={1010} x2={1080} y2={950} stroke={TEAL} strokeOpacity={0.47} strokeWidth={2} />

        {/* rating medallion rings */}
        <circle cx={118} cy={210} r={92} fill="#100c09" stroke={GOLD_400} strokeWidth={5} />
        <circle cx={118} cy={210} r={80} fill="none" stroke={TEAL} strokeOpacity={0.55} strokeWidth={2} />

        {/* stat chip shapes only — the value/label TEXT is rendered as
            regular HTML just below, not SVG <text>: html2canvas's support
            for text inside inline SVG is inconsistent across fonts/browsers,
            while plain HTML text is its main, well-supported case. */}
        {stats.map((s, i) => {
          const x0 = stripMargin + i * (chipW + stripGap);
          const x1 = x0 + chipW;
          const points = `${x0 + cut},${stripTop} ${x1},${stripTop} ${x1 - cut},${stripTop + stripH} ${x0},${stripTop + stripH}`;
          return <polygon key={s.label} points={points} fill="rgba(24,19,16,0.92)" stroke={s.color} strokeWidth={2} />;
        })}

        {/* outer foil border, matching the rounded corners */}
        <rect x={4} y={4} width={1072} height={1342} rx={34} fill="none" stroke={GOLD_400} strokeWidth={4} />
        <rect
          x={10}
          y={10}
          width={1060}
          height={1330}
          rx={28}
          fill="none"
          stroke={GOLD_100}
          strokeOpacity={0.35}
          strokeWidth={1}
        />
      </svg>

      {/* Stat chip text — positioned over the SVG polygons above */}
      <div style={{ position: 'absolute', left: px(stripMargin), top: px(stripTop), width: px(stripW), height: px(stripH), display: 'flex' }}>
        {stats.map((s, i) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              marginLeft: i === 0 ? 0 : px(stripGap),
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ color: s.color, fontWeight: 700, fontSize: px(36), lineHeight: 1 }}>{s.value}</div>
            <div style={{ color: 'rgba(245,230,194,0.7)', fontWeight: 700, fontSize: px(15), marginTop: px(6) }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Crest + wordmark */}
      <div
        style={{
          position: 'absolute',
          left: px(36),
          top: px(30),
          width: px(76),
          height: px(76),
          borderRadius: '50%',
          overflow: 'hidden',
          border: `${px(4)}px solid ${GOLD_400}`,
        }}
      >
        <img src={data.crestUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', left: px(130), top: px(38), color: GOLD_100, fontWeight: 700, fontSize: px(26), whiteSpace: 'nowrap' }}>
        NIRBANA UNITED
      </div>
      <div style={{ position: 'absolute', left: px(130), top: px(72), color: TEAL, fontWeight: 700, fontSize: px(19), letterSpacing: px(4), whiteSpace: 'nowrap' }}>
        EFC
      </div>

      {/* Kind tag, top-right */}
      <div
        style={{
          position: 'absolute',
          right: px(44),
          top: px(44),
          textAlign: 'right',
          color: GOLD_300,
          fontWeight: 700,
          fontSize: px(23),
          letterSpacing: px(3),
          whiteSpace: 'nowrap',
          borderBottom: `${px(2)}px solid rgba(212,163,57,0.55)`,
          paddingBottom: px(6),
        }}
      >
        {kindTagText}
      </div>

      {/* Squad-number medallion text */}
      <div
        style={{
          position: 'absolute',
          left: px(118 - 92),
          top: px(210 - 92),
          width: px(184),
          height: px(184),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: GOLD_100, fontWeight: 700, fontSize: px(42), lineHeight: 1 }}>{badge}</div>
        <div style={{ color: 'rgba(226,183,90,0.85)', fontWeight: 700, fontSize: px(14), letterSpacing: px(1), marginTop: px(6), whiteSpace: 'nowrap' }}>
          SQUAD NO.
        </div>
      </div>

      {/* Name + subtitle — the name uses the site's own display font
          (Cinzel, via --font-display) to match every other heading on the
          site, matching this card to the rest of the brand rather than
          just borrowing the ambient body font. */}
      <div
        style={{
          position: 'absolute',
          left: px(56),
          top: px(998),
          width: px(1080 - 112),
          color: GOLD_50,
          fontWeight: 700,
          fontSize: px(50),
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontFamily: 'var(--font-display), serif',
        }}
      >
        {data.name.toUpperCase()}
      </div>
      <div
        style={{
          position: 'absolute',
          left: px(58),
          top: px(1064),
          width: px(1080 - 116),
          color: 'rgba(226,183,90,0.85)',
          fontSize: px(23),
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {subtitle}
      </div>

      {/* MOTM row */}
      <div style={{ position: 'absolute', left: px(56), top: px(1256), display: 'flex', alignItems: 'center', gap: px(10) }}>
        <CrownIcon size={px(26)} color={GOLD_300} />
        <span style={{ color: GOLD_200, fontWeight: 700, fontSize: px(21), whiteSpace: 'nowrap' }}>
          {tc('motm')} &times; {data.motmCount}
        </span>
      </div>
      <div style={{ position: 'absolute', right: px(56), top: px(1262), color: 'rgba(245,230,194,0.45)', fontSize: px(14), fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
        {tc('motmTag')}
      </div>

      {/* Footer */}
      <div style={{ position: 'absolute', left: px(56), right: px(56), top: px(1292), borderTop: `1px solid rgba(212,163,57,0.3)` }} />
      <div style={{ position: 'absolute', left: px(56), top: px(1300), color: 'rgba(245,230,194,0.6)', fontSize: px(16), fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
        {footerLabel} &nbsp;|&nbsp; {data.siteHost} &nbsp;|&nbsp; {dateStr}
      </div>
    </div>
  );
}

export default function PlayerStatCard(data: PlayerStatCardData) {
  const t = useTranslations('playerProfile');
  const tc = useTranslations('playerProfile.statCard');
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>('allTime');
  const [downloading, setDownloading] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const dateStr = useMemo(() => formatFooterDate(new Date()), [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const kindTagText = kind === 'allTime' ? tc('allTime').toUpperCase() : (data.seasonLabel ?? tc('season')).toUpperCase();
  const rankLabel = /^#\d+/.test(data.divisionRank) ? `${t('divisionRank')} ${data.divisionRank}` : data.divisionRank;
  const footerLabel = kind === 'allTime' ? tc('allTimeOfficial') : (data.seasonLabel ?? tc('season'));

  async function handleDownload() {
    if (!exportRef.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: null,
        useCORS: true,
        scale: 1,
        width: DESIGN_W,
        height: DESIGN_H,
      });
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.slug}-${kind === 'allTime' ? 'all-time' : 'season'}-card.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary">
        {tc('downloadButton')}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full border border-gold-400/30 p-2 text-gold-200 hover:bg-gold-400/10"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>

          <div
            className="flex max-h-[90vh] w-full max-w-sm flex-col items-center gap-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {data.season && (
              <div className="flex gap-2 rounded-full border border-gold-400/25 bg-ink-900 p-1">
                <button
                  type="button"
                  onClick={() => setKind('allTime')}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                    kind === 'allTime' ? 'bg-gold-400 text-ink-950' : 'text-gold-200'
                  }`}
                >
                  {tc('allTime')}
                </button>
                <button
                  type="button"
                  onClick={() => setKind('season')}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                    kind === 'season' ? 'bg-gold-400 text-ink-950' : 'text-gold-200'
                  }`}
                >
                  {data.seasonLabel ?? tc('season')}
                </button>
              </div>
            )}

            {/* On-screen preview — a smaller copy of the exact same card */}
            <div className="shrink-0" style={{ width: 320 }}>
              <CardFace
                width={320}
                kind={kind}
                data={data}
                kindTagText={kindTagText}
                rankLabel={rankLabel}
                footerLabel={footerLabel}
                dateStr={dateStr}
                t={tc}
              />
            </div>

            <button type="button" onClick={handleDownload} disabled={downloading} className="btn-primary w-full max-w-xs disabled:opacity-60">
              {downloading ? tc('saving') : tc('save')}
            </button>
            <p className="max-w-xs text-center text-[11px] text-gold-100/40">{tc('motmNote')}</p>
          </div>
        </div>
      )}

      {/* Full-resolution off-screen copy — this is what html2canvas actually
          captures, so the download always matches the preview exactly. */}
      <div style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none' }} aria-hidden="true">
        <div ref={exportRef}>
          <CardFace
            width={DESIGN_W}
            kind={kind}
            data={data}
            kindTagText={kindTagText}
            rankLabel={rankLabel}
            footerLabel={footerLabel}
            dateStr={dateStr}
            t={tc}
          />
        </div>
      </div>
    </>
  );
}
