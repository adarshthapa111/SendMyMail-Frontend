/* Brand color → CSS gradient.
   The backend stores a single hex (or null) on each client. Every place
   we render a client avatar needs a 150deg gradient (lighter at top,
   darker at bottom) so the chip looks branded rather than flat.

   Used by ClientSwitcher, ClientRow, ClientsHealthList, etc. */

/* The 6-swatch palette from doc/mockups/client_create.html.
   Matched to the warm editorial theme — green / terra / indigo / pink /
   blue / amber. New clients default to the first swatch. */
export const BRAND_COLORS: string[] = [
  '#1D9E75',   // green
  '#D85A30',   // terra
  '#534AB7',   // indigo
  '#D4537E',   // pink
  '#378ADD',   // blue
  '#BA7517',   // amber
];

export const DEFAULT_BRAND_COLOR = BRAND_COLORS[0]!;

/* Used when a client has no avatarColor (legacy / older records).
   Same indigo gradient as the user-menu fallback in UserMenu.tsx. */
export const FALLBACK_GRADIENT = 'linear-gradient(150deg,#7A71D8,#4B43A8)';

/* Parse "#RRGGBB" → [r, g, b]. Returns null on bad input. */
function parseHex(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function clamp(n: number): number { return Math.max(0, Math.min(255, Math.round(n))); }

/* Lighten / darken a hex toward white / black by `amount` ∈ [0,1].
   Used to build the two stops of the gradient. */
function shade(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const target = amount > 0 ? 255 : 0;
  const k = Math.abs(amount);
  const [r, g, b] = rgb.map((v) => clamp(v + (target - v) * k)) as [number, number, number];
  const hexOf = (v: number) => v.toString(16).padStart(2, '0');
  return `#${hexOf(r)}${hexOf(g)}${hexOf(b)}`;
}

/* The single function callers want.
   Given a hex (or null), return a 150deg linear-gradient string suitable
   for `style={{ background: ... }}`. */
export function clientGradient(hex: string | null | undefined): string {
  if (!hex) return FALLBACK_GRADIENT;
  const light = shade(hex,  0.18);    // 18% toward white
  const dark  = shade(hex, -0.20);    // 20% toward black
  return `linear-gradient(150deg,${light},${dark})`;
}

/* "Khukri Spices" → "KS" / "Sushant" → "SU" / fallback "?" */
export function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length >= 2)  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return parts[0]!.slice(0, 2).toUpperCase();
}
