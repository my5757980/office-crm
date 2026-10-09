// The "from - to" date filter of the lead lists (an <input type="date"> sends
// YYYY-MM-DD). Each date is a whole calendar day, so "to" includes all of that
// day. Anything that is not a real date between 2000 and 2100 - a year half
// typed, a hand-edited URL - is ignored instead of breaking the page.
export interface DateRange {
  from: string | null;        // ISO start of the "from" day, or null
  toExclusive: string | null; // ISO start of the day AFTER "to", or null
}

function day(value: string | undefined | null): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value ?? "").trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 2000 || y > 2100) return null;
  const date = new Date(Date.UTC(y, mo - 1, d));
  // 2026-02-31 would roll over into March: not a real date.
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d ? date : null;
}

export function dateRange(fromValue?: string | null, toValue?: string | null): DateRange {
  let from = day(fromValue);
  let to = day(toValue);
  if (from && to && from > to) [from, to] = [to, from]; // dates entered the wrong way round
  return {
    from: from ? from.toISOString() : null,
    toExclusive: to ? new Date(to.getTime() + 24 * 60 * 60 * 1000).toISOString() : null,
  };
}
