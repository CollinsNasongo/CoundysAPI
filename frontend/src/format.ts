const intFmt = new Intl.NumberFormat("en-KE");
const compactFmt = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export const fmtInt = (n: number) => intFmt.format(n);
export const fmtCompact = (n: number) => compactFmt.format(n);

export function fmtPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

/** Percentage change from `from` to `to`, or null when there is no baseline. */
export function pctChange(from: number | undefined, to: number | undefined): number | null {
  if (from === undefined || to === undefined || from === 0) return null;
  return ((to - from) / from) * 100;
}

/** Signed percentage with sensible precision: 14%, 0.5%, -2.3%. */
export function fmtChange(pct: number): string {
  const abs = Math.abs(pct);
  const digits = abs === 0 ? 0 : abs < 10 ? 1 : 0;
  return `${abs.toFixed(digits)}%`;
}

/**
 * "NAIROBI CITY" -> "Nairobi City", "ELGEYO/MARAKWET" -> "Elgeyo/Marakwet",
 * "MURANG'A" -> "Murang'a", "DANDORA AREA IV" -> "Dandora Area IV".
 */
export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s/\-(.])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase())
    .replace(/\b(I{1,3}|Iv|Vi{0,3}|Ix|Xi{0,3})\b/g, (m) => m.toUpperCase());
}
