import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const BallotIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
    <path d="M7 11V3h10v8" />
    <path d="m9.5 7 1.75 1.75L14.5 5.5" />
  </svg>
);

export const PeopleIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
  </svg>
);

export const StationIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M3 21h18M5 21V10M19 21V10M9.5 21v-6h5v6" />
    <path d="M2 10 12 3l10 7z" />
  </svg>
);

export const PinIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);

export const GroupIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

export const MapIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
    <path d="M9 3v15M15 6v15" />
  </svg>
);

export const ArrowUp = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} width={14} height={14} strokeWidth={2.5} {...p}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

export const ArrowDown = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} width={14} height={14} strokeWidth={2.5} {...p}>
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </svg>
);

export const Dash = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} width={14} height={14} strokeWidth={2.5} {...p}>
    <path d="M6 12h12" />
  </svg>
);

export const SearchIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} width={16} height={16} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const BulbIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} width={24} height={24} {...p}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3z" />
  </svg>
);
