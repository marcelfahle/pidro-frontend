import { formatDate, t } from '@pidro/shared';

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * When something happened, in the words every friend line uses: "today",
 * "yesterday", "2 days ago", "last week", "in September" (with the year once
 * it is a year back). Counted in calendar days on the player's clock; a date
 * from the future reads "today". Null when the date cannot be read.
 */
export function relativeDay(value: string | Date, now: Date = new Date()): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  // Rounded, because a day across a clock change is 23 or 25 hours.
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY);
  if (days <= 0) return t('when.today');
  if (days === 1) return t('when.yesterday');
  if (days < 7) return t('when.days_ago', { count: days });
  if (days < 14) return t('when.last_week');
  const months =
    now.getFullYear() * 12 + now.getMonth() - (date.getFullYear() * 12 + date.getMonth());
  const month = formatDate(
    date,
    months < 12 ? { month: 'long' } : { month: 'long', year: 'numeric' }
  );
  return t('when.in_month', { month });
}
