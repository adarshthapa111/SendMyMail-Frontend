/* feature-client-brand-kit V1 — the active brand kit, as a tiny module
   singleton read by the section-composite factories at drop time.

   Why a singleton (not a factory parameter): every factory in the
   registry is `() => IMjmlNode` and is called from many places
   (EditorBody drop handler, Flyout preview). Threading a `kit` argument
   through the registry + all 25 factories would be heavy churn. Instead
   the editor calls setActiveBrandKit() once when a client's template
   loads; the factories (via shared.ts) read the resolved values through
   ES-module live bindings. Within one Builder session clientId is fixed
   (it's in the URL), so the kit is set once and never goes stale.

   Pure TS — no React, no Redux import. The editor (UI layer) pushes the
   kit down; this layer never reaches up. */

export interface BrandKit {
  /** Shown in headers/footers ("✦ {brandName}"). Defaults to the client name. */
  brandName: string;
  /** CSS font stack applied to all composite text. */
  fontFamily: string;
  /** Primary brand color — CTA/button backgrounds + accents. */
  primaryColor: string;
  /** Body ink + muted/line neutrals (not currently themed per client). */
  ink: string;
  muted: string;
  line: string;
  /** Header logo image; null → render the "✦ {brandName}" text mark. */
  logoUrl: string | null;
  /** Footer postal address; null → a neutral placeholder line. */
  address: string | null;
  social: { facebook?: string; instagram?: string; twitter?: string } | null;
}

/* Neutral defaults — the exact values the composites shipped with
   before brand kits existed, so an un-branded client looks identical. */
export const DEFAULT_BRAND_KIT: BrandKit = {
  brandName: 'Your Brand',
  fontFamily: 'Helvetica, Arial, sans-serif',
  primaryColor: '#111827',
  ink: '#1F2937',
  muted: '#6B7280',
  line: '#E5E7EB',
  logoUrl: null,
  address: null,
  social: null,
};

let active: BrandKit = { ...DEFAULT_BRAND_KIT };

/** Source shape from the API Client — only the brand-relevant subset. */
export interface BrandKitSource {
  name?: string | null;
  brandPrimary?: string | null;
  brandFont?: string | null;
  brandLogoUrl?: string | null;
  brandAddress?: string | null;
  brandSocial?: { facebook?: string; instagram?: string; twitter?: string } | null;
}

/* Merge a client's stored brand fields over the neutral defaults.
   Empty strings are treated as "unset" so a blank field never wipes a
   default to ''. */
export function resolveBrandKit(src: BrandKitSource | null | undefined): BrandKit {
  if (!src) return { ...DEFAULT_BRAND_KIT };
  const pick = (v: string | null | undefined, fallback: string) =>
    v && v.trim() ? v : fallback;
  return {
    brandName:    pick(src.name, DEFAULT_BRAND_KIT.brandName),
    fontFamily:   pick(src.brandFont, DEFAULT_BRAND_KIT.fontFamily),
    primaryColor: pick(src.brandPrimary, DEFAULT_BRAND_KIT.primaryColor),
    ink:          DEFAULT_BRAND_KIT.ink,
    muted:        DEFAULT_BRAND_KIT.muted,
    line:         DEFAULT_BRAND_KIT.line,
    logoUrl:      src.brandLogoUrl && src.brandLogoUrl.trim() ? src.brandLogoUrl : null,
    address:      src.brandAddress && src.brandAddress.trim() ? src.brandAddress : null,
    social:       src.brandSocial ?? null,
  };
}

/** Editor calls this once when a client's template loads. null → reset. */
export function setActiveBrandKit(src: BrandKitSource | null): void {
  active = src ? resolveBrandKit(src) : { ...DEFAULT_BRAND_KIT };
}

/** Read the active kit — called by shared.ts helpers at factory time. */
export function activeBrandKit(): BrandKit {
  return active;
}
