'use client';

/**
 * The downloadable, branded "match day" graphic for one round of a
 * tournament — modeled on the same dark/gold "gaming card" look and the
 * same html2canvas technique as components/PlayerStatCard.tsx (see that
 * file's own comment for why every angular/cut shape is drawn in SVG
 * rather than CSS `clip-path`, which html2canvas doesn't support). Unlike
 * the player card, this one has no player photo and a variable number of
 * rows (one per fixture in the round), so its height is computed from the
 * fixture count rather than fixed.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export interface TournamentFixtureCardMatch {
  id: string;
  homePlayerName: string;
  awayPlayerName: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string; // 'SCHEDULED' | 'COMPLETED'
}

export interface TournamentFixtureCardData {
  tournamentName: string;
  round: number;
  roundLabel: string | null;
  scheduledAt: string | Date | null;
  matches: TournamentFixtureCardMatch[];
  crestUrl: string;
  siteHost: string;
}

const GOLD_50 = '#fbf4e4';
const GOLD_100 = '#f5e6c2';
const GOLD_200 = '#eccf8c';
const GOLD_300 = '#e2b75a';
const GOLD_400 = '#d4a339';
const TEAL = '#2be3c4';

const DESIGN_W = 1080;
const HEADER_H = 300;
const ROW_H = 120;
const ROW_GAP = 16;
const FOOTER_H = 96;
const BOTTOM_PAD = 40;

function designHeight(rowCount: number): number {
  const rows = Math.max(rowCount, 1);
  return HEADER_H + rows * ROW_H + (rows - 1) * ROW_GAP + FOOTER_H + BOTTOM_PAD;
}

function formatMatchDay(d: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatFooterDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const yy = String(d.getFullYear()).slice(-2);
  return `${months[d.getMonth()]} ${d.getDate()}, ${yy}`;
}

/**
 * The card face itself, rendered at a given pixel `width` (height follows
 * from the fixture count — see designHeight). Used twice: a small
 * on-screen preview inside the modal, and a full-resolution (width=1080)
 * off-screen copy that html2canvas actually captures, so what the admin
 * sees is always exactly what gets downloaded, just at a different display
 * size — same pattern as PlayerStatCard.
 */
function CardFace({
  width,
  data,
  roundText,
  matchDayText,
  dateStr,
  t,
}: {
  width: number;
  data: TournamentFixtureCardData;
  roundText: string;
  matchDayText: string;
  dateStr: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const u = width / DESIGN_W;
  const rows = data.matches.length || 1;
  const height = designHeight(rows) * u;
  const px = (v: number) => v * u;

  const rowX0 = 56;
  const rowX1 = DESIGN_W - 56;
  const rowW = rowX1 - rowX0;
  const centerBandW = 170;
  const centerX0 = rowX0 + (rowW - centerBandW) / 2;
  const centerX1 = centerX0 + centerBandW;

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
        // Same unitless line-height fix as PlayerStatCard — see that
        // file's own comment for why this matters at full export
        // resolution rather than at the small on-screen preview size.
        lineHeight: 1.15,
      }}
    >
      {/* Background wash */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(58,42,10,0.35) 0%, rgba(10,8,6,0) 60%)',
        }}
      />

      {/* Decorative SVG: header banner slant, divider lines, outer foil border */}
      <svg
        viewBox={`0 0 ${DESIGN_W} ${designHeight(rows)}`}
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0 }}
        preserveAspectRatio="none"
      >
        <polygon points={`0,0 ${DESIGN_W},0 ${DESIGN_W},120 0,190`} fill="#0a0806" fillOpacity={0.92} />
        <line x1={0} y1={190} x2={DESIGN_W} y2={120} stroke={GOLD_400} strokeWidth={5} />
        <line x1={0} y1={180} x2={DESIGN_W} y2={110} stroke={TEAL} strokeOpacity={0.5} strokeWidth={2} />

        <line x1={56} y1={HEADER_H} x2={DESIGN_W - 56} y2={HEADER_H} stroke={GOLD_400} strokeOpacity={0.35} strokeWidth={2} />

        <line
          x1={56}
          y1={HEADER_H + rows * ROW_H + (rows - 1) * ROW_GAP + 16}
          x2={DESIGN_W - 56}
          y2={HEADER_H + rows * ROW_H + (rows - 1) * ROW_GAP + 16}
          stroke="rgba(212,163,57,0.3)"
          strokeWidth={1}
        />

        <rect x={4} y={4} width={DESIGN_W - 8} height={designHeight(rows) - 8} rx={34} fill="none" stroke={GOLD_400} strokeWidth={4} />
        <rect
          x={10}
          y={10}
          width={DESIGN_W - 20}
          height={designHeight(rows) - 20}
          rx={28}
          fill="none"
          stroke={GOLD_100}
          strokeOpacity={0.35}
          strokeWidth={1}
        />
      </svg>

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
        <div
          role="img"
          aria-label=""
          style={{
            width: '100%',
            height: '100%',
            backgroundImage: `url(${data.crestUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      </div>
      <div style={{ position: 'absolute', left: px(130), top: px(38), color: GOLD_100, fontWeight: 700, fontSize: px(26), whiteSpace: 'nowrap' }}>
        NIRBANA UNITED
      </div>
      <div style={{ position: 'absolute', left: px(130), top: px(72), color: TEAL, fontWeight: 700, fontSize: px(19), letterSpacing: px(4), whiteSpace: 'nowrap' }}>
        EFC
      </div>

      {/* Tournament name */}
      <div
        style={{
          position: 'absolute',
          left: px(56),
          top: px(146),
          width: px(DESIGN_W - 112),
          color: GOLD_50,
          fontWeight: 700,
          fontSize: px(44),
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontFamily: 'var(--font-display), serif',
        }}
      >
        {data.tournamentName.toUpperCase()}
      </div>

      {/* Round + match-day tag */}
      <div
        style={{
          position: 'absolute',
          left: px(56),
          top: px(206),
          color: GOLD_300,
          fontWeight: 700,
          fontSize: px(20),
          letterSpacing: px(2),
          whiteSpace: 'nowrap',
        }}
      >
        {roundText} &nbsp;&middot;&nbsp; {matchDayText}
      </div>

      {/* Scheduled date/time — the headline info this whole card exists for */}
      <div
        style={{
          position: 'absolute',
          left: px(56),
          top: px(240),
          color: data.scheduledAt ? TEAL : 'rgba(245,230,194,0.4)',
          fontWeight: 700,
          fontSize: px(32),
          whiteSpace: 'nowrap',
        }}
      >
        {dateStr}
      </div>

      {/* Fixture rows */}
      {data.matches.map((m, i) => {
        const rowTop = HEADER_H + 20 + i * (ROW_H + ROW_GAP);
        const isCompleted = m.status === 'COMPLETED' && m.homeScore != null && m.awayScore != null;
        return (
          <div
            key={m.id}
            style={{
              position: 'absolute',
              left: px(rowX0),
              top: px(rowTop),
              width: px(rowW),
              height: px(ROW_H - 8),
              borderRadius: px(16),
              background: 'rgba(24,19,16,0.75)',
              border: `${px(1.5)}px solid rgba(212,163,57,0.28)`,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: px(centerX0 - rowX0 - 16),
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: px(24),
                color: GOLD_100,
                fontWeight: 700,
                fontSize: px(27),
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'right',
              }}
            >
              {m.homePlayerName}
            </div>

            <div
              style={{
                position: 'absolute',
                left: px(centerX0 - rowX0),
                top: 0,
                width: px(centerBandW),
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isCompleted ? (
                <>
                  <div style={{ color: GOLD_200, fontWeight: 700, fontSize: px(34), lineHeight: 1 }}>
                    {m.homeScore} &ndash; {m.awayScore}
                  </div>
                  <div style={{ color: 'rgba(245,230,194,0.45)', fontWeight: 700, fontSize: px(12), letterSpacing: px(1), marginTop: px(4) }}>
                    {t('finalScoreTag')}
                  </div>
                </>
              ) : (
                <div style={{ color: TEAL, fontWeight: 700, fontSize: px(24), letterSpacing: px(2) }}>{t('vs')}</div>
              )}
            </div>

            <div
              style={{
                position: 'absolute',
                left: px(centerX1 - rowX0),
                top: 0,
                width: px(rowX1 - centerX1 - 16),
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingLeft: px(24),
                color: GOLD_100,
                fontWeight: 700,
                fontSize: px(27),
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {m.awayPlayerName}
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          left: px(56),
          top: px(HEADER_H + rows * ROW_H + (rows - 1) * ROW_GAP + 32),
          color: 'rgba(245,230,194,0.6)',
          fontSize: px(16),
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
        }}
      >
        {t('cardTag')} &nbsp;|&nbsp; {data.siteHost} &nbsp;|&nbsp; {formatFooterDate(new Date())}
      </div>
    </div>
  );
}

export default function TournamentFixtureCard({ data, onClose }: { data: TournamentFixtureCardData; onClose: () => void }) {
  const t = useTranslations('admin.tournaments.fixtureCard');
  const tc = useTranslations('common');
  const [downloading, setDownloading] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const roundText = `${t('roundPrefix')} ${data.round}${data.roundLabel ? ` · ${data.roundLabel}` : ''}`;
  const dateStr = useMemo(() => {
    if (!data.scheduledAt) return t('notScheduledCard');
    return formatMatchDay(new Date(data.scheduledAt));
  }, [data.scheduledAt, t]);

  async function handleDownload() {
    if (!exportRef.current) return;
    setDownloading(true);
    try {
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        await document.fonts.ready;
      }
      const { default: html2canvas } = await import('html2canvas');
      const rows = data.matches.length || 1;
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: null,
        useCORS: true,
        scale: 1,
        width: DESIGN_W,
        height: designHeight(rows),
      });
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fixtures-round-${data.round}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full border border-gold-400/30 p-2 text-gold-200 hover:bg-gold-400/10"
        onClick={onClose}
      >
        ✕
      </button>

      <div className="flex max-h-[90vh] w-full max-w-sm flex-col items-center gap-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0" style={{ width: 320 }}>
          <CardFace width={320} data={data} roundText={roundText} matchDayText={t('matchDayTag')} dateStr={dateStr} t={t} />
        </div>

        <button type="button" onClick={handleDownload} disabled={downloading} className="btn-primary w-full max-w-xs disabled:opacity-60">
          {downloading ? t('saving') : t('save')}
        </button>
        <button type="button" onClick={onClose} className="text-xs text-gold-100/40 underline">
          {tc('cancel')}
        </button>
      </div>

      {/* Full-resolution off-screen copy — this is what html2canvas actually captures */}
      <div style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none' }} aria-hidden="true">
        <div ref={exportRef}>
          <CardFace width={DESIGN_W} data={data} roundText={roundText} matchDayText={t('matchDayTag')} dateStr={dateStr} t={t} />
        </div>
      </div>
    </div>
  );
}
