import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiUrl, toArea, type Area, type County, type Constituency, type Level, type Page, type Ward } from "../api";
import { Callout, Card, ChartTooltip, Delta, ErrorBanner, YearLegend } from "../components/ui";
import { SearchIcon } from "../components/Icons";
import { fmtCompact, fmtInt, pctChange, titleCase } from "../format";
import { useDarkMode, useFetch, useFetchAll } from "../hooks";
import { chartTheme, yearColors, type ChartTheme } from "../theme";

const LEVELS: { id: Level; label: string; singular: string }[] = [
  { id: "counties", label: "Counties", singular: "County" },
  { id: "constituencies", label: "Constituencies", singular: "Constituency" },
  { id: "wards", label: "Wards", singular: "Ward" },
];

const MAX_SELECTED = 8;
const DEFAULT_SELECTED = 5;

interface Picked {
  code: number;
  name: string;
  parent: string | null;
}

type Row = County | Constituency | Ward;

interface Scope {
  county: number | null;
  constituency: number | null;
}

const NO_SCOPE: Scope = { county: null, constituency: null };

export function Compare({ years, year, onYear }: { years: number[]; year: number; onYear: (y: number) => void }) {
  const dark = useDarkMode();
  const theme = chartTheme(dark);
  const yearsAsc = [...years].sort((a, b) => a - b);
  const colors = yearColors(yearsAsc, dark);

  const [level, setLevel] = useState<Level>("counties");
  const [baseYear, setBaseYear] = useState<number | null>(null);
  const [selected, setSelected] = useState<Record<Level, Picked[] | null>>({
    counties: null,
    constituencies: null,
    wards: null,
  });
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim(), 250);
  // Narrow the picker to one county (constituencies, wards) or one constituency (wards).
  const [scopes, setScopes] = useState<Record<Level, Scope>>({
    counties: NO_SCOPE,
    constituencies: NO_SCOPE,
    wards: NO_SCOPE,
  });

  // Year A is the baseline; year B follows the header selector. They are never equal.
  const yearB = year;
  const fallbackA = yearsAsc.filter((y) => y < yearB).pop() ?? yearsAsc.find((y) => y !== yearB) ?? yearB;
  const yearA = baseYear !== null && baseYear !== yearB && years.includes(baseYear) ? baseYear : fallbackA;
  const pair = [yearA, yearB].sort((a, b) => a - b);

  const levelInfo = LEVELS.find((l) => l.id === level)!;

  const scope = scopes[level];
  const scoped = scope.county !== null || scope.constituency !== null;
  const setScope = (next: Partial<Scope>) => setScopes((s) => ({ ...s, [level]: { ...s[level], ...next } }));

  // Options for the County / Constituency filter dropdowns (alphabetical).
  const countyOpts = useFetch<Page<County>>(
    level !== "counties" ? apiUrl("/counties", { election_year: yearB, limit: 100 }) : null,
    "county-filter",
  );
  const constOpts = useFetch<Page<Constituency>>(
    level === "wards" && scope.county !== null
      ? apiUrl("/constituencies", { election_year: yearB, county_code: scope.county, limit: 100 })
      : null,
    "constituency-filter",
  );
  const byName = <T,>(items: T[] | undefined, name: (t: T) => string) =>
    [...(items ?? [])].sort((a, b) => name(a).localeCompare(name(b)));

  // Picker options: counties are few enough to load once and filter locally;
  // constituencies and wards are searched server-side, within the chosen county/constituency.
  const pickerUrl =
    level === "counties"
      ? apiUrl("/counties", { election_year: yearB, limit: 100 })
      : apiUrl(`/${level}`, {
          election_year: yearB,
          q: debounced || undefined,
          county_code: scope.county,
          constituency_code: level === "wards" ? scope.constituency : null,
          limit: scoped ? 200 : 50,
        });
  const picker = useFetch<Page<Row>>(pickerUrl, level);

  const options = useMemo(() => {
    const all = (picker.data?.items ?? []).map((r) => toArea(level, r));
    if (level !== "counties" || !debounced) return all;
    const q = debounced.toLowerCase();
    return all.filter((a) => a.name.toLowerCase().includes(q) || String(a.code) === q);
  }, [picker.data, level, debounced]);

  // First visit to a level: preselect the largest areas so the page isn't empty.
  useEffect(() => {
    if (selected[level] !== null || !picker.data || debounced || scoped) return;
    const top = picker.data.items.slice(0, DEFAULT_SELECTED).map((r) => toArea(level, r));
    setSelected((s) => ({ ...s, [level]: top.map(({ code, name, parent }) => ({ code, name, parent })) }));
  }, [picker.data, level, selected, debounced, scoped]);

  const picked = selected[level] ?? [];
  const codes = picked.map((p) => p.code);

  const compare = useFetchAll<Page<Row>>(
    codes.length ? pair.map((y) => apiUrl(`/${level}`, { election_year: y, codes, limit: 50 })) : [],
    level,
  );
  const areasByYear = useMemo(() => {
    const out = new Map<number, Map<number, Area>>();
    (compare.data ?? []).forEach((page, i) => {
      out.set(pair[i], new Map(page.items.map((r) => [toArea(level, r).code, toArea(level, r)])));
    });
    return out;
  }, [compare.data, level, pair.join()]);

  const rows = picked
    .map((p) => ({ ...p, a: areasByYear.get(yearA)?.get(p.code), b: areasByYear.get(yearB)?.get(p.code) }))
    .sort((x, y) => (y.b?.registered_voters ?? 0) - (x.b?.registered_voters ?? 0));

  const toggle = (area: Picked) => {
    setSelected((s) => {
      const cur = s[level] ?? [];
      const has = cur.some((p) => p.code === area.code);
      if (!has && cur.length >= MAX_SELECTED) return s;
      return { ...s, [level]: has ? cur.filter((p) => p.code !== area.code) : [...cur, area] };
    });
  };

  // Selected areas stay pinned at the top of the list even when a search hides them.
  const pickedSet = new Set(codes);
  const unpicked = options.filter((o) => !pickedSet.has(o.code));
  const full = picked.length >= MAX_SELECTED;

  const label = (p: Picked) => titleCase(p.name);
  const chartData = (metric: keyof Area) =>
    rows.map((r) => ({
      name: label(r),
      parent: r.parent ? titleCase(r.parent) : null,
      [yearA]: (r.a?.[metric] as number | undefined) ?? null,
      [yearB]: (r.b?.[metric] as number | undefined) ?? null,
    }));

  const thirdCol =
    level === "wards"
      ? { label: "Avg. voters / station", get: (a?: Area) => a?.avg_voters_per_station }
      : { label: "Wards", get: (a?: Area) => a?.ward_count ?? undefined };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Compare</h1>
          <p className="lede">Compare registered voters and polling stations across counties, constituencies or wards.</p>
        </div>
      </div>

      <div className="filters">
        <div className="segmented" role="tablist" aria-label="Area level">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              role="tab"
              aria-selected={level === l.id}
              className={`segmented-btn ${level === l.id ? "is-active" : ""}`}
              onClick={() => {
                setLevel(l.id);
                setQuery("");
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="year-pair">
          <span className="muted">Election years</span>
          <select className="select" aria-label="Baseline year" value={yearA} onChange={(e) => setBaseYear(Number(e.target.value))}>
            {yearsAsc
              .filter((y) => y !== yearB)
              .map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
          </select>
          <span className="muted">vs</span>
          <select className="select" aria-label="Comparison year" value={yearB} onChange={(e) => onYear(Number(e.target.value))}>
            {yearsAsc.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {(picker.error ?? compare.error) && <ErrorBanner error={(picker.error ?? compare.error)!} />}
      {years.length < 2 && <div className="error-banner">Only one election year is loaded, so there is nothing to compare yet.</div>}

      <div className="compare-top">
        <Card
          title="Select areas to compare"
          aside={
            <span className="picker-aside">
              <span className="muted small">
                {picked.length}/{MAX_SELECTED}
              </span>
              {picked.length > 0 && (
                <button type="button" className="link-btn" onClick={() => setSelected((s) => ({ ...s, [level]: [] }))}>
                  Clear
                </button>
              )}
            </span>
          }
          className="picker"
        >
          {level !== "counties" && (
            <div className="scope-filters">
              <label>
                <span className="scope-label">County</span>
                <select
                  className="select"
                  value={scope.county ?? ""}
                  onChange={(e) => setScope({ county: e.target.value ? Number(e.target.value) : null, constituency: null })}
                >
                  <option value="">All counties</option>
                  {byName(countyOpts.data?.items, (c) => c.county_name).map((c) => (
                    <option key={c.county_code} value={c.county_code}>
                      {titleCase(c.county_name)}
                    </option>
                  ))}
                </select>
              </label>
              {level === "wards" && (
                <label>
                  <span className="scope-label">Constituency</span>
                  <select
                    className="select"
                    value={scope.constituency ?? ""}
                    disabled={scope.county === null}
                    onChange={(e) => setScope({ constituency: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">{scope.county === null ? "Pick a county first" : "All constituencies"}</option>
                    {byName(constOpts.data?.items, (c) => c.constituency_name).map((c) => (
                      <option key={c.constituency_code} value={c.constituency_code}>
                        {titleCase(c.constituency_name)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
          <label className="search">
            <SearchIcon />
            <span className="sr-only">Search {levelInfo.label.toLowerCase()}</span>
            <input
              type="search"
              placeholder={`Search ${levelInfo.label.toLowerCase()}…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <ul className="pick-list" aria-busy={picker.loading}>
            {picked.map((p) => (
              <PickItem key={`p${p.code}`} area={p} checked onToggle={toggle} />
            ))}
            {picked.length > 0 && unpicked.length > 0 && <li className="pick-sep" aria-hidden="true" />}
            {unpicked.map((o) => (
              <PickItem key={o.code} area={o} checked={false} disabled={full} onToggle={toggle} />
            ))}
            {!picker.loading && options.length === 0 && (debounced || scoped) && (
              <li className="muted small pick-empty">No matches</li>
            )}
          </ul>
        </Card>

        <Card
          title={`Registered voters by ${levelInfo.singular.toLowerCase()}`}
          aside={<YearLegend years={pair} colors={colors} />}
          busy={compare.loading}
        >
          {rows.length === 0 ? (
            <p className="muted empty">Select up to {MAX_SELECTED} areas to compare.</p>
          ) : (
            <GroupedBars data={chartData("registered_voters")} years={pair} colors={colors} theme={theme} height={300} unit="registered voters" />
          )}
        </Card>
      </div>

      <Card title={`${levelInfo.singular} comparison`} busy={compare.loading}>
        <div className="table-wrap">
          <table className="table compare-table">
            <thead>
              <tr>
                <th rowSpan={2}>{levelInfo.singular}</th>
                <th colSpan={2} className="group">Registered voters</th>
                <th colSpan={2} className="group">Change</th>
                <th colSpan={2} className="group">Polling stations</th>
                <th colSpan={2} className="group">{thirdCol.label}</th>
              </tr>
              <tr>
                <th className="num">{yearA}</th>
                <th className="num">{yearB}</th>
                <th className="num">%</th>
                <th className="num">Δ</th>
                <th className="num">{yearA}</th>
                <th className="num">{yearB}</th>
                <th className="num">{yearA}</th>
                <th className="num">{yearB}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const diff = r.a && r.b ? r.b.registered_voters - r.a.registered_voters : null;
                return (
                  <tr key={r.code}>
                    <td>
                      {label(r)}
                      {r.parent && <span className="muted small"> · {titleCase(r.parent)}</span>}
                    </td>
                    <td className="num">{r.a ? fmtInt(r.a.registered_voters) : "—"}</td>
                    <td className="num">{r.b ? fmtInt(r.b.registered_voters) : "—"}</td>
                    <td className="num">
                      <Delta pct={pctChange(r.a?.registered_voters, r.b?.registered_voters)} />
                    </td>
                    <td className="num">{diff === null ? "—" : `${diff > 0 ? "+" : ""}${fmtInt(diff)}`}</td>
                    <td className="num">{r.a ? fmtInt(r.a.polling_station_count) : "—"}</td>
                    <td className="num">{r.b ? fmtInt(r.b.polling_station_count) : "—"}</td>
                    <td className="num">{fmtOpt(thirdCol.get(r.a))}</td>
                    <td className="num">{fmtOpt(thirdCol.get(r.b))}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="muted empty">
                    No areas selected.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {rows.length > 0 && (
        <div className="grid-2">
          <Card title="Polling stations" aside={<YearLegend years={pair} colors={colors} />} busy={compare.loading}>
            <GroupedBars data={chartData("polling_station_count")} years={pair} colors={colors} theme={theme} height={220} unit="polling stations" />
          </Card>
          <Card title="Average voters per station" aside={<YearLegend years={pair} colors={colors} />} busy={compare.loading}>
            <GroupedBars data={chartData("avg_voters_per_station")} years={pair} colors={colors} theme={theme} height={220} unit="voters per station" />
          </Card>
        </div>
      )}

      <Callout title="Tip">
        Switch between counties, constituencies and wards above, and tick up to {MAX_SELECTED} areas to compare. The
        header year sets the comparison year; the first year selector sets the baseline.
      </Callout>
    </main>
  );
}

const fmtOpt = (v: number | undefined) => (v === undefined ? "—" : fmtInt(v));

function PickItem({
  area,
  checked,
  disabled = false,
  onToggle,
}: {
  area: Picked;
  checked: boolean;
  disabled?: boolean;
  onToggle: (a: Picked) => void;
}) {
  return (
    <li>
      <label className={`pick ${disabled ? "is-disabled" : ""}`}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={() => onToggle({ code: area.code, name: area.name, parent: area.parent })}
        />
        <span className="pick-name">{titleCase(area.name)}</span>
        {area.parent && <span className="pick-parent">{titleCase(area.parent)}</span>}
      </label>
    </li>
  );
}

type Datum = { name: string; parent: string | null } & Record<number, number | null>;

function GroupedBars({
  data,
  years,
  colors,
  theme,
  height,
  unit,
}: {
  data: Datum[];
  years: number[];
  colors: Record<number, string>;
  theme: ChartTheme;
  height: number;
  unit: string;
}) {
  const many = data.length > 5;
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: many ? 28 : 0 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke={theme.grid} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={{ stroke: theme.axis }}
            interval={0}
            tick={{ fill: theme.tick, fontSize: 12 }}
            angle={many ? -25 : 0}
            textAnchor={many ? "end" : "middle"}
            tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
          />
          <YAxis tickFormatter={fmtCompact} tickLine={false} axisLine={false} tick={{ fill: theme.tick, fontSize: 12 }} width={48} />
          <Tooltip
            cursor={{ fill: theme.cursor }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as Datum;
              return (
                <ChartTooltip
                  title={d.parent ? `${d.name} · ${d.parent}` : d.name}
                  rows={years.map((y) => ({
                    key: y,
                    color: colors[y],
                    label: `${y} ${unit}`,
                    value: d[y] === null ? "—" : fmtInt(d[y]!),
                  }))}
                />
              );
            }}
          />
          {years.map((y) => (
            <Bar key={y} dataKey={String(y)} name={String(y)} fill={colors[y]} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
