import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from '../../tree/types';
import { activeBrandKit, DEFAULT_BRAND_KIT } from './brandKit';
import { monoSocialIcon, SOCIAL_DEFAULTS, type SocialNetwork } from './socialIcons';

/* feature-section-library V1 — shared building helpers for the
   pre-designed section composites. Pure TS, no React.

   feature-client-brand-kit V1 — the per-client kit landed: text/button
   helpers read activeBrandKit() at CALL time (drop time), so a dropped
   composite picks up the active client's font + primary color + brand
   name. INK/MUTED/LINE stay neutral (not themed per client). The kit is
   a module singleton set by the editor — see brandKit.ts for why. */

/* Neutral constants — NOT themed per client. Kept as named exports for
   the composites that reference them directly. */
export const INK   = DEFAULT_BRAND_KIT.ink;    // '#1F2937'
export const MUTED = DEFAULT_BRAND_KIT.muted;  // '#6B7280'
export const LINE  = DEFAULT_BRAND_KIT.line;   // '#E5E7EB'
/* Default font/primary — fallbacks for any neutral need. Per-client
   values come from activeBrandKit() inside the helpers below. */
export const FONT   = DEFAULT_BRAND_KIT.fontFamily;
export const BTN_BG = DEFAULT_BRAND_KIT.primaryColor;

/** Light-gray image placeholder (with a subtle mountain glyph), any size. */
export function placeholderImg(w: number, h: number): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}'>` +
    `<rect width='${w}' height='${h}' fill='%23E9EAEC'/>` +
    `<path d='M${w * 0.38} ${h * 0.62} l${w * 0.08} -${h * 0.18} l${w * 0.06} ${h * 0.10} l${w * 0.05} -${h * 0.07} l${w * 0.07} ${h * 0.15} z' fill='%23C7CAD0'/>` +
    `<circle cx='${w * 0.43}' cy='${h * 0.36}' r='${Math.min(w, h) * 0.045}' fill='%23C7CAD0'/>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${svg}`;
}

export function text(content: string, attrs: Record<string, string> = {}): IMjmlNode {
  return {
    tagName: 'mj-text',
    _id: uuid(),
    attributes: {
      'font-family': activeBrandKit().fontFamily,
      color: INK,
      'font-size': '14px',
      'line-height': '1.6',
      padding: '0 0 8px',
      ...attrs,
    },
    content,
  };
}

export function button(label: string, attrs: Record<string, string> = {}): IMjmlNode {
  return {
    tagName: 'mj-button',
    _id: uuid(),
    attributes: {
      'font-family': activeBrandKit().fontFamily,
      'background-color': activeBrandKit().primaryColor,
      color: '#ffffff',
      'font-size': '14px',
      'font-weight': '600',
      'border-radius': '6px',
      'inner-padding': '12px 28px',
      padding: '8px 0 0',
      href: '#',
      ...attrs,
    },
    content: label,
  };
}

/* feature-client-brand-kit V1 — the brand mark for headers/footers.
   Renders the active client's logo image when set, else a text wordmark
   ("✦ {brandName}"). align controls text alignment. */
export function brandMark(attrs: Record<string, string> = {}, align = 'center'): IMjmlNode {
  const kit = activeBrandKit();
  if (kit.logoUrl) {
    return {
      tagName: 'mj-image',
      _id: uuid(),
      attributes: {
        src: kit.logoUrl,
        alt: kit.brandName,
        width: '140px',
        align,
        padding: '0',
        ...attrs,
      },
    };
  }
  return text(`<strong>✦ ${kit.brandName}</strong>`, {
    'font-size': '18px',
    'letter-spacing': '0.02em',
    align,
    padding: '0',
    ...attrs,
  });
}

export function image(w: number, h: number, attrs: Record<string, string> = {}): IMjmlNode {
  return {
    tagName: 'mj-image',
    _id: uuid(),
    attributes: {
      src: placeholderImg(w, h),
      alt: 'Placeholder',
      padding: '0',
      'border-radius': '6px',
      ...attrs,
    },
  };
}

export function divider(attrs: Record<string, string> = {}): IMjmlNode {
  return {
    tagName: 'mj-divider',
    _id: uuid(),
    attributes: {
      'border-color': LINE,
      'border-width': '1px',
      padding: '12px 0',
      ...attrs,
    },
  };
}

export function column(children: IMjmlNode[], attrs: Record<string, string> = {}): IMjmlNode {
  return {
    tagName: 'mj-column',
    _id: uuid(),
    attributes: { ...attrs },
    children,
  };
}

export function section(children: IMjmlNode[], attrs: Record<string, string> = {}): IMjmlNode {
  return {
    tagName: 'mj-section',
    _id: uuid(),
    attributes: {
      'background-color': '#ffffff',
      padding: '24px 24px',
      ...attrs,
    },
    children,
  };
}

/* feature-section-library V1 — social row.
   Default = 4 small monochrome (B&W) icons: Instagram, Facebook, TikTok,
   X. Custom SVG `src` per element so they're neutral + include TikTok
   (MJML's built-in `name` presets are full-color and have no TikTok).
   `background-color: transparent` drops the default colored circle. */
export function social(attrs: Record<string, string> = {}): IMjmlNode {
  const el = (network: SocialNetwork): IMjmlNode => ({
    tagName: 'mj-social-element',
    _id: uuid(),
    attributes: {
      name: network,
      src: monoSocialIcon(network),
      'background-color': 'transparent',
      href: '#',
    },
  });
  return {
    tagName: 'mj-social',
    _id: uuid(),
    attributes: {
      mode: 'horizontal',
      'icon-size': '18px',
      'inner-padding': '0 6px',
      padding: '8px 0',
      align: 'center',
      ...attrs,
    },
    children: SOCIAL_DEFAULTS.map(el),
  };
}
