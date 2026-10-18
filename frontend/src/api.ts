/** Typed client for the Coundys API (/api/v1). */

const BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";

export type Level = "counties" | "constituencies" | "wards";

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface NationalSummary {
  election_year: number;
  total_counties: number;
  total_constituencies: number;
  total_wards: number;
  total_polling_stations: number;
  total_registered_voters: number;
  avg_voters_per_station: number;
  min_voters_per_station: number;
  max_voters_per_station: number;
  avg_voters_per_county: number;
  generated_at: string;
}

export interface County {
  election_year: number;
  county_code: number;
  county_name: string;
  constituency_count: number;
  ward_count: number;
  polling_station_count: number;
  registered_voters: number;
  pct_of_national_voters: number;
  national_voter_rank: number;
  avg_voters_per_station: number;
}

export interface Constituency {
  election_year: number;
  constituency_code: number;
  constituency_name: string;
  county_code: number;
  county_name: string;
  ward_count: number;
  polling_station_count: number;
  registered_voters: number;
  pct_of_county_voters: number;
  rank_in_county: number;
  avg_voters_per_station: number;
}

export interface Ward {
  election_year: number;
  ward_code: number;
  ward_name: string;
  constituency_code: number;
  constituency_name: string;
  county_code: number;
  county_name: string;
  polling_station_count: number;
  registered_voters: number;
  pct_of_constituency_voters: number;
  rank_in_constituency: number;
  avg_voters_per_station: number;
}

/** A county, constituency or ward reduced to the fields the Compare page needs. */
export interface Area {
  code: number;
  name: string;
  /** Parent area, to tell apart wards/constituencies that share a name. */
  parent: string | null;
  registered_voters: number;
  polling_station_count: number;
  ward_count: number | null;
  avg_voters_per_station: number;
}

export function toArea(level: Level, row: County | Constituency | Ward): Area {
  switch (level) {
    case "counties": {
      const r = row as County;
      return {
        code: r.county_code,
        name: r.county_name,
        parent: null,
        registered_voters: r.registered_voters,
        polling_station_count: r.polling_station_count,
        ward_count: r.ward_count,
        avg_voters_per_station: r.avg_voters_per_station,
      };
    }
    case "constituencies": {
      const r = row as Constituency;
      return {
        code: r.constituency_code,
        name: r.constituency_name,
        parent: r.county_name,
        registered_voters: r.registered_voters,
        polling_station_count: r.polling_station_count,
        ward_count: r.ward_count,
        avg_voters_per_station: r.avg_voters_per_station,
      };
    }
    case "wards": {
      const r = row as Ward;
      return {
        code: r.ward_code,
        name: r.ward_name,
        parent: r.constituency_name,
        registered_voters: r.registered_voters,
        polling_station_count: r.polling_station_count,
        ward_count: null,
        avg_voters_per_station: r.avg_voters_per_station,
      };
    }
  }
}

type Params = Record<string, string | number | (string | number)[] | null | undefined>;

/** Build an API URL; array values repeat the key (codes=1&codes=2). */
export function apiUrl(path: string, params: Params = {}): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    for (const v of Array.isArray(value) ? value : [value]) qs.append(key, String(v));
  }
  const query = qs.toString();
  return `${BASE}${path}${query ? `?${query}` : ""}`;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}
