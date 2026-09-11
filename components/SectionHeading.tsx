export default function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <div className="mb-1 text-xs font-bold uppercase tracking-[0.25em] text-gold-400/80">{eyebrow}</div>
        )}
        <h2 className="font-display text-2xl font-bold text-gold-100 sm:text-3xl">{title}</h2>
        <div className="mt-2 h-[3px] w-14 rounded bg-gold-400" />
      </div>
      {action}
    </div>
  );
}
