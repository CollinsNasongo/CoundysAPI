/**
 * Chart colours. Recharts needs literal colours, so these mirror the CSS tokens
 * in styles.css.
 *
 * Years are an ordinal blue ramp built on the palette's chart blue (#2563EB):
 * the latest year is the strongest step, earlier years recede. Green stays
 * reserved for the brand and for "up" deltas. Both two-year pairs were
 * validated (ordinal) against the card surface in each mode.
 */
const SERIES = {
  light: { current: "#2563eb", previous: "#60a5fa", older: ["#93c5fd", "#bfdbfe"] },
  dark: { current: "#60a5fa", previous: "#1d4ed8", older: ["#1e3a8a", "#1e3a8a"] },
};

export interface ChartTheme {
  grid: string;
  axis: string;
  tick: string;
  surface: string;
  cursor: string;
}

export const chartTheme = (dark: boolean): ChartTheme =>
  dark
    ? { grid: "#1f2d28", axis: "#2c3d37", tick: "#9ca3af", surface: "#111c18", cursor: "rgba(255,255,255,0.05)" }
    : { grid: "#e5e7eb", axis: "#d1d5db", tick: "#6b7280", surface: "#f9fafb", cursor: "rgba(15,61,46,0.05)" };

/** Colour for each year: latest = strongest blue, then lighter (light mode) / darker (dark mode) steps. */
export function yearColors(years: number[], dark: boolean): Record<number, string> {
  const s = dark ? SERIES.dark : SERIES.light;
  const newestFirst = [...years].sort((a, b) => b - a);
  const out: Record<number, string> = {};
  newestFirst.forEach((y, i) => {
    out[y] = i === 0 ? s.current : i === 1 ? s.previous : s.older[Math.min(i - 2, s.older.length - 1)];
  });
  return out;
}
