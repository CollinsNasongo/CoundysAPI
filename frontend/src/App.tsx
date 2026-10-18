import { useEffect, useState } from "react";
import { apiUrl } from "./api";
import { Header } from "./components/Header";
import { ErrorBanner } from "./components/ui";
import { useFetch, useHashRoute } from "./hooks";
import { Compare } from "./pages/Compare";
import { Overview } from "./pages/Overview";

export function App() {
  const [route, setRoute] = useHashRoute();
  const years = useFetch<number[]>(apiUrl("/national/years"));
  const [year, setYear] = useState<number | null>(null);

  // Default to the latest loaded year once the list arrives.
  useEffect(() => {
    if (year === null && years.data?.length) setYear(Math.max(...years.data));
  }, [years.data, year]);

  const list = years.data ?? [];

  return (
    <>
      <Header route={route} onRoute={setRoute} years={[...list].sort((a, b) => b - a)} year={year} onYear={setYear} />
      {years.error && (
        <main className="page">
          <ErrorBanner error={years.error} />
        </main>
      )}
      {year !== null &&
        (route === "compare" ? (
          <Compare years={list} year={year} onYear={setYear} />
        ) : (
          <Overview years={list} year={year} />
        ))}
    </>
  );
}
