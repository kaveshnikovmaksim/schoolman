type Period = { id: string; start_date: string; end_date: string };

/** Manual choices win; unavailable saved defaults never strand a user. */
export function displayQuarter<T extends Period>(quarters: T[], selectedId: string | null, defaultId: string | null | undefined, today: string): T | undefined {
  const sorted = [...quarters].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const started = sorted.filter(q => q.start_date <= today);
  return quarters.find(q => q.id === selectedId)
    ?? quarters.find(q => q.id === defaultId)
    ?? started[started.length - 1]
    ?? sorted[0];
}

export function displayClass<T extends { id: string }>(classes: T[], defaultId: string | null | undefined): T | undefined {
  return classes.find(c => c.id === defaultId) ?? classes[0];
}