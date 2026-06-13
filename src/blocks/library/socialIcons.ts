/* feature-section-library V1 — monochrome (black-and-white) social
   icons as inline SVG data-URIs.

   Why custom icons instead of MJML's built-in `name` presets: the
   built-ins are full-color and don't include TikTok. These are single-
   color glyphs so they read clean + neutral in any brand context, and
   small by default.

   ⚠ Email-client caveat: data-URI SVG renders in the editor canvas,
   the in-app preview, and modern webmail, but several clients (notably
   Outlook desktop + parts of Gmail) block data-URI / SVG images. For
   production sends we should host PNG versions on the CDN and swap the
   `src`. Fine for authoring + demo today. */

export type SocialNetwork = 'instagram' | 'facebook' | 'tiktok' | 'x';

export const SOCIAL_DEFAULTS: SocialNetwork[] = ['instagram', 'facebook', 'tiktok', 'x'];

/* Single-color glyph paths on a 24×24 viewBox. */
const PATHS: Record<SocialNetwork, string> = {
  facebook:
    'M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.86.24-1.45 1.48-1.45h1.58V3.97c-.27-.04-1.22-.12-2.32-.12-2.3 0-3.87 1.4-3.87 3.98V10H7.7v3h2.66v8z',
  instagram:
    'M12 4.06c2.58 0 2.88.01 3.9.06.94.04 1.45.2 1.79.33.45.17.77.38 1.11.72.34.34.55.66.72 1.11.13.34.29.85.33 1.79.05 1.02.06 1.32.06 3.9s-.01 2.88-.06 3.9c-.04.94-.2 1.45-.33 1.79-.17.45-.38.77-.72 1.11-.34.34-.66.55-1.11.72-.34.13-.85.29-1.79.33-1.02.05-1.32.06-3.9.06s-2.88-.01-3.9-.06c-.94-.04-1.45-.2-1.79-.33a2.98 2.98 0 0 1-1.11-.72 2.98 2.98 0 0 1-.72-1.11c-.13-.34-.29-.85-.33-1.79-.05-1.02-.06-1.32-.06-3.9s.01-2.88.06-3.9c.04-.94.2-1.45.33-1.79.17-.45.38-.77.72-1.11.34-.34.66-.55 1.11-.72.34-.13.85-.29 1.79-.33 1.02-.05 1.32-.06 3.9-.06M12 2.3c-2.62 0-2.95.01-3.98.06-1.03.05-1.73.21-2.35.45-.64.25-1.18.58-1.72 1.12-.54.54-.87 1.08-1.12 1.72-.24.62-.4 1.32-.45 2.35C2.31 9.05 2.3 9.38 2.3 12s.01 2.95.06 3.98c.05 1.03.21 1.73.45 2.35.25.64.58 1.18 1.12 1.72.54.54 1.08.87 1.72 1.12.62.24 1.32.4 2.35.45 1.03.05 1.36.06 3.98.06s2.95-.01 3.98-.06c1.03-.05 1.73-.21 2.35-.45.64-.25 1.18-.58 1.72-1.12.54-.54.87-1.08 1.12-1.72.24-.62.4-1.32.45-2.35.05-1.03.06-1.36.06-3.98s-.01-2.95-.06-3.98c-.05-1.03-.21-1.73-.45-2.35a4.7 4.7 0 0 0-1.12-1.72 4.7 4.7 0 0 0-1.72-1.12c-.62-.24-1.32-.4-2.35-.45C14.95 2.31 14.62 2.3 12 2.3m0 4.67A5.03 5.03 0 1 0 12 17a5.03 5.03 0 0 0 0-10.03m0 8.3A3.27 3.27 0 1 1 12 8.73a3.27 3.27 0 0 1 0 6.54m5.23-8.5a1.18 1.18 0 1 0 0 2.35 1.18 1.18 0 0 0 0-2.35',
  tiktok:
    'M16.6 5.82a4.28 4.28 0 0 1-1.9-2.82h-2.9v11.6a2.5 2.5 0 1 1-2.5-2.5c.27 0 .53.04.78.12V9.3a5.4 5.4 0 0 0-.78-.06 5.4 5.4 0 1 0 5.4 5.4V8.97a6.1 6.1 0 0 0 3.9 1.34V7.42a3.85 3.85 0 0 1-2-.6',
  x:
    'M17.53 3h2.94l-6.42 7.34L21.6 21h-5.9l-4.62-6.04L5.8 21H2.86l6.87-7.85L2.4 3h6.05l4.18 5.52zm-1.03 16.24h1.63L7.6 4.66H5.85z',
};

/** A monochrome social icon as a data-URI. `color` is a hex like #1F2937. */
export function monoSocialIcon(network: SocialNetwork, color = '#1F2937'): string {
  const fill = color.replace('#', '%23');
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>` +
    `<path fill='${fill}' d='${PATHS[network]}'/></svg>`;
  return `data:image/svg+xml;utf8,${svg}`;
}
