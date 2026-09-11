export default function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card-surface flex flex-col items-center justify-center gap-1 px-4 py-5 text-center animate-rise">
      <div className="font-display text-3xl font-bold text-gold-300">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-widest text-gold-100/50">{label}</div>
    </div>
  );
}
