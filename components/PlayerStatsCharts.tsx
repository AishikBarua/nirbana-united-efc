import { winRate } from '@/lib/utils';

/**
 * Hand-rolled SVG/CSS charts for the player profile page — no charting
 * library involved (none was already installed, and this project can't
 * currently reach the npm registry to add one). Every number these charts
 * draw comes straight from data already stored on the Player row or in
 * PlayerStatSnapshot; nothing here is estimated or invented.
 */

type WinDrawLoss = { wins: number; draws: number; losses: number };

/** A small donut chart of career Win/Draw/Loss. Shows a placeholder instead of a
 * zero-width circle when the player has no matches recorded yet. */
export function CareerResultDonut({ wins, draws, losses }: WinDrawLoss) {
  const total = wins + draws + losses;
  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return (
      <div className="flex h-40 w-40 flex-col items-center justify-center rounded-full border border-dashed border-gold-400/20 text-center text-xs text-gold-100/40">
        No matches
        <br />
        recorded yet
      </div>
    );
  }

  const segments: { value: number; color: string; label: string }[] = [
    { value: wins, color: '#2dd4bf', label: 'Wins' }, // signal-teal
    { value: draws, color: '#eab308', label: 'Draws' }, // gold-ish
    { value: losses, color: '#64748b', label: 'Losses' }, // muted slate
  ];

  let offsetSoFar = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const fraction = s.value / total;
      const dash = fraction * circumference;
      const gap = circumference - dash;
      // SVG circles are drawn clockwise from the 3 o'clock position by default;
      // rotate -90deg (below) so the first segment starts at 12 o'clock instead.
      const dashOffset = -offsetSoFar;
      offsetSoFar += dash;
      return (
        <circle
          key={s.label}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={s.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${gap}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="butt"
        />
      );
    });

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1f2530" strokeWidth={strokeWidth} />
        {arcs}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-gold-100/70">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label} ({s.value})
          </span>
        ))}
      </div>
    </div>
  );
}

type CareerVsSeasonProps = {
  career: { matchesPlayed: number; goals: number; wins: number; draws: number };
  season: {
    matchesPlayed: number | null;
    goalsFor: number | null;
    wins: number | null;
    winPct: number | null;
  };
};

/** Simple horizontal-bar comparison of career totals vs the current season. */
export function CareerVsSeasonBars({ career, season }: CareerVsSeasonProps) {
  const hasSeasonData = season.matchesPlayed !== null;
  if (!hasSeasonData) {
    return <p className="text-sm text-gold-100/40">Season stats aren&apos;t available for this player yet.</p>;
  }

  const careerWinPct = winRate(career.wins, career.matchesPlayed, career.draws);
  const rows: { label: string; career: number; season: number; suffix?: string }[] = [
    { label: 'Matches Played', career: career.matchesPlayed, season: season.matchesPlayed ?? 0 },
    { label: 'Goals', career: career.goals, season: season.goalsFor ?? 0 },
    { label: 'Win Rate', career: careerWinPct, season: Math.round(season.winPct ?? 0), suffix: '%' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row) => {
        const max = Math.max(row.career, row.season, 1);
        return (
          <div key={row.label}>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gold-100/50">{row.label}</div>
            <div className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-[11px] text-gold-100/40">Career</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full rounded-full bg-gold-400"
                  style={{ width: `${(row.career / max) * 100}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-xs text-gold-100/80">
                {row.career}
                {row.suffix ?? ''}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="w-14 shrink-0 text-[11px] text-gold-100/40">Season</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full rounded-full bg-signal-teal"
                  style={{ width: `${(row.season / max) * 100}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-xs text-gold-100/80">
                {row.season}
                {row.suffix ?? ''}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type Snapshot = { takenAt: Date | string; wins: number; goals: number };

/** Trend line of career wins & goals across snapshots taken at each tracker
 * sync. Needs at least 2 data points to draw a meaningful line — with fewer,
 * shows an honest "not enough history yet" message instead of a fake chart. */
export function StatTrendChart({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length < 2) {
    return (
      <p className="text-sm text-gold-100/40">
        Not enough sync history yet to chart a trend — this fills in automatically as future tracker syncs run.
      </p>
    );
  }

  const width = 560;
  const height = 160;
  const padding = 24;
  const maxWins = Math.max(...snapshots.map((s) => s.wins), 1);
  const maxGoals = Math.max(...snapshots.map((s) => s.goals), 1);

  function points(values: number[], max: number): string {
    return values
      .map((v, i) => {
        const x = padding + (i / (values.length - 1)) * (width - padding * 2);
        const y = height - padding - (v / max) * (height - padding * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  const winsPoints = points(
    snapshots.map((s) => s.wins),
    maxWins
  );
  const goalsPoints = points(
    snapshots.map((s) => s.goals),
    maxGoals
  );

  const firstDate = new Date(snapshots[0].takenAt);
  const lastDate = new Date(snapshots[snapshots.length - 1].takenAt);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-col gap-2">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <polyline points={winsPoints} fill="none" stroke="#2dd4bf" strokeWidth={2.5} />
        <polyline points={goalsPoints} fill="none" stroke="#eab308" strokeWidth={2.5} />
      </svg>
      <div className="flex items-center justify-between text-[11px] text-gold-100/40">
        <span>{fmt(firstDate)}</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-signal-teal" /> Wins
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#eab308' }} /> Goals
          </span>
        </div>
        <span>{fmt(lastDate)}</span>
      </div>
    </div>
  );
}
