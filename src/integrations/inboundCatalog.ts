/**
 * Catalog of INBOUND integrations (e-commerce sync into the contacts /
 * events store). Listed in the integrations screen's "E-commerce sync"
 * section per doc/mockups/integrations.html.
 *
 * Separate from the outbound `platformRegistry` because the data shape
 * is fundamentally different — inbound platforms don't carry
 * credentials / sendEndpoint / thirdPartyClientName. They're webhook
 * receivers that the backend will expose at Feature 09 V1 build (Weeks
 * 12-13 per feature-integrations.md).
 *
 * For V1, this catalog is **presentation-only**: each entry's status
 * is `coming-soon` (or `not-supported` for Daraz, which explicitly has
 * no third-party API). Rows render but don't dispatch any modal. When
 * the backend ships, we'll add `connectEndpoint` / `webhookUrl` /
 * `connected` here and the screen wires up a Connect button.
 */

import type { IconType } from 'react-icons';
import { SiShopify, SiZapier } from 'react-icons/si';

export type InboundStatus = 'coming-soon' | 'not-supported';

export interface InboundDef {
  /** Slug used in DOM keys + future localStorage keys. */
  id: string;
  /** Display name. */
  name: string;
  /** One-line tagline shown in the row. */
  tagline: string;
  /** Brand color for the letter-badge fallback. */
  brandColor: string;
  /** Letter shown when no `icon` is provided. */
  letter: string;
  /** Optional react-icons component. Falls back to `letter` badge. */
  icon?: IconType;
  /** Current V1 status — drives the pill style + disables the row. */
  status: InboundStatus;
}

/* Ordered as the mockup lists them. Don't sort — the ordering signals
   priority (Woo first because it's the primary V1 inbound). */
export const INBOUND_CATALOG: InboundDef[] = [
  {
    id:        'woocommerce',
    name:      'WooCommerce',
    tagline:   'Free WordPress plugin · customer, order & cart sync',
    brandColor: '#7F54B3',
    letter:    'W',
    status:    'coming-soon',
  },
  {
    id:        'shopify',
    name:      'Shopify',
    tagline:   'Private app · public App Store listing pending',
    brandColor: '#95BF47',
    letter:    'S',
    icon:      SiShopify,
    status:    'coming-soon',
  },
  {
    id:        'zapier_inbound',
    name:      'Zapier',
    tagline:   'Inbound webhook escape hatch for anything else',
    brandColor: '#FF4F00',
    letter:    'Z',
    icon:      SiZapier,
    status:    'coming-soon',
  },
  {
    id:        'daraz',
    name:      'Daraz',
    tagline:   'No third-party API — use CSV export instead',
    brandColor: '#F85606',
    letter:    'D',
    status:    'not-supported',
  },
];
