import { cn } from '@/lib/cn';

export type SceneName = 'beach' | 'hills' | 'city' | 'heritage' | 'food' | 'journey';

/**
 * Small original illustrations in the brand palette. They use the theme's
 * colour variables, so they follow light and dark mode automatically.
 */
export function Scene({ name, className }: { name: SceneName; className?: string }) {
  return (
    <svg
      viewBox="0 0 160 120"
      className={cn('size-full', className)}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      {name === 'beach' && (
        <>
          <rect width="160" height="120" fill="var(--sky-soft)" />
          <circle cx="118" cy="38" r="17" fill="var(--accent)" />
          <path d="M0 78 Q40 68 80 78 T160 76 V120 H0Z" fill="var(--sky)" opacity=".75" />
          <path d="M0 92 Q50 82 100 94 T160 90 V120 H0Z" fill="var(--accent-soft)" />
          <path
            d="M38 96 Q41 66 50 50"
            stroke="var(--accent-ink)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M50 50 Q30 42 22 54 M50 50 Q36 34 26 36 M50 50 Q54 32 68 34 M50 50 Q66 42 74 54 M50 50 Q48 36 40 30"
            stroke="var(--primary)"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          <path d="M96 100 l18 -6 l4 8 z" fill="var(--danger)" />
        </>
      )}
      {name === 'hills' && (
        <>
          <rect width="160" height="120" fill="var(--primary-soft)" />
          <circle cx="40" cy="34" r="14" fill="var(--accent)" />
          <path d="M-10 120 L42 46 L78 96 L104 60 L170 120Z" fill="var(--primary)" opacity=".55" />
          <path d="M42 46 l-9 13 l6 3 l5 -5 l6 6 l3 -4z" fill="var(--surface)" />
          <path d="M-10 120 Q40 78 90 104 T170 92 V120Z" fill="var(--primary)" />
          <g fill="var(--primary-hover)">
            <path d="M118 104 l7 -18 l7 18z M130 108 l6 -15 l6 15z M24 110 l6 -15 l6 15z" />
          </g>
        </>
      )}
      {name === 'city' && (
        <>
          <rect width="160" height="120" fill="var(--sky-soft)" />
          <circle cx="126" cy="30" r="12" fill="var(--surface)" />
          <g fill="var(--sky-ink)">
            <rect x="14" y="62" width="20" height="58" rx="2" />
            <rect x="40" y="44" width="16" height="76" rx="2" />
            <path d="M68 120 V34 l8 -14 l8 14 V120z" />
            <rect x="92" y="56" width="22" height="64" rx="2" />
            <rect x="120" y="72" width="26" height="48" rx="2" />
          </g>
          <g fill="var(--accent)">
            <rect x="19" y="70" width="4" height="5" />
            <rect x="26" y="82" width="4" height="5" />
            <rect x="44" y="54" width="4" height="5" />
            <rect x="74" y="50" width="4" height="5" />
            <rect x="74" y="70" width="4" height="5" />
            <rect x="98" y="66" width="4" height="5" />
            <rect x="105" y="84" width="4" height="5" />
            <rect x="128" y="82" width="4" height="5" />
          </g>
        </>
      )}
      {name === 'heritage' && (
        <>
          <rect width="160" height="120" fill="var(--accent-soft)" />
          <circle cx="32" cy="30" r="12" fill="var(--accent)" />
          <path d="M50 120 V70 Q80 28 110 70 V120z" fill="var(--accent-ink)" opacity=".85" />
          <path d="M66 120 V78 Q80 56 94 78 V120z" fill="var(--accent-soft)" />
          <rect x="40" y="62" width="10" height="58" fill="var(--accent-ink)" />
          <rect x="110" y="62" width="10" height="58" fill="var(--accent-ink)" />
          <path d="M38 62 l7 -14 l7 14z M108 62 l7 -14 l7 14z" fill="var(--danger)" />
          <circle cx="80" cy="40" r="5" fill="var(--danger)" />
          <rect x="0" y="112" width="160" height="8" fill="var(--accent)" opacity=".5" />
        </>
      )}
      {name === 'food' && (
        <>
          <rect width="160" height="120" fill="var(--danger-soft)" />
          <ellipse cx="80" cy="104" rx="56" ry="8" fill="var(--danger-ink)" opacity=".18" />
          <path
            d="M30 66 H130 Q128 104 80 104 Q32 104 30 66z"
            fill="var(--surface)"
            stroke="var(--danger-ink)"
            strokeWidth="3"
          />
          <path d="M38 66 Q80 46 122 66z" fill="var(--accent)" />
          <circle cx="62" cy="62" r="6" fill="var(--danger)" />
          <circle cx="96" cy="60" r="5" fill="var(--primary)" />
          <path
            d="M60 40 q-6 -8 0 -16 M80 36 q-6 -8 0 -16 M100 40 q-6 -8 0 -16"
            stroke="var(--danger-ink)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            opacity=".6"
          />
          <path
            d="M112 30 l18 34 M120 28 l14 36"
            stroke="var(--accent-ink)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}
      {name === 'journey' && (
        <>
          <rect width="160" height="120" fill="var(--primary-soft)" />
          <path
            d="M14 46 Q60 4 122 30"
            stroke="var(--primary)"
            strokeWidth="2.5"
            strokeDasharray="5 6"
            fill="none"
            strokeLinecap="round"
          />
          <path d="M118 22 l22 6 l-18 10 l-2 -7z" fill="var(--primary)" />
          <ellipse cx="80" cy="110" rx="50" ry="6" fill="var(--primary)" opacity=".18" />
          <rect x="50" y="56" width="60" height="50" rx="9" fill="var(--accent)" />
          <rect
            x="68"
            y="44"
            width="24"
            height="14"
            rx="5"
            fill="none"
            stroke="var(--accent-ink)"
            strokeWidth="4"
          />
          <rect x="50" y="74" width="60" height="7" fill="var(--accent-ink)" opacity=".5" />
          <circle cx="64" cy="108" r="5" fill="var(--ink)" />
          <circle cx="96" cy="108" r="5" fill="var(--ink)" />
          <circle cx="32" cy="88" r="8" fill="var(--danger)" opacity=".8" />
        </>
      )}
    </svg>
  );
}
