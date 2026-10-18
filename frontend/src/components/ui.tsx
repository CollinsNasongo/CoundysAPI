import type { ReactNode } from "react";
import { fmtChange, fmtInt } from "../format";
import { ArrowDown, ArrowUp, BulbIcon, Dash } from "./Icons";

export function Card({
  title,
  aside,
  children,
  className = "",
  busy = false,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  busy?: boolean;
}) {
  return (
    <section className={`card ${busy ? "is-busy" : ""} ${className}`} aria-busy={busy}>
      {(title || aside) && (
        <header className="card-head">
          {title && <h2 className="card-title">{title}</h2>}
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

/** Signed change with arrow icon, so direction never relies on colour alone. */
export function Delta({ pct, className = "" }: { pct: number | null; className?: string }) {
  if (pct === null) return <span className={`delta delta-none ${className}`}>n/a</span>;
  const dir = Math.abs(pct) < 0.05 ? "flat" : pct > 0 ? "up" : "down";
  const Icon = dir === "up" ? ArrowUp : dir === "down" ? ArrowDown : Dash;
  const label = dir === "up" ? "Up" : dir === "down" ? "Down" : "No change,";
  return (
    <span className={`delta delta-${dir} ${className}`}>
      <Icon />
      <span className="sr-only">{label}</span>
      {fmtChange(dir === "flat" ? 0 : pct)}
    </span>
  );
}

export function StatTile({
  icon,
  label,
  value,
  previous,
  previousYear,
}: {
  icon: ReactNode;
  label: string;
  value: number | undefined;
  previous: number | undefined;
  previousYear: number | null;
}) {
  const pct = previous !== undefined && value !== undefined && previous !== 0 ? ((value - previous) / previous) * 100 : null;
  return (
    <div className="stat">
      <div className="stat-label">
        <span className="stat-icon">{icon}</span>
        {label}
      </div>
      <div className="stat-value">{value === undefined ? "—" : fmtInt(value)}</div>
      {previousYear !== null && previous !== undefined ? (
        <div className="stat-foot">
          <Delta pct={pct} />
          <span className="muted">
            vs {previousYear} ({fmtInt(previous)})
          </span>
        </div>
      ) : (
        <div className="stat-foot muted">First year on record</div>
      )}
    </div>
  );
}

export function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="callout">
      <BulbIcon className="callout-icon" />
      <div>
        <div className="callout-title">{title}</div>
        <div className="callout-body">{children}</div>
      </div>
    </aside>
  );
}

export function ErrorBanner({ error }: { error: Error }) {
  return (
    <div className="error-banner" role="alert">
      Couldn't load data from the API: {error.message}
    </div>
  );
}

/** Legend for year series; rect keys because the marks are bars/areas. */
export function YearLegend({ years, colors }: { years: number[]; colors: Record<number, string> }) {
  return (
    <ul className="legend">
      {years.map((y) => (
        <li key={y}>
          <span className="legend-key" style={{ background: colors[y] }} />
          {y}
        </li>
      ))}
    </ul>
  );
}

interface TooltipRow {
  key: string | number;
  color: string;
  label: string;
  value: string;
}

/** Recharts tooltip body: values lead, series labels follow, keyed by a short line. */
export function ChartTooltip({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{title}</div>
      {rows.map((r) => (
        <div className="chart-tooltip-row" key={r.key}>
          <span className="chart-tooltip-key" style={{ background: r.color }} />
          <strong>{r.value}</strong>
          <span className="muted">{r.label}</span>
        </div>
      ))}
    </div>
  );
}
