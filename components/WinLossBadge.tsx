export default function WinLossBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  const cls = result === 'W' ? 'badge-win' : result === 'D' ? 'badge-draw' : 'badge-loss';
  return <span className={cls}>{result}</span>;
}
