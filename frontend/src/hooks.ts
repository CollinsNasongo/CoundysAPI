import { useEffect, useState } from "react";
import { fetchJson } from "./api";

// Gold data only changes when the ETL reruns, so responses are cached for the session.
const cache = new Map<string, unknown>();

export interface FetchState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
}

interface Held<T> extends FetchState<T> {
  scope: string;
}

/**
 * Only hand back held data while the scope is unchanged. Within a scope the
 * previous response is kept during a refetch so charts hold their frame; a
 * new scope (e.g. a different area level, whose rows have a different shape)
 * starts empty instead of showing rows of the wrong kind.
 */
function scoped<T>(held: Held<T>, scope: string): FetchState<T> {
  return held.scope === scope ? held : { data: undefined, error: undefined, loading: true };
}

/**
 * Fetch JSON from `url` (skipped when null). `scope` names the shape of the
 * response; previous data is only reused while it stays the same.
 */
export function useFetch<T>(url: string | null, scope = ""): FetchState<T> {
  const [held, setHeld] = useState<Held<T>>(() => ({
    scope,
    data: url ? (cache.get(url) as T | undefined) : undefined,
    error: undefined,
    loading: url !== null && !cache.has(url),
  }));

  useEffect(() => {
    if (url === null) {
      setHeld({ scope, data: undefined, error: undefined, loading: false });
      return;
    }
    if (cache.has(url)) {
      setHeld({ scope, data: cache.get(url) as T, error: undefined, loading: false });
      return;
    }
    const ctrl = new AbortController();
    setHeld((s) => (s.scope === scope ? { ...s, error: undefined, loading: true } : { scope, data: undefined, error: undefined, loading: true }));
    fetchJson<T>(url, ctrl.signal)
      .then((data) => {
        cache.set(url, data);
        setHeld({ scope, data, error: undefined, loading: false });
      })
      .catch((error: Error) => {
        if (ctrl.signal.aborted) return;
        setHeld((s) => ({ ...s, scope, error, loading: false }));
      });
    return () => ctrl.abort();
  }, [url, scope]);

  return scoped(held, scope);
}

/** Fetch several URLs in parallel; resolves in the same order. `scope` as in useFetch. */
export function useFetchAll<T>(urls: string[], scope = ""): FetchState<T[]> {
  const key = urls.join("\n");
  const [held, setHeld] = useState<Held<T[]>>({ scope, data: undefined, error: undefined, loading: true });

  useEffect(() => {
    if (urls.length === 0) {
      setHeld({ scope, data: [], error: undefined, loading: false });
      return;
    }
    const ctrl = new AbortController();
    setHeld((s) => (s.scope === scope ? { ...s, error: undefined, loading: true } : { scope, data: undefined, error: undefined, loading: true }));
    Promise.all(
      urls.map((u) =>
        cache.has(u)
          ? Promise.resolve(cache.get(u) as T)
          : fetchJson<T>(u, ctrl.signal).then((d) => {
              cache.set(u, d);
              return d;
            }),
      ),
    )
      .then((data) => setHeld({ scope, data, error: undefined, loading: false }))
      .catch((error: Error) => {
        if (ctrl.signal.aborted) return;
        setHeld((s) => ({ ...s, scope, error, loading: false }));
      });
    return () => ctrl.abort();
  }, [key, scope]);

  return scoped(held, scope);
}

/** Tracks the OS colour scheme so chart colours (which can't read CSS vars) follow it. */
export function useDarkMode(): boolean {
  const query = "(prefers-color-scheme: dark)";
  const [dark, setDark] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return dark;
}

/** Current hash route ("overview" | "compare"). */
export function useHashRoute(): [string, (route: string) => void] {
  const read = () => window.location.hash.replace(/^#\/?/, "") || "overview";
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onHash = () => setRoute(read());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return [route, (r: string) => (window.location.hash = `/${r}`)];
}
