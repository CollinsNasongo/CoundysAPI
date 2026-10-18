import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiUrl, type County, type NationalSummary, type Page } from "../api";
import { Card, ChartTooltip, Delta, ErrorBanner, StatTile } from "../components/ui";
import { GroupIcon, MapIcon, PeopleIcon, PinIcon, StationIcon } from "../components/Icons";
import { fmtCompact, fmtInt, fmtPct, pctChange, titleCase } from "../format";
import { useDarkMode, useFetch, useFetchAll } from "../hooks";
import { chartTheme, yearColors } from "../theme";

type MetricKey = keyof Omit<NationalSummary, "election_year" | "generated_at">;

const METRICS: { key: MetricKey; label: string }[] = [
  { key: "total_registered_voters", label: "Registered voters" },
  { key: "total_polling_stations", label: "Polling stations" },
  { key: "total_wards", label: "Wards" },
  { key: "total_constituencies", label: "Constituencies" },
  { key: "total_counties", label: "Counties" },
  { key: "avg_voters_per_station", label: "Avg. voters per station" },
  { key: "min_voters_per_station", label: "Min. voters per station" },
  { key: "max_voters_per_station", label: "Max. voters per station" },
];

export function Overview({ years, year }: { years: number[]; year: number }) {
  const dark = useDarkMode();
  const theme = chartTheme(dark);
  const yearsAsc = [...years].sort((a, b) => a - b);
  const colors = yearColors(yearsAsc, dark);
  const prevYear = yearsAsc[yearsAsc.indexOf(year) - 1] ?? null;

  const nationals = useFetchAll<NationalSummary>(yearsAsc.map((y) => apiUrl("/national", { election_year: y })));
  const top = useFetch<Page<County>>(apiUrl("/counties", { election_year: year, limit: 10 }));

  const byYear = new Map((nationals.data ?? []).map((n) => [n.election_year, n]));
  const cur = byYear.get(year);
  const prev = prevYear !== null ? byYear.get(prevYear) : undefined;
  const series = yearsAsc.map((y) => ({
    year: String(y),
    voters: byYear.get(y)?.total_registered_voters ?? 0,
    stations: byYear.get(y)?.total_polling_stations ?? 0,
    raw: y,
  }));

  const error = nationals.error ?? top.error;
  const topMax = Math.max(1, ...(top.data?.items ?? []).map((c) => c.registered_voters));

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p className="lede">Key voter metrics and trends for the {year} election.</p>
        </div>
      </div>

      {error && <ErrorBanner error={error} />}

      <div className="stats" aria-busy={nationals.loading}>
        <StatTile
          icon={<PeopleIcon />}
          label="Registered voters"
          value={cur?.total_registered_voters}
          previous={prev?.total_registered_voters}
          previousYear={prevYear}
        />
        <StatTile
          icon={<StationIcon />}
          label="Polling stations"
          value={cur?.total_polling_stations}
          previous={prev?.total_polling_stations}
          previousYear={prevYear}
        />
        <StatTile icon={<PinIcon />} label="Wards" value={cur?.total_wards} previous={prev?.total_wards} previousYear={prevYear} />
        <StatTile
          icon={<GroupIcon />}
          label="Constituencies"
          value={cur?.total_constituencies}
          previous={prev?.total_constituencies}
          previousYear={prevYear}
        />
        <StatTile
          icon={<MapIcon />}
          label="Counties"
          value={cur?.total_counties}
          previous={prev?.total_counties}
          previousYear={prevYear}
        />
      </div>

      <div className="grid-2">
        <Card title="Registered voters by election year" busy={nationals.loading}>
          <div className="chart" role="img" aria-label={`Registered voters: ${series.map((s) => `${s.year} ${fmtInt(s.voters)}`).join(", ")}`}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={series} margin={{ top: 28, right: 32, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={theme.grid} />
                <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: theme.axis }} tick={{ fill: theme.tick, fontSize: 12 }} padding={{ left: 32, right: 32 }} />
                <YAxis tickFormatter={fmtCompact} tickLine={false} axisLine={false} tick={{ fill: theme.tick, fontSize: 12 }} width={48} domain={[0, "auto"]} />
                <Tooltip
                  cursor={{ stroke: theme.axis, strokeWidth: 1 }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <ChartTooltip
                        title={String(payload[0].payload.year)}
                        rows={[{ key: "v", color: colors[yearsAsc[yearsAsc.length - 1]], label: "registered voters", value: fmtInt(payload[0].payload.voters) }]}
                      />
                    ) : null
                  }
                />
                <Area
                  type="linear"
                  dataKey="voters"
                  stroke={colors[yearsAsc[yearsAsc.length - 1]]}
                  strokeWidth={2}
                  fill={colors[yearsAsc[yearsAsc.length - 1]]}
                  fillOpacity={0.1}
                  isAnimationActive={false}
                  dot={(p: { cx?: number; cy?: number; payload?: { raw: number }; index?: number }) => (
                    <circle
                      key={p.index}
                      cx={p.cx}
                      cy={p.cy}
                      r={p.payload?.raw === year ? 6 : 4}
                      fill={colors[yearsAsc[yearsAsc.length - 1]]}
                      stroke={theme.surface}
                      strokeWidth={2}
                    />
                  )}
                  activeDot={{ r: 6, stroke: theme.surface, strokeWidth: 2 }}
                >
                  <LabelList dataKey="voters" position="top" offset={12} formatter={fmtCompact} className="chart-label" />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Polling stations by election year" busy={nationals.loading}>
          <div className="chart" role="img" aria-label={`Polling stations: ${series.map((s) => `${s.year} ${fmtInt(s.stations)}`).join(", ")}`}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={series} margin={{ top: 28, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={theme.grid} />
                <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: theme.axis }} tick={{ fill: theme.tick, fontSize: 12 }} />
                <YAxis tickFormatter={fmtCompact} tickLine={false} axisLine={false} tick={{ fill: theme.tick, fontSize: 12 }} width={48} />
                <Tooltip
                  cursor={{ fill: theme.cursor }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <ChartTooltip
                        title={String(payload[0].payload.year)}
                        rows={[{ key: "s", color: colors[payload[0].payload.raw], label: "polling stations", value: fmtInt(payload[0].payload.stations) }]}
                      />
                    ) : null
                  }
                />
                <Bar dataKey="stations" maxBarSize={56} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {series.map((s) => (
                    <Cell key={s.year} fill={colors[s.raw]} />
                  ))}
                  <LabelList dataKey="stations" position="top" offset={8} formatter={fmtInt} className="chart-label" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid-2">
        <Card title={`Top 10 counties by registered voters (${year})`} busy={top.loading}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th>County</th>
                  <th className="bar-col" aria-hidden="true" />
                  <th className="num">Registered voters</th>
                  <th className="num">% of total</th>
                </tr>
              </thead>
              <tbody>
                {(top.data?.items ?? []).map((c) => (
                  <tr key={c.county_code}>
                    <td className="num muted">{c.national_voter_rank}</td>
                    <td>{titleCase(c.county_name)}</td>
                    <td className="bar-col" aria-hidden="true">
                      <span className="inline-bar" style={{ width: `${(c.registered_voters / topMax) * 100}%`, background: colors[year] }} />
                    </td>
                    <td className="num">{fmtInt(c.registered_voters)}</td>
                    <td className="num muted">{fmtPct(c.pct_of_national_voters)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Key metrics by election year" busy={nationals.loading}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Metric</th>
                  {yearsAsc.map((y) => (
                    <th key={y} className={`num ${y === year ? "is-current" : ""}`}>
                      {y}
                    </th>
                  ))}
                  <th className="num">{prevYear !== null ? `Change ${prevYear}–${year}` : "Change"}</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map((m) => (
                  <tr key={m.key}>
                    <td>{m.label}</td>
                    {yearsAsc.map((y) => {
                      const v = byYear.get(y)?.[m.key];
                      return (
                        <td key={y} className={`num ${y === year ? "is-current" : ""}`}>
                          {v === undefined ? "—" : fmtInt(v)}
                        </td>
                      );
                    })}
                    <td className="num">
                      <Delta pct={pctChange(prev?.[m.key], cur?.[m.key])} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </main>
  );
}

