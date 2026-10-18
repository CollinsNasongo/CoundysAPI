import { BallotIcon } from "./Icons";

const ROUTES = [
  { id: "overview", label: "Overview" },
  { id: "compare", label: "Compare" },
];

export function Header({
  route,
  onRoute,
  years,
  year,
  onYear,
}: {
  route: string;
  onRoute: (r: string) => void;
  years: number[];
  year: number | null;
  onYear: (y: number) => void;
}) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a className="brand" href="#/overview">
          <BallotIcon width={30} height={30} className="brand-icon" />
          <span>
            <span className="brand-title">County Electorate Explorer</span>
            <span className="brand-sub">Polling stations and registered voters</span>
          </span>
        </a>
        <nav className="nav" aria-label="Pages">
          {ROUTES.map((r) => (
            <a
              key={r.id}
              href={`#/${r.id}`}
              className={`nav-link ${route === r.id ? "is-active" : ""}`}
              aria-current={route === r.id ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                onRoute(r.id);
              }}
            >
              {r.label}
            </a>
          ))}
          <a className="nav-link" href="/docs" target="_blank" rel="noopener">
            API docs
          </a>
        </nav>
        <label className="topbar-year">
          <span className="sr-only">Election year</span>
          <select
            className="select select-dark"
            value={year ?? ""}
            disabled={years.length === 0}
            onChange={(e) => onYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
