import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from '../../tree/types';

/* feature-section-library V1 — shared building helpers for the
   pre-designed section composites. Pure TS, no React.

   Styling philosophy: neutral + email-safe so a composite looks clean
   in ANY brand context. Helvetica stack, near-black ink, warm-gray
   muted text, dark CTA buttons, light placeholder imagery (inline SVG
   data-URIs — zero network fetches in the editor). When the per-client
   brand kit lands (Phase 2), these constants become kit lookups. */

export const FONT  = 'Helvetica, Arial, sans-serif';
export const INK   = '#1F2937';
export const MUTED = '#6B7280';
export const LINE  = '#E5E7EB';
export const BTN_BG = '#111827';

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
      'font-family': FONT,
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
      'font-family': FONT,
      'background-color': BTN_BG,
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

export function social(attrs: Record<string, string> = {}): IMjmlNode {
  const el = (name: string): IMjmlNode => ({
    tagName: 'mj-social-element',
    _id: uuid(),
    attributes: { name, href: '#' },
  });
  return {
    tagName: 'mj-social',
    _id: uuid(),
    attributes: {
      mode: 'horizontal',
      'icon-size': '20px',
      padding: '8px 0',
      align: 'center',
      ...attrs,
    },
    children: [el('facebook'), el('instagram'), el('twitter')],
  };
}
