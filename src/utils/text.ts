/** Lowercase, strip accents/punctuation so "Jesus," == "jesus". */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/'/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function words(s: string): string[] {
  const n = normalize(s);
  return n ? n.split(' ') : [];
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const k = s.slice(i, i + 2);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/** Sørensen–Dice similarity on character bigrams: 0..1, forgiving of mishearings. */
export function dice(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = bigrams(a);
  const B = bigrams(b);
  let overlap = 0;
  for (const [k, v] of A) overlap += Math.min(v, B.get(k) ?? 0);
  const total = Math.max(a.length - 1, 0) + Math.max(b.length - 1, 0);
  return total === 0 ? 0 : (2 * overlap) / total;
}
