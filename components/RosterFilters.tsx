'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/lib/navigation';
import { useSearchParams } from 'next/navigation';

export default function RosterFilters({
  positions,
  divisions,
}: {
  positions: string[];
  divisions: string[];
}) {
  const t = useTranslations('players');
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-8 flex flex-wrap gap-3">
      <select
        className="input-field w-auto"
        defaultValue={searchParams.get('sort') || 'joinDate'}
        onChange={(e) => updateParam('sort', e.target.value)}
        aria-label={t('sortBy')}
      >
        <option value="joinDate">{t('sortJoinDate')}</option>
        <option value="goals">{t('sortGoals')}</option>
        <option value="divisionRank">{t('sortDivision')}</option>
        <option value="name">{t('sortName')}</option>
      </select>

      <select
        className="input-field w-auto"
        defaultValue={searchParams.get('position') || ''}
        onChange={(e) => updateParam('position', e.target.value)}
        aria-label={t('filterPosition')}
      >
        <option value="">{t('allPositions')}</option>
        {positions.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <select
        className="input-field w-auto"
        defaultValue={searchParams.get('division') || ''}
        onChange={(e) => updateParam('division', e.target.value)}
        aria-label={t('filterDivision')}
      >
        <option value="">{t('allDivisions')}</option>
        {divisions.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  );
}
