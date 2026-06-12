import type { IMjmlNode } from '../tree/types';
import type { BlockCategory, PaletteGroup } from './categories';

import { createTextNode } from './text';
import { createImageNode } from './image';
import { createButtonNode } from './button';
import { createDividerNode } from './divider';
import { createSpacerNode } from './spacer';
import {
  createOneColumnSection,
  createTwoColumnSection,
  createThreeColumnSection,
} from './sections';
import { createSocialNode } from './social';
import { createHeroNode } from './hero';
import { createNavbarNode } from './navbar';
import { createRawHtmlNode } from './rawHtml';

/* feature-section-library V1 — pre-designed section composites. */
import {
  createHeaderLogo,
  createHeaderLogoNav,
  createHeaderLogoButton,
  createHeaderCenteredNav,
  createHeaderNavOnly,
  createHeaderLogoSocial,
} from './library/headers';
import {
  createHeroHeadline,
  createHeroImageBg,
  createHeroImageTop,
  createHeroSplit,
} from './library/heroes';
import {
  createFeatureRow,
  createFeatureCards,
  createFeatureSteps,
  createFeatureAnnouncement,
  createFeatureTestimonial,
  createFeatureProducts,
} from './library/features';
import { createGalleryRow, createGalleryGrid, createGalleryCaptioned } from './library/galleries';
import { createCtaCentered, createCtaBanner, createCtaPromo } from './library/cta';
import {
  createFooterSimple,
  createFooterFull,
  createFooterMinimal,
  createFooterContact,
} from './library/footers';
import { createTableSimple, createTableOrder } from './library/tables';
import { createVideoThumb } from './library/videos';

export interface BlockDef {
  id: string;
  label: string;
  /** Short glyph (1–3 chars) shown in the palette card icon box. */
  icon: string;
  /** Drop-target constraint: which container tags accept this block. */
  category: BlockCategory;
  /** Rail entry this block appears under in the palette. */
  group: PaletteGroup;
  /**
   * feature-section-library V1 — how the palette renders this block:
   *   'element'           → icon tile (the classic grid card)
   *   'section-composite' → live mini-preview card in the flyout
   */
  kind: 'element' | 'section-composite';
  factory: () => IMjmlNode;
}

export const blockRegistry: Record<string, BlockDef> = {
  // ── Elements (primitives) ───────────────────────────────────────────
  text: {
    id: 'text',
    label: 'Text',
    icon: 'T',
    category: 'content',
    group: 'elements',
    kind: 'element',
    factory: createTextNode,
  },
  button: {
    id: 'button',
    label: 'Button',
    icon: '▭',
    category: 'content',
    group: 'elements',
    kind: 'element',
    factory: createButtonNode,
  },
  image: {
    id: 'image',
    label: 'Image',
    icon: '▣',
    category: 'content',
    group: 'elements',
    kind: 'element',
    factory: createImageNode,
  },
  divider: {
    id: 'divider',
    label: 'Divider',
    icon: '—',
    category: 'content',
    group: 'elements',
    kind: 'element',
    factory: createDividerNode,
  },
  spacer: {
    id: 'spacer',
    label: 'Spacer',
    icon: '↕',
    category: 'content',
    group: 'elements',
    kind: 'element',
    factory: createSpacerNode,
  },
  social: {
    id: 'social',
    label: 'Social',
    icon: '◯',
    category: 'content',
    group: 'elements',
    kind: 'element',
    factory: createSocialNode,
  },
  navbar: {
    id: 'navbar',
    label: 'Navbar',
    icon: '☰',
    category: 'content',
    group: 'elements',
    kind: 'element',
    factory: createNavbarNode,
  },
  rawHtml: {
    id: 'rawHtml',
    label: 'Raw HTML',
    icon: '</>',
    category: 'content',
    group: 'elements',
    kind: 'element',
    factory: createRawHtmlNode,
  },

  // ── Layout (empty scaffolds) ────────────────────────────────────────
  'section-1col': {
    id: 'section-1col',
    label: '1 Column',
    icon: '▭',
    category: 'section',
    group: 'layout',
    kind: 'element',
    factory: createOneColumnSection,
  },
  'section-2col': {
    id: 'section-2col',
    label: '2 Columns',
    icon: '▭▭',
    category: 'section',
    group: 'layout',
    kind: 'element',
    factory: createTwoColumnSection,
  },
  'section-3col': {
    id: 'section-3col',
    label: '3 Columns',
    icon: '▭▭▭',
    category: 'section',
    group: 'layout',
    kind: 'element',
    factory: createThreeColumnSection,
  },

  // ── Header composites ───────────────────────────────────────────────
  'header-logo': {
    id: 'header-logo',
    label: 'Logo',
    icon: '✦',
    category: 'section',
    group: 'header',
    kind: 'section-composite',
    factory: createHeaderLogo,
  },
  'header-logo-nav': {
    id: 'header-logo-nav',
    label: 'Logo + Navigation',
    icon: '✦☰',
    category: 'section',
    group: 'header',
    kind: 'section-composite',
    factory: createHeaderLogoNav,
  },
  'header-logo-button': {
    id: 'header-logo-button',
    label: 'Logo + Button',
    icon: '✦▭',
    category: 'section',
    group: 'header',
    kind: 'section-composite',
    factory: createHeaderLogoButton,
  },

  'header-centered-nav': {
    id: 'header-centered-nav',
    label: 'Centered + Navigation',
    icon: '✦≡',
    category: 'section',
    group: 'header',
    kind: 'section-composite',
    factory: createHeaderCenteredNav,
  },

  'header-nav-only': {
    id: 'header-nav-only',
    label: 'Navigation only',
    icon: '☰',
    category: 'section',
    group: 'header',
    kind: 'section-composite',
    factory: createHeaderNavOnly,
  },
  'header-logo-social': {
    id: 'header-logo-social',
    label: 'Logo + Social',
    icon: '✦◯',
    category: 'section',
    group: 'header',
    kind: 'section-composite',
    factory: createHeaderLogoSocial,
  },

  // ── Hero composites ─────────────────────────────────────────────────
  'hero-headline': {
    id: 'hero-headline',
    label: 'Headline hero',
    icon: 'H',
    category: 'section',
    group: 'hero',
    kind: 'section-composite',
    factory: createHeroHeadline,
  },
  'hero-image-bg': {
    id: 'hero-image-bg',
    label: 'Image background hero',
    icon: '▣H',
    category: 'section',
    group: 'hero',
    kind: 'section-composite',
    factory: createHeroImageBg,
  },
  'hero-image-top': {
    id: 'hero-image-top',
    label: 'Image-top hero',
    icon: '▣↓',
    category: 'section',
    group: 'hero',
    kind: 'section-composite',
    factory: createHeroImageTop,
  },
  'hero-split': {
    id: 'hero-split',
    label: 'Split hero',
    icon: 'T▣',
    category: 'section',
    group: 'hero',
    kind: 'section-composite',
    factory: createHeroSplit,
  },
  hero: {
    id: 'hero',
    label: 'Basic hero (empty)',
    icon: '★',
    category: 'section',
    group: 'hero',
    kind: 'element',
    factory: createHeroNode,
  },

  // ── Feature composites ──────────────────────────────────────────────
  'feature-row': {
    id: 'feature-row',
    label: 'Feature row',
    icon: '▣T',
    category: 'section',
    group: 'features',
    kind: 'section-composite',
    factory: createFeatureRow,
  },
  'feature-cards': {
    id: 'feature-cards',
    label: 'Double cards',
    icon: '▣▣',
    category: 'section',
    group: 'features',
    kind: 'section-composite',
    factory: createFeatureCards,
  },
  'feature-steps': {
    id: 'feature-steps',
    label: '3 steps',
    icon: '123',
    category: 'section',
    group: 'features',
    kind: 'section-composite',
    factory: createFeatureSteps,
  },
  'feature-announcement': {
    id: 'feature-announcement',
    label: 'Announcement',
    icon: '★T',
    category: 'section',
    group: 'features',
    kind: 'section-composite',
    factory: createFeatureAnnouncement,
  },

  'feature-testimonial': {
    id: 'feature-testimonial',
    label: 'Testimonial',
    icon: '“”',
    category: 'section',
    group: 'features',
    kind: 'section-composite',
    factory: createFeatureTestimonial,
  },
  'feature-products': {
    id: 'feature-products',
    label: 'Product cards',
    icon: '▣$',
    category: 'section',
    group: 'features',
    kind: 'section-composite',
    factory: createFeatureProducts,
  },

  // ── Gallery composites ──────────────────────────────────────────────
  'gallery-row': {
    id: 'gallery-row',
    label: '3 across',
    icon: '▣▣▣',
    category: 'section',
    group: 'gallery',
    kind: 'section-composite',
    factory: createGalleryRow,
  },
  'gallery-grid': {
    id: 'gallery-grid',
    label: '2×2 grid',
    icon: '⊞',
    category: 'section',
    group: 'gallery',
    kind: 'section-composite',
    factory: createGalleryGrid,
  },

  'gallery-captioned': {
    id: 'gallery-captioned',
    label: 'Captioned images',
    icon: '▣T',
    category: 'section',
    group: 'gallery',
    kind: 'section-composite',
    factory: createGalleryCaptioned,
  },

  // ── Table composites ────────────────────────────────────────────────
  'table-simple': {
    id: 'table-simple',
    label: 'Simple table',
    icon: '⊟',
    category: 'section',
    group: 'table',
    kind: 'section-composite',
    factory: createTableSimple,
  },
  'table-order': {
    id: 'table-order',
    label: 'Order summary',
    icon: '⊟$',
    category: 'section',
    group: 'table',
    kind: 'section-composite',
    factory: createTableOrder,
  },

  // ── Video composites ────────────────────────────────────────────────
  'video-thumb': {
    id: 'video-thumb',
    label: 'Video thumbnail',
    icon: '▶',
    category: 'section',
    group: 'video',
    kind: 'section-composite',
    factory: createVideoThumb,
  },

  // ── Call-to-action composites ───────────────────────────────────────
  'cta-centered': {
    id: 'cta-centered',
    label: 'Centered CTA',
    icon: '▭C',
    category: 'section',
    group: 'cta',
    kind: 'section-composite',
    factory: createCtaCentered,
  },
  'cta-banner': {
    id: 'cta-banner',
    label: 'Banner CTA',
    icon: '■C',
    category: 'section',
    group: 'cta',
    kind: 'section-composite',
    factory: createCtaBanner,
  },

  'cta-promo': {
    id: 'cta-promo',
    label: 'Promo code',
    icon: '%▭',
    category: 'section',
    group: 'cta',
    kind: 'section-composite',
    factory: createCtaPromo,
  },

  // ── Footer composites ───────────────────────────────────────────────
  'footer-simple': {
    id: 'footer-simple',
    label: 'Simple footer',
    icon: '⎯F',
    category: 'section',
    group: 'footer',
    kind: 'section-composite',
    factory: createFooterSimple,
  },
  'footer-minimal': {
    id: 'footer-minimal',
    label: 'Minimal footer',
    icon: '⎯',
    category: 'section',
    group: 'footer',
    kind: 'section-composite',
    factory: createFooterMinimal,
  },
  'footer-contact': {
    id: 'footer-contact',
    label: 'Contact footer',
    icon: '⎯@',
    category: 'section',
    group: 'footer',
    kind: 'section-composite',
    factory: createFooterContact,
  },
  'footer-full': {
    id: 'footer-full',
    label: 'Full footer',
    icon: '≡F',
    category: 'section',
    group: 'footer',
    kind: 'section-composite',
    factory: createFooterFull,
  },
};
