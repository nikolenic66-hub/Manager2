const LIVE_STATUSES = new Set([
  'LIVE',
  'IN_PROGRESS',
  'IN_PLAY',
  'INPLAY',
  'FIRST_HALF',
  '1H',
  '2H',
  'EXTRA_TIME',
  'PENALTIES',
  'INPROGRESS',
  'PLAYING',
  'STARTED',
  'HALFTIME',
  'HALF_TIME',
  'SECOND_HALF',
  'PAUSED',
]);

/** Match providers sometimes normalize the same running state differently between polling snapshots. */
export function isMatchLive(status?: string | null): boolean {
  const normalized = String(status ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  return LIVE_STATUSES.has(normalized);
}
