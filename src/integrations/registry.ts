import type { IconType } from 'react-icons';
import {
  SiMailchimp,
  SiSendgrid,
  SiHubspot,
  SiShopify,
  SiZapier,
  SiSalesforce,
  SiBrevo,
  SiMake,
  SiHtml5,
} from 'react-icons/si';

export type Tier = 1 | 2 | 3 | 4;
export type PlatformCategory = 'esp' | 'transactional' | 'design-tool' | 'webhook' | 'output';

export interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password';
  placeholder?: string;
  help?: string;
}

export interface PlatformDef {
  id: string; // slug used in localStorage + URLs
  value: string; // exact thirdPartyClientName for backend
  name: string;
  tier: Tier;
  category: PlatformCategory;
  description: string;
  /** Brand color used by the icon (when icon present) or the letter-badge fallback. */
  brandColor: string;
  /** Optional react-icons component. If absent, PlatformCard renders a letter badge. */
  icon?: IconType;
  // Tier 1 only:
  credentialFields?: CredentialField[];
  testEndpoint?: string;
  sendEndpoint?: string;
  // Tier 4 only:
  acceptsUrl?: true;
}

export const platformRegistry: Record<string, PlatformDef> = {
  // ─────────────────────────────────────────────────────────────────
  // Tier 1 — Full API integration (12)
  // ─────────────────────────────────────────────────────────────────
  mailerlite: {
    id: 'mailerlite',
    value: 'MailerLite',
    name: 'MailerLite',
    tier: 1,
    category: 'esp',
    description:
      'Send draft campaigns via the MailerLite new API. ' +
      'Note: MailerLite restricts API content upload to the Advanced plan. ' +
      'On lower plans, use Export → Copy HTML and paste manually.',
    brandColor: '#00C16A',
    credentialFields: [
      {
        key: 'apiKey',
        label: 'API key',
        type: 'password',
        help: 'connect.mailerlite.com → Integrations → Developer API',
      },
      {
        key: 'fromEmail',
        label: 'From email',
        type: 'text',
        placeholder: 'you@yourdomain.com',
        help: 'Must be verified as a sender in MailerLite first (Account → Domains).',
      },
      {
        key: 'fromName',
        label: 'From name',
        type: 'text',
        placeholder: 'Your Brand',
      },
    ],
    testEndpoint: '/integrations/mailerlite/test',
    sendEndpoint: '/integrations/mailerlite/send',
  },
  mailerlite_classic: {
    id: 'mailerlite_classic',
    value: 'MailerLiteClassic',
    name: 'MailerLite (Classic)',
    tier: 1,
    category: 'esp',
    description:
      'Legacy MailerLite v2 API. Not subject to the Advanced-plan restriction of the new API.',
    brandColor: '#00C16A',
    credentialFields: [
      { key: 'apiKey', label: 'API key', type: 'password', help: 'app.mailerlite.com → Integrations → Developer API' },
      { key: 'fromEmail', label: 'From email', type: 'text', placeholder: 'you@yourdomain.com', help: 'Must be a verified sender in MailerLite.' },
      { key: 'fromName', label: 'From name', type: 'text', placeholder: 'Your Brand' },
    ],
    testEndpoint: '/integrations/mailerlite-classic/test',
    sendEndpoint: '/integrations/mailerlite-classic/send',
  },
  marketo: {
    id: 'marketo',
    value: 'Marketo',
    name: 'Marketo',
    tier: 1,
    category: 'esp',
    description: 'OAuth-authenticated. Uploads email templates into a Marketo folder.',
    brandColor: '#5C4C9F',
    credentialFields: [
      { key: 'baseUrl', label: 'Identity / REST host', type: 'text', placeholder: 'https://123-ABC-456.mktorest.com', help: 'Marketo Admin → Web Services → REST API endpoint URL (host only).' },
      { key: 'clientId', label: 'Client ID', type: 'text' },
      { key: 'clientSecret', label: 'Client secret', type: 'password' },
      { key: 'folderId', label: 'Template folder ID', type: 'text', help: 'Numeric ID of the Marketo folder where new templates are uploaded.' },
    ],
    testEndpoint: '/integrations/marketo/test',
    sendEndpoint: '/integrations/marketo/send',
  },
  onesignal: {
    id: 'onesignal',
    value: 'OneSignal',
    name: 'OneSignal',
    tier: 1,
    category: 'transactional',
    description: 'Create email templates in OneSignal.',
    brandColor: '#E54B4D',
    credentialFields: [
      { key: 'apiKey', label: 'REST API key', type: 'password' },
      { key: 'appId', label: 'App ID', type: 'text' },
    ],
    testEndpoint: '/integrations/onesignal/test',
    sendEndpoint: '/integrations/onesignal/send',
  },
  brevo: {
    id: 'brevo',
    value: 'Brevo',
    name: 'Brevo',
    tier: 1,
    category: 'esp',
    description: 'Create email templates with a verified sender.',
    brandColor: '#0B996E',
    icon: SiBrevo,
    credentialFields: [
      { key: 'apiKey', label: 'API key', type: 'password', help: 'app.brevo.com → SMTP & API → API keys' },
      { key: 'fromEmail', label: 'From email', type: 'text', placeholder: 'you@yourdomain.com', help: 'Must be a verified sender in Brevo.' },
      { key: 'fromName', label: 'From name', type: 'text', placeholder: 'Your Brand' },
    ],
    testEndpoint: '/integrations/brevo/test',
    sendEndpoint: '/integrations/brevo/send',
  },
  mailjet: {
    id: 'mailjet',
    value: 'Mailjet',
    name: 'Mailjet',
    tier: 1,
    category: 'transactional',
    description: 'Create email templates.',
    brandColor: '#FEAD0E',
    credentialFields: [
      { key: 'publicKey', label: 'Public key', type: 'text' },
      { key: 'privateKey', label: 'Private key', type: 'password' },
    ],
    testEndpoint: '/integrations/mailjet/test',
    sendEndpoint: '/integrations/mailjet/send',
  },
  airship: {
    id: 'airship',
    value: 'Airship',
    name: 'Airship',
    tier: 1,
    category: 'esp',
    description: 'Push email templates with Airship-specific unsubscribe attrs.',
    brandColor: '#000000',
    credentialFields: [
      { key: 'appKey', label: 'App key', type: 'text' },
      { key: 'bearerToken', label: 'Bearer token', type: 'password' },
      { key: 'region', label: 'Region', type: 'text', placeholder: 'us', help: 'us or eu — defaults to us.' },
      { key: 'fromEmail', label: 'From email', type: 'text', placeholder: 'you@yourdomain.com' },
      { key: 'fromName', label: 'From name', type: 'text', placeholder: 'Your Brand' },
    ],
    testEndpoint: '/integrations/airship/test',
    sendEndpoint: '/integrations/airship/send',
  },
  postmark: {
    id: 'postmark',
    value: 'Postmark',
    name: 'Postmark',
    tier: 1,
    category: 'transactional',
    description: 'Create transactional email templates.',
    brandColor: '#FFCD00',
    credentialFields: [{ key: 'serverToken', label: 'Server token', type: 'password' }],
    testEndpoint: '/integrations/postmark/test',
    sendEndpoint: '/integrations/postmark/send',
  },
  activecampaign: {
    id: 'activecampaign',
    value: 'ActiveCampaign',
    name: 'ActiveCampaign',
    tier: 1,
    category: 'esp',
    description: 'Push campaigns into ActiveCampaign.',
    brandColor: '#356AE6',
    credentialFields: [
      { key: 'apiUrl', label: 'API URL', type: 'text', placeholder: 'https://your-account.api-us1.com' },
      { key: 'apiKey', label: 'API key', type: 'password' },
    ],
    testEndpoint: '/integrations/activecampaign/test',
    sendEndpoint: '/integrations/activecampaign/send',
  },
  stripo: {
    id: 'stripo',
    value: 'Stripo',
    name: 'Stripo',
    tier: 1,
    category: 'design-tool',
    description: 'Import as an MJML template into Stripo.',
    brandColor: '#00BD90',
    credentialFields: [
      { key: 'authToken', label: 'API auth token', type: 'password', help: 'Stripo dashboard → Account → API.' },
      { key: 'folderId', label: 'Folder ID (optional)', type: 'text' },
    ],
    testEndpoint: '/integrations/stripo/test',
    sendEndpoint: '/integrations/stripo/send',
  },
  parcel: {
    id: 'parcel',
    value: 'Parcel::Html',
    name: 'Parcel',
    tier: 3,
    category: 'design-tool',
    description: 'Copy compiled HTML, then paste into a Parcel template.',
    brandColor: '#4F46E5',
  },
  sendgrid: {
    id: 'sendgrid',
    value: 'Sendgrid',
    name: 'SendGrid',
    tier: 1,
    category: 'transactional',
    description: 'Create dynamic email templates.',
    brandColor: '#1A82E2',
    icon: SiSendgrid,
    credentialFields: [
      { key: 'apiKey', label: 'API key', type: 'password', help: 'app.sendgrid.com → Settings → API Keys' },
      { key: 'region', label: 'Region', type: 'text', placeholder: 'us', help: 'us or eu — defaults to us.' },
    ],
    testEndpoint: '/integrations/sendgrid/test',
    sendEndpoint: '/integrations/sendgrid/send',
  },

  // ─────────────────────────────────────────────────────────────────
  // Tier 2 — Export with ESP-specific HTML attrs (5)
  // ─────────────────────────────────────────────────────────────────
  salesforce: {
    id: 'salesforce',
    value: 'Salesforce',
    name: 'Salesforce Marketing Cloud',
    tier: 2,
    category: 'esp',
    description: 'Export HTML with AMPscript + SF-specific attributes.',
    brandColor: '#00A1E0',
    icon: SiSalesforce,
  },
  braze_html: {
    id: 'braze_html',
    value: 'Braze::Html',
    name: 'Braze',
    tier: 2,
    category: 'esp',
    description: 'HTML with Braze unsubscribe link rewriting.',
    brandColor: '#ED4039',
  },
  braze_content_block: {
    id: 'braze_content_block',
    value: 'BrazeContentBlock::Html',
    name: 'Braze Content Block',
    tier: 2,
    category: 'esp',
    description: 'HTML snippet for use as a Braze content block.',
    brandColor: '#ED4039',
  },
  iterable_snippet: {
    id: 'iterable_snippet',
    value: 'IterableSnippet',
    name: 'Iterable Snippet',
    tier: 2,
    category: 'esp',
    description: 'HTML snippet with Iterable-specific attributes.',
    brandColor: '#6B47ED',
  },
  moengage_block: {
    id: 'moengage_block',
    value: 'MoengageBlock',
    name: 'MoEngage (Content Block API)',
    tier: 2,
    category: 'esp',
    description: 'HTML with MoEngage content block API attributes.',
    brandColor: '#F47C29',
  },

  // ─────────────────────────────────────────────────────────────────
  // Tier 3 — Copy & paste (16)
  // ─────────────────────────────────────────────────────────────────
  html: {
    id: 'html', value: 'Html', name: 'HTML code', tier: 3, category: 'output',
    description: 'Plain compiled HTML.', brandColor: '#E34F26', icon: SiHtml5,
  },
  mjml: {
    id: 'mjml', value: 'Mjml', name: 'MJML code', tier: 3, category: 'output',
    description: 'Raw MJML source.', brandColor: '#F06B6E',
  },
  mailchimp: {
    id: 'mailchimp', value: 'MailChimp', name: 'Mailchimp', tier: 3, category: 'esp',
    description: 'Paste HTML into Mailchimp.', brandColor: '#FFE01B', icon: SiMailchimp,
  },
  klaviyo: {
    id: 'klaviyo', value: 'Klaviyo', name: 'Klaviyo (HTML only)', tier: 3, category: 'esp',
    description: 'Paste HTML with Liquid unsubscribe tag.', brandColor: '#1E1E1E',
  },
  klaviyo_edit: {
    id: 'klaviyo_edit', value: 'Klaviyo::Edit', name: 'Klaviyo (Editable in DnD)', tier: 3, category: 'esp',
    description: 'HTML with Klaviyo editable attributes.', brandColor: '#1E1E1E',
  },
  hubspot: {
    id: 'hubspot', value: 'Hubspot', name: 'HubSpot', tier: 3, category: 'esp',
    description: 'HubSpot Handlebars merge tags.', brandColor: '#FF7A59', icon: SiHubspot,
  },
  iterable_drag: {
    id: 'iterable_drag', value: 'Iterable', name: 'Iterable (Drag and Drop)', tier: 3, category: 'esp',
    description: 'Standard HTML with Iterable merge tags.', brandColor: '#6B47ED',
  },
  loops: {
    id: 'loops', value: 'Loops::Mjml', name: 'Loops', tier: 3, category: 'esp',
    description: 'MJML-only zip with index.mjml + img/ folder.', brandColor: '#1A1A1A',
  },
  customer_io: {
    id: 'customer_io', value: 'Customer::DesignStudio', name: 'Customer.io', tier: 3, category: 'esp',
    description: 'CIO Design Studio HTML.', brandColor: '#7C3AED',
  },
  shopify: {
    id: 'shopify', value: 'Shopify::Html', name: 'Shopify', tier: 3, category: 'esp',
    description: 'Shopify email HTML.', brandColor: '#95BF47', icon: SiShopify,
  },
  dotdigital: {
    id: 'dotdigital', value: 'Dotdigital::Html', name: 'Dotdigital', tier: 3, category: 'esp',
    description: 'Dotdigital HTML export.', brandColor: '#00B8E7',
  },
  moengage: {
    id: 'moengage', value: 'Moengage', name: 'MoEngage', tier: 3, category: 'esp',
    description: 'Standard MoEngage HTML.', brandColor: '#F47C29',
  },
  netcore: {
    id: 'netcore', value: 'Netcore', name: 'Netcore', tier: 3, category: 'esp',
    description: 'Netcore [%UNSUB%] tags.', brandColor: '#1E5BD9',
  },
  blueshift: {
    id: 'blueshift', value: 'Blueshift', name: 'Blueshift', tier: 3, category: 'esp',
    description: 'Blueshift HTML.', brandColor: '#6E2DD2',
  },
  sendx: {
    id: 'sendx', value: 'SendX', name: 'SendX', tier: 3, category: 'esp',
    description: 'SendX HTML.', brandColor: '#6366F1',
  },
  zeta: {
    id: 'zeta', value: 'Zeta', name: 'Zeta', tier: 3, category: 'esp',
    description: 'Zeta HTML with merge tags.', brandColor: '#11A9CC',
  },

  // ─────────────────────────────────────────────────────────────────
  // Tier 4 — Webhooks (3)
  // ─────────────────────────────────────────────────────────────────
  webhook: {
    id: 'webhook', value: 'Webhook::Html', name: 'Custom Webhook', tier: 4, category: 'webhook',
    description: 'POST compiled HTML to your own URL.', brandColor: '#6B7280',
    acceptsUrl: true, sendEndpoint: '/integrations/webhook/send',
  },
  zapier: {
    id: 'zapier', value: 'Zapier::Html', name: 'Zapier', tier: 4, category: 'webhook',
    description: 'Zapier webhook target.', brandColor: '#FF4A00', icon: SiZapier,
    acceptsUrl: true, sendEndpoint: '/integrations/webhook/send',
  },
  make: {
    id: 'make', value: 'Make::Html', name: 'Make (Integromat)', tier: 4, category: 'webhook',
    description: 'Make.com webhook target.', brandColor: '#6D00CC', icon: SiMake,
    acceptsUrl: true, sendEndpoint: '/integrations/webhook/send',
  },
};

export const TIER_ORDER: Tier[] = [1, 2, 4, 3];
export const TIER_LABEL: Record<Tier, string> = {
  1: 'API integrations',
  2: 'ESP exports',
  3: 'Copy & paste',
  4: 'Webhooks',
};

export const TIER_DESCRIPTION: Record<Tier, string> = {
  1: 'Connect with credentials and push templates as drafts directly to the platform.',
  2: 'Get HTML with platform-specific attributes baked in. Copy and paste — no connection needed.',
  3: 'Standard MJML or HTML you copy and paste into the platform’s own editor.',
  4: 'POST the compiled HTML to a URL you provide.',
};
