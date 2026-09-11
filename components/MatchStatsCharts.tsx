/**
 * Hand-rolled SVG/CSS charts for the /matches page — same approach as
 * components/PlayerStatsCharts.tsx (no charting library available), reusing
 * real match history that's already stored (dates + scores), no invented or
 * estimated numbers.
 */

type MatchPoint = { date: Date | string; ourScore: number; opponentScore: number };

/** Trend line of goals for vs goals against across every completed match,
 * oldest to newest. Needs at least 2 matches to draw a meaningful line. */
export function GoalsTrendChart({ matches }: { matches: MatchPoint[] }) {
  if (matches.length < 2) {
    return <p className="text-sm text-gold-100/40">Not enough match history yet to chart a trend.</p>;
  }

  const width = 640;
  const height = 180;
  const padding = 24;
  const maxGoals = Math.max(...matches.map((m) => Math.max(m.ourScore, m.opponentScore)), 1);

  function points(values: number[]): string {
    return values
      .map((v, i) => {
        const x = padding + (i / (values.length - 1)) * (width - padding * 2);
        const y = height - padding - (v / maxGoals) * (height - padding * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  const gfPoints = points(matches.map((m) => m.ourScore));
  const gaPoints = points(matches.map((m) => m.opponentScore));

  const firstDate = new Date(matches[0].date);
  const lastDate = new Date(matches[matches.length - 1].date);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-col gap-2">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <polyline points={gfPoints} fill="none" stroke="#2dd4bf" strokeWidth={2.5} />
        <polyline points={gaPoints} fill="none" stroke="#f87171" strokeWidth={2.5} />
      </svg>
      <div className="flex items-center justify-between text-[11px] text-gold-100/40">
        <span>{fmt(firstDate)}</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-signal-teal" /> Goals For
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#f87171' }} /> Goals Against
          </span>
        </div>
        <span>{fmt(lastDate)}</span>
      </div>
    </div>
  );
}

type FormResult = 'W' | 'D' | 'L';

const FORM_COLOR: Record<FormResult, string> = {
  W: '#2dd4bf', // signal-teal
  D: '#eab308', // gold
  L: '#64748b', // muted slate
};

/** Small strip of the most recent results, oldest (left) to newest (right) —
 * the same idea as a "form guide" on a real football site. */
export function FormStrip({ results }: { results: FormResult[] }) {
  if (results.length === 0) {
    return <p className="text-sm text-gold-100/40">No results recorded yet.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {results.map((r, i) => (
        <span
          key={i}
          title={r === 'W' ? 'Win' : r === 'D' ? 'Draw' : 'Loss'}
          className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-ink-950"
          style={{ backgroundColor: FORM_COLOR[r] }}
        >
          {r}
        </span>
      ))}
    </div>
  );
}
